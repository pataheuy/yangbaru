/**
 * api/config.js — Vercel Serverless Function
 * Return Supabase URL dan anon key dari env var ke client.
 * Key tidak pernah hardcoded di HTML.
 *
 * CATATAN KEAMANAN:
 *   - adminPassword TIDAK pernah dikirim ke client dari sini.
 *     Verifikasi password admin dilakukan di server via api/sb.js.
 *
 * Env var yang dibutuhkan (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL  = https://xxxx.supabase.co
 *   SUPABASE_KEY  = eyJ...  (anon key)
 */

export default function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  // Cache 1 jam di browser — key tidak berubah-ubah
  res.setHeader('Cache-Control', 'public, max-age=3600');

  return res.status(200).json({ url, key });
}
