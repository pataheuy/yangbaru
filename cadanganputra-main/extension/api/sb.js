/**
 * extension/api/sb.js — Vercel Serverless Function
 * Di-deploy via project pspf.vercel.app (Root Directory: extension)
 *
 * Env var di Vercel project pspf:
 *   SUPABASE_URL   = https://xxxx.supabase.co
 *   SUPABASE_KEY   = eyJ...
 *   ALLOWED_EMAIL  = emailkamu@gmail.com
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SB_URL        = process.env.SUPABASE_URL;
  const SB_KEY        = process.env.SUPABASE_KEY;
  const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL || '').toLowerCase().trim();

  if (!SB_URL || !SB_KEY || !ALLOWED_EMAIL) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  const { path, method = 'GET', body, token, prefer } = req.body || {};

  if (!path) return res.status(400).json({ error: 'path required' });

  // ── Login: client kirim password saja, email di-inject dari env var ────
  if (path === '/auth/v1/login') {
    const password = body && body.password;
    if (!password) return res.status(400).json({ error: 'password required' });

    const upstream = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ALLOWED_EMAIL, password })
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Login gagal' });

    const returnedEmail = ((data.user && data.user.email) || '').toLowerCase();
    if (returnedEmail !== ALLOWED_EMAIL) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    return res.status(200).json({ access_token: data.access_token, email: data.user.email });
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  if (path === '/auth/v1/logout') {
    if (token) {
      await fetch(`${SB_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    return res.status(200).json({ ok: true });
  }

  // ── Akses data: hanya tabel passwords, wajib ada token ─────────────────
  if (!path.startsWith('/rest/v1/passwords')) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${token}`,
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
  } catch {
    return res.status(502).json({ error: 'Upstream error' });
  }
}
