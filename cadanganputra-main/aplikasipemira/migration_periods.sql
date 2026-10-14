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
CREATE POLICY "allow_all_periods" ON periods
    FOR ALL USING (true) WITH CHECK (true);

-- 2. Insert periode default "2026-2027" sebagai aktif
INSERT INTO periods (name, is_active)
VALUES ('2026-2027', true)
ON CONFLICT DO NOTHING;

-- 3. Simpan ID periode default ke variabel sementara
DO $$
DECLARE
    default_period_id UUID;
BEGIN
    SELECT id INTO default_period_id FROM periods WHERE name = '2026-2027' LIMIT 1;

    -- 4. Tambah kolom period_id ke semua tabel (kalau belum ada)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'candidates' AND column_name = 'period_id'
    ) THEN
        ALTER TABLE candidates ADD COLUMN period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'period_id'
    ) THEN
        ALTER TABLE students ADD COLUMN period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'teachers' AND column_name = 'period_id'
    ) THEN
        ALTER TABLE teachers ADD COLUMN period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vote_logs' AND column_name = 'period_id'
    ) THEN
        ALTER TABLE vote_logs ADD COLUMN period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'period_id'
    ) THEN
        ALTER TABLE settings ADD COLUMN period_id UUID REFERENCES periods(id) ON DELETE CASCADE;
        -- Ubah PRIMARY KEY settings menjadi (key, period_id)
        -- Hapus PK lama dulu kalau ada
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
        ALTER TABLE settings ADD PRIMARY KEY (key, period_id);
    END IF;

    -- 5. Migrate data lama (period_id = NULL) ke periode default
    UPDATE candidates SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE students   SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE teachers   SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE vote_logs  SET period_id = default_period_id WHERE period_id IS NULL;
    UPDATE settings   SET period_id = default_period_id WHERE period_id IS NULL;

    -- 6. Insert settings default (open/close time) untuk periode default jika belum ada
    INSERT INTO settings (key, value, period_id)
    VALUES
        ('pemira_open_time',  '', default_period_id),
        ('pemira_close_time', '', default_period_id)
    ON CONFLICT (key, period_id) DO NOTHING;

END $$;

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
SELECT 'vote_logs with period',  count(*) FROM vote_logs  WHERE period_id IS NOT NULL;
