# Pufutara — Digital Projects

**Pufutara** adalah ruang portofolio dan kumpulan proyek digital yang dikembangkan oleh **Putra Azzam Elfathin**. Repositori ini menyimpan berbagai eksperimen, aplikasi web, alat produktivitas, proyek organisasi, hingga mini games yang dibuat sebagai bagian dari proses belajar dan berkarya.

🌐 **Website:** [pufuta.vercel.app](https://pufuta.vercel.app)

## Tentang Proyek

Pufutara menjadi tempat untuk mengembangkan dan mengumpulkan berbagai karya digital dalam satu ekosistem. Proyek-proyek di dalamnya memiliki tujuan dan teknologi yang berbeda, mulai dari halaman web sederhana hingga aplikasi yang terhubung dengan layanan backend.

Beberapa kategori proyek yang tersedia:

- **Portfolio & organisasi** — website portofolio, portal komunitas, dan kebutuhan organisasi.
- **Produktivitas** — catatan, daftar tugas, habit tracker, workspace, dan berbagai utilitas.
- **Kreativitas** — aplikasi menulis, menggambar, jurnal, serta pengelolaan konten.
- **Platform digital** — layanan chat, penyimpanan file, galeri, dan media.
- **Edukasi** — kuis interaktif, sistem voting, dan aplikasi pendukung pembelajaran.
- **Hiburan** — kumpulan mini games berbasis web.

## Teknologi

Teknologi yang digunakan dapat berbeda pada setiap proyek. Beberapa di antaranya:

- HTML5, CSS3, dan JavaScript
- Tailwind CSS
- Font Awesome dan Google Fonts
- Supabase untuk autentikasi, database, dan penyimpanan pada proyek tertentu
- Vercel Serverless Functions untuk beberapa endpoint backend
- Electron.js untuk aplikasi desktop tertentu
- Integrasi API pihak ketiga pada proyek yang membutuhkannya

## Struktur Repositori

Sebagian besar kode aplikasi berada di dalam folder `cadanganputra-main/`.

```text
yangbaru/
├── README.md
└── cadanganputra-main/
    ├── index.html          # Halaman utama portofolio
    ├── script.js           # Data proyek dan interaksi halaman utama
    ├── api/                # Endpoint serverless dan konfigurasi backend
    ├── foto/               # Aset gambar dan sampul proyek
    ├── archive/            # Halaman arsip proyek
    ├── game/               # Mini games
    ├── keep/               # Aplikasi catatan
    ├── shop/               # Toko online
    ├── quiz/               # Aplikasi kuis
    ├── vote/               # Aplikasi voting
    ├── launcher/           # Peluncur aplikasi Pufutara
    └── ...                 # Proyek web lainnya
```

> Struktur di atas merupakan gambaran folder utama. Setiap aplikasi dapat memiliki file, konfigurasi, dan kebutuhan backend masing-masing.

## Menjalankan Secara Lokal

Sebagian halaman merupakan aplikasi web statis. Untuk menjalankannya, clone repositori terlebih dahulu:

```bash
git clone https://github.com/pataheuy/yangbaru.git
cd yangbaru/cadanganputra-main
```

Jalankan server lokal dari folder tersebut. Jika Python tersedia:

```bash
python -m http.server 5500
```

Kemudian buka [http://localhost:5500](http://localhost:5500) di browser.

Kamu juga dapat menggunakan ekstensi Live Server di Visual Studio Code. Menjalankan halaman melalui server lokal lebih disarankan daripada membuka file HTML secara langsung karena beberapa fitur menggunakan path dan request jaringan.

## Konfigurasi Backend

Tidak semua proyek membutuhkan backend. Beberapa aplikasi menggunakan layanan eksternal seperti Supabase atau endpoint serverless.

Untuk menjalankan fitur yang memerlukan backend:

1. Periksa dokumentasi atau file konfigurasi di folder aplikasi terkait.
2. Siapkan project dan tabel database yang dibutuhkan pada layanan terkait.
3. Atur environment variables melalui dashboard hosting, misalnya Vercel.
4. Jangan menaruh password, private key, atau token rahasia di dalam kode frontend maupun repositori publik.

Contoh environment variable yang digunakan oleh endpoint utama:

| Variable | Keterangan |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_KEY` | Key Supabase yang digunakan oleh endpoint |

Nama dan konfigurasi tambahan dapat berbeda untuk setiap aplikasi. Periksa kode pada folder masing-masing sebelum melakukan deployment.

## Deployment

Website utama dapat di-deploy menggunakan layanan hosting statis atau platform yang mendukung Vercel Functions.

Untuk deployment melalui Vercel:

1. Import repositori ke Vercel.
2. Atur **Root Directory** ke `cadanganputra-main`.
3. Tambahkan environment variables yang diperlukan oleh aplikasi.
4. Jalankan deployment dan periksa halaman serta endpoint yang digunakan.

Pastikan konfigurasi backend sudah tersedia sebelum menguji fitur yang bergantung pada database atau API.

## Kontribusi

Pufutara merupakan kumpulan proyek yang terus dikembangkan. Jika ingin mengusulkan perbaikan:

1. Fork repositori ini.
2. Buat branch baru untuk perubahanmu.
3. Lakukan perubahan dan uji bagian yang terdampak.
4. Ajukan Pull Request dengan penjelasan yang jelas.

## Catatan

- Setiap aplikasi dapat memiliki tingkat penyelesaian dan kebutuhan teknis yang berbeda.
- Beberapa proyek merupakan eksperimen atau prototipe untuk pembelajaran.
- README khusus di dalam folder aplikasi dapat menjadi panduan yang lebih rinci untuk aplikasi tersebut.
- Lisensi penggunaan belum dicantumkan secara khusus di repositori ini. Hubungi pemilik repositori sebelum menggunakan ulang atau mendistribusikan bagian proyek.

## Kontak

**Putra Azzam Elfathin**

- Website: [pufuta.vercel.app](https://pufuta.vercel.app)
- GitHub: [@pataheuy](https://github.com/pataheuy)

---

<p align="center">
  Dibuat dan dikembangkan sebagai bagian dari perjalanan belajar, bereksperimen, dan membangun sesuatu.
</p>
