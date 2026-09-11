-- STREAMING_CHUNK: Creating certificates table schema...
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Create the certificates table with all required columns (including grade / nilai)
CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class TEXT,
    grade TEXT,
    event TEXT DEFAULT 'School of Leadership 2026',
    signer TEXT DEFAULT 'Asep Lukmanul Hakim S.Sy',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STREAMING_CHUNK: Setting up Row Level Security policies...
-- 2. Enable Row Level Security (RLS)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 3. Create public access policies for anonymous read/write/delete operations
CREATE POLICY "Akses Baca Publik" ON certificates FOR SELECT USING (true);
CREATE POLICY "Akses Tambah Publik" ON certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "Akses Edit Publik" ON certificates FOR UPDATE USING (true);
CREATE POLICY "Akses Hapus Publik" ON certificates FOR DELETE USING (true);