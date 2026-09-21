/**
 * api/config.js — Vercel Serverless Function
 * Return Supabase URL & anon key dari env var ke client.
 * Key tidak pernah hardcoded di HTML.
 *
 * Env var yang dibutuhkan (sama dengan api/sb.js):
 *   SUPABASE_URL  = https://xxxx.supabase.co
 *   SUPABASE_KEY  = eyJ...  (anon key)
 */

export default function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  // Cache 1 jam di browser — key tidak berubah-ubah
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json({ url, key });
}
