-- ============================================================
--  Schema untuk Extension "Simpan Sandi"
--  Jalankan di Supabase → SQL Editor
--  Jika tabel sudah ada, jalankan bagian DROP dulu
-- ============================================================

-- Hapus tabel lama jika ada (jalankan ini dulu jika sudah terlanjur buat)
DROP TABLE IF EXISTS public.passwords;

-- Buat tabel baru dengan id TEXT (bukan uuid/bigint)
CREATE TABLE public.passwords (
  id        TEXT        PRIMARY KEY,
  site      TEXT        NOT NULL DEFAULT '',
  username  TEXT        NOT NULL DEFAULT 'Tidak diketahui',
  password  TEXT        NOT NULL DEFAULT '',
  timestamp TEXT
);

-- Aktifkan Row Level Security
ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "allow_all_anon"   ON public.passwords;
DROP POLICY IF EXISTS "allow_select"     ON public.passwords;
DROP POLICY IF EXISTS "allow_insert"     ON public.passwords;
DROP POLICY IF EXISTS "allow_delete"     ON public.passwords;

-- Buat policy per operasi (lebih eksplisit, lebih aman)
CREATE POLICY "allow_select" ON public.passwords
  FOR SELECT USING (true);

CREATE POLICY "allow_insert" ON public.passwords
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_delete" ON public.passwords
  FOR DELETE USING (true);

-- Grant akses ke anon dan authenticated
GRANT SELECT, INSERT, DELETE ON public.passwords TO anon;
GRANT SELECT, INSERT, DELETE ON public.passwords TO authenticated;

-- ============================================================
--  Selesai. Reload extension lalu coba login di situs mana saja.
-- ============================================================
