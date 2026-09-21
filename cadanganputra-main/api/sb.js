/**
 * api/sb.js — Vercel Serverless Function
 *
 * Bertindak sebagai proxy ke Supabase.
 * Key disimpan di Vercel Environment Variables, tidak pernah dikirim ke browser.
 *
 * Cara set env var:
 *   Vercel Dashboard → Project → Settings → Environment Variables
 *   Tambahkan:
 *     SUPABASE_URL  = https://xxxx.supabase.co
 *     SUPABASE_KEY  = eyJ...  (anon key atau service_role key)
 */

export default async function handler(req, res) {
  // Hanya izinkan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ambil key dari env var Vercel (tidak pernah ke client)
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  const { path, method = 'GET', body, token, prefer } = req.body || {};

  if (!path) {
    return res.status(400).json({ error: 'path required' });
  }

  // Hanya izinkan path ke tabel passwords (keamanan tambahan)
  if (!path.startsWith('/rest/v1/passwords') && !path.startsWith('/auth/v1/')) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  const headers = {
    'apikey': SB_KEY,
    // Kalau ada user token (JWT setelah login), pakai itu — RLS tetap aktif
    // Kalau tidak ada, pakai anon key
    'Authorization': `Bearer ${token || SB_KEY}`,
    'Content-Type': 'application/json',
  };

  if (prefer) headers['Prefer'] = prefer;

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

    // Teruskan header content-range untuk pagination
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('x-content-range', contentRange);

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error: ' + err.message });
  }
}
