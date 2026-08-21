# 🚀 Pufutara Keep - Setup Guide

## Langkah-langkah Setup (5 menit)

### 1️⃣ Setup Supabase Database

#### A. Jalankan SQL

1. Login ke [Supabase Dashboard](https://supabase.com)
2. Buka project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New query**
5. Copy **SELURUH** isi file `supabase-setup.sql`
6. Paste di SQL Editor
7. Klik **Run** atau tekan `Ctrl + Enter`
8. Tunggu sampai muncul "Success. No rows returned"

#### B. Verify Database

Cek apakah table berhasil dibuat:
```sql
SELECT * FROM public.pufutara_notes;
```

Harusnya muncul table kosong tanpa error.

### 2️⃣ Nonaktifkan Email Confirmation

**PENTING! Tanpa ini, login tidak akan work!**

1. Di Supabase Dashboard, klik **Authentication**
2. Klik **Providers**
3. Klik **Email** provider
4. Scroll ke bawah ke section **Email Settings**
5. **MATIKAN** toggle "Confirm email"
   ```
   [x] Enable email confirmations → [ ] Enable email confirmations
   ```
6. Klik **Save** di pojok kanan bawah

### 3️⃣ Dapatkan API Credentials

1. Di Supabase Dashboard, klik **Settings** (gear icon)
2. Klik **API**
3. Lihat section **Project API keys**
4. Copy dua nilai ini:
   - **Project URL** (contoh: `https://xyz.supabase.co`)
   - **anon public** key (string panjang yang dimulai dengan `eyJ...`)

### 4️⃣ Update Script.js

1. Buka file `script.js`
2. Di baris 7-8, ganti dengan credentials Anda:
   ```javascript
   const SUPABASE_URL = 'PASTE_PROJECT_URL_DISINI';
   const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_DISINI';
   ```
3. Save file

### 5️⃣ Test Aplikasi

1. Buka `index.html` di browser
2. Masukkan email dan password (bebas, minimal 6 karakter)
   - Contoh: 
     - Email: `test@example.com`
     - Password: `test123`
3. Klik **Sign In**
4. Jika berhasil, akan masuk ke halaman utama

---

## ✅ Verification Checklist

Pastikan semua ini sudah dilakukan:

- [ ] SQL sudah dijalankan tanpa error
- [ ] Table `pufutara_notes` sudah ada
- [ ] Email confirmation sudah **DINONAKTIFKAN**
- [ ] Credentials di `script.js` sudah diganti
- [ ] Browser console tidak ada error merah

---

## 🎯 Quick Start Commands

### Untuk Developer

```bash
# Clone atau copy folder keep
cd keep

# Buka di browser
start index.html
# atau double click index.html
```

### Untuk Deploy

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:**
Drag & drop folder `keep` ke Netlify

---

## 📸 Screenshot Guide

### Step 1: SQL Editor
![SQL Editor](https://via.placeholder.com/800x400/f0f0f0/000?text=1.+Paste+SQL+di+Editor)

### Step 2: Disable Email Confirmation
![Disable Confirmation](https://via.placeholder.com/800x400/f0f0f0/000?text=2.+Matikan+Email+Confirmation)

### Step 3: Get API Keys
![API Keys](https://via.placeholder.com/800x400/f0f0f0/000?text=3.+Copy+URL+dan+anon+key)

---

## 🔧 Common Issues

### Issue: "Invalid login credentials"
**Cause:** Email confirmation masih aktif
**Fix:** Ulangi Step 2

### Issue: "Table does not exist"
**Cause:** SQL belum dijalankan
**Fix:** Ulangi Step 1

### Issue: "Supabase connection failed"
**Cause:** Credentials salah
**Fix:** Periksa Step 3 dan 4

---

## 🎓 Tutorial Video

Coming soon! Subscribe for updates.

---

## 💡 Tips

1. **Development:**
   - Gunakan email dummy: `dev@test.com`
   - Password simple: `dev123`

2. **Production:**
   - Aktifkan kembali email confirmation
   - Gunakan HTTPS
   - Setup SMTP email

3. **Testing:**
   - Buka browser console untuk debug
   - Check Network tab untuk API calls

---

## 📞 Support

Stuck? Buka file `TROUBLESHOOTING.md` untuk solusi lengkap.

**Contact:** putra@pufutara.com

---

**Setup selesai! Happy noting! 📝✨**
