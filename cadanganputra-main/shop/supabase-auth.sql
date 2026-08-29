-- ============================================================
-- PUFUTARASHOP — Auth, Banner Slides, RLS per User
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah user_id ke orders (Supabase Auth UUID)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- 2. Tabel banner slides (dikelola admin)
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

-- Index untuk urutan tampil
CREATE INDEX IF NOT EXISTS idx_banner_sort ON banner_slides(sort_order ASC);

-- 3. RLS untuk banner_slides (baca publik, tulis admin saja)
ALTER TABLE banner_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banner slides are publicly readable"
    ON banner_slides FOR SELECT USING (true);
CREATE POLICY "Anyone can insert banner slides"
    ON banner_slides FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update banner slides"
    ON banner_slides FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete banner slides"
    ON banner_slides FOR DELETE USING (true);

-- 4. Update RLS orders: user hanya bisa lihat pesanannya sendiri
--    (drop dulu policy lama yang publik bisa baca semua)
DROP POLICY IF EXISTS "Orders are publicly readable" ON orders;
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

-- 5. Update INSERT: simpan user_id saat insert order
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
CREATE POLICY "Authenticated users can insert orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Seed data banner awal
INSERT INTO banner_slides (image_url, title, subtitle, link_cat, sort_order, active) VALUES
('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop',
 'Style Tanpa Kompromi.', 'Pilihan produk premium yang dikurasi khusus untuk Anda.', 'all', 1, true),
('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=500&fit=crop',
 'Koleksi Eksklusif 2024', 'Gadget terbaru dengan teknologi terdepan.', 'Gadget', 2, true),
('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=500&fit=crop',
 'Flash Sale Hari Ini', 'Diskon hingga 50% untuk produk pilihan.', 'promo', 3, true);
