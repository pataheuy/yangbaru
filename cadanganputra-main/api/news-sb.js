/**
 * api/news-sb.js — Vercel Serverless Function
 *
 * Proxy ke Supabase untuk News Portal (tabel `articles` + Storage).
 * Dipanggil dari /news/index.html via fetch ke /api/news-sb
 *
 * Env var (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL   = https://xxxx.supabase.co
 *   SUPABASE_KEY   = eyJ...  (anon key)
 *   ADMIN_PASSWORD = password admin (shared dengan api/sb.js)
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
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // ── Env vars ──────────────────────────────────────────────────────────────
  const SB_URL     = process.env.SUPABASE_URL;
  const SB_KEY     = process.env.SUPABASE_KEY;
  const ADMIN_PASS = (process.env.ADMIN_PASSWORD || '').trim();

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  const { path, method = 'GET', body, prefer } = req.body || {};

  if (!path) return res.status(400).json({ error: 'path required' });

  // ── Verifikasi password admin ─────────────────────────────────────────────
  if (path === '/admin/verify-password') {
    const password = body && body.password;
    if (!password)    return res.status(400).json({ error: 'password required' });
    if (!ADMIN_PASS)  return res.status(500).json({ error: 'Admin password not configured' });

    return password === ADMIN_PASS
      ? res.status(200).json({ ok: true })
      : res.status(401).json({ error: 'Password salah' });
  }

  // ── Upload gambar ke Supabase Storage ─────────────────────────────────────
  if (path === '/news/upload-image') {
    if (!body || !body.name || !body.contentType || !body.data) {
      return res.status(400).json({ error: 'name, contentType, dan data wajib diisi' });
    }

    const { name, contentType, data: base64 } = body;
    const safeName   = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `article-images/${safeName}`;

    try {
      const binary   = Buffer.from(base64, 'base64');
      const upstream = await fetch(`${SB_URL}/storage/v1/object/${objectPath}`, {
        method : 'POST',
        headers: {
          'apikey'       : SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type' : contentType,
          'x-upsert'     : 'true',
        },
        body: binary,
      });

      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'Upload ke storage gagal' });
      }

      return res.status(200).json({
        url: `${SB_URL}/storage/v1/object/public/${objectPath}`
      });
    } catch (err) {
      return res.status(502).json({ error: 'Upstream storage error' });
    }
  }

  // ── Whitelist path Supabase yang diizinkan ────────────────────────────────
  if (!/^\/rest\/v1\/(articles|comments)/.test(path)) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  // Hanya method yang diizinkan
  const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];
  if (!ALLOWED_METHODS.includes(method.toUpperCase())) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Forward ke Supabase REST ──────────────────────────────────────────────
  const headers = {
    'apikey'        : SB_KEY,
    'Authorization' : `Bearer ${SB_KEY}`,
    'Content-Type'  : 'application/json',
  };
  if (prefer) headers['Prefer'] = prefer;

  try {
    const upstream = await fetch(`${SB_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const ct   = upstream.headers.get('content-type') || '';
    const text = await upstream.text();
    const data = ct.includes('application/json') && text ? JSON.parse(text) : (text || null);

    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('x-content-range', cr);

    // 204 No Content (DELETE) — kembalikan ok:true supaya frontend tidak throw
    if (upstream.status === 204) {
      return res.status(200).json({ ok: true });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error' });
  }
}
