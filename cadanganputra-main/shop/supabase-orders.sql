-- ============================================================
-- PUFUTARASHOP — Orders & Variants Setup
-- Jalankan di Supabase SQL Editor (terpisah dari setup awal)
-- ============================================================

-- 1. Tambah kolom variants ke tabel products
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]';

-- 2. Tabel pesanan utama
CREATE TABLE IF NOT EXISTS orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number    TEXT NOT NULL UNIQUE,
    buyer_name      TEXT NOT NULL,
    buyer_phone     TEXT NOT NULL,
    buyer_address   TEXT NOT NULL,
    total_price     NUMERIC NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'menunggu_pembayaran'
                    CHECK (status IN (
                        'menunggu_pembayaran',
                        'pembayaran_diterima',
                        'diproses',
                        'dikemas',
                        'dikirim',
                        'sampai',
                        'selesai',
                        'dibatalkan'
                    )),
    status_note     TEXT NOT NULL DEFAULT '',
    tracking_number TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel item pesanan
CREATE TABLE IF NOT EXISTS order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name    TEXT NOT NULL,
    product_image   TEXT NOT NULL DEFAULT '',
    unit_price      NUMERIC NOT NULL DEFAULT 0,
    quantity        INTEGER NOT NULL DEFAULT 1,
    chosen_variants JSONB NOT NULL DEFAULT '{}',
    subtotal        NUMERIC NOT NULL DEFAULT 0
);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 5. Auto-update trigger untuk updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert orders"        ON orders      FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders are publicly readable"    ON orders      FOR SELECT USING (true);
CREATE POLICY "Anyone can update orders"        ON orders      FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert order_items"   ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Order items are publicly readable" ON order_items FOR SELECT USING (true);

-- 7. Fix DELETE policies yang hilang di setup awal
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Anyone can delete products') THEN
        EXECUTE 'CREATE POLICY "Anyone can delete products" ON products FOR DELETE USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Anyone can delete comments') THEN
        EXECUTE 'CREATE POLICY "Anyone can delete comments" ON comments FOR DELETE USING (true)';
    END IF;
END $$;
