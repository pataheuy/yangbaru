# 🔧 Pufutara Keep - Troubleshooting Guide

## ❌ Tidak Bisa Login

### Problem: "Invalid login credentials" atau tidak ada respon

**Solusi 1: Nonaktifkan Email Confirmation (RECOMMENDED)**

1. Buka Supabase Dashboard
2. Pergi ke **Authentication** → **Providers** → **Email**
3. Scroll ke bawah ke **Email Settings**
4. **NONAKTIFKAN** "Confirm email"
5. Klik **Save**

**Solusi 2: Gunakan Email Testing**

Jika tidak bisa nonaktifkan email confirmation:
1. Gunakan email yang valid (bisa dibuka)
2. Setelah register, cek inbox email
3. Klik link konfirmasi
4. Kembali ke aplikasi dan login

**Solusi 3: Setup SMTP (Advanced)**

Untuk production, setup SMTP email:
1. Di Supabase: **Authentication** → **Email Settings**
2. Enable Custom SMTP
3. Masukkan SMTP credentials (Gmail, SendGrid, dll)

### Problem: Password terlalu pendek

**Error:** "Password should be at least 6 characters"

**Solusi:**
- Password minimal **6 karakter**
- Gunakan kombinasi huruf dan angka
- Contoh: `test123` atau `mypass123`

### Problem: Supabase connection failed

**Cek:**
1. Internet connection
2. Supabase project masih aktif
3. Credentials benar di `script.js`:
   ```javascript
   const SUPABASE_URL = 'your-url-here';
   const SUPABASE_ANON_KEY = 'your-key-here';
   ```

**Cara dapatkan credentials:**
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Klik **Settings** → **API**
4. Copy:
   - **Project URL** → SUPABASE_URL
   - **anon public** key → SUPABASE_ANON_KEY

## 🗄️ Database Issues

### Problem: Table tidak ditemukan

**Solusi:**
1. Buka Supabase **SQL Editor**
2. Copy seluruh isi `supabase-setup.sql`
3. Paste dan **Run**
4. Refresh browser

### Problem: RLS blocking queries

**Error:** "new row violates row-level security policy"

**Solusi:**
1. Pastikan RLS policies sudah dijalankan
2. Jalankan query ini di SQL Editor:
   ```sql
   -- Check policies
   SELECT * FROM pg_policies WHERE tablename = 'pufutara_notes';
   ```
3. Jika kosong, run ulang `supabase-setup.sql`

### Problem: Permission denied

**Solusi:**
```sql
-- Grant permissions
GRANT ALL ON public.pufutara_notes TO authenticated;
GRANT ALL ON public.pufutara_notes TO anon;
```

## 🔍 Debug Mode

### Enable Console Logging

Buka browser console (F12) dan lihat log:
- ✅ = Success
- ❌ = Error
- 🔐 = Auth attempt
- 📝 = Signup attempt

### Common Console Errors

**Error:** `supabase is not defined`
- **Fix:** CDN script belum load. Refresh browser.

**Error:** `Cannot read property 'auth' of undefined`
- **Fix:** Check Supabase credentials

**Error:** `Failed to fetch`
- **Fix:** Check internet atau Supabase down

## 🧪 Testing

### Test dengan Dummy Account

```
Email: test@pufutara.com
Password: test123
```

Jika ini tidak work, ada masalah dengan Supabase setup.

### Manual Test Queries

Di Supabase SQL Editor:

```sql
-- Check if table exists
SELECT * FROM public.pufutara_notes LIMIT 1;

-- Check auth users
SELECT email FROM auth.users LIMIT 5;

-- Insert test note (ganti user_id)
INSERT INTO public.pufutara_notes (user_id, title, content)
VALUES ('your-user-id', 'Test', 'Test content');
```

## 🚀 Quick Fixes

### Clear Cache
1. Buka browser DevTools (F12)
2. Right click Refresh button
3. "Empty Cache and Hard Reload"

### Reset Local Storage
Di browser console:
```javascript
localStorage.clear();
location.reload();
```

### Restart Supabase Project
1. Supabase Dashboard
2. Settings → General
3. Pause project
4. Resume project

## 📞 Still Not Working?

### Checklist Lengkap:

- [ ] SQL sudah dijalankan di Supabase
- [ ] Email confirmation dinonaktifkan
- [ ] Credentials benar di script.js
- [ ] Browser console tidak ada error merah
- [ ] Internet connection stabil
- [ ] Password minimal 6 karakter
- [ ] Email format valid

### Cara Report Bug:

Ambil screenshot dari:
1. Browser console (F12) - tab Console
2. Network tab - filter "supabase"
3. Error message yang muncul

## 🔐 Security Checklist

**Production Setup:**
- [ ] HTTPS enabled
- [ ] Email confirmation re-enabled
- [ ] Rate limiting configured
- [ ] RLS policies verified
- [ ] Credentials tidak di commit ke Git

---

**Need more help?** Contact: putra@pufutara.com
