-- ============================================================
-- Setup tabel settings untuk PEMIRA BEM SMP
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Buat tabel settings
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- Aktifkan RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Izinkan semua operasi untuk anon key (baca + tulis)
CREATE POLICY "allow_all_settings" ON settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert default (kosong) untuk waktu vote
INSERT INTO settings (key, value)
VALUES
    ('pemira_open_time',  ''),
    ('pemira_close_time', '')
ON CONFLICT (key) DO NOTHING;
