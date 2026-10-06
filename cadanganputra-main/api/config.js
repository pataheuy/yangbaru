/**
 * api/config.js — Vercel Serverless Function
 * Return Supabase URL, anon key, dan admin password dari env var ke client.
 * Key tidak pernah hardcoded di HTML.
 *
 * Env var yang dibutuhkan (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL     = https://xxxx.supabase.co
 *   SUPABASE_KEY     = eyJ...  (anon key)
 *   ADMIN_PASSWORD   = password admin (plaintext)
 */

export default function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url           = process.env.SUPABASE_URL;
  const key           = process.env.SUPABASE_KEY;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Log untuk debug di Vercel Function Logs
  console.log('ENV CHECK — url:', !!url, '| key:', !!key, '| adminPassword:', !!adminPassword);

  if (!url || !key) {
    return res.status(500).json({ error: 'Server configuration missing', detail: 'SUPABASE_URL atau SUPABASE_KEY belum di-set di Vercel' });
  }

  // Cache 1 jam di browser — key tidak berubah-ubah
  res.setHeader('Cache-Control', 'public, max-age=3600');

  return res.status(200).json({
    url,
    key,
    // adminPassword bersifat opsional — jika tidak di-set, client pakai fallback
    ...(adminPassword ? { adminPassword } : {})
  });
}
