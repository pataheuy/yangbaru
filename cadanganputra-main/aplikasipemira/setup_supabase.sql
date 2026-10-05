-- ============================================================
--  SETUP SUPABASE — pufutaraPemira (v2 + password siswa)
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
--  Jalankan dari atas ke bawah, satu kali saja.
--
--  JIKA TABEL SUDAH ADA SEBELUMNYA:
--  Jalankan bagian "ALTER TABLE" di Bagian 2b untuk menambah
--  kolom password tanpa harus drop tabel.
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
    password    TEXT        NOT NULL DEFAULT '',   -- ← password login siswa
    has_voted   BOOLEAN     NOT NULL DEFAULT FALSE,
    voted_for   TEXT        REFERENCES public.candidates(id) ON DELETE SET NULL DEFAULT NULL
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select"
    ON public.students FOR SELECT USING (true);

CREATE POLICY "students_all"
    ON public.students FOR ALL USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────
--  BAGIAN 2b: UPDATE TABEL students YANG SUDAH ADA
--  Jalankan ini jika tabel students sudah dibuat sebelumnya
--  dan BELUM punya kolom password.
--  Aman dijalankan berkali-kali (IF NOT EXISTS).
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';


-- ──────────────────────────────────────────────────────────
--  BAGIAN 3: STORAGE BUCKET candidate-images
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

CREATE POLICY IF NOT EXISTS "storage_candidate_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'candidate-images');

CREATE POLICY IF NOT EXISTS "storage_candidate_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'candidate-images');

CREATE POLICY IF NOT EXISTS "storage_candidate_update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'candidate-images');

CREATE POLICY IF NOT EXISTS "storage_candidate_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'candidate-images');


-- ──────────────────────────────────────────────────────────
--  BAGIAN 4: DATA AWAL KANDIDAT (OPSIONAL)
--  Hapus tanda komentar jika ingin mengisi via SQL.
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
--  BAGIAN 5: DATA AWAL SISWA (OPSIONAL)
--  Format kolom: id, name, grade, password, has_voted, voted_for
--  Contoh:
-- ──────────────────────────────────────────────────────────
/*
INSERT INTO public.students (id, name, grade, password, has_voted, voted_for)
VALUES
    ('std_001', 'Budi Santoso',   'Kelas 7', 'budi123',  false, null),
    ('std_002', 'Ani Rahayu',     'Kelas 7', 'ani456',   false, null),
    ('std_003', 'Dedi Kurniawan', 'Kelas 8', 'dedi789',  false, null)
ON CONFLICT (id) DO NOTHING;
*/


-- ──────────────────────────────────────────────────────────
--  BAGIAN 6: VERIFIKASI
--  Jalankan query ini untuk memastikan semua kolom sudah benar.
-- ──────────────────────────────────────────────────────────
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('candidates', 'students')
ORDER BY table_name, ordinal_position;
