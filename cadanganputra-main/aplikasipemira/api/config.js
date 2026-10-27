/**
 * aplikasipemira/api/config.js — Vercel Serverless Function
 *
 * Salinan dari api/config.js di root, untuk mendukung akses dari domain
 * yang langsung mengarah ke folder aplikasipemira/ sebagai root.
 *
 * Env var yang dibutuhkan (sama dengan root project):
 *   SUPABASE_URL  = https://xxxx.supabase.co
 *   SUPABASE_KEY  = eyJ...  (anon key)
 */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');

  return res.status(200).json({ url, key });
}
