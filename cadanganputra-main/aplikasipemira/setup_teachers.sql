-- ============================================================
--  SETUP TABEL TEACHERS (GURU / STAF) — pufutaraPemira
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
--
--  Jalankan file ini SETELAH setup_supabase.sql sudah dijalankan.
--  File ini menambahkan tabel teachers untuk pemilih kategori guru.
-- ============================================================


-- ──────────────────────────────────────────────────────────
--  TABEL teachers
--  Menyimpan data guru / staf yang berhak memilih.
--  Login menggunakan username + password (plaintext, sama seperti students).
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teachers (
    id          TEXT        PRIMARY KEY,                          -- "tch_<timestamp>_<random>"
    name        TEXT        NOT NULL,                             -- Nama lengkap guru
    username    TEXT        NOT NULL UNIQUE,                      -- Username login (unik)
    password    TEXT        NOT NULL DEFAULT '',                  -- Password login
    role        TEXT        NOT NULL DEFAULT 'Guru',              -- Label: 'Guru', 'Staf', dll.
    has_voted   BOOLEAN     NOT NULL DEFAULT FALSE,               -- Sudah memilih?
    voted_for   TEXT        REFERENCES public.candidates(id)
                            ON DELETE SET NULL DEFAULT NULL       -- FK ke candidates
);

-- Index untuk mempercepat login (cari berdasarkan username)
CREATE INDEX IF NOT EXISTS teachers_username_idx ON public.teachers (username);

-- Row Level Security
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa baca (dipakai untuk login check di client)
CREATE POLICY "teachers_select"
    ON public.teachers FOR SELECT USING (true);

-- Semua orang bisa insert / update / delete (via anon key — admin pakai ini)
CREATE POLICY "teachers_all"
    ON public.teachers FOR ALL USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────
--  CONTOH DATA AWAL (OPSIONAL — hapus komentar jika perlu)
-- ──────────────────────────────────────────────────────────
/*
INSERT INTO public.teachers (id, name, username, password, role, has_voted, voted_for)
VALUES
    ('tch_001', 'Budi Santoso, S.Pd.',    'guru01', 'pass123', 'Guru',  FALSE, NULL),
    ('tch_002', 'Siti Rahmawati, M.Pd.',  'guru02', 'pass456', 'Guru',  FALSE, NULL),
    ('tch_003', 'Ahmad Fauzi, S.Kom.',    'staf01', 'pass789', 'Staf',  FALSE, NULL)
ON CONFLICT (id) DO NOTHING;
*/


-- ──────────────────────────────────────────────────────────
--  VERIFIKASI
--  Jalankan query ini untuk memastikan tabel berhasil dibuat.
-- ──────────────────────────────────────────────────────────
-- SELECT * FROM public.teachers LIMIT 10;
-- SELECT COUNT(*) FROM public.teachers;
