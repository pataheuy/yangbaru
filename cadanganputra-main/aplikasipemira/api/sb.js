/**
 * aplikasipemira/api/sb.js — Vercel Serverless Function
 * Proxy aman ke Supabase untuk aplikasi PEMIRA.
 * Key & konfigurasi sensitif tidak pernah sampai ke browser.
 *
 * Env var yang dibutuhkan (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL        = https://xxxx.supabase.co
 *   SUPABASE_KEY        = eyJ...  (anon/service key)
 *   ADMIN_PASSWORD_HASH = (bcrypt hash dari password admin)
 *
 * Endpoint yang dilayani:
 *   POST /api/sb  dengan body { path, method, body, token, prefer }
 *
 * Path yang diizinkan:
 *   /rest/v1/candidates
 *   /rest/v1/students
 *   /rest/v1/audit_logs
 */

export default async function handler(req, res) {
  // CORS — izinkan request dari semua origin (sesuaikan jika perlu)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  const { path, method = 'GET', body, token, prefer } = req.body || {};

  if (!path) {
    return res.status(400).json({ error: 'path required' });
  }

  // Hanya izinkan akses ke tabel PEMIRA yang diketahui
  const allowedPaths = ['/rest/v1/candidates', '/rest/v1/students', '/rest/v1/audit_logs'];
  const isAllowed = allowedPaths.some(p => path.startsWith(p));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  const headers = {
    'apikey': SB_KEY,
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

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('x-content-range', contentRange);

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error' });
  }
}
