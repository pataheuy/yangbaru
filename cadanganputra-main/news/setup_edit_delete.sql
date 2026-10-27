-- =============================================================
--  SQL — Edit & Hapus Artikel (Pufutara News)
--  Jalankan di Supabase → SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- 1. Izinkan UPDATE artikel (proxy pakai anon key)
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "articles_auth_update" ON public.articles;
CREATE POLICY "articles_auth_update"
  ON public.articles FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- -------------------------------------------------------------
-- 2. Izinkan DELETE artikel
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "articles_auth_delete" ON public.articles;
CREATE POLICY "articles_auth_delete"
  ON public.articles FOR DELETE
  USING (true);


-- -------------------------------------------------------------
-- 3. Soft-delete opsional (bisa pakai published = false)
--    Kalau mau hapus permanen, pakai DELETE biasa (sudah dibuat di atas).
--    Kalau mau soft-delete, uncomment baris berikut dan
--    ubah DELETE di proxy menjadi PATCH published=false:
-- -------------------------------------------------------------
-- ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- (ubah query read: tambahkan filter "deleted_at IS NULL")


-- -------------------------------------------------------------
-- 4. Kolom updated_at sudah di-set otomatis oleh trigger
--    (dari setup_news_supabase.sql sebelumnya).
--    Jika belum ada, jalankan ini:
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_updated_at ON public.articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- -------------------------------------------------------------
-- 5. Verifikasi — lihat artikel terbaru
-- -------------------------------------------------------------
SELECT id, title, category, published, created_at, updated_at
FROM public.articles
ORDER BY updated_at DESC
LIMIT 10;
