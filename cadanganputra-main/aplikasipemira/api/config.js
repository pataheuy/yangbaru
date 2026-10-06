/**
 * aplikasipemira/api/config.js — Vercel Serverless Function
 * Mengembalikan Supabase URL, anon key, dan admin password
 * dari environment variable ke client.
 * Nilai sensitif TIDAK pernah hardcoded di HTML / JS client.
 *
 * Env var yang dibutuhkan (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL     = https://xxxx.supabase.co
 *   SUPABASE_KEY     = eyJ...  (anon key)
 *   ADMIN_PASSWORD   = password admin (plaintext)
 */

export default function handler(req, res) {
  const url           = process.env.SUPABASE_URL;
  const key           = process.env.SUPABASE_KEY;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!url || !key || !adminPassword) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  // Cache 1 jam di browser — nilai tidak berubah-ubah
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json({ url, key, adminPassword });
}
