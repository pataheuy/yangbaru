# 📝 Pufutara Keep - Smart Notes Application

Aplikasi catatan pintar mirip Google Keep dengan backend Supabase. Dibuat dengan style design Pufutara yang modern dan minimalis.

## ✨ Fitur

### 🎯 Fitur Utama
- ✅ **Login/Register** - Autentikasi dengan Supabase Auth
- ✅ **Create Notes** - Buat catatan dengan judul dan isi
- ✅ **Color Picker** - 11 pilihan warna seperti Google Keep
- ✅ **Edit Notes** - Edit catatan yang sudah ada
- ✅ **Delete Notes** - Hapus dengan soft delete (pindah ke sampah)
- ✅ **Archive** - Arsipkan catatan yang sudah selesai
- ✅ **Search** - Cari catatan berdasarkan judul atau isi
- ✅ **Responsive** - Tampilan optimal di desktop dan mobile

### 🎨 Design Features
- Modern minimalist design dengan Pufutara style
- Smooth animations (fade, slide, scale)
- Material Icons dari Google
- Color palette mirip Google Keep
- Responsive grid layout
- Toast notifications

### 🔐 Security Features
- Row Level Security (RLS) enabled
- Per-user data isolation
- Secure authentication dengan Supabase
- Password hashing otomatis

## 🚀 Setup

### 1. Setup Supabase

1. **Buat Project Baru** di [Supabase](https://supabase.com)
2. **Jalankan SQL Setup**:
   - Buka SQL Editor di dashboard Supabase
   - Copy seluruh isi file `supabase-setup.sql`
   - Paste dan jalankan di SQL Editor
3. **Dapatkan Credentials**:
   - Buka Settings → API
   - Copy `Project URL` dan `anon public key`
4. **Update Credentials** di `script.js`:
   ```javascript
   const SUPABASE_URL = 'your-project-url';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

### 2. Jalankan Aplikasi

1. Buka `index.html` di browser
2. Atau deploy ke hosting (Vercel, Netlify, dll)

### 3. Cara Pakai

1. **Register/Login**:
   - Masukkan email dan password
   - Jika akun belum ada, otomatis dibuat
   
2. **Buat Catatan**:
   - Isi judul (opsional) dan konten
   - Pilih warna catatan
   - Klik "Simpan"

3. **Edit Catatan**:
   - Klik pada catatan yang ingin diedit
   - Modal edit akan terbuka
   - Update dan simpan perubahan

4. **Arsipkan**:
   - Hover pada catatan
   - Klik icon archive
   - Lihat di menu "Arsip"

5. **Hapus**:
   - Hover pada catatan
   - Klik icon delete
   - Catatan pindah ke "Sampah"
   - Bisa dipulihkan atau dihapus permanen

6. **Search**:
   - Gunakan search bar di header
   - Atau tekan `Ctrl/Cmd + K`

## 📂 Struktur File

```
keep/
├── index.html           # Main HTML file
├── script.js            # JavaScript logic + Supabase integration
├── supabase-setup.sql   # Database setup SQL
└── README.md            # Documentation (file ini)
```

## 🗄️ Database Schema

### Table: `pufutara_notes`

| Column      | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| id          | UUID      | Primary key                          |
| user_id     | UUID      | Foreign key ke auth.users            |
| title       | TEXT      | Judul catatan (nullable)             |
| content     | TEXT      | Isi catatan                          |
| color       | VARCHAR   | Warna catatan (white, red, dll)      |
| archived    | BOOLEAN   | Status arsip                         |
| deleted     | BOOLEAN   | Status soft delete                   |
| created_at  | TIMESTAMP | Waktu dibuat                         |
| updated_at  | TIMESTAMP | Waktu update terakhir (auto-update)  |

### Indexes

- `idx_notes_user_id` - Query by user
- `idx_notes_archived` - Filter archived notes
- `idx_notes_deleted` - Filter deleted notes
- `idx_notes_created_at` - Sorting by date
- `idx_notes_user_status` - Composite index untuk performa

### RLS Policies

- Users dapat melihat catatan mereka sendiri
- Users dapat membuat catatan untuk diri sendiri
- Users dapat update catatan mereka sendiri
- Users dapat delete catatan mereka sendiri

## 🎨 Warna Available

1. **White** - Default
2. **Red** - #f28b82
3. **Orange** - #fbbc04
4. **Yellow** - #fff475
5. **Green** - #ccff90
6. **Teal** - #a7ffeb
7. **Blue** - #cbf0f8
8. **Purple** - #d7aefb
9. **Pink** - #fdcfe8
10. **Brown** - #e6c9a8
11. **Gray** - #e8eaed

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search bar
- `Escape` - Close modal
- `Enter` - Submit login form

## 🔧 Customization

### Ubah Warna
Edit CSS variables di `:root`:
```css
:root {
    --primary: #000000;
    --surface: #ffffff;
    --note-red: #f28b82;
    /* dst... */
}
```

### Ubah Animasi
Edit keyframes dan transitions di CSS.

### Tambah Fitur
Lihat function-function di `script.js` untuk extend functionality.

## 🐛 Troubleshooting

### Error: "Supabase connection failed"
- Pastikan credentials benar
- Check internet connection
- Verify Supabase project aktif

### Error: "Login gagal"
- Check email format
- Password minimal 6 karakter
- Verify Supabase Auth enabled

### Catatan tidak muncul
- Check browser console untuk error
- Verify RLS policies sudah dijalankan
- Check user_id di database

### SQL Error saat setup
- Jalankan query satu per satu
- Check table sudah tidak ada sebelumnya
- Verify syntax untuk PostgreSQL

## 📱 Mobile Support

Aplikasi fully responsive untuk mobile:
- Sidebar collapsible
- Touch-friendly buttons
- Swipe gestures (native)
- Mobile-optimized layout

## 🚀 Deployment

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
1. Drag & drop folder keep ke Netlify
2. Atau connect ke Git repository

### GitHub Pages
1. Push ke GitHub
2. Enable Pages di Settings
3. Deploy from branch

## 📊 Analytics (Optional)

Jalankan query di SQL Editor untuk melihat statistik:

```sql
-- Total notes per user
SELECT * FROM note_stats;

-- Notes by color
SELECT color, COUNT(*) FROM pufutara_notes 
WHERE NOT deleted GROUP BY color;
```

## 🔒 Security Notes

- Password di-hash otomatis oleh Supabase
- RLS mencegah akses antar user
- HTTPS required untuk production
- Never commit credentials ke Git

## 📝 License

Free to use untuk project pribadi dan komersial.

## 👨‍💻 Credits

Created by Putra Azzam Elfathin
- Portfolio: https://pufuta.vercel.app
- Style inspired by Google Keep
- Built with ❤️ and Supabase

## 🆘 Support

Jika ada masalah atau pertanyaan:
1. Check troubleshooting section
2. Lihat Supabase documentation
3. Contact: putra@pufutara.com

---

**Happy noting! 📝✨**
