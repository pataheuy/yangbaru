-- ============================================================
-- PUFUTARASHOP — Auth, Banner Slides, RLS per User
-- Versi aman: pakai DROP IF EXISTS sebelum CREATE
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah user_id ke orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- 2. Tabel banner_slides
CREATE TABLE IF NOT EXISTS banner_slides (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url  TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    subtitle   TEXT NOT NULL DEFAULT '',
    link_cat   TEXT NOT NULL DEFAULT 'all',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banner_sort ON banner_slides(sort_order ASC);

-- 3. RLS banner_slides
ALTER TABLE banner_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Banner slides are publicly readable" ON banner_slides;
CREATE POLICY "Banner slides are publicly readable"
    ON banner_slides FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert banner slides" ON banner_slides;
CREATE POLICY "Anyone can insert banner slides"
    ON banner_slides FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update banner slides" ON banner_slides;
CREATE POLICY "Anyone can update banner slides"
    ON banner_slides FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete banner slides" ON banner_slides;
CREATE POLICY "Anyone can delete banner slides"
    ON banner_slides FOR DELETE USING (true);

-- 4. Fix RLS orders — hapus dulu semua policy lama, buat ulang yang baru
DROP POLICY IF EXISTS "Orders are publicly readable"          ON orders;
DROP POLICY IF EXISTS "Anyone can insert orders"              ON orders;
DROP POLICY IF EXISTS "Anyone can update orders"              ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders"             ON orders;

-- User hanya bisa lihat pesanan miliknya sendiri
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

-- Hanya user yang sudah login bisa bikin pesanan
CREATE POLICY "Authenticated users can insert orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Update tetap boleh (untuk update status dari admin via anon key)
CREATE POLICY "Anyone can update orders"
    ON orders FOR UPDATE USING (true);

-- 5. Fix DELETE policies untuk products dan comments
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename='products' AND policyname='Anyone can delete products'
    ) THEN
        EXECUTE 'CREATE POLICY "Anyone can delete products" ON products FOR DELETE USING (true)';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename='comments' AND policyname='Anyone can delete comments'
    ) THEN
        EXECUTE 'CREATE POLICY "Anyone can delete comments" ON comments FOR DELETE USING (true)';
    END IF;
END $$;

-- 6. Seed banner awal (skip kalau sudah ada data)
INSERT INTO banner_slides (image_url, title, subtitle, link_cat, sort_order, active)
SELECT * FROM (VALUES
    ('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop',
     'Style Tanpa Kompromi.', 'Pilihan produk premium yang dikurasi khusus untuk Anda.', 'all', 1, true),
    ('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=500&fit=crop',
     'Koleksi Eksklusif 2024', 'Gadget terbaru dengan teknologi terdepan.', 'Gadget', 2, true),
    ('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=500&fit=crop',
     'Flash Sale Hari Ini', 'Diskon hingga 50% untuk produk pilihan.', 'promo', 3, true)
) AS v(image_url, title, subtitle, link_cat, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM banner_slides LIMIT 1);
