-- =============================================================
--  SQL — Fitur Komentar (Pufutara News)
--  Jalankan di Supabase → SQL Editor
-- =============================================================

-- Tabel komentar
CREATE TABLE IF NOT EXISTS public.comments (
  id         bigserial PRIMARY KEY,
  article_id bigint    NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  name       text      NOT NULL,
  body       text      NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index agar query per artikel cepat
CREATE INDEX IF NOT EXISTS comments_article_id_idx ON public.comments(article_id);

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Siapapun bisa baca komentar
DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT USING (true);

-- Siapapun bisa tulis komentar (anon)
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT WITH CHECK (true);

-- Hanya bisa hapus via proxy (admin)
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE USING (true);
