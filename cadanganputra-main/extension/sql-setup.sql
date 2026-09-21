-- ============================================================
-- SQL SETUP — extension/index.html (Password Manager)
-- Jalankan ini di: Supabase Dashboard → SQL Editor
-- Urutan: jalankan satu blok per sekali, dari atas ke bawah.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. BUAT TABEL passwords
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.passwords (
    id          uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid            REFERENCES auth.users(id) ON DELETE CASCADE,
    site        text            NOT NULL,
    username    text            NOT NULL,
    password    text            NOT NULL,       -- disimpan terenkripsi oleh extension
    timestamp   timestamptz     DEFAULT now()
);

-- Index untuk mempercepat query per user
CREATE INDEX IF NOT EXISTS passwords_user_id_idx ON public.passwords (user_id);
CREATE INDEX IF NOT EXISTS passwords_site_idx    ON public.passwords (site);

-- Constraint unik: site + username per user tidak boleh duplikat
-- Ini yang membuat PATCH bisa menarget baris yang tepat
-- dan mencegah insert ganda kalau ada race condition
ALTER TABLE public.passwords
  ADD CONSTRAINT passwords_user_site_username_unique
  UNIQUE (user_id, site, username);


-- ────────────────────────────────────────────────────────────
-- 2. AKTIFKAN ROW LEVEL SECURITY (RLS)
--    Setelah ini, TIDAK ADA yang bisa baca/tulis kecuali ada policy.
--    Walau anon key bocor, tabel tetap tidak bisa diakses tanpa JWT login.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 3. RLS POLICIES — hanya user yang login bisa akses data miliknya
-- ────────────────────────────────────────────────────────────

-- SELECT: hanya baca data milik sendiri
CREATE POLICY "user_select_own"
    ON public.passwords
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: hanya boleh insert dengan user_id sendiri
CREATE POLICY "user_insert_own"
    ON public.passwords
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: hanya boleh update data milik sendiri
CREATE POLICY "user_update_own"
    ON public.passwords
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: hanya boleh hapus data milik sendiri
CREATE POLICY "user_delete_own"
    ON public.passwords
    FOR DELETE
    USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 4. (OPSIONAL) ENKRIPSI PASSWORD dengan pgcrypto
--    Aktifkan extension ini di: Database → Extensions → pgcrypto
--    Lalu extension browser bisa enkripsi sebelum kirim,
--    atau pakai fungsi ini di trigger.
-- ────────────────────────────────────────────────────────────

-- Aktifkan pgcrypto (hanya perlu sekali)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Contoh insert terenkripsi manual (opsional, dari SQL Editor):
-- INSERT INTO passwords (user_id, site, username, password)
-- VALUES (
--     auth.uid(),
--     'github.com',
--     'emailkamu@gmail.com',
--     crypt('passwordasli', gen_salt('bf', 12))   -- bcrypt cost 12
-- );

-- CATATAN: jika pakai enkripsi di kolom password,
-- kamu TIDAK BISA membaca plaintext lagi dari dashboard.
-- Sebaiknya enkripsi dilakukan di sisi extension (client-side AES),
-- bukan di database, agar tetap bisa ditampilkan.


-- ────────────────────────────────────────────────────────────
-- 5. BUAT USER ADMIN di Supabase Auth
--    Jalankan ini untuk membuat akun login pertamamu.
--    Atau buat manual di: Authentication → Users → Add User
-- ────────────────────────────────────────────────────────────

-- Cara manual via SQL (gunakan service_role key, bukan anon key):
-- SELECT auth.create_user(
--     email    := 'admin@sekolahputra.id',
--     password := 'GantiPasswordKuatDisini!2025'
-- );

-- Cara lebih mudah: buka Supabase Dashboard →
--   Authentication → Users → "Add user" → masukkan email & password


-- ────────────────────────────────────────────────────────────
-- 6. VERIFIKASI — cek apakah setup sudah benar
-- ────────────────────────────────────────────────────────────

-- Cek struktur tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'passwords'
ORDER BY ordinal_position;

-- Cek RLS aktif
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'passwords';

-- Cek semua policy yang ada
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'passwords';


-- ────────────────────────────────────────────────────────────
-- 7. QUERY BERGUNA untuk SQL Editor di index.html
-- ────────────────────────────────────────────────────────────

-- Lihat semua data (hanya bisa jika sudah login, karena RLS)
-- SELECT * FROM passwords ORDER BY timestamp DESC LIMIT 50;

-- Hitung per situs
-- SELECT site, COUNT(*) AS total FROM passwords GROUP BY site ORDER BY total DESC;

-- Hapus data lama (lebih dari 90 hari)
-- DELETE FROM passwords WHERE timestamp < now() - INTERVAL '90 days';

-- Cari berdasarkan situs
-- SELECT * FROM passwords WHERE site ILIKE '%google%';


-- ────────────────────────────────────────────────────────────
-- 8. ROLLBACK — hapus semua jika ingin mulai ulang
-- ────────────────────────────────────────────────────────────

-- DROP POLICY IF EXISTS "user_select_own" ON public.passwords;
-- DROP POLICY IF EXISTS "user_insert_own" ON public.passwords;
-- DROP POLICY IF EXISTS "user_update_own" ON public.passwords;
-- DROP POLICY IF EXISTS "user_delete_own" ON public.passwords;
-- DROP TABLE IF EXISTS public.passwords;
