-- ============================================================
-- PUFUTARA KEEP - SUPABASE DATABASE SETUP
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. CREATE TABLE pufutara_notes
-- Table untuk menyimpan catatan per user
CREATE TABLE IF NOT EXISTS public.pufutara_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    color VARCHAR(20) DEFAULT 'white',
    archived BOOLEAN DEFAULT false,
    deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES untuk performa query
-- Index untuk user_id (query by user)
CREATE INDEX IF NOT EXISTS idx_notes_user_id 
ON public.pufutara_notes(user_id);

-- Index untuk archived status
CREATE INDEX IF NOT EXISTS idx_notes_archived 
ON public.pufutara_notes(archived);

-- Index untuk deleted status
CREATE INDEX IF NOT EXISTS idx_notes_deleted 
ON public.pufutara_notes(deleted);

-- Index untuk created_at (sorting)
CREATE INDEX IF NOT EXISTS idx_notes_created_at 
ON public.pufutara_notes(created_at DESC);

-- Composite index untuk filtering
CREATE INDEX IF NOT EXISTS idx_notes_user_status 
ON public.pufutara_notes(user_id, archived, deleted);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pufutara_notes ENABLE ROW LEVEL SECURITY;

-- 4. DROP EXISTING POLICIES (jika ada)
DROP POLICY IF EXISTS "Users can view their own notes" ON public.pufutara_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.pufutara_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.pufutara_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.pufutara_notes;

-- 5. CREATE RLS POLICIES
-- Policy: User hanya bisa melihat catatan mereka sendiri
CREATE POLICY "Users can view their own notes"
ON public.pufutara_notes
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: User hanya bisa membuat catatan untuk diri sendiri
CREATE POLICY "Users can insert their own notes"
ON public.pufutara_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: User hanya bisa update catatan mereka sendiri
CREATE POLICY "Users can update their own notes"
ON public.pufutara_notes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: User hanya bisa delete catatan mereka sendiri
CREATE POLICY "Users can delete their own notes"
ON public.pufutara_notes
FOR DELETE
USING (auth.uid() = user_id);

-- 6. CREATE FUNCTION untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE TRIGGER untuk auto-update updated_at
DROP TRIGGER IF EXISTS update_pufutara_notes_updated_at ON public.pufutara_notes;

CREATE TRIGGER update_pufutara_notes_updated_at
BEFORE UPDATE ON public.pufutara_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. CREATE VIEW untuk statistik (optional)
CREATE OR REPLACE VIEW public.note_stats AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE NOT deleted AND NOT archived) as active_notes,
    COUNT(*) FILTER (WHERE archived AND NOT deleted) as archived_notes,
    COUNT(*) FILTER (WHERE deleted) as deleted_notes,
    COUNT(*) as total_notes
FROM public.pufutara_notes
GROUP BY user_id;

-- 9. GRANT PERMISSIONS
GRANT SELECT ON public.note_stats TO authenticated;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'pufutara_notes'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'pufutara_notes';

-- Check policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies
WHERE tablename = 'pufutara_notes';

-- ============================================================
-- SAMPLE DATA (Optional - untuk testing)
-- ============================================================

-- Uncomment untuk insert sample data
-- Note: Ganti 'your-user-id-here' dengan user_id yang valid

/*
INSERT INTO public.pufutara_notes (user_id, title, content, color) VALUES
('your-user-id-here', 'Catatan Pertama', 'Ini adalah catatan pertama saya di Pufutara Keep!', 'yellow'),
('your-user-id-here', 'To-Do List', 'Belajar Supabase\nBikin aplikasi\nDeploy ke production', 'green'),
('your-user-id-here', 'Ide Proyek', 'Membuat aplikasi notes yang mirip Google Keep dengan fitur kolaborasi real-time', 'blue'),
('your-user-id-here', 'Shopping List', 'Beras\nTelur\nSayuran\nBuah-buahan', 'orange'),
('your-user-id-here', 'Reminder', 'Jangan lupa meeting jam 2 siang!', 'red');
*/

-- ============================================================
-- CLEANUP QUERIES (gunakan dengan hati-hati!)
-- ============================================================

-- Delete all notes (use with caution!)
-- DELETE FROM public.pufutara_notes;

-- Drop table completely (use with extreme caution!)
-- DROP TABLE IF EXISTS public.pufutara_notes CASCADE;

-- ============================================================
-- ANALYTICS QUERIES (Optional)
-- ============================================================

-- Count notes by color
SELECT 
    color, 
    COUNT(*) as count
FROM public.pufutara_notes
WHERE NOT deleted
GROUP BY color
ORDER BY count DESC;

-- Count notes by status
SELECT 
    CASE 
        WHEN deleted THEN 'Deleted'
        WHEN archived THEN 'Archived'
        ELSE 'Active'
    END as status,
    COUNT(*) as count
FROM public.pufutara_notes
GROUP BY status;

-- Recent notes (last 7 days)
SELECT 
    title,
    content,
    created_at,
    color
FROM public.pufutara_notes
WHERE created_at >= NOW() - INTERVAL '7 days'
    AND NOT deleted
ORDER BY created_at DESC;

-- ============================================================
-- MAINTENANCE QUERIES
-- ============================================================

-- Permanently delete notes in trash older than 30 days
-- Run this as a scheduled job or manually
/*
DELETE FROM public.pufutara_notes
WHERE deleted = true 
    AND updated_at < NOW() - INTERVAL '30 days';
*/

-- ============================================================
-- END OF SETUP
-- ============================================================
-- ✅ Database setup complete!
-- 📝 Table: pufutara_notes
-- 🔒 RLS Enabled with policies
-- 📊 Indexes created for performance
-- 🔄 Auto-update trigger active
-- ============================================================
