-- ============================================================
-- Migration: Multi-Periode PEMIRA BEM SMP
-- Jalankan sekali di Supabase SQL Editor
-- ============================================================

-- 1. Buat tabel periods
CREATE TABLE IF NOT EXISTS periods (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT NOT NULL,
    is_active  BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_periods" ON periods;
CREATE POLICY "allow_all_periods" ON periods
    FOR ALL USING (true) WITH CHECK (true);

-- 2. Insert periode default "2026-2027" sebagai aktif
INSERT INTO periods (name, is_active)
VALUES ('2026-2027', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP A: Tambah kolom period_id ke semua tabel (nullable dulu)
-- ============================================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
ALTER TABLE students   ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
ALTER TABLE teachers   ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
ALTER TABLE vote_logs  ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
ALTER TABLE settings   ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id) ON DELETE CASCADE;

-- ============================================================
-- STEP B: Migrate data lama (NULL) ke periode default
-- ============================================================

DO $$
DECLARE
    default_period_id UUID;
BEGIN
    SELECT id INTO default_period_id FROM periods WHERE name = '2026-2027' LIMIT 1;

    UPDATE candidates SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE students   SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE teachers   SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE vote_logs  SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE settings   SET period_id = default_period_id WHERE period_id IS NULL;

    -- Insert settings default jika belum ada
    INSERT INTO settings (key, value, period_id)
    VALUES
        ('pemira_open_time',  '', default_period_id),
        ('pemira_close_time', '', default_period_id)
    ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- STEP C: Setelah semua data ter-migrate, baru set NOT NULL + PK
-- ============================================================

-- Set NOT NULL setelah semua row sudah punya period_id
ALTER TABLE candidates ALTER COLUMN period_id SET NOT NULL;
ALTER TABLE students   ALTER COLUMN period_id SET NOT NULL;
ALTER TABLE teachers   ALTER COLUMN period_id SET NOT NULL;
ALTER TABLE vote_logs  ALTER COLUMN period_id SET NOT NULL;
ALTER TABLE settings   ALTER COLUMN period_id SET NOT NULL;

-- Hapus PK lama settings kalau ada, lalu buat PK baru
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings ADD PRIMARY KEY (key, period_id);

-- ============================================================
-- Verifikasi
-- ============================================================
SELECT 'periods' AS tabel, count(*) FROM periods
UNION ALL
SELECT 'candidates with period', count(*) FROM candidates WHERE period_id IS NOT NULL
UNION ALL
SELECT 'students with period',   count(*) FROM students   WHERE period_id IS NOT NULL
UNION ALL
SELECT 'teachers with period',   count(*) FROM teachers   WHERE period_id IS NOT NULL
UNION ALL
SELECT 'vote_logs with period',  count(*) FROM vote_logs  WHERE period_id IS NOT NULL
UNION ALL
SELECT 'settings with period',   count(*) FROM settings   WHERE period_id IS NOT NULL;
