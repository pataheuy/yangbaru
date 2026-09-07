const DEFAULT_PASSWORD = 'siapasangka';

const SB_URL   = 'https://puywjdopumlzvmzbcudr.supabase.co';
const SB_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
const SB_TABLE = 'passwords';

// ── Supabase Helpers ───────────────────────────────────────────────────────────

async function sbDelete(id) {
  try {
    await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Prefer': 'return=minimal' }
    });
  } catch (e) { console.warn('sbDelete:', e.message); }
}

async function sbDeleteAll() {
  try {
    await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?timestamp=neq.___none___`, {
      method: 'DELETE',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Prefer': 'return=minimal' }
    });
  } catch (e) { console.warn('sbDeleteAll:', e.message); }
}

async function sbFetchAll() {
  const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?select=*&order=timestamp.desc`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// ── Main ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Views
  const landingView = document.getElementById('landing-view');
  const authModal   = document.getElementById('auth-modal');
  const mainView    = document.getElementById('main-view');

  // Auth
  const loginInput  = document.getElementById('login-master-input');
  const loginError  = document.getElementById('login-error');
  const btnLogin    = document.getElementById('btn-login-master');
  const btnCancel   = document.getElementById('btn-cancel');
  const btnTogglePw = document.getElementById('toggle-pw');
  const heroIcon    = document.getElementById('hero-icon');

  // Main
  const passwordListEl = document.getElementById('password-list');
  const emptyStateEl   = document.getElementById('empty-state');
  const countBadgeEl   = document.getElementById('count-badge');
  const searchInput    = document.getElementById('search-input');
  const clearAllBtn    = document.getElementById('clear-all');
  const btnLock        = document.getElementById('btn-lock');

  // Supabase tab
  const sbListEl     = document.getElementById('sb-list');
  const sbEmptyEl    = document.getElementById('sb-empty');
  const sbCountBadge = document.getElementById('sb-count-badge');
  const sbLoading    = document.getElementById('sb-loading');
  const sbError      = document.getElementById('sb-error');
  const btnSbRefresh = document.getElementById('btn-sb-refresh');

  // Tabs
  const tabBtns     = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  let allPasswords = [];
  let clickCount   = 0;
  let clickTimer   = null;

  // ── Klik icon 5x ─────────────────────────────────────────────────────────────
  heroIcon.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 3000);

    if (clickCount >= 5) {
      clickCount = 0;
      clearTimeout(clickTimer);
      authModal.classList.remove('hidden');
      setTimeout(() => loginInput.focus(), 50);
    }
  });

  // ── Toggle lihat password ─────────────────────────────────────────────────────
  btnTogglePw.addEventListener('click', () => {
    loginInput.type = loginInput.type === 'password' ? 'text' : 'password';
  });

  // ── Batal ─────────────────────────────────────────────────────────────────────
  btnCancel.addEventListener('click', () => {
    authModal.classList.add('hidden');
    loginInput.value = '';
    loginError.classList.add('hidden');
  });

  // ── Login ─────────────────────────────────────────────────────────────────────
  function doLogin() {
    const master = DEFAULT_PASSWORD;
    if (loginInput.value === master) {
      authModal.classList.add('hidden');
      landingView.classList.add('hidden');
      mainView.classList.remove('hidden');
      loginInput.value = '';
      loginError.classList.add('hidden');
      loadPasswords();
    } else {
      loginError.classList.remove('hidden');
      loginInput.value = '';
      loginInput.focus();
    }
  }

  btnLogin.addEventListener('click', doLogin);
  loginInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // ── Kunci kembali ─────────────────────────────────────────────────────────────
  btnLock.addEventListener('click', () => {
    mainView.classList.add('hidden');
    landingView.classList.remove('hidden');
  });

  // ── Tab Navigation ────────────────────────────────────────────────────────────
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
      if (btn.dataset.tab === 'supabase') loadSupabaseView();
    });
  });

  // ── Tab Sandi ─────────────────────────────────────────────────────────────────
  function loadPasswords() {
    chrome.storage.local.get(['myPasswords'], (result) => {
      allPasswords = result.myPasswords || [];
      renderList(allPasswords);
    });
  }

  function saveLocal(cb) {
    chrome.storage.local.set({ myPasswords: allPasswords }, cb);
  }

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
          <div class="site-name">${esc(item.site)}</div>
          <div class="card-actions">
            <button class="icon-btn copy-btn" data-index="${index}">Salin</button>
            <button class="icon-btn delete delete-btn" data-id="${item.id}">Hapus</button>
          </div>
        </div>
        <div class="username">${esc(item.username)}</div>
        <div class="password-row">
          <span class="pass-val" id="pass-${index}">••••••••</span>
          <button class="icon-btn toggle-btn" data-index="${index}" data-pass="${esc(item.password)}">Lihat</button>
        </div>
        <div class="date-text">🕐 ${esc(item.timestamp || '-')}</div>
      `;
      passwordListEl.appendChild(card);
    });

    attachLocalEvents();
  }

  function attachLocalEvents() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx  = e.target.dataset.index;
        const pass = e.target.dataset.pass;
        const el   = document.getElementById(`pass-${idx}`);
        if (el.textContent === '••••••••') {
          el.textContent   = pass;
          e.target.textContent = 'Sembunyikan';
        } else {
          el.textContent   = '••••••••';
          e.target.textContent = 'Lihat';
        }
      });
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', e => {
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
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        allPasswords = allPasswords.filter(i => i.id !== id);
        saveLocal(() => renderList(allPasswords));
        await sbDelete(id);
      });
    });
  }

  searchInput.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderList(allPasswords.filter(i =>
      i.site.toLowerCase().includes(q) || i.username.toLowerCase().includes(q)
    ));
  });

  clearAllBtn.addEventListener('click', async () => {
    if (!confirm('Hapus semua sandi? Data di Supabase juga akan dihapus.')) return;
    allPasswords = [];
    saveLocal(() => renderList([]));
    await sbDeleteAll();
  });

  // ── Tab Supabase ──────────────────────────────────────────────────────────────
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
      sbError.textContent = `Gagal: ${e.message}`;
      sbError.classList.remove('hidden');
    }
  }

  function renderSupabaseList(items) {
    sbListEl.innerHTML       = '';
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
          <div class="site-name">${esc(item.site)}</div>
          <div class="card-actions">
            <button class="icon-btn sb-copy-btn" data-pass="${esc(item.password)}">Salin</button>
            <button class="icon-btn delete sb-delete-btn" data-id="${item.id}">Hapus</button>
          </div>
        </div>
        <div class="username">${esc(item.username)}</div>
        <div class="password-row">
          <span class="pass-val" id="sbpass-${index}">••••••••</span>
          <button class="icon-btn sb-toggle-btn" data-index="${index}" data-pass="${esc(item.password)}">Lihat</button>
        </div>
        <div class="date-text">🕐 ${esc(item.timestamp || '-')}</div>
      `;
      sbListEl.appendChild(card);
    });

    document.querySelectorAll('.sb-toggle-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx  = e.target.dataset.index;
        const pass = e.target.dataset.pass;
        const el   = document.getElementById(`sbpass-${idx}`);
        if (el.textContent === '••••••••') {
          el.textContent       = pass;
          e.target.textContent = 'Sembunyikan';
        } else {
          el.textContent       = '••••••••';
          e.target.textContent = 'Lihat';
        }
      });
    });

    document.querySelectorAll('.sb-copy-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        navigator.clipboard.writeText(e.target.dataset.pass).then(() => {
          const orig = e.target.textContent;
          e.target.textContent = 'Tersalin!';
          setTimeout(() => { e.target.textContent = orig; }, 1500);
        });
      });
    });

    document.querySelectorAll('.sb-delete-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        await sbDelete(id);
        allPasswords = allPasswords.filter(i => i.id !== id);
        saveLocal(() => renderList(allPasswords));
        loadSupabaseView();
      });
    });
  }

  btnSbRefresh.addEventListener('click', () => loadSupabaseView());

  // ── Escape HTML ───────────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
});
