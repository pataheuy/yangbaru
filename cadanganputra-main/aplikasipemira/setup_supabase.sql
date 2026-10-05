-- ============================================================
--  SETUP SUPABASE — pufutaraPemira (v3 + audit log)
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
--  Jalankan dari atas ke bawah, satu kali saja.
--
--  JIKA TABEL SUDAH ADA SEBELUMNYA:
--  • Bagian 2b → tambah kolom password di tabel students
--  • Bagian 3  → buat tabel vote_logs baru
-- ============================================================


-- ──────────────────────────────────────────────────────────
--  BAGIAN 1: TABEL candidates
--  Menyimpan data calon presiden BEM: foto, visi, misi, suara
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.candidates (
    id              TEXT        PRIMARY KEY,
    no              INTEGER     NOT NULL,
    name            TEXT        NOT NULL,
    image           TEXT        NOT NULL DEFAULT '',
    visi            TEXT        NOT NULL DEFAULT '',
    misi            JSONB       NOT NULL DEFAULT '[]',
    votes           INTEGER     NOT NULL DEFAULT 0,
    votes_by_class  JSONB       NOT NULL DEFAULT '{}'
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidates_select"
    ON public.candidates FOR SELECT USING (true);

CREATE POLICY "candidates_all"
    ON public.candidates FOR ALL USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────
--  BAGIAN 2a: TABEL students (BARU — belum pernah dibuat)
--  Kolom `password` sudah disertakan sejak awal.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
    id          TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL,
    grade       TEXT        NOT NULL,
    password    TEXT        NOT NULL DEFAULT '',
    has_voted   BOOLEAN     NOT NULL DEFAULT FALSE,
    voted_for   TEXT        REFERENCES public.candidates(id) ON DELETE SET NULL DEFAULT NULL
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select"
    ON public.students FOR SELECT USING (true);

CREATE POLICY "students_all"
    ON public.students FOR ALL USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────
--  BAGIAN 2b: MIGRASI — tambah kolom password ke students
--  Jalankan jika tabel students sudah ada sebelumnya.
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';


-- ──────────────────────────────────────────────────────────
--  BAGIAN 3: TABEL vote_logs  ← BARU (audit log)
--  Setiap baris = satu kejadian pemilihan.
--  Insert-only: tidak pernah di-update, hanya insert & delete
--  (delete hanya saat admin reset semua suara).
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vote_logs (
    id             TEXT         PRIMARY KEY,              -- "log_<timestamp>_<random>"
    student_id     TEXT         NOT NULL,                 -- FK ke students.id (soft)
    student_name   TEXT         NOT NULL,
    student_grade  TEXT         NOT NULL,
    candidate_id   TEXT         NOT NULL,                 -- FK ke candidates.id (soft)
    candidate_name TEXT         NOT NULL,
    candidate_no   INTEGER      NOT NULL,
    voted_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()    -- waktu pilih (UTC)
);

-- Index untuk mempercepat filter & sort
CREATE INDEX IF NOT EXISTS vote_logs_student_grade_idx ON public.vote_logs (student_grade);
CREATE INDEX IF NOT EXISTS vote_logs_candidate_id_idx  ON public.vote_logs (candidate_id);
CREATE INDEX IF NOT EXISTS vote_logs_voted_at_idx      ON public.vote_logs (voted_at DESC);

ALTER TABLE public.vote_logs ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa baca (admin perlu lihat log)
CREATE POLICY "vote_logs_select"
    ON public.vote_logs FOR SELECT USING (true);

-- Semua orang bisa insert (saat siswa memilih, anon key dipakai)
CREATE POLICY "vote_logs_insert"
    ON public.vote_logs FOR INSERT WITH CHECK (true);

-- Semua orang bisa delete (admin reset via anon key)
CREATE POLICY "vote_logs_delete"
    ON public.vote_logs FOR DELETE USING (true);


-- ──────────────────────────────────────────────────────────
--  BAGIAN 4: STORAGE BUCKET candidate-images
--  Untuk menyimpan foto kandidat yang diupload admin.
--
--  Jika storage.buckets tidak bisa diakses via SQL Editor,
--  buat bucket manual di: Storage → New Bucket
--    Name  : candidate-images
--    Public: ✅
-- ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-images', 'candidate-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_candidate_select'
  ) THEN
    CREATE POLICY "storage_candidate_select"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'candidate-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_candidate_insert'
  ) THEN
    CREATE POLICY "storage_candidate_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'candidate-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_candidate_update'
  ) THEN
    CREATE POLICY "storage_candidate_update"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'candidate-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_candidate_delete'
  ) THEN
    CREATE POLICY "storage_candidate_delete"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'candidate-images');
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────
--  BAGIAN 5: DATA AWAL KANDIDAT (OPSIONAL)
-- ──────────────────────────────────────────────────────────
/*
INSERT INTO public.candidates (id, no, name, image, visi, misi, votes, votes_by_class)
VALUES
(
    'c_001', 1, 'Ahmad Rizky',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
    'Mewujudkan BEM SMP yang solid, inovatif, dan berkarakter.',
    '["Mengadakan program ekstrakurikuler mingguan.", "Mengelola kas BEM secara transparan.", "Menciptakan lingkungan sekolah yang bersih dan kreatif."]',
    0, '{}'
),
(
    'c_002', 2, 'Siti Nurhaliza',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
    'Menjadikan BEM SMP sebagai sarana pengembangan bakat siswa.',
    '["Menyelenggarakan lomba seni dan olahraga antar kelas.", "Mendorong kegiatan minat dan bakat siswa.", "Menjalin komunikasi positif antara siswa dan guru."]',
    0, '{}'
)
ON CONFLICT (id) DO NOTHING;
*/


-- ──────────────────────────────────────────────────────────
--  BAGIAN 6: DATA AWAL SISWA (OPSIONAL)
--  Format: id, name, grade, password, has_voted, voted_for
-- ──────────────────────────────────────────────────────────
/*
INSERT INTO public.students (id, name, grade, password, has_voted, voted_for)
VALUES
    ('std_001', 'Budi Santoso',   'Kelas 7', 'budi123', false, null),
    ('std_002', 'Ani Rahayu',     'Kelas 7', 'ani456',  false, null),
    ('std_003', 'Dedi Kurniawan', 'Kelas 8', 'dedi789', false, null)
ON CONFLICT (id) DO NOTHING;
*/


-- ──────────────────────────────────────────────────────────
--  BAGIAN 7: VERIFIKASI
--  Jalankan ini untuk memastikan semua tabel & kolom benar.
-- ──────────────────────────────────────────────────────────
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('candidates', 'students', 'vote_logs')
ORDER BY table_name, ordinal_position;
