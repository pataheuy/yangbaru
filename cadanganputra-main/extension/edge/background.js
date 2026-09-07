// Background Service Worker

const SB_URL   = 'https://puywjdopumlzvmzbcudr.supabase.co';
const SB_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
const SB_TABLE = 'passwords';

// ── Supabase insert ───────────────────────────────────────────────────────────
async function sbInsert(entry) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
      method:  'POST',
      headers: {
        'apikey':        SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify(entry)
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('[BG] Supabase insert gagal:', res.status, text);
    } else {
      console.log('[BG] Supabase insert OK:', text);
    }
  } catch (e) {
    console.error('[BG] Supabase fetch error:', e.message);
  }
}

// ── Terima pesan dari content script ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Simpan username sementara untuk multi-step login (misal Google)
  if (message.type === 'SAVE_USERNAME') {
    const key = 'pending_username_' + message.site;
    chrome.storage.session.set({ [key]: message.username });
    return;
  }

  if (message.type !== 'SAVE_PASSWORD') return;

  const entry = message.payload;
  if (!entry || !entry.password) return;

  // Jika username tidak diketahui, coba ambil dari storage session (multi-step)
  const sessionKey = 'pending_username_' + entry.site;

  chrome.storage.session.get([sessionKey], (sessionResult) => {
    if (entry.username === 'Tidak diketahui' && sessionResult[sessionKey]) {
      entry.username = sessionResult[sessionKey];
    }

    // Bersihkan session setelah dipakai
    chrome.storage.session.remove(sessionKey);

    chrome.storage.local.get(['myPasswords'], async (result) => {
      const existing = result.myPasswords || [];

      // Cek duplikat
      const isDuplicate = existing.some(item =>
        item.site     === entry.site &&
        item.username === entry.username &&
        item.password === entry.password
      );

      if (isDuplicate) {
        console.log('[BG] Duplikat dilewati:', entry.site);
        return;
      }

      const updated = [entry, ...existing];
      chrome.storage.local.set({ myPasswords: updated });

      await sbInsert(entry);
      console.log('[BG] Tersimpan:', entry.site, entry.username);
    });
  });
});
