const DEFAULT_PASSWORD = 'siapasangka';

// Supabase config (hardcoded)
const SB_URL   = 'https://puywjdopumlzvmzbcudr.supabase.co';
const SB_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
const SB_TABLE = 'passwords';

// ── Supabase Helpers ──────────────────────────────────────────────────────────

async function sbInsert(entry) {
  try {
    await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
      method:  'POST',
      headers: {
        'apikey':        SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify(entry)
    });
  } catch (e) {
    console.warn('Supabase insert gagal:', e.message);
  }
}

async function sbDelete(id) {
  try {
    await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method:  'DELETE',
      headers: {
        'apikey':        SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Prefer':        'return=minimal'
      }
    });
  } catch (e) {
    console.warn('Supabase delete gagal:', e.message);
  }
}

async function sbDeleteAll() {
  try {
    // Supabase REST butuh filter untuk DELETE — pakai timestamp neq '' (selalu true)
    await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?timestamp=neq.___none___`, {
      method:  'DELETE',
      headers: {
        'apikey':        SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Prefer':        'return=minimal'
      }
    });
  } catch (e) {
    console.warn('Supabase delete all gagal:', e.message);
  }
}

async function sbFetchAll() {
  const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?select=*&order=timestamp.desc`, {
    headers: {
      'apikey':        SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`
    }
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Views
  const loginView = document.getElementById('login-view');
  const mainView  = document.getElementById('main-view');

  // Login
  const loginMasterInput = document.getElementById('login-master-input');
  const btnLoginMaster   = document.getElementById('btn-login-master');
  const loginError       = document.getElementById('login-error');
  const btnLock          = document.getElementById('btn-lock');

  // Tab Sandi
  const passwordListEl = document.getElementById('password-list');
  const emptyStateEl   = document.getElementById('empty-state');
  const countBadgeEl   = document.getElementById('count-badge');
  const searchInput    = document.getElementById('search-input');
  const clearAllBtn    = document.getElementById('clear-all');

  // Tab Supabase
  const sbListEl      = document.getElementById('sb-list');
  const sbEmptyEl     = document.getElementById('sb-empty');
  const sbCountBadge  = document.getElementById('sb-count-badge');
  const sbLoading     = document.getElementById('sb-loading');
  const sbError       = document.getElementById('sb-error');
  const btnSbRefresh  = document.getElementById('btn-sb-refresh');

  // Tabs
  const tabBtns     = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  let allPasswords = [];

  // ── Login ───────────────────────────────────────────────────────────────────
  loginView.classList.remove('hidden');
  loginMasterInput.focus();

  function handleLogin() {
    const inputPass = loginMasterInput.value;
    chrome.storage.local.get(['masterPassword'], (result) => {
      const master = result.masterPassword || DEFAULT_PASSWORD;
      if (master === inputPass) {
        loginError.classList.add('hidden');
        loginView.classList.add('hidden');
        mainView.classList.remove('hidden');
        loginMasterInput.value = '';
        loadPasswords();
      } else {
        loginError.classList.remove('hidden');
      }
    });
  }

  btnLoginMaster.addEventListener('click', handleLogin);
  loginMasterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  btnLock.addEventListener('click', () => {
    mainView.classList.add('hidden');
    loginView.classList.remove('hidden');
    loginMasterInput.focus();
  });

  // ── Tab Navigation ──────────────────────────────────────────────────────────
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.add('hidden'));
      btn.classList.add('active');
      const tabId = 'tab-' + btn.dataset.tab;
      document.getElementById(tabId).classList.remove('hidden');
      if (btn.dataset.tab === 'supabase') loadSupabaseView();
    });
  });

  // ── Tab Sandi: Render ───────────────────────────────────────────────────────
  function renderList(items) {
    passwordListEl.innerHTML = '';
    countBadgeEl.textContent = items.length;

    if (items.length === 0) {
      emptyStateEl.classList.remove('hidden');
      passwordListEl.classList.add('hidden');
      return;
    }
    emptyStateEl.classList.add('hidden');
    passwordListEl.classList.remove('hidden');

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-top">
          <div class="site-name">${escapeHtml(item.site)}</div>
          <div class="card-actions">
            <button class="icon-btn copy-btn" data-index="${index}">Salin</button>
            <button class="icon-btn delete delete-btn" data-id="${item.id}">Hapus</button>
          </div>
        </div>
        <div class="username">${escapeHtml(item.username)}</div>
        <div class="password-row">
          <span class="pass-val" id="pass-${index}">••••••••</span>
          <button class="icon-btn toggle-btn" data-index="${index}" data-pass="${escapeHtml(item.password)}">Lihat</button>
        </div>
        <div class="date-text">🕐 ${escapeHtml(item.timestamp || '-')}</div>
      `;
      passwordListEl.appendChild(card);
    });

    attachLocalEvents();
  }

  function loadPasswords() {
    chrome.storage.local.get(['myPasswords'], (result) => {
      allPasswords = result.myPasswords || [];
      renderList(allPasswords);
    });
  }

  function saveLocal(cb) {
    chrome.storage.local.set({ myPasswords: allPasswords }, cb);
  }

  function attachLocalEvents() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx    = e.target.dataset.index;
        const pass   = e.target.dataset.pass;
        const passEl = document.getElementById(`pass-${idx}`);
        if (passEl.textContent === '••••••••') {
          passEl.textContent   = pass;
          e.target.textContent = 'Sembunyikan';
        } else {
          passEl.textContent   = '••••••••';
          e.target.textContent = 'Lihat';
        }
      });
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = allPasswords[e.target.dataset.index];
        if (item) {
          navigator.clipboard.writeText(item.password).then(() => {
            const orig = e.target.textContent;
            e.target.textContent = 'Tersalin!';
            setTimeout(() => { e.target.textContent = orig; }, 1500);
          });
        }
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        allPasswords = allPasswords.filter(item => item.id !== id);
        saveLocal(() => renderList(allPasswords));
        await sbDelete(id);
      });
    });
  }

  // ── Pencarian ───────────────────────────────────────────────────────────────
  searchInput.addEventListener('input', (e) => {
    const q        = e.target.value.toLowerCase();
    const filtered = allPasswords.filter(item =>
      item.site.toLowerCase().includes(q) || item.username.toLowerCase().includes(q)
    );
    renderList(filtered);
  });

  // ── Hapus Semua ─────────────────────────────────────────────────────────────
  clearAllBtn.addEventListener('click', async () => {
    if (!confirm('Hapus semua sandi tersimpan? Data di Supabase juga akan dihapus.')) return;
    allPasswords = [];
    saveLocal(() => renderList([]));
    await sbDeleteAll();
  });

  // ── Tab Supabase: Load & Render ─────────────────────────────────────────────
  async function loadSupabaseView() {
    sbLoading.classList.remove('hidden');
    sbError.classList.add('hidden');
    sbListEl.classList.add('hidden');
    sbEmptyEl.classList.add('hidden');

    try {
      const data = await sbFetchAll();
      sbLoading.classList.add('hidden');
      renderSupabaseList(data);
    } catch (e) {
      sbLoading.classList.add('hidden');
      sbError.textContent = `Gagal memuat data: ${e.message}`;
      sbError.classList.remove('hidden');
    }
  }

  function renderSupabaseList(items) {
    sbListEl.innerHTML      = '';
    sbCountBadge.textContent = items.length;

    if (items.length === 0) {
      sbEmptyEl.classList.remove('hidden');
      sbListEl.classList.add('hidden');
      return;
    }
    sbEmptyEl.classList.add('hidden');
    sbListEl.classList.remove('hidden');

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-top">
          <div class="site-name">${escapeHtml(item.site)}</div>
          <div class="card-actions">
            <button class="icon-btn sb-copy-btn" data-pass="${escapeHtml(item.password)}">Salin</button>
            <button class="icon-btn delete sb-delete-btn" data-id="${item.id}">Hapus</button>
          </div>
        </div>
        <div class="username">${escapeHtml(item.username)}</div>
        <div class="password-row">
          <span class="pass-val" id="sbpass-${index}">••••••••</span>
          <button class="icon-btn sb-toggle-btn" data-index="${index}" data-pass="${escapeHtml(item.password)}">Lihat</button>
        </div>
        <div class="date-text">🕐 ${escapeHtml(item.timestamp || '-')}</div>
      `;
      sbListEl.appendChild(card);
    });

    attachSupabaseEvents(items);
  }

  function attachSupabaseEvents(items) {
    document.querySelectorAll('.sb-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx    = e.target.dataset.index;
        const pass   = e.target.dataset.pass;
        const passEl = document.getElementById(`sbpass-${idx}`);
        if (passEl.textContent === '••••••••') {
          passEl.textContent   = pass;
          e.target.textContent = 'Sembunyikan';
        } else {
          passEl.textContent   = '••••••••';
          e.target.textContent = 'Lihat';
        }
      });
    });

    document.querySelectorAll('.sb-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.target.dataset.pass).then(() => {
          const orig = e.target.textContent;
          e.target.textContent = 'Tersalin!';
          setTimeout(() => { e.target.textContent = orig; }, 1500);
        });
      });
    });

    document.querySelectorAll('.sb-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await sbDelete(id);
        // Hapus juga dari lokal jika ada
        allPasswords = allPasswords.filter(item => item.id !== id);
        saveLocal(() => renderList(allPasswords));
        // Reload supabase view
        loadSupabaseView();
      });
    });
  }

  btnSbRefresh.addEventListener('click', () => loadSupabaseView());

  // ── Escape HTML ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }
});
