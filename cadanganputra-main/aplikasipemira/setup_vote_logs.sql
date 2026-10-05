-- ============================================================
--  SETUP VOTE LOGS — pufutaraPemira
--  File ini KHUSUS untuk membuat tabel audit log vote_logs.
--
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
--  Aman dijalankan meski tabel sudah ada (IF NOT EXISTS).
-- ============================================================


-- ──────────────────────────────────────────────────────────
--  1. BUAT TABEL vote_logs
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vote_logs (
    id             TEXT         PRIMARY KEY,
    student_id     TEXT         NOT NULL,
    student_name   TEXT         NOT NULL,
    student_grade  TEXT         NOT NULL,
    candidate_id   TEXT         NOT NULL,
    candidate_name TEXT         NOT NULL,
    candidate_no   INTEGER      NOT NULL,
    voted_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ──────────────────────────────────────────────────────────
--  2. INDEX untuk filter & sort cepat
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS vote_logs_student_grade_idx ON public.vote_logs (student_grade);
CREATE INDEX IF NOT EXISTS vote_logs_candidate_id_idx  ON public.vote_logs (candidate_id);
CREATE INDEX IF NOT EXISTS vote_logs_voted_at_idx      ON public.vote_logs (voted_at DESC);


-- ──────────────────────────────────────────────────────────
--  3. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.vote_logs ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────
--  4. POLICIES (dibungkus DO $$ agar tidak error kalau sudah ada)
-- ──────────────────────────────────────────────────────────
DO $$
BEGIN
    -- SELECT: semua orang bisa baca log (admin)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'vote_logs'
          AND policyname = 'vote_logs_select'
    ) THEN
        CREATE POLICY "vote_logs_select"
            ON public.vote_logs FOR SELECT
            USING (true);
    END IF;

    -- INSERT: anon key bisa insert saat siswa memilih
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'vote_logs'
          AND policyname = 'vote_logs_insert'
    ) THEN
        CREATE POLICY "vote_logs_insert"
            ON public.vote_logs FOR INSERT
            WITH CHECK (true);
    END IF;

    -- DELETE: admin bisa hapus semua log saat reset
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'vote_logs'
          AND policyname = 'vote_logs_delete'
    ) THEN
        CREATE POLICY "vote_logs_delete"
            ON public.vote_logs FOR DELETE
            USING (true);
    END IF;
END $$;


-- ──────────────────────────────────────────────────────────
--  5. VERIFIKASI — hasil harus menampilkan 8 kolom vote_logs
-- ──────────────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vote_logs'
ORDER BY ordinal_position;
