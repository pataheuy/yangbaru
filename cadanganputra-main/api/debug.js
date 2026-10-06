/**
 * api/debug.js — Vercel debug endpoint (HAPUS setelah masalah selesai)
 * Cek apakah env var sudah terbaca, tanpa expose nilainya.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    SUPABASE_URL:    !!process.env.SUPABASE_URL,
    SUPABASE_KEY:    !!process.env.SUPABASE_KEY,
    ADMIN_PASSWORD:  !!process.env.ADMIN_PASSWORD,
    NODE_ENV:        process.env.NODE_ENV || 'tidak di-set',
  });
}
