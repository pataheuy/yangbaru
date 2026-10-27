/**
 * news/api/sb.js — Vercel Serverless Function
 *
 * Proxy ke Supabase untuk tabel `articles` (News Portal).
 * Key & kredensial tidak pernah terekspos ke browser.
 *
 * Env var yang dibutuhkan (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL     = https://xxxx.supabase.co
 *   SUPABASE_KEY     = eyJ...  (anon key)
 *   ADMIN_PASSWORD   = password admin (shared dengan api/sb.js root)
 *
 * Allowed origins — tambahkan domain kamu di sini.
 */

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowed = ['https://putraazzamelfathin.vercel.app', 'https://pspf.vercel.app'];
  const origin  = req.headers.origin || '';
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Env vars ──────────────────────────────────────────────────────────────
  const SB_URL        = process.env.SUPABASE_URL;
  const SB_KEY        = process.env.SUPABASE_KEY;
  const ADMIN_PASS    = (process.env.ADMIN_PASSWORD || '').trim();

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  const { path, method = 'GET', body, token, prefer } = req.body || {};

  if (!path) return res.status(400).json({ error: 'path required' });

  // ── Verifikasi password admin ─────────────────────────────────────────────
  // Menggunakan env var ADMIN_PASSWORD yang sama dengan api/sb.js root
  if (path === '/admin/verify-password') {
    const password = body && body.password;
    if (!password) return res.status(400).json({ error: 'password required' });
    if (!ADMIN_PASS) return res.status(500).json({ error: 'Admin password not configured' });

    return password === ADMIN_PASS
      ? res.status(200).json({ ok: true })
      : res.status(401).json({ error: 'Password salah' });
  }

  // ── Upload gambar langsung ke Supabase Storage ────────────────────────────
  // Client kirim: { path: '/news/upload-image', body: { name, contentType, data (base64) } }
  if (path === '/news/upload-image') {
    if (!body || !body.name || !body.contentType || !body.data) {
      return res.status(400).json({ error: 'name, contentType, dan data wajib diisi' });
    }

    const { name, contentType, data: base64 } = body;

    // Tolak nama file yang mencurigakan
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `article-images/${safeName}`;

    try {
      const binary = Buffer.from(base64, 'base64');

      const upstream = await fetch(`${SB_URL}/storage/v1/object/${objectPath}`, {
        method: 'POST',
        headers: {
          'apikey'        : SB_KEY,
          'Authorization' : `Bearer ${SB_KEY}`,
          'Content-Type'  : contentType,
          'x-upsert'      : 'true',
        },
        body: binary,
      });

      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'Upload ke storage gagal' });
      }

      const publicUrl = `${SB_URL}/storage/v1/object/public/${objectPath}`;
      return res.status(200).json({ url: publicUrl });
    } catch (err) {
      return res.status(502).json({ error: 'Upstream storage error' });
    }
  }

  // ── Whitelist path yang diizinkan ─────────────────────────────────────────
  const ALLOWED_PATHS = [
    /^\/rest\/v1\/articles/,   // CRUD artikel
  ];

  const isAllowed = ALLOWED_PATHS.some(pattern => pattern.test(path));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  // ── Build headers upstream ────────────────────────────────────────────────
  const headers = {
    'apikey'        : SB_KEY,
    'Authorization' : `Bearer ${SB_KEY}`,
    'Content-Type'  : 'application/json',
  };
  if (prefer) headers['Prefer'] = prefer;

  // ── Forward ke Supabase ───────────────────────────────────────────────────
  try {
    const upstream = await fetch(`${SB_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = upstream.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await upstream.json()
      : await upstream.text();

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('x-content-range', contentRange);

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error' });
  }
}
