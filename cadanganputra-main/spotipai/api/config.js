/**
 * spotipai/api/config.js — Vercel Serverless Function
 *
 * Mengembalikan konfigurasi publik ke client (Supabase anon key + Cloudinary preset).
 * Kredensial tidak pernah hardcoded di HTML/JS.
 *
 * Env var yang dibutuhkan (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL                  = https://xxxx.supabase.co  (sama dengan project utama)
 *   SUPABASE_KEY                  = eyJ...  (anon key, sama dengan project utama)
 *   SPOTIPAI_CLOUDINARY_CLOUD     = nama_cloud_kamu
 *   SPOTIPAI_CLOUDINARY_PRESET    = nama_upload_preset_kamu
 */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url    = process.env.SUPABASE_URL;
  const key    = process.env.SUPABASE_KEY;
  const cloud  = process.env.SPOTIPAI_CLOUDINARY_CLOUD;
  const preset = process.env.SPOTIPAI_CLOUDINARY_PRESET;

  if (!url || !key || !cloud || !preset) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  // Cache 1 jam — nilai ini jarang berubah
  res.setHeader('Cache-Control', 'public, max-age=3600');

  return res.status(200).json({ url, key, cloud, preset });
}
