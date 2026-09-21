// Background Service Worker

const SB_URL   = 'https://puywjdopumlzvmzbcudr.supabase.co';
const SB_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
const SB_TABLE = 'passwords';

// ── Upsert ke Supabase ────────────────────────────────────────────────────────
// Kalau sudah ada baris dengan site + username yang sama → UPDATE (patch).
// Kalau belum ada → INSERT baru.
// Kolom id & timestamp TIDAK diganti saat update, supaya history tetap.
async function sbUpsert(entry) {
  try {
    // 1. Cek apakah sudah ada baris dengan site + username ini
    const checkRes = await fetch(
      `${SB_URL}/rest/v1/${SB_TABLE}?site=eq.${encodeURIComponent(entry.site)}&username=eq.${encodeURIComponent(entry.username)}&select=id&limit=1`,
      {
        headers: {
          'apikey':        SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`
        }
      }
    );

    if (!checkRes.ok) {
      console.error('[BG] Cek duplikat gagal:', checkRes.status);
      return;
    }

    const existing = await checkRes.json();

    if (existing.length > 0) {
      // 2a. Sudah ada → PATCH hanya kolom password & timestamp
      const existingId = existing[0].id;
      const patchRes = await fetch(
        `${SB_URL}/rest/v1/${SB_TABLE}?id=eq.${encodeURIComponent(existingId)}`,
        {
          method:  'PATCH',
          headers: {
            'apikey':        SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type':  'application/json',
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify({
            password:  entry.password,
            timestamp: entry.timestamp
          })
        }
      );

      if (!patchRes.ok) {
        console.error('[BG] Update gagal:', patchRes.status);
      } else {
        console.log('[BG] Password diperbarui:', entry.site, entry.username);
      }

    } else {
      // 2b. Belum ada → INSERT
      const insertRes = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
        method:  'POST',
        headers: {
          'apikey':        SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify(entry)
      });

      if (!insertRes.ok) {
        const text = await insertRes.text();
        console.error('[BG] Insert gagal:', insertRes.status, text);
      } else {
        console.log('[BG] Password baru tersimpan:', entry.site, entry.username);
      }
    }

  } catch (e) {
    console.error('[BG] Fetch error:', e.message);
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

  const sessionKey = 'pending_username_' + entry.site;

  chrome.storage.session.get([sessionKey], (sessionResult) => {
    if (entry.username === 'Tidak diketahui' && sessionResult[sessionKey]) {
      entry.username = sessionResult[sessionKey];
    }

    chrome.storage.session.remove(sessionKey);

    chrome.storage.local.get(['myPasswords'], async (result) => {
      const existing = result.myPasswords || [];

      // Cari apakah site + username sudah ada di storage lokal
      const localIdx = existing.findIndex(item =>
        item.site === entry.site && item.username === entry.username
      );

      let updated;
      if (localIdx !== -1) {
        // Sudah ada → update password & timestamp, pertahankan id lama
        updated = [...existing];
        updated[localIdx] = {
          ...updated[localIdx],
          password:  entry.password,
          timestamp: entry.timestamp
        };
        console.log('[BG] Update lokal:', entry.site, entry.username);
      } else {
        // Belum ada → tambah di depan
        updated = [entry, ...existing];
        console.log('[BG] Simpan lokal baru:', entry.site, entry.username);
      }

      chrome.storage.local.set({ myPasswords: updated });

      // Sinkron ke Supabase (upsert)
      await sbUpsert(entry);
    });
  });
});
