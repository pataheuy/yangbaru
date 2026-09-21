// Config dimuat dari server — key tidak ada di file ini
// Kedua variabel ini diisi oleh initSupabaseConfig() sebelum app berjalan
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

async function initSupabaseConfig() {
    try {
        const cfg = await fetch('/api/config').then(r => r.json());
        SUPABASE_URL     = cfg.url;
        SUPABASE_ANON_KEY = cfg.key;
    } catch (e) {
        console.error('Gagal memuat config:', e);
    }
}
