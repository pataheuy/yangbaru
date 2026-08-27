-- ============================================================
-- PUFUTARASHOP - Supabase Database Setup
-- Jalankan SQL ini di Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- ============================================================

-- 1. Tabel Produk
CREATE TABLE IF NOT EXISTS products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    price       NUMERIC NOT NULL DEFAULT 0,
    discount    NUMERIC NOT NULL DEFAULT 0,
    category    TEXT NOT NULL DEFAULT 'Pakaian',
    description TEXT NOT NULL DEFAULT '',
    images      JSONB NOT NULL DEFAULT '[]',
    location    TEXT NOT NULL DEFAULT '',
    shipped_from TEXT NOT NULL DEFAULT '',
    estimated_time TEXT NOT NULL DEFAULT '',
    likes       INTEGER NOT NULL DEFAULT 0,
    rating      NUMERIC NOT NULL DEFAULT 0,
    stock       INTEGER NOT NULL DEFAULT 10,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Komentar
CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    rating      INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_comments_product_id ON comments(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- 4. Row Level Security (RLS) - Baca publik, tulis publik (sesuai kebutuhan toko)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: semua orang bisa baca produk
CREATE POLICY "Products are publicly readable"
    ON products FOR SELECT USING (true);

-- Policy: semua orang bisa tambah produk (form Jual Barang)
CREATE POLICY "Anyone can insert products"
    ON products FOR INSERT WITH CHECK (true);

-- Policy: semua orang bisa update produk (likes, rating)
CREATE POLICY "Anyone can update products"
    ON products FOR UPDATE USING (true);

-- Policy: semua orang bisa baca komentar
CREATE POLICY "Comments are publicly readable"
    ON comments FOR SELECT USING (true);

-- Policy: semua orang bisa tambah komentar
CREATE POLICY "Anyone can insert comments"
    ON comments FOR INSERT WITH CHECK (true);

-- 5. Seed data produk awal (opsional, hapus jika tidak ingin)
INSERT INTO products (name, price, discount, category, description, images, location, shipped_from, estimated_time, likes, rating, stock) VALUES
('Premium Onyx Hoodie', 580000, 15, 'Pakaian', 'Hoodie premium katun 100% yang sangat lembut dan nyaman dipakai seharian.', '["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 124, 4.8, 12),
('Minimalist White Sneakers', 950000, 0, 'Sepatu', 'Sneakers putih bersih dengan desain abadi, cocok untuk semua gaya kasual.', '["https://images.unsplash.com/photo-1570158268183-d296b2892211?w=500&h=500&fit=crop"]', 'Bandung, Jawa Barat', 'Toko Cabang Bandung', '2 - 4 Hari Kerja', 89, 4.5, 5),
('Aero Tech Backpack', 1350000, 25, 'Aksesori', 'Tas ransel tahan air dengan banyak kompartemen tersembunyi untuk laptop dan gadget.', '["https://images.unsplash.com/photo-1553062407-98eeb94c6a62?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 210, 4.9, 8),
('Future Retro Glasses', 420000, 5, 'Aksesori', 'Kacamata bergaya futuristik dengan sentuhan retro, lensa UV protection.', '["https://images.unsplash.com/photo-1511499767390-91f197f66028?w=500&h=500&fit=crop"]', 'Surabaya, Jawa Timur', 'Gudang Timur', '3 - 5 Hari Kerja', 56, 4.2, 20),
('Smart Watch Ultra', 3200000, 10, 'Gadget', 'Smartwatch canggih dengan layar OLED, fitur GPS, dan sensor detak jantung.', '["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 312, 4.7, 3),
('Classic Leather Wallet', 290000, 0, 'Aksesori', 'Dompet kulit sapi asli yang elegan dengan 8 slot kartu dan 2 slot uang kertas.', '["https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 45, 4.0, 15),
('Wireless Headphones', 1800000, 20, 'Gadget', 'Headphone over-ear dengan teknologi noise-canceling terbaik.', '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop"]', 'Bali, Indonesia', 'Toko Cabang Bali', '2 - 5 Hari Kerja', 178, 4.6, 6),
('Denim Trucker Jacket', 750000, 0, 'Pakaian', 'Jaket denim tebal gaya trucker klasik dengan kancing logam premium.', '["https://images.unsplash.com/photo-1576905341935-420ca25380d1?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 92, 4.4, 10),
('Mechanical Keyboard', 1200000, 15, 'Gadget', 'Keyboard mekanik layout 65% dengan switch tactile dan pencahayaan RGB.', '["https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 64, 4.8, 4),
('Sporty Running Shoes', 1100000, 30, 'Sepatu', 'Sepatu lari super ringan dengan bantalan responsif untuk aktivitas berat.', '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop"]', 'Bandung, Jawa Barat', 'Toko Cabang Bandung', '2 - 4 Hari Kerja', 134, 4.5, 11),
('Vintage Leather Jacket', 1250000, 10, 'Pakaian', 'Jaket kulit pria desain klasik vintage yang maskulin dan tahan angin.', '["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop"]', 'Bandung, Jawa Barat', 'Gudang Bandung', '2 - 3 Hari Kerja', 145, 4.7, 8),
('Ergonomic Laptop Stand', 350000, 5, 'Gadget', 'Stand laptop bahan aluminium tebal yang kokoh dan dapat diatur ketinggiannya.', '["https://images.unsplash.com/photo-1616422285623-14ff016214b8?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 88, 4.9, 25),
('Canvas Slip-on Shoes', 450000, 0, 'Sepatu', 'Sepatu kanvas slip-on bergaya kasual yang sangat nyaman untuk sehari-hari.', '["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&h=500&fit=crop"]', 'Surabaya, Jawa Timur', 'Toko Pusat SBY', '3 - 5 Hari Kerja', 230, 4.6, 15),
('Polarized Sunglasses', 250000, 15, 'Aksesori', 'Kacamata hitam pria/wanita anti-UV dengan lensa polarized premium pelindung mata.', '["https://images.unsplash.com/photo-1577803645773-f96470509666?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 112, 4.8, 30),
('Pro Gaming Mouse', 850000, 20, 'Gadget', 'Mouse gaming wireless dengan latensi rendah dan sensor optik 16.000 DPI yang presisi.', '["https://images.unsplash.com/photo-1527814050087-37938154733d?w=500&h=500&fit=crop"]', 'Jakarta Barat', 'Tech Store JKT', '1 - 2 Hari Kerja', 410, 4.9, 12),
('Oversized Graphic T-Shirt', 199000, 0, 'Pakaian', 'Kaos potongan oversized berbahan katun combed 24s dengan sablon desain street style.', '["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&h=500&fit=crop"]', 'Bandung, Jawa Barat', 'Distro BDG', '2 - 4 Hari Kerja', 355, 4.5, 40),
('Chunky Platform Sneakers', 890000, 5, 'Sepatu', 'Sneakers sol tebal bergaya retro kekinian yang nyaman dan membuat kaki terlihat lebih jenjang.', '["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 280, 4.7, 7),
('Stainless Steel Watch', 1550000, 10, 'Aksesori', 'Jam tangan analog elegan dengan material full stainless steel anti-karat dan water resistant.', '["https://images.unsplash.com/photo-1524592094714-cb9c76eb0790?w=500&h=500&fit=crop"]', 'Surabaya, Jawa Timur', 'Watch Center', '3 - 5 Hari Kerja', 190, 4.8, 9),
('Noise Cancelling Earbuds', 2100000, 25, 'Gadget', 'TWS Earbuds canggih dengan fitur Active Noise Cancelling dan daya baterai hingga 24 jam.', '["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&h=500&fit=crop"]', 'Jakarta Selatan, Indonesia', 'Gudang Utama Pufutarashop', '1 - 3 Hari Kerja', 520, 4.9, 2),
('Cotton Cargo Pants', 350000, 0, 'Pakaian', 'Celana kargo pria dari bahan katun twill dengan banyak saku fungsional untuk aktivitas outdoor.', '["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&h=500&fit=crop"]', 'Bandung, Jawa Barat', 'Gudang Bandung', '2 - 3 Hari Kerja', 165, 4.6, 18);

-- ============================================================
-- SUPABASE STORAGE (opsional - untuk upload foto produk)
-- Jalankan ini juga di SQL Editor setelah membuat bucket:
-- 1. Pergi ke Storage > New Bucket
-- 2. Nama bucket: "product-images"
-- 3. Centang "Public bucket"
-- ============================================================

-- Policy storage publik (jalankan setelah bucket dibuat)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
-- CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
-- CREATE POLICY "Anyone can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
