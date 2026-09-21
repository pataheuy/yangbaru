# Panduan Keamanan — extension/index.html

## Kenapa anon key tetap terlihat di HTML?

Supabase **anon key dirancang public** — semua client-side app menyimpannya di JS.
Yang melindungi data bukan menyembunyikan key-nya, tapi **Row Level Security (RLS)**.

Dengan RLS aktif: walau seseorang tahu anon key-mu, mereka tetap **tidak bisa baca
data siapapun** tanpa JWT login yang valid.

---

## Lapisan keamanan yang sudah diterapkan

| Lapisan | Status | Keterangan |
|---|---|---|
| Hardcoded password dihapus | ✅ | Diganti `signInWithPassword` Supabase |
| User JWT di setiap request | ✅ | `Authorization: Bearer <user_token>` |
| Row Level Security (RLS) | ⚠️ Perlu setup | Lihat `sql-setup.sql` |
| Sesi persistent + auto-refresh | ✅ | Token tidak expire tiba-tiba |

---

## Cara menyembunyikan key via Vercel (level tertinggi)

Jika ingin key **tidak pernah sampai ke browser sama sekali**, gunakan
Vercel Edge Function sebagai proxy. Struktur foldernya:

```
cadanganputra-main/
├── api/
│   └── sb.js          ← Edge Function (key ada di sini, di server)
├── extension/
│   └── index.html     ← request ke /api/sb, bukan langsung ke Supabase
└── vercel.json
```

### 1. Buat `api/sb.js`

```js
// api/sb.js — Vercel Serverless Function
// Key disimpan di Vercel env var, tidak pernah ke browser
export default async function handler(req, res) {
  // Hanya izinkan dari origin sendiri
  const origin = req.headers.origin || '';
  if (!origin.includes('vercel.app') && !origin.includes('yourdomain.com')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key, bukan anon!

  const { path, method = 'GET', body, token } = req.body || {};
  if (!path) return res.status(400).json({ error: 'path required' });

  const sbRes = await fetch(`${SB_URL}${path}`, {
    method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${token || SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': req.headers['prefer'] || ''
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await sbRes.json();
  res.status(sbRes.status).json(data);
}
```

### 2. Simpan key di Vercel Dashboard

Buka: **Vercel → Project → Settings → Environment Variables**

```
SUPABASE_URL          = https://puywjdopumlzvmzbcudr.supabase.co
SUPABASE_SERVICE_KEY  = eyJ...   ← service_role key (bukan anon!)
```

> ⚠️ Jangan commit `.env` ke git. Vercel membaca env var dari dashboard-nya sendiri.

### 3. `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin",  "value": "https://namadomain.vercel.app" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization" }
      ]
    }
  ]
}
```

### 4. Update `index.html` untuk pakai proxy

Ganti semua `fetch(SB_URL + ...)` menjadi:

```js
// Sebelum (langsung ke Supabase):
fetch(`${SB_URL}/rest/v1/passwords?...`, { headers: { apikey: SB_KEY, ... } })

// Sesudah (lewat proxy Vercel):
fetch('/api/sb', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: '/rest/v1/passwords?select=*&order=timestamp.desc',
    method: 'GET',
    token: userToken    // JWT user, dikirim ke proxy, proxy forward ke Supabase
  })
})
```

---

## Apakah wajib pakai Vercel?

**Tidak wajib.** Selama RLS aktif, anon key yang bocor tidak berbahaya karena:
- Orang lain tidak punya email/password akun Supabase-mu
- Tanpa JWT valid, semua query dikembalikan 0 baris (bukan error, tapi kosong)
- Supabase bisa dibatasi allowed origins di **API Settings → Allowed origins**

Gunakan pendekatan Vercel hanya jika:
- Kamu mau menggunakan `service_role` key (yang BISA bypass RLS)
- Aplikasi di-host public dan kamu ingin lapisan keamanan ekstra

---

## Tambahan: batasi origin di Supabase

Buka: **Supabase Dashboard → Project Settings → API → Allowed origins**

Tambahkan:
```
https://namadomain.vercel.app
http://localhost:5500
```

Dengan ini, request dari domain lain akan ditolak walau punya anon key yang benar.
