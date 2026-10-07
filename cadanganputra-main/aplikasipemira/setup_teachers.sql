-- ============================================================
--  SETUP TABEL TEACHERS (GURU / STAF) — pufutaraPemira
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
--
--  Jalankan SETELAH setup_supabase.sql sudah dijalankan.
--
--  Alur login guru sama seperti siswa:
--  → Cari nama → klik nama → masukkan password
--  (tidak perlu username)
-- ============================================================

-- ──────────────────────────────────────────────────────────
--  HAPUS tabel lama jika sudah ada (bersih dari awal)
-- ──────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.teachers;


-- ──────────────────────────────────────────────────────────
--  TABEL teachers
--  Login pakai nama (search) + password — tidak perlu username.
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.teachers (
    id          TEXT        PRIMARY KEY,                          -- "tch_<timestamp>_<random>"
    name        TEXT        NOT NULL,                             -- Nama lengkap guru / staf
    password    TEXT        NOT NULL DEFAULT '',                  -- Password login
    role        TEXT        NOT NULL DEFAULT 'Guru',              -- Label: 'Guru', 'Staf', dll.
    has_voted   BOOLEAN     NOT NULL DEFAULT FALSE,               -- Sudah memilih?
    voted_for   TEXT        REFERENCES public.candidates(id)
                            ON DELETE SET NULL DEFAULT NULL       -- FK ke candidates
);

-- Index nama untuk mempercepat pencarian (search by name)
CREATE INDEX IF NOT EXISTS teachers_name_idx ON public.teachers (name);

-- Row Level Security
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_select"
    ON public.teachers FOR SELECT USING (true);

CREATE POLICY "teachers_all"
    ON public.teachers FOR ALL USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────
--  CONTOH DATA AWAL (OPSIONAL — hapus komentar jika perlu)
-- ──────────────────────────────────────────────────────────
/*
INSERT INTO public.teachers (id, name, password, role, has_voted, voted_for)
VALUES
    ('tch_001', 'Budi Santoso, S.Pd.',   'pass123', 'Guru',  FALSE, NULL),
    ('tch_002', 'Siti Rahmawati, M.Pd.', 'pass456', 'Guru',  FALSE, NULL),
    ('tch_003', 'Ahmad Fauzi, S.Kom.',   'pass789', 'Staf',  FALSE, NULL)
ON CONFLICT (id) DO NOTHING;
*/


-- ──────────────────────────────────────────────────────────
--  VERIFIKASI — jalankan untuk cek hasilnya
-- ──────────────────────────────────────────────────────────
-- SELECT * FROM public.teachers LIMIT 10;
-- SELECT COUNT(*) FROM public.teachers;
