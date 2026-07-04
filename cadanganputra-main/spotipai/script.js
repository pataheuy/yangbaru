// ==========================================
// KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://xhgwgdsurorujsvwzdpi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZ3dnZHN1cm9ydWpzdnd6ZHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMzUxMzEsImV4cCI6MjA5ODYxMTEzMX0.Az8W5OaQEpZHCtmJ1mUvRAF_O8jlOFAM3zDIE3KTfew';

// supabaseClient diinisialisasi di window.onload agar CDN pasti sudah siap
let supabaseClient = null;

// --- Data & State ---
let songs = [];
let likedSongsIds = JSON.parse(localStorage.getItem('spotipai_liked') || '[]');
let customPlaylists = JSON.parse(localStorage.getItem('bemspotipai_playlists')) || [];
let tempSongIdToAdd = null;
let playlistToDelete = null;
let songToDelete = null;

// currentUser = null (publik) | { username, role: 'admin' } (sadmin)
// isUploaderMode = true artinya mode upload aktif (tanpa login)
let currentUser = null;
let isUploaderMode = false;
// IDs lagu yang diupload oleh uploader tamu dalam sesi ini
let uploaderSessionSongIds = [];

let currentSongIndex = -1;
let currentQueue = [];      // Array of song objects untuk konteks aktif (artis / playlist / global)
let currentQueueIndex = -1; // Posisi lagu saat ini di dalam currentQueue
let isPlaying = false;
let isRepeat = false;
const audio = new Audio();
audio.volume = 1;

// Easter egg state
let errorClickCount = 0;
let canClickError = false;
let isProcessingEntrance = false;

// Lyrics state
let currentSyncedLyrics = null;

// DOM elements — diisi saat window.onload
let playerTitle, playerArtist, playerCover, playPauseIcon;
let progressBar, progressFill, timeCurrent, timeTotal;
let volumeBar, volumeFill, iconLike, btnLike;
let lyricsTitle, lyricsArtist, lyricsContent;

// ==========================================
// UTILITY: Toast, Modal
// ==========================================

// Helper: pecah string artis multi-nilai (Bug 2 fix)
function getArtistNames(artistStr) {
    if (!artistStr) return [];
    return artistStr.split(',').map(a => a.trim()).filter(Boolean);
}

// Konteks render terakhir — digunakan createSongCard untuk pass queue ke playSong
let _lastRenderedContext = null;

function showMessage(text, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'error' ? 'ph-warning-circle' : 'ph-check-circle';
    toast.className = `flex items-center gap-2 px-4 py-3 rounded shadow-lg text-white font-medium text-sm toast-enter pointer-events-auto ${bgColor}`;
    toast.innerHTML = `<i class="ph ${icon} text-lg"></i> <span>${text}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex', 'modal-enter');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex', 'modal-enter');
    if (id === 'create-playlist-modal') {
        const inp = document.getElementById('playlist-name-input');
        if (inp) inp.value = '';
    }
}

// ==========================================
// UPLOAD / ADMIN BUTTON LOGIC
// ==========================================
// Tombol "Upload":
//   - Belum upload mode → aktifkan mode upload, langsung buka halaman tambah lagu
//   - Sudah upload mode / admin → tombol jadi "Masuk Admin", tampilkan login modal
function handleUploadBtn() {
    if (isUploaderMode || (currentUser && currentUser.role === 'admin')) {
        showModal('login-modal');
    } else {
        isUploaderMode = true;
        updateUploadBtn();
        document.getElementById('admin-menu').classList.remove('hidden');
        // Uploader tamu: label "Menu Uploader"
        const menuLabel = document.getElementById('admin-menu-label');
        if (menuLabel) menuLabel.textContent = 'Menu Uploader';
// Uploader tamu: tampilkan menu Kelola (hanya lagu sendiri) + Tambah Lagu
        const manageLink = document.getElementById('admin-menu').querySelector('[data-tab="admin-manage"]');
        if (manageLink) manageLink.style.display = '';
        const mobileBtn = document.getElementById('mobile-admin-btn');
        if (mobileBtn) { mobileBtn.classList.remove('hidden'); mobileBtn.classList.add('flex'); }
        switchTab('admin-add');
    }
}

function updateUploadBtn() {
    const btn = document.getElementById('upload-action-btn');
    if (!btn) return;
    if (isUploaderMode || (currentUser && currentUser.role === 'admin')) {
        btn.textContent = 'Masuk Admin';
        btn.classList.remove('bg-white', 'text-black');
        btn.classList.add('bg-spotify-green', 'text-black');
    } else {
        btn.textContent = 'Upload';
        btn.classList.remove('bg-spotify-green');
        btn.classList.add('bg-white', 'text-black');
    }
}

// ==========================================
// ARTIST TAGS (Tambah Lagu)
// ==========================================
let artistTags = [];

function renderArtistTags() {
    const container = document.getElementById('artist-tags-container');
    const hidden = document.getElementById('add-artist');
    if (!container) return;
    container.innerHTML = artistTags.map((a, i) => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:#1DB954;color:#000;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">
            ${a}<button type="button" onclick="removeArtistTag(${i})" style="background:none;border:none;color:#000;cursor:pointer;font-size:0.9rem;line-height:1;padding:0 2px;">×</button>
        </span>`).join('');
    if (hidden) hidden.value = artistTags.join(', ');
}

function addArtistTag() {
    const input = document.getElementById('add-artist-input');
    if (!input) return;
    const val = input.value.trim();
    if (val && !artistTags.includes(val)) { artistTags.push(val); renderArtistTags(); }
    input.value = ''; input.focus();
}

function removeArtistTag(i) { artistTags.splice(i, 1); renderArtistTags(); }

function resetArtistTags() {
    artistTags = [];
    renderArtistTags();
    const input = document.getElementById('add-artist-input');
    if (input) input.value = '';
}

// ==========================================
// ARTIST TAGS (Edit Lagu)
// ==========================================
let editArtistTags = [];

function renderEditArtistTags() {
    const container = document.getElementById('edit-artist-tags-container');
    const hidden = document.getElementById('edit-artist');
    if (!container) return;
    container.innerHTML = editArtistTags.map((a, i) => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:#1DB954;color:#000;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">
            ${a}<button type="button" onclick="removeEditArtistTag(${i})" style="background:none;border:none;color:#000;cursor:pointer;font-size:0.9rem;line-height:1;padding:0 2px;">×</button>
        </span>`).join('');
    if (hidden) hidden.value = editArtistTags.join(', ');
}

function addEditArtistTag() {
    const input = document.getElementById('edit-artist-input');
    if (!input) return;
    const val = input.value.trim();
    if (val && !editArtistTags.includes(val)) { editArtistTags.push(val); renderEditArtistTags(); }
    input.value = ''; input.focus();
}

function removeEditArtistTag(i) { editArtistTags.splice(i, 1); renderEditArtistTags(); }

function populateArtistSuggestions() {
    // Tidak perlu datalist lagi — dropdown custom dihandle oleh showArtistDropdown
}

// List penyanyi tetap (SpotipaiKW house artists) + dari database
const SPOTIPAIKW_ARTISTS = [
    'Iwan Fals', 'Slank', 'Peterpan', 'Noah', 'Sheila On 7',
    'Dewa 19', 'Ada Band', 'Ungu', 'Padi', 'Gigi',
    'Nidji', 'Letto', 'Efek Rumah Kaca', 'The Changcuters', 'Superman Is Dead',
    'Burgerkill', 'Naif', 'Mocca', 'Maliq & D\'Essentials', 'Fourtwnty',
    'Fiersa Besari', 'Hindia', 'Pamungkas', 'Tulus', 'Glenn Fredly',
    'Raisa', 'Isyana Sarasvati', 'Yura Yunita', 'Rossa', 'Agnez Mo',
    'BCL', 'Bunga Citra Lestari', 'Afgan', 'Rizky Febian', 'Mahalini',
    'Tiara Andini', 'Lyodra', 'Betrand Peto', 'Judika', 'Virzha',
    'Devano Danendra', 'Ziva Magnolya', 'Anneth', 'Marion Jola', 'Fildan',
    'Atta Halilintar', 'Niken Salindry', 'Happy Asmara', 'Nella Kharisma', 'Denny Caknan',
    'Guyon Waton', 'Ndarboy Genk', 'Tri Suaka', 'Ilux ID', 'Esa Risty',
    'Lana Del Rey', 'Taylor Swift', 'Billie Eilish', 'Olivia Rodrigo', 'Doja Cat',
    'The Weeknd', 'Harry Styles', 'Ed Sheeran', 'Adele', 'Dua Lipa',
    'Justin Bieber', 'Ariana Grande', 'Selena Gomez', 'Bruno Mars', 'Charlie Puth',
    'BTS', 'BLACKPINK', 'NewJeans', 'aespa', 'IVE',
    'Stray Kids', 'Seventeen', 'EXO', 'GOT7', 'TWICE',
];

function getArtistSuggestions(query) {
    // Gabungkan artis dari database + daftar tetap, unik dan sorted
    const fromDB = songs.map(s => s.artist).filter(Boolean);
    const allArtists = [...new Set([...fromDB, ...SPOTIPAIKW_ARTISTS])].sort();
    if (!query.trim()) return allArtists.slice(0, 12);
    const q = query.toLowerCase();
    return allArtists.filter(a => a.toLowerCase().includes(q)).slice(0, 10);
}

function showArtistDropdown(mode) {
    const inputId = mode === 'add' ? 'add-artist-input' : mode === 'multi' ? 'multi-artist-input' : 'edit-artist-input';
    const dropdownId = mode === 'add' ? 'add-artist-dropdown' : mode === 'multi' ? 'multi-artist-dropdown' : 'edit-artist-dropdown';
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    const val = input.value.trim();
    const suggestions = getArtistSuggestions(val);

    if (suggestions.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    dropdown.innerHTML = suggestions.map((name, i) => `
        <div class="artist-dropdown-item px-4 py-2.5 cursor-pointer hover:bg-spotify-green/20 text-sm text-white flex items-center gap-2 transition-colors"
             data-name="${name.replace(/"/g, '&quot;')}"
             onmousedown="selectArtistFromDropdown('${name.replace(/'/g, "\\'")}', '${mode}')">
            <i class="ph ph-user text-spotify-green text-base flex-shrink-0"></i>
            <span>${highlightMatch(name, val)}</span>
        </div>
    `).join('');

    dropdown.classList.remove('hidden');
}

function highlightMatch(text, query) {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="text-spotify-green font-bold">$1</span>');
}

function selectArtistFromDropdown(name, mode) {
    const inputId = mode === 'add' ? 'add-artist-input' : mode === 'multi' ? 'multi-artist-input' : 'edit-artist-input';
    const dropdownId = mode === 'add' ? 'add-artist-dropdown' : mode === 'multi' ? 'multi-artist-dropdown' : 'edit-artist-dropdown';
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input) return;

    input.value = name;
    if (dropdown) dropdown.classList.add('hidden');

    if (mode === 'add') addArtistTag();
    else if (mode === 'multi') addMultiArtistTag();
    else addEditArtistTag();
}

function hideArtistDropdown(mode) {
    const dropdownId = mode === 'add' ? 'add-artist-dropdown' : mode === 'multi' ? 'multi-artist-dropdown' : 'edit-artist-dropdown';
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) setTimeout(() => dropdown.classList.add('hidden'), 150);
}

function handleArtistInputKey(e, mode) {
    const dropdownId = mode === 'add' ? 'add-artist-dropdown' : mode === 'multi' ? 'multi-artist-dropdown' : 'edit-artist-dropdown';
    const dropdown = document.getElementById(dropdownId);

    if (e.key === 'Enter') {
        e.preventDefault();
        const highlighted = dropdown?.querySelector('.bg-spotify-green\\/20');
        if (highlighted) {
            highlighted.dispatchEvent(new MouseEvent('mousedown'));
        } else {
            if (mode === 'add') addArtistTag();
            else if (mode === 'multi') addMultiArtistTag();
            else addEditArtistTag();
        }
        if (dropdown) dropdown.classList.add('hidden');
        return;
    }

    if (e.key === 'Escape') {
        if (dropdown) dropdown.classList.add('hidden');
        return;
    }

    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && dropdown && !dropdown.classList.contains('hidden')) {
        e.preventDefault();
        const items = dropdown.querySelectorAll('.artist-dropdown-item');
        if (!items.length) return;
        const current = dropdown.querySelector('.bg-\\[\\#2a2a2a\\]');
        let idx = -1;
        items.forEach((item, i) => { if (item === current) idx = i; });
        items.forEach(item => item.classList.remove('bg-[#2a2a2a]'));
        const next = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
        items[next].classList.add('bg-[#2a2a2a]');
        items[next].scrollIntoView({ block: 'nearest' });
    }
}

// ==========================================
// HEADER SEARCH
// ==========================================
function handleHeaderSearch(val) {
    const heading  = document.getElementById('songs-section-heading');
    const grid     = document.getElementById('songs-grid');
    const clearBtn = document.getElementById('header-search-clear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !val.trim());

    const hasQuery = val.trim().length > 0;

    // Pindah ke tab home dulu kalau belum di sana
    const homeTab = document.getElementById('tab-home');
    if (hasQuery && homeTab && homeTab.classList.contains('hidden')) {
        switchTab('home');
    }

    const hideOnSearch = [
        document.getElementById('home-trending-heading'),
        document.getElementById('trending-songs-grid'),
        document.getElementById('home-artists-heading'),
        document.getElementById('trending-artists-grid'),
        document.querySelector('#tab-home > hr'),
        document.querySelector('#tab-home > div.flex.items-center.justify-between'),
        document.getElementById('public-playlists-grid'),
    ];
    hideOnSearch.forEach(el => { if (el) el.style.display = hasQuery ? 'none' : ''; });

    if (!hasQuery) {
        if (heading) heading.textContent = 'Semua Lagu';
        renderHome(); return;
    }
    const q = val.toLowerCase();
    const filtered = songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    if (heading) heading.textContent = `Hasil: "${val}" (${filtered.length} lagu)`;
    if (grid) {
        grid.className = 'grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
        renderSongs(filtered, grid, 'all');
    }
}

function clearHeaderSearch() {
    const input = document.getElementById('header-search-input');
    const clearBtn = document.getElementById('header-search-clear');
    if (input) { input.value = ''; input.focus(); }
    if (clearBtn) clearBtn.classList.add('hidden');
    handleHeaderSearch('');
}

// ==========================================
// SIDEBAR & SCROLL
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const btn = document.getElementById('sidebar-toggle-btn');
    if (!sidebar || !btn) return;
    sidebar.classList.toggle('sidebar-collapsed');
    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
    btn.querySelector('i').className = isCollapsed ? 'ph ph-layout text-xl' : 'ph ph-sidebar-simple text-xl';
}

// ==========================================
// QUEUE PANEL
// ==========================================
let isQueueOpen = false;

function toggleLyricsTab() {
    // Kalau sedang di lyrics → balik ke home
    const lyricsTab = document.getElementById('tab-lyrics');
    const isOnLyrics = lyricsTab && !lyricsTab.classList.contains('hidden');

    if (isOnLyrics) {
        switchTab('home');
        // Reset semua ikon lirik
        const btnMobile  = document.getElementById('btn-lyrics-mobile');
        const btnDesktop = document.getElementById('btn-lyrics-desktop');
        if (btnMobile)  btnMobile.querySelector('i').className  = 'ph ph-microphone-stage text-xl';
        if (btnDesktop) btnDesktop.querySelector('i').className = 'ph ph-microphone-stage';
        if (btnDesktop) btnDesktop.style.color = '';
    } else {
        switchTab('lyrics');
        // Highlight ikon lirik
        const btnMobile  = document.getElementById('btn-lyrics-mobile');
        const btnDesktop = document.getElementById('btn-lyrics-desktop');
        if (btnMobile)  btnMobile.querySelector('i').className  = 'ph-fill ph-microphone-stage text-xl text-white';
        if (btnDesktop) btnDesktop.querySelector('i').className = 'ph-fill ph-microphone-stage';
        if (btnDesktop) btnDesktop.style.color = 'white';
    }
}

function toggleQueuePanel() {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Mobile: bottom sheet
        const sheet   = document.getElementById('queue-mobile-sheet');
        const overlay = document.getElementById('queue-mobile-overlay');
        if (!sheet) return;

        isQueueOpen = !isQueueOpen;

        if (isQueueOpen) {
            sheet.classList.remove('hidden');
            overlay.classList.remove('hidden');
            // Trigger animasi slide up
            requestAnimationFrame(() => {
                sheet.classList.remove('translate-y-full');
            });
            updateQueuePanelMobile();
        } else {
            sheet.classList.add('translate-y-full');
            overlay.classList.add('hidden');
            setTimeout(() => sheet.classList.add('hidden'), 300);
        }

        const btn = document.getElementById('btn-queue-mobile');
        if (btn) btn.querySelector('i').className = isQueueOpen
            ? 'ph-fill ph-queue text-xl text-white'
            : 'ph ph-queue text-xl';
    } else {
        // Desktop: side panel
        isQueueOpen = !isQueueOpen;
        const panel = document.getElementById('queue-panel');
        const btn   = document.getElementById('btn-queue');
        if (!panel) return;
        if (isQueueOpen) {
            panel.classList.remove('queue-closed');
            panel.classList.add('queue-open');
            if (btn) { btn.querySelector('i').classList.add('text-white'); btn.classList.add('text-white'); }
        } else {
            panel.classList.remove('queue-open');
            panel.classList.add('queue-closed');
            if (btn) { btn.querySelector('i').classList.remove('text-white'); btn.classList.remove('text-white'); }
        }
        updateQueuePanel();
    }
}

function updateQueuePanel() {
    if (!isQueueOpen) return;
    const nowPlayingEl = document.getElementById('queue-now-playing');
    const queueListEl = document.getElementById('queue-list');
    const nextLabel = document.getElementById('queue-next-label');
    if (!nowPlayingEl || !queueListEl) return;

    const fallbackImg = 'https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=150&q=80';

    // Now playing
    if (currentSongIndex === -1 || !songs[currentSongIndex]) {
        nowPlayingEl.innerHTML = '<p class="text-gray-500 text-sm">Belum ada lagu diputar</p>';
        queueListEl.innerHTML = '<p class="text-gray-600 text-sm">Antrian kosong.</p>';
        return;
    }
    const current = songs[currentSongIndex];
    nowPlayingEl.innerHTML = `
        <img src="${current.coverUrl}" onerror="this.src='${fallbackImg}'" class="w-10 h-10 rounded object-cover flex-shrink-0 shadow">
        <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-spotify-green truncate leading-tight">${current.title}</p>
            <p class="text-xs text-gray-400 truncate mt-0.5">${current.artist}</p>
        </div>`;

    // Build upcoming list from currentQueue
    const upcoming = [];
    if (currentQueue.length > 1) {
        const qLen = currentQueue.length;
        const startIdx = (currentQueueIndex + 1) % qLen;
        const total = Math.min(qLen - 1, 50);
        for (let i = 0; i < total; i++) {
            upcoming.push(currentQueue[(startIdx + i) % qLen]);
        }
    }

    if (nextLabel) nextLabel.textContent = 'Next in queue';

    if (upcoming.length === 0) {
        queueListEl.innerHTML = '<p class="text-gray-600 text-sm">Tidak ada lagu berikutnya.</p>';
        return;
    }

    queueListEl.innerHTML = '';
    upcoming.forEach((song) => {
        const globalIdx = songs.findIndex(s => s.id === song.id);
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/10 cursor-pointer group transition-colors -mx-2';
        row.innerHTML = `
            <img src="${song.coverUrl}" onerror="this.src='${fallbackImg}'" class="w-10 h-10 rounded object-cover flex-shrink-0 shadow">
            <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-white truncate leading-tight">${song.title}</p>
                <p class="text-xs text-gray-400 truncate mt-0.5">${song.artist}</p>
            </div>`;
        row.onclick = () => {
            if (globalIdx !== -1) {
                playSong(globalIdx, currentQueue);
                setTimeout(updateQueuePanel, 100);
            }
        };
        queueListEl.appendChild(row);
    });
}

// Mobile queue panel — sama kontennya, elemen berbeda
function updateQueuePanelMobile() {
    const nowPlayingEl = document.getElementById('queue-now-playing-mobile');
    const queueListEl  = document.getElementById('queue-list-mobile');
    if (!nowPlayingEl || !queueListEl) return;

    const fallbackImg = 'https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=150&q=80';

    if (currentSongIndex === -1 || !songs[currentSongIndex]) {
        nowPlayingEl.innerHTML = '<p class="text-gray-500 text-sm">Belum ada lagu diputar</p>';
        queueListEl.innerHTML  = '<p class="text-gray-600 text-sm">Antrian kosong.</p>';
        return;
    }
    const current = songs[currentSongIndex];
    nowPlayingEl.innerHTML = `
        <img src="${current.coverUrl}" onerror="this.src='${fallbackImg}'" class="w-10 h-10 rounded object-cover flex-shrink-0 shadow">
        <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-spotify-green truncate leading-tight">${current.title}</p>
            <p class="text-xs text-gray-400 truncate mt-0.5">${current.artist}</p>
        </div>`;

    const upcoming = [];
    if (currentQueue.length > 1) {
        const qLen = currentQueue.length;
        const startIdx = (currentQueueIndex + 1) % qLen;
        const total = Math.min(qLen - 1, 50);
        for (let i = 0; i < total; i++) upcoming.push(currentQueue[(startIdx + i) % qLen]);
    }

    if (upcoming.length === 0) {
        queueListEl.innerHTML = '<p class="text-gray-600 text-sm">Tidak ada lagu berikutnya.</p>';
        return;
    }

    queueListEl.innerHTML = '';
    upcoming.forEach(song => {
        const globalIdx = songs.findIndex(s => s.id === song.id);
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/10 cursor-pointer transition-colors -mx-2';
        row.innerHTML = `
            <img src="${song.coverUrl}" onerror="this.src='${fallbackImg}'" class="w-10 h-10 rounded object-cover flex-shrink-0 shadow">
            <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-white truncate leading-tight">${song.title}</p>
                <p class="text-xs text-gray-400 truncate mt-0.5">${song.artist}</p>
            </div>`;
        row.onclick = () => {
            if (globalIdx !== -1) {
                playSong(globalIdx, currentQueue);
                setTimeout(updateQueuePanelMobile, 100);
            }
        };
        queueListEl.appendChild(row);
    });
}

function scrollArtists(dir) {
    const container = document.getElementById('trending-artists-grid');
    if (container) container.scrollBy({ left: dir * 280, behavior: 'smooth' });
}

// ==========================================
// AD / CREDIT
// ==========================================
function showAdWithDelay() {
    showModal('ad-modal');
    const closeBtn = document.getElementById('close-ad-btn');
    closeBtn.disabled = true;
    closeBtn.className = "px-6 py-3 bg-[#333] text-gray-500 font-bold rounded-full transition-colors cursor-not-allowed w-full text-xs uppercase tracking-widest";
    let timeLeft = 3;
    closeBtn.innerText = `Tutup (${timeLeft})`;
    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) { closeBtn.innerText = `Tutup (${timeLeft})`; }
        else {
            clearInterval(timer);
            closeBtn.innerText = 'Tutup Kredit';
            closeBtn.disabled = false;
            closeBtn.className = "px-6 py-3 bg-white hover:scale-105 text-black font-bold rounded-full transition-transform active:scale-95 w-full text-xs uppercase tracking-widest shadow-lg";
        }
    }, 1000);
}

// ==========================================
// SORT SONGS
// ==========================================
function sortSongs() {
    const bottomTitles = ["Bintang 5", "Sency", "Berubah", "Tabola Bale"];
    songs.sort((a, b) => {
        const aBot = bottomTitles.some(t => a.title.toLowerCase().includes(t.toLowerCase()));
        const bBot = bottomTitles.some(t => b.title.toLowerCase().includes(t.toLowerCase()));
        if (aBot && !bBot) return 1;
        if (!aBot && bBot) return -1;
        return 0;
    });
}

// ==========================================
// LYRICS HELPERS
// ==========================================
function handleLrcUpload(input, textareaId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById(textareaId).value = e.target.result;
        showMessage("File lirik (.lrc/.srt) berhasil dimuat!");
    };
    reader.readAsText(file);
}

function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const result = [];
    const lrcRegex = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;
    lines.forEach(line => {
        const match = lrcRegex.exec(line.trim());
        if (match) result.push({ time: parseInt(match[1], 10) * 60 + parseFloat(match[2]), text: match[3].trim() });
    });
    return result.sort((a, b) => a.time - b.time);
}

function parseSRT(srtText) {
    const blocks = srtText.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/);
    const result = [];
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return;
        let timeLine = '', textIndex = 1;
        if (lines[0].includes('-->')) { timeLine = lines[0]; textIndex = 1; }
        else if (lines[1] && lines[1].includes('-->')) { timeLine = lines[1]; textIndex = 2; }
        if (timeLine) {
            const m = timeLine.split('-->')[0].trim().match(/(\d+):(\d+):(\d+)[,\.](\d+)/);
            if (m) result.push({ time: +m[1]*3600 + +m[2]*60 + +m[3] + +m[4]/1000, text: lines.slice(textIndex).join(' ') });
        }
    });
    return result.sort((a, b) => a.time - b.time);
}

// ==========================================
// EASTER EGG 404
// ==========================================
function initEasterEgg() {
    const titleEl = document.getElementById('error-title');
    if (!titleEl) return;
    titleEl.addEventListener('click', () => {
        if (!canClickError || isProcessingEntrance) return;
        errorClickCount++;
        const statusEl = document.getElementById('error-status');
        if (statusEl && errorClickCount < 5) {
            const msgs = ['Status: Retrying connection...','Status: Connection timed out. Retrying...','Status: Server not responding...','Status: Attempting failover...'];
            statusEl.textContent = msgs[Math.min(errorClickCount - 1, msgs.length - 1)];
        }
        if (errorClickCount >= 5) {
            isProcessingEntrance = true;
            if (statusEl) { statusEl.textContent = 'Status: Bypassing... Redirecting in 1s...'; statusEl.style.color = '#1DB954'; }
            setTimeout(() => {
                const fake404 = document.getElementById('fake-404');
                const appView = document.getElementById('app-view');
                fake404.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                fake404.style.opacity = '0'; fake404.style.transform = 'scale(1.03)'; fake404.style.pointerEvents = 'none';
                appView.style.opacity = '0'; appView.classList.remove('opacity-0');
                appView.style.transition = 'opacity 0.7s ease 0.3s';
                requestAnimationFrame(() => requestAnimationFrame(() => { appView.style.opacity = '1'; }));
                setTimeout(() => fake404.classList.add('hidden'), 700);
                setTimeout(() => showAdWithDelay(), 3000);
            }, 1000);
        }
    });
}

// ==========================================
// AUTHENTICATION (sadmin only)
// ==========================================
function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        if (!user || !pass) return showMessage('Username dan password harus diisi', 'error');

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const origText = submitBtn.innerText;
        submitBtn.innerText = "Memuat..."; submitBtn.disabled = true;

        if (user === 'sadmin' && pass === 'sadmin') {
            currentUser = { username: user, role: 'admin' };
            isUploaderMode = true;
            showMessage('Berhasil login sebagai Admin');
        } else {
            submitBtn.innerText = origText; submitBtn.disabled = false;
            return showMessage('Username atau password salah', 'error');
        }

        updateUploadBtn();
        document.getElementById('auth-login-btn').classList.add('hidden');
        document.getElementById('auth-user-info').classList.remove('hidden');
        document.getElementById('auth-user-info').classList.add('flex');
        document.getElementById('user-greeting').innerText = `Halo, ${user}`;
        document.getElementById('admin-menu').classList.remove('hidden');
        // Admin sadmin tampilkan semua menu + label "Menu Admin"
        const menuLabelAdmin = document.getElementById('admin-menu-label');
        if (menuLabelAdmin) menuLabelAdmin.textContent = 'Menu Admin';
        const manageLink = document.getElementById('admin-menu').querySelector('[data-tab="admin-manage"]');
        if (manageLink) manageLink.style.display = '';
        // Tampilkan Kelola Playlist hanya untuk sadmin
        const playlistsLink = document.getElementById('admin-playlists-link');
        if (playlistsLink) playlistsLink.classList.remove('hidden');
        const mobileBtn = document.getElementById('mobile-admin-btn');
        if (mobileBtn) { mobileBtn.classList.remove('hidden'); mobileBtn.classList.add('flex'); }

        submitBtn.innerText = origText; submitBtn.disabled = false;
        closeModal('login-modal');

        const activeTabEl = document.querySelector('.content-tab:not(.hidden)');
        const activeTab = activeTabEl ? activeTabEl.id.replace('tab-', '') : 'home';
        switchTab(activeTab === 'artist' ? 'home' : activeTab);
        updateLikeIcon();
    });
}

function logout() {
    audio.pause(); isPlaying = false; updatePlayIcon();
    currentUser = null; isUploaderMode = false; uploaderSessionSongIds = []; updateUploadBtn();
    document.getElementById('auth-login-btn').classList.remove('hidden');
    document.getElementById('auth-user-info').classList.add('hidden');
    document.getElementById('auth-user-info').classList.remove('flex');
    document.getElementById('admin-menu').classList.add('hidden');
    // Reset Kelola Playlist link
    const playlistsLinkLogout = document.getElementById('admin-playlists-link');
    if (playlistsLinkLogout) playlistsLinkLogout.classList.add('hidden');
    const mobileBtn = document.getElementById('mobile-admin-btn');
    if (mobileBtn) { mobileBtn.classList.add('hidden'); mobileBtn.classList.remove('flex'); }
    document.getElementById('login-form').reset();
    switchTab('home'); updateLikeIcon();
    showMessage('Berhasil keluar');
}

// ==========================================
// NAVIGATION
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.content-tab').forEach(tab => tab.classList.add('hidden'));
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        targetTab.classList.remove('page-enter');
        void targetTab.offsetWidth;
        targetTab.classList.add('page-enter');
    }

    // Reset icon lirik mobile & desktop kalau pindah dari lyrics
    const btnLyricsMobile  = document.getElementById('btn-lyrics-mobile');
    const btnLyricsDesktop = document.getElementById('btn-lyrics-desktop');
    if (tabId === 'lyrics') {
        if (btnLyricsMobile)  btnLyricsMobile.querySelector('i').className  = 'ph-fill ph-microphone-stage text-xl text-white';
        if (btnLyricsDesktop) { btnLyricsDesktop.querySelector('i').className = 'ph-fill ph-microphone-stage'; btnLyricsDesktop.style.color = 'white'; }
    } else {
        if (btnLyricsMobile)  btnLyricsMobile.querySelector('i').className  = 'ph ph-microphone-stage text-xl';
        if (btnLyricsDesktop) { btnLyricsDesktop.querySelector('i').className = 'ph ph-microphone-stage'; btnLyricsDesktop.style.color = ''; }
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset && item.dataset.tab === tabId) {
            item.classList.remove('text-gray-400'); item.classList.add('text-white');
        } else {
            item.classList.remove('text-white'); item.classList.add('text-gray-400');
        }
    });

    if (tabId === 'home') renderHome();
    else if (tabId === 'search') renderBrowseCategories();
    else if (tabId === 'collection') {
        closePlaylistDetails();
        document.getElementById('liked-count').innerText = likedSongsIds.length;
        renderCustomPlaylists();
    }
    else if (tabId === 'library') renderLibrary();
    else if (tabId === 'lyrics') {
        updateLyricsView();
        const lyricsTab = document.getElementById('tab-lyrics');
        if (lyricsTab) lyricsTab.scrollTo({ top: 0, behavior: 'smooth' });
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        const sidebar = document.getElementById('main-sidebar');
        const btn = document.getElementById('sidebar-toggle-btn');
        if (sidebar && !sidebar.classList.contains('sidebar-collapsed')) {
            sidebar.classList.add('sidebar-collapsed');
            if (btn) btn.querySelector('i').className = 'ph ph-sidebar-simple-fill text-xl';
        }
    }
    else if (tabId === 'admin-manage') {
        if (!isUploaderMode && (!currentUser || currentUser.role !== 'admin')) {
            showMessage('Akses ditolak.', 'error');
            switchTab('admin-add'); return;
        }
        renderAdminLibrary();
    }
    else if (tabId === 'admin-playlists') {
        if (!currentUser || currentUser.role !== 'admin') {
            showMessage('Akses ditolak. Hanya sadmin.', 'error');
            switchTab('home'); return;
        }
        loadAdminPlaylists();
    }
    else if (tabId === 'admin-add') populateArtistSuggestions();
    else if (tabId === 'about') {
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    else if (tabId === 'request') {
        renderRequestTable();
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==========================================
// RENDER HOME
// ==========================================

// Update hanya bagian artis populer tanpa re-render grid semua lagu
// Ini mencegah re-shuffle saat play count diupdate
function renderTrendingOnly() {
    const artistContainer = document.getElementById('trending-artists-grid');
    if (!artistContainer) return;

    const artistMap = {};
    songs.forEach(s => {
        if (!s.artist) return;
        getArtistNames(s.artist).forEach(artistName => {
            if (!artistMap[artistName]) artistMap[artistName] = { name: artistName, playCount: 0, image: s.coverUrl };
            artistMap[artistName].playCount += (s.playCount || 0);
        });
    });
    const trendingArtists = Object.values(artistMap).sort((a, b) => b.playCount - a.playCount).slice(0, 10);
    artistContainer.innerHTML = '';
    if (trendingArtists.length === 0) {
        artistContainer.innerHTML = '<p class="text-gray-500 text-sm">Belum ada artis terdaftar.</p>';
        return;
    }
    trendingArtists.forEach(art => {
        const escapedName = art.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const div = document.createElement('div');
        div.className = 'flex flex-col items-center gap-3 cursor-pointer group min-w-[120px]';
        div.setAttribute('onclick', `showArtistPage('${escapedName}')`);
        div.innerHTML = `
            <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-lg group-hover:shadow-spotify-green/20 transition-all">
                <img src="${art.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 pointer-events-none select-none" draggable="false">
            </div>
            <span class="text-sm font-bold text-white text-center w-full truncate group-hover:text-spotify-green transition-colors">${art.name}</span>`;
        artistContainer.appendChild(div);
    });
}

function renderHome() {
    const allContainer = document.getElementById('songs-grid');
    if (!allContainer) return;

    renderTrendingOnly();

    // "Semua Lagu" — selalu ditampilkan acak setiap render
    const shuffledSongs = [...songs].sort(() => Math.random() - 0.5);
    renderSongs(shuffledSongs, allContainer, 'all');
}

// ==========================================
// ALL ARTISTS PAGE
// ==========================================
function showAllArtistsPage() {
    document.querySelectorAll('.content-tab').forEach(tab => tab.classList.add('hidden'));
    document.getElementById('tab-all-artists').classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('text-white'); item.classList.add('text-gray-400');
    });
    const mainContainer = document.querySelector('main');
    if (mainContainer) mainContainer.scrollTo({ top: 0, behavior: 'smooth' });

    const artistMap = {};
    songs.forEach(s => {
        if (!s.artist) return;
        getArtistNames(s.artist).forEach(artistName => {
            if (!artistMap[artistName]) {
                artistMap[artistName] = { name: artistName, playCount: 0, image: s.coverUrl };
            }
            artistMap[artistName].playCount += (s.playCount || 0);
        });
    });
    const allArtists = Object.values(artistMap).sort((a, b) => a.name.localeCompare(b.name));

    const container = document.getElementById('all-artists-grid');
    if (!container) return;
    container.innerHTML = '';
    if (allArtists.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm col-span-full">Belum ada artis terdaftar.</p>';
        return;
    }
    allArtists.forEach(art => {
        const div = document.createElement('div');
        div.className = 'flex flex-col items-center gap-2 cursor-pointer group';
        div.onclick = () => showArtistPage(art.name);
        div.innerHTML = `
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg group-hover:shadow-spotify-green/20 transition-all">
                <img src="${art.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=300&q=80'">
            </div>
            <span class="text-xs font-bold text-white text-center w-full truncate group-hover:text-spotify-green transition-colors">${art.name}</span>`;
        container.appendChild(div);
    });
}

// ==========================================
// ARTIST PAGE
// ==========================================
function showArtistPage(artistName) {
    document.querySelectorAll('.content-tab').forEach(tab => tab.classList.add('hidden'));
    document.getElementById('tab-artist').classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('text-white'); item.classList.add('text-gray-400');
    });
    const mainContainer = document.querySelector('main');
    if (mainContainer) mainContainer.scrollTo({ top: 0, behavior: 'smooth' });

    const artistSongs = songs.filter(s =>
        getArtistNames(s.artist).some(a => a.toLowerCase() === artistName.toLowerCase())
    );
    const totalPlays = artistSongs.reduce((sum, s) => sum + (s.playCount || 0), 0);
    const artistImage = artistSongs[0]?.coverUrl || 'https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=300&q=80';

    document.getElementById('artist-page-name').innerText = artistName;
    document.getElementById('artist-page-name-sub').innerText = artistName;
    document.getElementById('artist-page-plays').innerText = totalPlays;
    document.getElementById('artist-page-image').src = artistImage;

    // Set blurred background image
    const bgEl = document.getElementById('artist-page-bg');
    if (bgEl) bgEl.style.backgroundImage = `url('${artistImage}')`;

    renderSongs(artistSongs, document.getElementById('artist-songs-grid'), 'artist');
}

// ==========================================
// PLAYLISTS
// ==========================================
function renderSidebarPlaylists() {
    const container = document.getElementById('sidebar-playlists');
    const miniContainer = document.getElementById('sidebar-playlists-mini');
    if (!container) return;
    container.innerHTML = '';
    if (miniContainer) miniContainer.innerHTML = '';

    customPlaylists.forEach(pl => {
        // Full sidebar item
        const a = document.createElement('a');
        a.href = "#";
        a.className = "flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors truncate w-full font-medium py-1 rounded-md hover:bg-white/5 px-1";
        // Cover thumbnail
        let thumbHtml = '<div class="w-8 h-8 rounded bg-gray-800 flex items-center justify-center flex-shrink-0"><i class="ph ph-music-notes text-gray-500 text-sm"></i></div>';
        if (pl.songs.length > 0) {
            const firstSong = songs.find(s => s.id === pl.songs[0]);
            if (firstSong) thumbHtml = `<img src="${firstSong.coverUrl}" class="w-8 h-8 rounded object-cover flex-shrink-0" onerror="this.style.display='none'">`;
        }
        a.innerHTML = `${thumbHtml}<span class="truncate">${pl.name}</span>`;
        a.onclick = (e) => { e.preventDefault(); switchTab('collection'); showPlaylistDetails(pl.id); };
        container.appendChild(a);

        // Mini icon for collapsed sidebar
        if (miniContainer) {
            const mini = document.createElement('button');
            mini.className = "w-10 h-10 rounded-lg overflow-hidden hover:scale-105 transition-transform flex-shrink-0 bg-gray-800 flex items-center justify-center";
            mini.title = pl.name;
            if (pl.songs.length > 0) {
                const firstSong = songs.find(s => s.id === pl.songs[0]);
                if (firstSong) {
                    mini.innerHTML = `<img src="${firstSong.coverUrl}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<i class=\\'ph ph-music-notes text-gray-400 text-sm\\'></i>'">`;
                } else {
                    mini.innerHTML = '<i class="ph ph-music-notes text-gray-400 text-sm"></i>';
                }
            } else {
                mini.innerHTML = '<i class="ph ph-music-notes text-gray-400 text-sm"></i>';
            }
            mini.onclick = () => { switchTab('collection'); showPlaylistDetails(pl.id); };
            miniContainer.appendChild(mini);
        }
    });
}

function renderCustomPlaylists() {
    const container = document.getElementById('custom-playlists-grid');
    if (!container) return;
    container.innerHTML = '';
    if (customPlaylists.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm col-span-full">Kamu belum membuat playlist kustom apapun.</p>';
        return;
    }
    customPlaylists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'bg-spotify-elevated p-4 rounded-md hover:bg-spotify-highlight transition-colors cursor-pointer group';
        card.onclick = () => showPlaylistDetails(pl.id);
        let coverHtml = '<div class="w-full h-full bg-gray-800 flex items-center justify-center"><i class="ph ph-music-notes text-4xl text-gray-500"></i></div>';
        if (pl.songs.length > 0) {
            const firstSong = songs.find(s => s.id === pl.songs[0]);
            if (firstSong) coverHtml = `<img src="${firstSong.coverUrl}" class="w-full h-full object-cover">`;
        }
        card.innerHTML = `
            <div class="relative mb-4 pb-[100%] shadow-lg rounded overflow-hidden"><div class="absolute top-0 left-0 w-full h-full">${coverHtml}</div></div>
            <h3 class="font-bold text-white mb-1 truncate text-sm">${pl.name}</h3>
            <p class="text-xs text-gray-400 truncate">${pl.songs.length} lagu</p>`;
        container.appendChild(card);
    });
}

let currentOpenPlaylistId = null; // Track which playlist is open for cover editing

function showPlaylistDetails(id) {
    currentOpenPlaylistId = id;

    // Hide all collection-level UI
    document.getElementById('custom-playlists-grid').classList.add('hidden');
    // Hide liked songs banner (first direct child div with cursor-pointer)
    const likedBanner = document.querySelector('#tab-collection > div.cursor-pointer, #tab-collection > div.group');
    if (likedBanner) likedBanner.classList.add('hidden');
    // Hide "Playlist Kamu" heading row
    const playlistsHeading = document.querySelector('#tab-collection > div.flex.items-center');
    if (playlistsHeading) playlistsHeading.classList.add('hidden');
    const hr = document.querySelector('#tab-collection > hr');
    if (hr) hr.classList.add('hidden');

    const detailView = document.getElementById('playlist-detail-view');
    const detailSongs = document.getElementById('detail-playlist-songs');
    const titleElem = document.getElementById('detail-playlist-title');
    const deleteBtn = document.getElementById('delete-playlist-btn');
    const coverEl = document.getElementById('playlist-detail-cover');
    const coverEditBtn = document.getElementById('playlist-cover-edit-btn');
    const creatorEl = document.getElementById('detail-playlist-creator');
    detailView.classList.remove('hidden');

    // Reset cover
    if (coverEl) {
        coverEl.className = 'w-40 h-40 sm:w-52 sm:h-52 flex-shrink-0 flex items-center justify-center shadow-2xl rounded-lg overflow-hidden';
        coverEl.innerHTML = '<i class="ph ph-music-notes text-6xl text-gray-500"></i>';
    }
    if (coverEditBtn) coverEditBtn.classList.add('hidden');
    if (creatorEl) creatorEl.innerHTML = `<i class="ph-fill ph-spotify-logo text-spotify-green text-base"></i> spotipaiKW`;

    if (id === 'liked') {
        if (titleElem) titleElem.innerText = 'Lagu yang Disukai';
        // Liked banner cover
        if (coverEl) {
            coverEl.className = 'w-40 h-40 sm:w-52 sm:h-52 flex-shrink-0 bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-400 flex items-center justify-center shadow-2xl rounded-lg';
            coverEl.innerHTML = '<i class="ph-fill ph-heart text-7xl text-white drop-shadow-lg"></i>';
        }
        renderSongs(songs.filter(s => likedSongsIds.includes(s.id)), detailSongs, 'liked');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        const playBtn = document.getElementById('playlist-detail-play-btn');
        if (playBtn) playBtn.onclick = () => {
            const likedSongs = songs.filter(s => likedSongsIds.includes(s.id));
            if (likedSongs.length) playSong(songs.findIndex(s => s.id === likedSongs[0].id), likedSongs);
        };
    } else {
        const pl = customPlaylists.find(p => p.id === id);
        if (pl) {
            if (titleElem) titleElem.innerText = pl.name;
            const plSongs = songs.filter(s => pl.songs.includes(s.id));

            // Cover from first song, or custom cover
            if (coverEl) {
                const firstSong = plSongs[0];
                const customCover = pl.customCover || '';
                if (customCover) {
                    coverEl.innerHTML = `<img src="${customCover}" class="w-full h-full object-cover">`;
                } else if (firstSong) {
                    coverEl.innerHTML = `<img src="${firstSong.coverUrl}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<i class=\\'ph ph-music-notes text-6xl text-gray-500\\'></i>'">`;
                }
            }

            // Edit cover dinonaktifkan
            if (coverEditBtn) coverEditBtn.classList.add('hidden');

            // Creator info for public playlists
            if (pl.isPublic) {
                const pubData = publicPlaylists.find(p => p.id === id);
                if (pubData && creatorEl) {
                    const creator = pubData.show_creator && pubData.creator_name
                        ? `oleh <span class="text-white font-semibold">${pubData.creator_name}</span>`
                        : 'Playlist Publik';
                    creatorEl.innerHTML = `<i class="ph-fill ph-spotify-logo text-spotify-green text-base"></i> spotipaiKW · ${creator} · <span class="text-spotify-green"><i class="ph ph-globe text-xs"></i> Publik</span>`;
                }
            }

            renderSongs(plSongs, detailSongs, id);

            // Hapus: hanya milik sendiri atau sadmin
            const isOwnPlaylist = !pl.isPublic || pl._ownedThisSession;
            if (deleteBtn) {
                if (isOwnPlaylist || currentUser?.role === 'admin') {
                    deleteBtn.classList.remove('hidden');
                    deleteBtn.onclick = () => promptDeletePlaylist(id);
                } else {
                    deleteBtn.classList.add('hidden');
                }
            }
            const playBtn = document.getElementById('playlist-detail-play-btn');
            if (playBtn) playBtn.onclick = () => {
                if (plSongs.length) {
                    playSong(songs.findIndex(s => s.id === plSongs[0].id), plSongs);
                    // Update play count realtime di beranda
                    incrementPublicPlaylistPlayCount(id).then(() => renderPublicPlaylists());
                }
            };
        }
    }
}

function closePlaylistDetails() {
    currentOpenPlaylistId = null;
    document.getElementById('playlist-detail-view').classList.add('hidden');
    document.getElementById('custom-playlists-grid').classList.remove('hidden');
    const likedBanner = document.querySelector('#tab-collection > div.cursor-pointer, #tab-collection > div.group');
    if (likedBanner) likedBanner.classList.remove('hidden');
    const playlistsHeading = document.querySelector('#tab-collection > div.flex.items-center');
    if (playlistsHeading) playlistsHeading.classList.remove('hidden');
    const hr = document.querySelector('#tab-collection > hr');
    if (hr) hr.classList.remove('hidden');
}

// Handle cover image change for a playlist
async function handlePlaylistCoverChange(input) {
    const file = input.files[0];
    if (!file || !currentOpenPlaylistId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;
        const coverEl = document.getElementById('playlist-detail-cover');

        // Update preview
        if (coverEl) coverEl.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover">`;

        // Save to local playlist
        const pl = customPlaylists.find(p => p.id === currentOpenPlaylistId);
        if (pl) {
            // Try upload to Supabase storage if available, otherwise use data URL
            let finalCoverUrl = dataUrl;
            if (supabaseClient) {
                try {
                    const path = `covers/playlist_${currentOpenPlaylistId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                    const { error } = await supabaseClient.storage.from('media').upload(path, file);
                    if (!error) {
                        finalCoverUrl = supabaseClient.storage.from('media').getPublicUrl(path).data.publicUrl;
                    }
                } catch(e) { /* fallback to dataUrl */ }
            }
            pl.customCover = finalCoverUrl;
            localStorage.setItem('bemspotipai_playlists', JSON.stringify(customPlaylists));

            // Sync to Supabase if public
            if (pl.isPublic && supabaseClient) {
                try {
                    await supabaseClient.from('public_playlists').update({ cover_url: finalCoverUrl }).eq('id', pl.id);
                    const pubPl = publicPlaylists.find(p => p.id === pl.id);
                    if (pubPl) pubPl.cover_url = finalCoverUrl;
                    renderPublicPlaylists();
                } catch(e) { console.error('Gagal sync cover:', e); }
            }
            // Refresh grids
            renderCustomPlaylists();
            renderSidebarPlaylists();
            showMessage('Cover playlist berhasil diubah');
        }
    };
    reader.readAsDataURL(file);
}

function promptDeletePlaylist(id) { playlistToDelete = id; showModal('delete-playlist-modal'); }

function openAddToPlaylistModal(songId) {
    tempSongIdToAdd = songId;
    const container = document.getElementById('playlist-options');
    container.innerHTML = '';
    if (customPlaylists.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 py-4 text-center">Belum ada playlist kustom. Buat satu dulu!</p>';
    } else {
        customPlaylists.forEach(pl => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm font-medium transition-colors flex justify-between items-center";
            const isAdded = pl.songs.includes(songId);
            btn.innerHTML = `<span>${pl.name}</span>${isAdded ? '<i class="ph-fill ph-check-circle text-spotify-green text-lg"></i>' : '<i class="ph ph-plus text-gray-400 text-lg"></i>'}`;
            btn.onclick = async () => {
                if (isAdded) { pl.songs = pl.songs.filter(id => id !== songId); showMessage(`Dihapus dari '${pl.name}'`, 'error'); }
                else { pl.songs.push(songId); showMessage(`Ditambahkan ke '${pl.name}'`); }
                localStorage.setItem('bemspotipai_playlists', JSON.stringify(customPlaylists));
                // Sync ke Supabase jika playlist publik
                if (pl.isPublic && supabaseClient) {
                    try {
                        await supabaseClient.from('public_playlists').update({ song_ids: pl.songs }).eq('id', pl.id);
                        // Update cache
                        const pubPl = publicPlaylists.find(p => p.id === pl.id);
                        if (pubPl) pubPl.song_ids = pl.songs;
                    } catch(e) { console.error('Gagal sync playlist ke Supabase:', e); }
                }
                closeModal('add-to-playlist-modal');
            };
            container.appendChild(btn);
        });
    }
    showModal('add-to-playlist-modal');
}

function removeSongFromPlaylist(playlistId, songId) {
    const pl = customPlaylists.find(p => p.id === playlistId);
    if (pl) {
        pl.songs = pl.songs.filter(id => id !== songId);
        localStorage.setItem('bemspotipai_playlists', JSON.stringify(customPlaylists));
        showMessage('Lagu dihapus dari playlist');
        showPlaylistDetails(playlistId); renderCustomPlaylists();
    }
}

// ==========================================
// SONG CARDS & RENDER
// ==========================================
function createSongCard(song, index, playlistId = null, contextQueue = null) {
    const card = document.createElement('div');
    card.className = 'bg-spotify-elevated p-4 rounded-md hover:bg-spotify-highlight transition-colors group cursor-pointer relative';
    const fallbackImg = 'https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=300&q=80';
    const isLiked = likedSongsIds.includes(song.id);
    let removeBtnHtml = '';
    const isPublicPlaylist = playlistId && playlistId.startsWith('pub_');
    const canRemove = playlistId
        && !['liked','trending','all','artist'].includes(playlistId)
        && (!isPublicPlaylist || (currentUser && currentUser.role === 'admin'));
    if (canRemove) {
        removeBtnHtml = `<button class="absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100 z-20 shadow-md" title="Hapus dari Playlist"><i class="ph ph-trash text-lg"></i></button>`;
    }
    card.innerHTML = `
        <div class="relative mb-4 pb-[100%] shadow-lg rounded overflow-hidden">
            <img src="${song.coverUrl}" onerror="this.src='${fallbackImg}'" alt="Cover" class="song-card-img absolute top-0 left-0 w-full h-full object-cover">
            ${removeBtnHtml}
            <div class="absolute top-2 right-2 flex gap-2 z-20">
                <button class="btn-add-playlist p-1 rounded-full bg-black/40 hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100" title="Tambah ke Playlist"><i class="ph ph-list-plus text-white text-xl"></i></button>
                <button class="btn-like p-1 rounded-full bg-black/40 hover:bg-black/80 transition-colors ${isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}" title="Suka"><i class="${isLiked ? 'ph-fill text-spotify-green' : 'ph text-white'} ph-heart text-xl drop-shadow-md"></i></button>
            </div>
            <button class="btn-play absolute bottom-2 right-2 bg-spotify-green text-black rounded-full w-12 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105 hover:bg-green-400 z-10"><i class="ph-fill ph-play text-2xl ml-1"></i></button>
        </div>
        <h3 class="font-bold text-white mb-1 truncate text-sm" title="${song.title}">${song.title}</h3>
        <p class="text-xs text-gray-400 truncate" title="${song.artist}">${song.artist}</p>`;

    // Klik kartu atau tombol play → putar dengan konteks
    card.onclick = () => playSong(index, contextQueue);
    const btnPlay = card.querySelector('.btn-play');
    if (btnPlay) btnPlay.onclick = (e) => { e.stopPropagation(); playSong(index, contextQueue); };

    // Tombol hapus dari playlist
    const btnRemove = card.querySelector('.absolute.top-2.left-2');
    if (btnRemove && canRemove) {
        btnRemove.onclick = (e) => { e.stopPropagation(); removeSongFromPlaylist(playlistId, song.id); };
    }

    // Tombol tambah ke playlist
    const btnAddPlaylist = card.querySelector('.btn-add-playlist');
    if (btnAddPlaylist) btnAddPlaylist.onclick = (e) => { e.stopPropagation(); openAddToPlaylistModal(song.id); };

    // Tombol like
    const btnLikeCard = card.querySelector('.btn-like');
    if (btnLikeCard) btnLikeCard.onclick = (e) => { e.stopPropagation(); toggleLikeCard(song.id); };

    return card;
}

function renderSongs(songList, container, playlistId = null) {
    if (!container) return;
    _lastRenderedContext = songList; // simpan konteks aktif untuk playSong
    container.innerHTML = '';
    if (songList.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm col-span-full">Tidak ada lagu yang ditemukan.</p>';
        return;
    }
    songList.forEach(song => {
        const actualIndex = songs.findIndex(s => s.id === song.id);
        container.appendChild(createSongCard(song, actualIndex, playlistId, songList));
    });
}

function renderLibrary() {
    const tbody = document.getElementById('library-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (songs.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">Arsip kosong.</td></tr>'; return; }
    songs.forEach((song, i) => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-800 hover:bg-gray-800/40 transition-colors cursor-pointer";
        tr.onclick = () => playSong(i);
        tr.innerHTML = `
            <td class="px-6 py-4">${i+1}</td>
            <td class="px-6 py-4 font-medium text-white flex items-center gap-3"><img src="${song.coverUrl}" class="w-10 h-10 rounded object-cover shadow" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=150&q=80'"><div class="truncate max-w-[150px] sm:max-w-xs text-sm">${song.title}</div></td>
            <td class="px-6 py-4 truncate max-w-[120px] text-sm">${song.artist}</td>
            <td class="px-6 py-4 truncate text-sm text-gray-400"><i class="ph-fill ph-headphones mr-1"></i>${song.playCount || 0}</td>
            <td class="px-6 py-4 text-right"><div class="flex items-center justify-end gap-3">
                <button onclick="event.stopPropagation(); playSong(${i})" class="text-spotify-green hover:scale-110 transition-transform flex items-center justify-center" title="Putar"><i class="ph-fill ph-play-circle text-3xl"></i></button>
                <button onclick="event.stopPropagation(); attemptDownload('${song.audioUrl}', '${song.title.replace(/'/g, "\\'")}')" class="text-blue-400 hover:text-white transition-all p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-full w-10 h-10 flex items-center justify-center" title="Download Audio"><i class="ph-bold ph-download-simple text-xl"></i></button>
            </div></td>`;
        tbody.appendChild(tr);
    });
}

// ==========================================
// ADMIN LIBRARY
// ==========================================
function renderAdminLibrary() {
    const tbody = document.getElementById('admin-library-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Uploader tamu hanya melihat lagu yang dia upload di sesi ini
    const isAdmin = currentUser && currentUser.role === 'admin';
    const visibleSongs = isAdmin ? songs : songs.filter(s => uploaderSessionSongIds.includes(s.id));

    if (visibleSongs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-gray-500 text-sm">${isAdmin ? 'Belum ada lagu.' : 'Belum ada lagu yang kamu upload di sesi ini.'}</td></tr>`;
        return;
    }
    visibleSongs.forEach(song => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-800 hover:bg-gray-800/30 transition-colors";
        tr.innerHTML = `
            <td class="px-4 py-2.5"><div class="flex items-center gap-3 overflow-hidden">
                <img src="${song.coverUrl}" class="w-10 h-10 rounded object-cover shadow hidden sm:block flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=150&q=80'">
                <div class="min-w-0"><p class="truncate font-bold text-sm text-white">${song.title}</p><p class="text-xs text-gray-500 truncate">${song.artist}</p></div>
            </div></td>
            <td class="px-4 py-2.5 text-center text-xs text-gray-400">${song.playCount || 0}</td>
            <td class="px-4 py-2.5 text-right"><div class="flex items-center justify-end gap-2">
                ${isAdmin ? `<button onclick="event.stopPropagation(); downloadSong('${song.audioUrl}', '${song.title.replace(/'/g, "\\'")}')" class="text-blue-400 hover:text-white transition-colors p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-full w-9 h-9 flex items-center justify-center" title="Download Audio"><i class="ph-fill ph-download-simple text-lg"></i></button>` : ''}
                <button onclick="event.stopPropagation(); openEditSongModal('${song.id}')" class="text-yellow-500 hover:text-white transition-colors p-2 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-full w-9 h-9 flex items-center justify-center" title="Edit Lagu"><i class="ph-fill ph-pencil-simple text-lg"></i></button>
                <button onclick="event.stopPropagation(); promptDeleteSong('${song.id}')" class="text-red-500 hover:text-white transition-colors p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full w-9 h-9 flex items-center justify-center" title="Hapus Lagu"><i class="ph-fill ph-trash text-lg"></i></button>
            </div></td>`;
        tbody.appendChild(tr);
    });
}

// ==========================================
// LIBRARY / ADMIN SEARCH FILTER
// ==========================================
function filterLibrary(query) {
    const tbody = document.getElementById('library-list');
    if (!tbody) return;
    const q = query.trim().toLowerCase();
    if (!q) { renderLibrary(); return; }

    const filtered = songs.map((song, i) => ({ song, i }))
        .filter(({ song }) => song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q));

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-gray-500 text-sm">Tidak ada lagu yang cocok dengan "<span class="text-white">${query}</span>"</td></tr>`;
        return;
    }
    filtered.forEach(({ song, i }, rowNum) => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-800 hover:bg-gray-800/40 transition-colors cursor-pointer";
        tr.onclick = () => playSong(i);
        tr.innerHTML = `
            <td class="px-6 py-4">${rowNum + 1}</td>
            <td class="px-6 py-4 font-medium text-white flex items-center gap-3"><img src="${song.coverUrl}" class="w-10 h-10 rounded object-cover shadow" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=150&q=80'"><div class="truncate max-w-[150px] sm:max-w-xs text-sm">${song.title}</div></td>
            <td class="px-6 py-4 truncate max-w-[120px] text-sm">${song.artist}</td>
            <td class="px-6 py-4 truncate text-sm text-gray-400"><i class="ph-fill ph-headphones mr-1"></i>${song.playCount || 0}</td>
            <td class="px-6 py-4 text-right"><div class="flex items-center justify-end gap-3">
                <button onclick="event.stopPropagation(); playSong(${i})" class="text-spotify-green hover:scale-110 transition-transform flex items-center justify-center" title="Putar"><i class="ph-fill ph-play-circle text-3xl"></i></button>
                <button onclick="event.stopPropagation(); attemptDownload('${song.audioUrl}', '${song.title.replace(/'/g, "\\'")}')" class="text-blue-400 hover:text-white transition-all p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-full w-10 h-10 flex items-center justify-center" title="Download Audio"><i class="ph-bold ph-download-simple text-xl"></i></button>
            </div></td>`;
        tbody.appendChild(tr);
    });
}

function filterAdminLibrary(query) {
    const tbody = document.getElementById('admin-library-list');
    if (!tbody) return;
    const q = query.trim().toLowerCase();
    if (!q) { renderAdminLibrary(); return; }

    const isAdmin = currentUser && currentUser.role === 'admin';
    const sourceSongs = isAdmin ? songs : songs.filter(s => uploaderSessionSongIds.includes(s.id));
    const filtered = sourceSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-center text-gray-500 text-sm">Tidak ada lagu yang cocok dengan "<span class="text-white">${query}</span>"</td></tr>`;
        return;
    }
    filtered.forEach(song => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-800 hover:bg-gray-800/30 transition-colors";
        tr.innerHTML = `
            <td class="px-4 py-2.5"><div class="flex items-center gap-3 overflow-hidden">
                <img src="${song.coverUrl}" class="w-10 h-10 rounded object-cover shadow hidden sm:block flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=150&q=80'">
                <div class="min-w-0"><p class="truncate font-bold text-sm text-white">${song.title}</p><p class="text-xs text-gray-500 truncate">${song.artist}</p></div>
            </div></td>
            <td class="px-4 py-2.5 text-center text-xs text-gray-400">${song.playCount || 0}</td>
            <td class="px-4 py-2.5 text-right"><div class="flex items-center justify-end gap-2">
                ${isAdmin ? `<button onclick="event.stopPropagation(); downloadSong('${song.audioUrl}', '${song.title.replace(/'/g, "\\'")}')" class="text-blue-400 hover:text-white transition-colors p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-full w-9 h-9 flex items-center justify-center" title="Download Audio"><i class="ph-fill ph-download-simple text-lg"></i></button>` : ''}
                <button onclick="event.stopPropagation(); openEditSongModal('${song.id}')" class="text-yellow-500 hover:text-white transition-colors p-2 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-full w-9 h-9 flex items-center justify-center" title="Edit Lagu"><i class="ph-fill ph-pencil-simple text-lg"></i></button>
                <button onclick="event.stopPropagation(); promptDeleteSong('${song.id}')" class="text-red-500 hover:text-white transition-colors p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full w-9 h-9 flex items-center justify-center" title="Hapus Lagu"><i class="ph-fill ph-trash text-lg"></i></button>
            </div></td>`;
        tbody.appendChild(tr);
    });
}

function promptDeleteSong(id) { songToDelete = id; showModal('delete-song-modal'); }

function openEditSongModal(id) {
    const song = songs.find(s => s.id === id);
    if (!song) return;
    document.getElementById('edit-song-id').value = song.id;
    document.getElementById('edit-title').value = song.title;
    document.getElementById('edit-cover-url').value = song.coverUrl;
    document.getElementById('edit-lyrics').value = song.lyrics || '';
    editArtistTags = song.artist ? song.artist.split(',').map(a => a.trim()).filter(Boolean) : [];
    renderEditArtistTags();
    document.querySelector('input[name="edit_cover_type"][value="url"]').checked = true;
    document.getElementById('edit-cover-url').classList.remove('hidden');
    document.getElementById('edit-cover-file').classList.add('hidden');
    document.getElementById('edit-cover-file').value = '';
    showModal('edit-song-modal');
}

// ==========================================
// DOWNLOAD
// ==========================================
function attemptDownload(url, filename) {
    if (currentUser && currentUser.role === 'admin') {
        downloadSong(url, filename);
    } else {
        showMessage("Login sebagai Admin untuk mengunduh lagu.", "error");
        showModal('login-modal');
    }
}

async function downloadSong(url, filename) {
    try {
        showMessage(`Menyiapkan unduhan: ${filename}...`);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Jaringan bermasalah');
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none'; a.href = blobUrl; a.download = `${filename}.mp3`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(blobUrl); document.body.removeChild(a);
        showMessage(`Unduhan '${filename}' berhasil disiapkan.`);
    } catch (err) {
        console.error("Download failed:", err);
        window.open(url, '_blank');
        showMessage('Membuka di tab baru (izin unduh otomatis ditolak)', 'error');
    }
}

// ==========================================
// SEARCH TAB
// ==========================================
function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const browseSection = document.getElementById('search-browse');
        const resultsSection = document.getElementById('search-results-section');
        const topResult = document.getElementById('search-top-result');
        const songsList = document.getElementById('search-songs-list');
        const allResults = document.getElementById('search-results');
        const headerSearch = document.getElementById('header-search-input');
        if (headerSearch) headerSearch.value = e.target.value;
        if (!query) { browseSection.classList.remove('hidden'); resultsSection.classList.add('hidden'); return; }
        const filtered = songs.filter(s => s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query));
        browseSection.classList.add('hidden'); resultsSection.classList.remove('hidden');
        const fallbackImg = 'https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=300&q=80';
        if (filtered.length > 0) {
            const top = filtered[0]; const topIdx = songs.findIndex(s => s.id === top.id);
            topResult.innerHTML = `<div class="flex flex-col gap-4"><img src="${top.coverUrl}" onerror="this.src='${fallbackImg}'" class="w-24 h-24 rounded-lg object-cover shadow-xl"><div><p class="text-2xl font-extrabold text-white mb-1">${top.title}</p><p class="text-sm text-gray-400 font-medium">${top.artist}</p></div><button class="self-start mt-2 bg-spotify-green hover:bg-green-400 text-black font-bold px-6 py-2.5 rounded-full text-sm transition-colors flex items-center gap-2"><i class="ph-fill ph-play text-base"></i> Putar</button></div>`;
            topResult.querySelector('div').onclick = () => playSong(topIdx, filtered);
            topResult.querySelector('button').onclick = (e) => { e.stopPropagation(); playSong(topIdx, filtered); };
        } else { topResult.innerHTML = '<p class="text-gray-500 text-sm">Tidak ada hasil.</p>'; }
        songsList.innerHTML = '';
        filtered.slice(0, 5).forEach(song => {
            const idx = songs.findIndex(s => s.id === song.id);
            const row = document.createElement('div');
            row.className = "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-spotify-elevated transition-colors cursor-pointer group";
            row.innerHTML = `<img src="${song.coverUrl}" onerror="this.src='${fallbackImg}'" class="w-10 h-10 rounded object-cover shadow flex-shrink-0"><div class="flex-1 min-w-0"><p class="text-sm font-bold text-white truncate">${song.title}</p><p class="text-xs text-gray-400 truncate">${song.artist}</p></div><button class="opacity-0 group-hover:opacity-100 transition-opacity text-white bg-spotify-green rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 hover:bg-green-400"><i class="ph-fill ph-play text-sm ml-0.5"></i></button>`;
            row.onclick = () => playSong(idx, filtered);
            row.querySelector('button').onclick = (e) => { e.stopPropagation(); playSong(idx, filtered); };
            songsList.appendChild(row);
        });
        renderSongs(filtered, allResults, 'all');
    });
}

function renderBrowseCategories() {
    const container = document.getElementById('browse-categories');
    if (!container) return;
    const categories = [
        { name: 'Semua', color: '#1DB954', icon: 'ph-music-notes' },
        { name: 'Pop', color: '#E13300', icon: 'ph-star' },
        { name: 'Religi', color: '#006450', icon: 'ph-moon-stars' },
        { name: 'Nostalgia', color: '#8D67AB', icon: 'ph-clock-clockwise' },
        { name: 'Indie', color: '#1E3264', icon: 'ph-guitar' },
        { name: 'Rap', color: '#BC5900', icon: 'ph-microphone' },
        { name: 'Rock', color: '#B02897', icon: 'ph-lightning' },
        { name: 'Lo-fi', color: '#148A08', icon: 'ph-coffee' },
    ];
    container.innerHTML = categories.map(c => `
        <div class="relative rounded-xl overflow-hidden p-4 h-24 flex items-end cursor-pointer hover:scale-[1.02] transition-transform" style="background:${c.color};" onclick="filterByCategory('${c.name}')">
            <i class="ph-fill ${c.icon} absolute top-3 right-3 text-3xl text-white/60"></i>
            <span class="font-extrabold text-white text-sm relative z-10">${c.name}</span>
        </div>`).join('');
}

function filterByCategory(cat) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) { searchInput.value = cat === 'Semua' ? '' : cat; searchInput.dispatchEvent(new Event('input')); }
}

function renderRequestTable() { /* stub */ }

// ==========================================
// LIKE / LOVE
// ==========================================
function toggleLikeCard(songId) {
    const index = likedSongsIds.indexOf(songId);
    if (index > -1) { likedSongsIds.splice(index, 1); showMessage('Dihapus dari Koleksi Kamu', 'error'); }
    else { likedSongsIds.push(songId); showMessage('Ditambahkan ke Koleksi Kamu'); }
    localStorage.setItem('spotipai_liked', JSON.stringify(likedSongsIds));
    if (currentSongIndex !== -1 && songs[currentSongIndex].id === songId) updateLikeIcon();
    const activeTab = document.querySelector('.content-tab:not(.hidden)');
    if (activeTab && activeTab.id === 'tab-home') renderHome();
    const detailView = document.getElementById('playlist-detail-view');
    const detailTitle = document.getElementById('detail-playlist-title');
    if (activeTab && activeTab.id === 'tab-collection' && detailView && !detailView.classList.contains('hidden')) {
        if (detailTitle && detailTitle.innerText === 'Lagu yang Disukai') showPlaylistDetails('liked');
    }
}

function toggleLike() { if (currentSongIndex === -1) return; toggleLikeCard(songs[currentSongIndex].id); }

function updateLikeIcon() {
    const iLike = iconLike || document.getElementById('icon-like');
    const bLike = btnLike  || document.getElementById('btn-like');
    if (!iLike || !bLike) return;
    if (currentSongIndex === -1) {
        iLike.className = "ph ph-heart text-xl";
        bLike.classList.remove('text-spotify-green'); bLike.classList.add('text-gray-400'); return;
    }
    const songId = songs[currentSongIndex].id;
    if (likedSongsIds.includes(songId)) {
        iLike.className = "ph-fill ph-heart text-xl";
        bLike.classList.add('text-spotify-green'); bLike.classList.remove('text-gray-400');
    } else {
        iLike.className = "ph ph-heart text-xl";
        bLike.classList.remove('text-spotify-green'); bLike.classList.add('text-gray-400');
    }
}

// ==========================================
// LYRICS VIEW
// ==========================================
function updateLyricsView() {
    const lTitle   = lyricsTitle   || document.getElementById('lyrics-title');
    const lArtist  = lyricsArtist  || document.getElementById('lyrics-artist');
    const lContent = lyricsContent || document.getElementById('lyrics-content');
    if (!lTitle || !lArtist || !lContent) return;
    if (currentSongIndex === -1) {
        lTitle.innerText = "Pilih lagu untuk melihat lirik";
        lArtist.innerText = "-";
        lContent.innerHTML = "Belum ada lagu yang diputar."; return;
    }
    const song = songs[currentSongIndex];
    lTitle.innerText = song.title;
    lArtist.innerText = song.artist;
    lContent.innerHTML = '';
    currentSyncedLyrics = null;
    if (song.lyrics && song.lyrics.trim() !== '') {
        const lyricsStr = song.lyrics.trim();
        let parsedLyrics = null;
        if (lyricsStr.startsWith('[') && lyricsStr.includes('"time"')) { try { parsedLyrics = JSON.parse(lyricsStr); } catch(e){} }
        if (!parsedLyrics && lyricsStr.includes('[') && lyricsStr.includes(':')) parsedLyrics = parseLRC(lyricsStr);
        if (!parsedLyrics && lyricsStr.includes('-->')) parsedLyrics = parseSRT(lyricsStr);
        if (parsedLyrics && parsedLyrics.length > 0) {
            currentSyncedLyrics = parsedLyrics;
            currentSyncedLyrics.forEach((line, i) => {
                const p = document.createElement('p');
                p.id = `lyric-line-${i}`;
                p.className = 'lyric-line text-2xl md:text-4xl font-bold text-gray-500/40 transition-all duration-300 cursor-pointer hover:text-gray-300 transform origin-center w-full px-4';
                p.innerText = line.text;
                p.onclick = () => { audio.currentTime = line.time; if (audio.paused) togglePlay(); };
                lContent.appendChild(p);
            });
        } else { lContent.innerText = song.lyrics; }
    } else {
        lContent.innerText = "( Lirik tidak tersedia untuk lagu ini )";
    }
}

// ==========================================
// AUDIO PLAYER
// ==========================================
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60), sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

async function playSong(index, contextQueue = null) {
    if (index < 0 || index >= songs.length) return;

    // Simpan konteks playback (Bug 1 fix)
    if (contextQueue && contextQueue.length > 0) {
        currentQueue = contextQueue;
        currentQueueIndex = contextQueue.findIndex(s => s.id === songs[index].id);
    } else {
        // Konteks global: gunakan songs[] yang di-shuffle agar next/prev acak
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        // Taruh lagu yang diklik di posisi 0 agar langsung diputar
        const clickedSong = songs[index];
        const filteredShuffled = shuffled.filter(s => s.id !== clickedSong.id);
        currentQueue = [clickedSong, ...filteredShuffled];
        currentQueueIndex = 0;
    }

    currentSongIndex = index;
    const song = songs[index];
    audio.src = song.audioUrl ? song.audioUrl.replace('puywjdopumlzvmzbcudr.supabase.co', 'xhgwgdsurorujsvwzdpi.supabase.co') : '';
    // Pastikan DOM elements sudah ada (bisa null jika belum di-init)
    const pTitle  = playerTitle  || document.getElementById('player-title');
    const pArtist = playerArtist || document.getElementById('player-artist');
    const pCover  = playerCover  || document.getElementById('player-cover');
    if (pTitle)  pTitle.innerText  = song.title;
    if (pArtist) pArtist.innerText = song.artist;
    const correctedCoverUrl = song.coverUrl ? song.coverUrl.replace('puywjdopumlzvmzbcudr.supabase.co', 'xhgwgdsurorujsvwzdpi.supabase.co') : '';
    if (pCover)  pCover.src        = correctedCoverUrl;
    // Sync mobile cover
    const pCoverMobile = document.getElementById('player-cover-mobile');
    if (pCoverMobile) pCoverMobile.src = correctedCoverUrl;
    const sb = document.getElementById('main-sidebar');
    if (sb && !sb.classList.contains('sidebar-collapsed')) sb.classList.add('sidebar-collapsed');
    updateLikeIcon(); updateLyricsView();
    incrementPlayCount(song.id);
    audio.play().then(() => { isPlaying = true; updatePlayIcon(); updateQueuePanel(); })
        .catch(e => { console.error(e); showMessage("Gagal memutar audio.", "error"); isPlaying = false; updatePlayIcon(); });
}

async function incrementPlayCount(songId) {
    const now = Date.now();
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (!isAdmin) {
        // Non-admin: throttle — max 1 increment per 60 detik per lagu
        const lastPlayed = window._lastPlayedTime || {};
        if (lastPlayed[songId] && (now - lastPlayed[songId]) < 60000) return;
        lastPlayed[songId] = now; window._lastPlayedTime = lastPlayed;
    }
    // Admin sadmin: tidak ada delay, setiap klik langsung increment

    const songIndex = songs.findIndex(s => s.id === songId);
    if (songIndex !== -1) songs[songIndex].playCount = (songs[songIndex].playCount || 0) + 1;

    // Hanya update bagian trending (bukan re-render seluruh halaman)
    // agar grid "Semua Lagu" tidak ter-shuffle ulang saat klik lagu
    const activeTabEl = document.querySelector('.content-tab:not(.hidden)');
    if (activeTabEl && activeTabEl.id === 'tab-home') renderTrendingOnly();
    if (activeTabEl && activeTabEl.id === 'tab-library') renderLibrary();

    if (!supabaseClient) return;
    try {
        if (isAdmin) {
            // Admin: langsung update tanpa baca dulu (lebih cepat, tidak throttled)
            const { data } = await supabaseClient.from('songs').select('play_count').eq('id', songId).single();
            if (data) await supabaseClient.from('songs').update({ play_count: (data.play_count || 0) + 1 }).eq('id', songId);
        } else {
            const { data } = await supabaseClient.from('songs').select('play_count').eq('id', songId).single();
            if (data) await supabaseClient.from('songs').update({ play_count: (data.play_count || 0) + 1 }).eq('id', songId);
        }
    } catch (err) { console.error("Gagal menambah jumlah putar:", err); }
}

function togglePlay() {
    if (currentSongIndex === -1 && songs.length > 0) return playSong(0);
    else if (currentSongIndex === -1) return showMessage("Belum ada lagu.", "error");
    if (audio.paused) { audio.play(); isPlaying = true; } else { audio.pause(); isPlaying = false; }
    updatePlayIcon();
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const icon = document.getElementById('repeat-icon');
    if (!icon) return;
    if (isRepeat) { icon.classList.remove('text-gray-400'); icon.classList.add('text-spotify-green'); }
    else { icon.classList.add('text-gray-400'); icon.classList.remove('text-spotify-green'); }
}

function updatePlayIcon() {
    const ppi = playPauseIcon || document.getElementById('play-pause-icon');
    if (!ppi) return;
    ppi.className = isPlaying ? "ph-fill ph-pause text-xl sm:text-xl" : "ph-fill ph-play text-xl sm:text-xl ml-1";
}

function nextSong() {
    if (!currentQueue.length) return;
    let nextIdx = currentQueueIndex + 1;
    // When reaching the end, wrap back to start (loop queue)
    if (nextIdx >= currentQueue.length) {
        nextIdx = 0;
        // If queue is the global songs list, reshuffle for variety
        if (currentQueue === songs || currentQueue.length === songs.length) {
            const reshuffled = [...songs].sort(() => Math.random() - 0.5);
            currentQueue = reshuffled;
        }
    }
    currentQueueIndex = nextIdx;
    const song = currentQueue[nextIdx];
    const globalIdx = songs.findIndex(s => s.id === song.id);
    if (globalIdx !== -1) playSong(globalIdx, currentQueue);
}

function prevSong() {
    if (!currentQueue.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    let prevIdx = currentQueueIndex - 1;
    if (prevIdx < 0) prevIdx = currentQueue.length - 1;
    currentQueueIndex = prevIdx;
    const song = currentQueue[prevIdx];
    const globalIdx = songs.findIndex(s => s.id === song.id);
    if (globalIdx !== -1) playSong(globalIdx, currentQueue);
}

function seekAudio(value) { if (audio.duration) audio.currentTime = (value / 100) * audio.duration; }
function changeVolume(value) { audio.volume = value; }
function updateProgressBarColor(input) {
    const pf = progressFill || document.getElementById('progress-fill');
    if (pf) pf.style.width = input.value + '%';
}
function updateVolumeBarColor(input) {
    const vf = volumeFill || document.getElementById('volume-fill');
    const pct = Math.round(input.value * 100);
    if (vf) vf.style.width = pct + '%';
    // Drive the CSS gradient on the track
    input.style.setProperty('--vol', pct + '%');
    // Update volume icon
    const icon = document.getElementById('volume-icon');
    if (icon) {
        if (input.value == 0) icon.className = 'ph ph-speaker-slash';
        else if (input.value < 0.4) icon.className = 'ph ph-speaker-low';
        else if (input.value < 0.7) icon.className = 'ph ph-speaker';
        else icon.className = 'ph ph-speaker-high';
        icon.style.fontSize = '1rem';
    }
}

audio.addEventListener('timeupdate', () => {
    const tc = timeCurrent || document.getElementById('time-current');
    const pb = progressBar || document.getElementById('progress-bar');
    if (tc) tc.innerText = formatTime(audio.currentTime);
    if (audio.duration && pb) {
        pb.value = (audio.currentTime / audio.duration) * 100;
        updateProgressBarColor(pb);
        pb.style.setProperty('--progress', (audio.currentTime / audio.duration * 100) + '%');
    }
    if (currentSyncedLyrics) {
        const lyricsTab = document.getElementById('tab-lyrics');
        if (lyricsTab && !lyricsTab.classList.contains('hidden')) {
            let activeIndex = -1;
            for (let i = 0; i < currentSyncedLyrics.length; i++) {
                if (audio.currentTime >= currentSyncedLyrics[i].time) activeIndex = i; else break;
            }
            document.querySelectorAll('.lyric-line').forEach((el, i) => {
                if (i === activeIndex) { el.classList.remove('text-gray-500/40'); el.classList.add('text-white','scale-110','drop-shadow-lg'); }
                else { el.classList.add('text-gray-500/40'); el.classList.remove('text-white','scale-110','drop-shadow-lg'); }
            });
            if (activeIndex !== -1) { const el = document.getElementById(`lyric-line-${activeIndex}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }
    }
});

audio.addEventListener('loadedmetadata', () => {
    const tt = timeTotal || document.getElementById('time-total');
    if (tt) tt.innerText = formatTime(audio.duration);
});
audio.addEventListener('ended', () => { if (isRepeat) { audio.currentTime = 0; audio.play(); } else nextSong(); });

// ==========================================
// MULTI UPLOAD
// ==========================================
let isMultiUploadMode = false;
let multiArtistTags = [];
let multiSongFiles = []; // { audioFile, title, artist, coverUrl, coverFile, lyrics, lrcFile }

function toggleMultiUploadMode() {
    isMultiUploadMode = !isMultiUploadMode;
    const single = document.getElementById('single-upload-section');
    const multi = document.getElementById('multi-upload-section');
    const btn = document.getElementById('btn-toggle-multi-upload');
    const label = document.getElementById('multi-upload-mode-label');
    if (isMultiUploadMode) {
        single.classList.add('hidden');
        multi.classList.remove('hidden');
        btn.classList.add('border-spotify-green', 'text-spotify-green');
        label.textContent = 'Mode Single';
    } else {
        single.classList.remove('hidden');
        multi.classList.add('hidden');
        btn.classList.remove('border-spotify-green', 'text-spotify-green');
        label.textContent = 'Multi Upload';
    }
}

// Multi-upload artist tags
function renderMultiArtistTags() {
    const container = document.getElementById('multi-artist-tags-container');
    const hidden = document.getElementById('multi-artist-value');
    if (!container) return;
    container.innerHTML = multiArtistTags.map((a, i) => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:#1DB954;color:#000;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">
            ${a}<button type="button" onclick="removeMultiArtistTag(${i})" style="background:none;border:none;color:#000;cursor:pointer;font-size:0.9rem;line-height:1;padding:0 2px;">×</button>
        </span>`).join('');
    if (hidden) hidden.value = multiArtistTags.join(', ');
    // propagate default artist to all rows that still use default
    document.querySelectorAll('.multi-row-use-default').forEach(checkbox => {
        if (checkbox.checked) {
            const rowIdx = parseInt(checkbox.dataset.row);
            if (multiSongFiles[rowIdx]) multiSongFiles[rowIdx].artist = multiArtistTags.join(', ');
            const artistInput = document.getElementById(`multi-row-artist-${rowIdx}`);
            if (artistInput) artistInput.value = multiArtistTags.join(', ');
        }
    });
}

function addMultiArtistTag() {
    const input = document.getElementById('multi-artist-input');
    if (!input) return;
    const val = input.value.trim();
    if (val && !multiArtistTags.includes(val)) { multiArtistTags.push(val); renderMultiArtistTags(); }
    input.value = ''; input.focus();
}
function removeMultiArtistTag(i) { multiArtistTags.splice(i, 1); renderMultiArtistTags(); }

// Handle artist dropdown for multi mode — reuse existing infrastructure
function handleMultiArtistKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); addMultiArtistTag(); }
}

// Handle selecting multiple audio files
function handleMultiAudioSelect(input) {
    const files = Array.from(input.files);
    if (!files.length) return;
    // Merge: keep existing entries for files already in list, add new ones
    const existingNames = multiSongFiles.map(s => s.audioFile.name);
    files.forEach(f => {
        if (!existingNames.includes(f.name)) {
            const titleFromFile = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            multiSongFiles.push({
                audioFile: f,
                title: titleFromFile,
                artist: multiArtistTags.join(', '),
                coverUrl: '',
                coverFile: null,
                lyrics: '',
                lrcFile: null,
            });
        }
    });
    renderMultiSongRows();
}

function renderMultiSongRows() {
    const container = document.getElementById('multi-songs-list');
    if (!container) return;
    container.innerHTML = '';
    if (multiSongFiles.length === 0) return;

    multiSongFiles.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'bg-black/50 border border-gray-700 rounded-xl p-4 space-y-3';
        row.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <i class="ph-fill ph-music-note text-spotify-green flex-shrink-0"></i>
                    <span class="text-xs text-gray-400 truncate">${item.audioFile.name}</span>
                </div>
                <button type="button" onclick="removeMultiRow(${i})" class="text-red-500 hover:text-red-400 p-1 flex-shrink-0" title="Hapus"><i class="ph ph-trash text-base"></i></button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-gray-400 mb-1 font-medium">Judul Lagu</label>
                    <input type="text" id="multi-row-title-${i}" value="${item.title}"
                        class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:outline-none focus:border-spotify-green"
                        oninput="multiSongFiles[${i}].title = this.value">
                </div>
                <div>
                    <label class="block text-xs text-gray-400 mb-1 font-medium flex items-center justify-between">
                        <span>Penyanyi</span>
                        <label class="flex items-center gap-1 font-normal cursor-pointer">
                            <input type="checkbox" class="accent-spotify-green multi-row-use-default" data-row="${i}" ${multiArtistTags.length ? 'checked' : ''}
                                onchange="onMultiRowUseDefault(${i}, this.checked)">
                            <span class="text-gray-500 text-xs">Pakai default</span>
                        </label>
                    </label>
                    <input type="text" id="multi-row-artist-${i}" value="${item.artist}"
                        class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:outline-none focus:border-spotify-green"
                        ${multiArtistTags.length ? 'readonly' : ''}
                        oninput="multiSongFiles[${i}].artist = this.value">
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-gray-400 mb-1 font-medium">Cover (URL atau kosongkan pakai default)</label>
                    <input type="url" id="multi-row-cover-${i}" value="${item.coverUrl}"
                        class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:outline-none focus:border-spotify-green"
                        placeholder="URL cover (opsional)"
                        oninput="multiSongFiles[${i}].coverUrl = this.value">
                </div>
                <div>
                    <label class="block text-xs text-gray-400 mb-1 font-medium flex items-center justify-between">
                        <span>File Lirik (.lrc/.srt)</span>
                        <span id="multi-row-lrc-name-${i}" class="text-spotify-green text-xs"></span>
                    </label>
                    <input type="file" accept=".lrc,.srt" class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                        onchange="handleMultiRowLrc(${i}, this)">
                </div>
            </div>`;
        container.appendChild(row);
    });
}

function onMultiRowUseDefault(rowIdx, checked) {
    const artistInput = document.getElementById(`multi-row-artist-${rowIdx}`);
    if (checked) {
        if (artistInput) { artistInput.value = multiArtistTags.join(', '); artistInput.readOnly = true; }
        if (multiSongFiles[rowIdx]) multiSongFiles[rowIdx].artist = multiArtistTags.join(', ');
    } else {
        if (artistInput) { artistInput.readOnly = false; artistInput.focus(); }
    }
}

function handleMultiRowLrc(rowIdx, input) {
    const file = input.files[0];
    if (!file) return;
    multiSongFiles[rowIdx].lrcFile = file;
    const nameEl = document.getElementById(`multi-row-lrc-name-${rowIdx}`);
    if (nameEl) nameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => { multiSongFiles[rowIdx].lyrics = e.target.result; };
    reader.readAsText(file);
}

function removeMultiRow(i) {
    multiSongFiles.splice(i, 1);
    renderMultiSongRows();
}

function clearMultiUpload() {
    multiSongFiles = [];
    multiArtistTags = [];
    renderMultiArtistTags();
    renderMultiSongRows();
    const audioInput = document.getElementById('multi-audio-files');
    if (audioInput) audioInput.value = '';
    const coverUrl = document.getElementById('multi-cover-url');
    if (coverUrl) coverUrl.value = '';
}

async function submitMultiUpload() {
    if (!supabaseClient) return showMessage('Supabase belum dikonfigurasi.', 'error');
    if (multiSongFiles.length === 0) return showMessage('Pilih file audio terlebih dahulu.', 'error');

    const btn = document.getElementById('btn-multi-submit');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg"></i> Mengupload...';

    // Resolve shared cover
    let sharedCoverUrl = '';
    const sharedCoverType = document.querySelector('input[name="multi_cover_type"]:checked')?.value || 'url';
    if (sharedCoverType === 'url') {
        sharedCoverUrl = document.getElementById('multi-cover-url')?.value.trim() || '';
    } else {
        const f = document.getElementById('multi-cover-file')?.files[0];
        if (f) {
            try {
                const path = `covers/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                const { error } = await supabaseClient.storage.from('media').upload(path, f);
                if (!error) sharedCoverUrl = supabaseClient.storage.from('media').getPublicUrl(path).data.publicUrl;
            } catch(e) { console.warn('Cover upload failed', e); }
        }
    }

    let successCount = 0, failCount = 0;
    for (let i = 0; i < multiSongFiles.length; i++) {
        const item = multiSongFiles[i];
        const titleInput = document.getElementById(`multi-row-title-${i}`);
        const artistInput = document.getElementById(`multi-row-artist-${i}`);
        const coverInput = document.getElementById(`multi-row-cover-${i}`);
        const title = (titleInput?.value || item.title).trim();
        const artist = (artistInput?.value || item.artist).trim();
        const coverUrl = (coverInput?.value || item.coverUrl || sharedCoverUrl).trim();
        const lyrics = item.lyrics || '';

        if (!title || !artist) { showMessage(`Baris ${i+1}: Judul dan penyanyi wajib diisi`, 'error'); failCount++; continue; }

        btn.innerHTML = `<i class="ph ph-spinner text-lg"></i> Upload ${i+1}/${multiSongFiles.length}...`;

        try {
            // Upload audio
            const audioPath = `audio/${Date.now()}_${item.audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
            const { error: audioErr } = await supabaseClient.storage.from('media').upload(audioPath, item.audioFile);
            if (audioErr) throw audioErr;
            const audioUrl = supabaseClient.storage.from('media').getPublicUrl(audioPath).data.publicUrl;

            // Resolve cover
            let finalCoverUrl = coverUrl;
            if (!finalCoverUrl) finalCoverUrl = 'https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=300&q=80';

            const newSongData = { id: Date.now().toString() + i, title, artist, cover_url: finalCoverUrl, audio_url: audioUrl, lyrics, play_count: 0 };
            const { error: dbErr } = await supabaseClient.from('songs').insert([newSongData]);
            if (dbErr) throw dbErr;

            songs.unshift({ id: newSongData.id, title, artist, coverUrl: finalCoverUrl, audioUrl, lyrics, playCount: 0 });
            if (isUploaderMode && !(currentUser && currentUser.role === 'admin')) uploaderSessionSongIds.push(newSongData.id);
            successCount++;
        } catch(err) {
            console.error(`Upload gagal untuk ${title}:`, err);
            showMessage(`Gagal: ${title} — ${err.message}`, 'error');
            failCount++;
        }
    }

    sortSongs();
    btn.disabled = false;
    btn.innerHTML = originalHtml;

    if (successCount > 0) {
        showMessage(`${successCount} lagu berhasil diupload!${failCount ? ` (${failCount} gagal)` : ''}`);
        clearMultiUpload();
        renderAdminLibrary();
        switchTab('admin-manage');
    }
}

// ==========================================
// ADD SONG FORM
// ==========================================
function initAddSongForm() {
    const form = document.getElementById('add-song-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabaseClient) return showMessage("Supabase belum dikonfigurasi.", "error");
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Mengunggah..."; submitBtn.disabled = true;
        try {
            const title = document.getElementById('add-title').value.trim();
            const artist = document.getElementById('add-artist').value.trim();
            const lyrics = document.getElementById('add-lyrics').value.trim();
            const coverType = document.querySelector('input[name="cover_type"]:checked').value;
            const audioType = document.querySelector('input[name="audio_type"]:checked').value;
            let coverUrl = '', audioUrl = '';
            if (coverType === 'url') { coverUrl = document.getElementById('add-cover-url').value.trim(); }
            else {
                const file = document.getElementById('add-cover-file').files[0];
                if (file) {
                    const path = `covers/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                    const { error } = await supabaseClient.storage.from('media').upload(path, file);
                    if (error) throw error;
                    coverUrl = supabaseClient.storage.from('media').getPublicUrl(path).data.publicUrl;
                }
            }
            if (audioType === 'url') { audioUrl = document.getElementById('add-audio-url').value.trim(); }
            else {
                const file = document.getElementById('add-audio-file').files[0];
                if (file) {
                    const path = `audio/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                    const { error } = await supabaseClient.storage.from('media').upload(path, file);
                    if (error) throw error;
                    audioUrl = supabaseClient.storage.from('media').getPublicUrl(path).data.publicUrl;
                }
            }
            if (!title || !artist || !coverUrl || !audioUrl) { showMessage('Semua kolom utama harus diisi (URL atau File)', 'error'); return; }
            const newSongData = { id: Date.now().toString(), title, artist, cover_url: coverUrl, audio_url: audioUrl, lyrics, play_count: 0 };
            const { error: dbError } = await supabaseClient.from('songs').insert([newSongData]);
            if (dbError) throw dbError;
            songs.unshift({ id: newSongData.id, title, artist, coverUrl, audioUrl, lyrics, playCount: 0 });
            sortSongs();
            showMessage(`Berhasil menambahkan: ${title}`);
            form.reset(); resetArtistTags(); populateArtistSuggestions();
            // Catat ID lagu yang diupload oleh uploader tamu
            if (isUploaderMode && !(currentUser && currentUser.role === 'admin')) {
                uploaderSessionSongIds.push(newSongData.id);
            }
            if (currentUser && currentUser.role === 'admin') { renderAdminLibrary(); switchTab('admin-manage'); }
            else if (isUploaderMode) { renderAdminLibrary(); switchTab('admin-manage'); }
        } catch (error) { console.error("Error saving song:", error); showMessage('Kesalahan: ' + error.message, 'error'); }
        finally { submitBtn.innerText = originalText; submitBtn.disabled = false; }
    });
}

// ==========================================
// EDIT SONG FORM
// ==========================================
function initEditSongForm() {
    const form = document.getElementById('edit-song-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabaseClient) return showMessage("Supabase belum dikonfigurasi.", "error");
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = "Menyimpan..."; btn.disabled = true;
        try {
            const id = document.getElementById('edit-song-id').value;
            const title = document.getElementById('edit-title').value.trim();
            const artist = document.getElementById('edit-artist').value.trim();
            const lyrics = document.getElementById('edit-lyrics').value.trim();
            const coverType = document.querySelector('input[name="edit_cover_type"]:checked').value;
            let coverUrl = document.getElementById('edit-cover-url').value.trim();
            const currentSong = songs.find(s => s.id === id);
            if (coverType === 'file') {
                const file = document.getElementById('edit-cover-file').files[0];
                if (file) {
                    const path = `covers/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                    const { error } = await supabaseClient.storage.from('media').upload(path, file);
                    if (error) throw error;
                    coverUrl = supabaseClient.storage.from('media').getPublicUrl(path).data.publicUrl;
                } else { coverUrl = currentSong.coverUrl; }
            } else { if (!coverUrl) coverUrl = currentSong.coverUrl; }
            const { data, error } = await supabaseClient.from('songs').update({ title, artist, cover_url: coverUrl, lyrics }).eq('id', id).select();
            if (error) throw error;
            if (!data || data.length === 0) { showMessage('Gagal: Pastikan Policy UPDATE di Supabase sudah diizinkan!', 'error'); return; }
            if (currentSong) { currentSong.title = title; currentSong.artist = artist; currentSong.coverUrl = coverUrl; currentSong.lyrics = lyrics; }
            showMessage(`Lagu '${title}' berhasil diperbarui`);
            closeModal('edit-song-modal'); renderAdminLibrary();
            if (!document.getElementById('tab-home').classList.contains('hidden')) renderHome();
            if (!document.getElementById('tab-library').classList.contains('hidden')) renderLibrary();
            if (currentSongIndex !== -1 && songs[currentSongIndex].id === id) {
                if (playerTitle) playerTitle.innerText = title;
                if (playerArtist) playerArtist.innerText = artist;
                if (playerCover) playerCover.src = coverUrl;
                updateLyricsView();
            }
        } catch (err) { console.error("Edit failed:", err); showMessage("Gagal memperbarui lagu.", "error"); }
        finally { btn.innerText = originalText; btn.disabled = false; }
    });
}

// ==========================================
// DELETE SONG
// ==========================================
function initDeleteSong() {
    const btn = document.getElementById('confirm-delete-song-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!songToDelete || !supabaseClient) return;
        const originalText = btn.innerText;
        btn.innerText = "Menghapus..."; btn.disabled = true;
        try {
            const { data, error } = await supabaseClient.from('songs').delete().eq('id', songToDelete).select();
            if (error) throw error;
            if (!data || data.length === 0) { showMessage('Gagal Hapus: Izin DELETE di Supabase belum diaktifkan!', 'error'); closeModal('delete-song-modal'); songToDelete = null; return; }
            songs = songs.filter(s => s.id !== songToDelete);
            showMessage('Lagu berhasil dihapus dari database');
            renderAdminLibrary();
            if (!document.getElementById('tab-home').classList.contains('hidden')) renderHome();
            if (!document.getElementById('tab-library').classList.contains('hidden')) renderLibrary();
            closeModal('delete-song-modal');
        } catch (error) { console.error("Delete failed:", error); showMessage('Gagal menghapus lagu.', 'error'); }
        finally { btn.innerText = originalText; btn.disabled = false; songToDelete = null; }
    });
}

// ==========================================
// LOAD DATA
// ==========================================
async function loadPublicData() {
    if (supabaseClient) {
        try {
            const { data: sData, error: sErr } = await supabaseClient.from('songs').select('*').order('created_at', { ascending: false });
            if (!sErr && sData) {
                songs = sData.map(s => {
                    let cover = s.cover_url;
                    if (!cover || cover.trim() === "" || cover.includes("null") || cover.includes("undefined")) {
                        if (s.title.toLowerCase().includes("sency")) cover = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80";
                        else if (s.title.toLowerCase().includes("berubah")) cover = "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&q=80";
                        else cover = "https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=150&q=80";
                    }
                    return { id: s.id, title: s.title, artist: s.artist, coverUrl: cover, audioUrl: s.audio_url, lyrics: s.lyrics, playCount: s.play_count || 0 };
                });
                sortSongs();
            }
        } catch (err) { console.error(err); }
    } else {
        showMessage('Peringatan: URL Supabase belum diisi di kode', 'error');
    }
    renderHome(); renderLibrary(); populateArtistSuggestions();
    loadPublicPlaylists(); // Load playlist publik dari pendengar
}

// ==========================================
// RADIO BUTTON TOGGLE
// ==========================================
function initRadioToggles() {
    document.querySelectorAll('input[name="cover_type"]').forEach(radio => {
        radio.addEventListener('change', e => {
            document.getElementById('add-cover-url').classList.toggle('hidden', e.target.value !== 'url');
            document.getElementById('add-cover-file').classList.toggle('hidden', e.target.value === 'url');
        });
    });
    document.querySelectorAll('input[name="audio_type"]').forEach(radio => {
        radio.addEventListener('change', e => {
            document.getElementById('add-audio-url').classList.toggle('hidden', e.target.value !== 'url');
            document.getElementById('add-audio-file').classList.toggle('hidden', e.target.value === 'url');
        });
    });
    document.querySelectorAll('input[name="edit_cover_type"]').forEach(radio => {
        radio.addEventListener('change', e => {
            document.getElementById('edit-cover-url').classList.toggle('hidden', e.target.value !== 'url');
            document.getElementById('edit-cover-file').classList.toggle('hidden', e.target.value === 'url');
        });
    });
    document.querySelectorAll('input[name="multi_cover_type"]').forEach(radio => {
        radio.addEventListener('change', e => {
            const urlEl = document.getElementById('multi-cover-url');
            const fileEl = document.getElementById('multi-cover-file');
            if (urlEl) urlEl.classList.toggle('hidden', e.target.value !== 'url');
            if (fileEl) fileEl.classList.toggle('hidden', e.target.value === 'url');
        });
    });
}

// ==========================================
// PUBLIC PLAYLISTS (Supabase)
// ==========================================
let publicPlaylists = []; // Cache dari Supabase

// Load + render public playlists di beranda
async function loadPublicPlaylists() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('public_playlists')
            .select('*')
            .eq('is_public', true)
            .order('play_count', { ascending: false });
        if (error) throw error;
        publicPlaylists = data || [];
    } catch (e) {
        console.error('Gagal memuat public playlists:', e);
        publicPlaylists = [];
    }
    renderPublicPlaylists();
}

function renderPublicPlaylists() {
    const grid = document.getElementById('public-playlists-grid');
    const seeAllBtn = document.getElementById('btn-see-all-playlists');
    if (!grid) return;
    grid.innerHTML = '';

    if (publicPlaylists.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 text-sm col-span-full">Belum ada playlist publik. Jadilah yang pertama!</p>';
        if (seeAllBtn) seeAllBtn.classList.add('hidden');
        return;
    }

    // Tampilkan maks 6, sisanya di halaman "Lihat Semua"
    const displayed = publicPlaylists.slice(0, 6);
    if (seeAllBtn) {
        publicPlaylists.length > 6 ? seeAllBtn.classList.remove('hidden') : seeAllBtn.classList.add('hidden');
    }

    displayed.forEach(pl => {
        const card = buildPublicPlaylistCard(pl);
        grid.appendChild(card);
    });
}

function buildPublicPlaylistCard(pl) {
    const songIds = Array.isArray(pl.song_ids) ? pl.song_ids : (pl.song_ids || []);
    const coverSong = songs.find(s => songIds.includes(s.id));
    const coverUrl = pl.cover_url || coverSong?.coverUrl || 'https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=300&q=80';
    const songCount = songIds.length;
    const creatorLine = pl.show_creator && pl.creator_name
        ? `<p class="text-xs text-gray-500 truncate mt-0.5">oleh ${pl.creator_name}</p>`
        : `<p class="text-xs text-gray-500 truncate mt-0.5">${songCount} lagu</p>`;

    const card = document.createElement('div');
    card.className = 'bg-spotify-elevated p-4 rounded-md hover:bg-spotify-highlight transition-colors cursor-pointer group';
    card.onclick = () => openPublicPlaylistDetail(pl.id);
    card.innerHTML = `
        <div class="relative mb-3 pb-[100%] shadow-lg rounded overflow-hidden">
            <img src="${coverUrl}" class="song-card-img absolute top-0 left-0 w-full h-full object-cover"
                onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb51bd3d2c17?w=300&q=80'">
            <button class="absolute bottom-2 right-2 bg-spotify-green text-black rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105 hover:bg-green-400 z-10">
                <i class="ph-fill ph-play text-xl ml-0.5"></i>
            </button>
        </div>
        <h3 class="font-bold text-white text-sm truncate">${pl.name}</h3>
        ${creatorLine}`;

    card.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        playPublicPlaylist(pl);
        setTimeout(() => renderPublicPlaylists(), 600);
    };
    return card;
}

function showAllPublicPlaylistsPage() {
    document.querySelectorAll('.content-tab').forEach(tab => tab.classList.add('hidden'));
    const tab = document.getElementById('tab-all-playlists');
    if (tab) {
        tab.classList.remove('hidden');
        tab.classList.remove('page-enter');
        void tab.offsetWidth;
        tab.classList.add('page-enter');
    }
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('text-white'); item.classList.add('text-gray-400');
    });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });

    const grid = document.getElementById('all-public-playlists-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (publicPlaylists.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 text-sm col-span-full">Belum ada playlist publik.</p>';
        return;
    }
    publicPlaylists.forEach(pl => {
        const card = buildPublicPlaylistCard(pl);
        grid.appendChild(card);
    });
}

async function openPublicPlaylistDetail(playlistId) {
    const pl = publicPlaylists.find(p => p.id === playlistId);
    if (!pl) return;

    // Increment play count
    await incrementPublicPlaylistPlayCount(playlistId);

    const songIds = Array.isArray(pl.song_ids) ? pl.song_ids : [];

    // Find matching local playlist, or create a temporary one
    let localPl = customPlaylists.find(p => p.id === playlistId);
    if (!localPl) {
        // Create a temporary in-memory entry so showPlaylistDetails works
        // NOT marked as _ownedThisSession — this is someone else's public playlist
        localPl = {
            id: playlistId,
            name: pl.name,
            songs: songIds,
            isPublic: true,
            _ownedThisSession: false,
            customCover: pl.cover_url || ''
        };
        customPlaylists.push(localPl);
    } else {
        // Sync song list from Supabase
        localPl.songs = songIds;
        localPl.isPublic = true;
        localPl.customCover = pl.cover_url || localPl.customCover || '';
        // Preserve _ownedThisSession flag — don't overwrite it
    }

    switchTab('collection');
    setTimeout(() => showPlaylistDetails(playlistId), 60);
}

function playPublicPlaylist(pl) {
    const songIds = Array.isArray(pl.song_ids) ? pl.song_ids : [];
    const plSongs = songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
    if (plSongs.length === 0) return showMessage('Playlist ini kosong.', 'error');
    const globalIdx = songs.findIndex(s => s.id === plSongs[0].id);
    if (globalIdx !== -1) playSong(globalIdx, plSongs);
    incrementPublicPlaylistPlayCount(pl.id);
}

async function incrementPublicPlaylistPlayCount(playlistId) {
    if (!supabaseClient) return;
    try {
        const pl = publicPlaylists.find(p => p.id === playlistId);
        const current = pl?.play_count || 0;
        await supabaseClient.from('public_playlists').update({ play_count: current + 1 }).eq('id', playlistId);
        if (pl) {
            pl.play_count = current + 1;
            // Refresh beranda kalau sedang tampil
            const homeTab = document.getElementById('tab-home');
            if (homeTab && !homeTab.classList.contains('hidden')) renderPublicPlaylists();
        }
    } catch (e) { console.error('Gagal update play count playlist:', e); }
}

// ==========================================
// ADMIN: Kelola Playlist Publik
// ==========================================
async function loadAdminPlaylists() {
    if (!supabaseClient) return;
    const container = document.getElementById('admin-playlists-list');
    if (!container) return;
    container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Memuat...</p>';
    try {
        const { data, error } = await supabaseClient
            .from('public_playlists')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Belum ada playlist publik.</p>';
            return;
        }

        container.innerHTML = '';
        data.forEach(pl => {
            const songIds = Array.isArray(pl.song_ids) ? pl.song_ids : [];
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3 p-3 bg-black/30 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors';
            row.innerHTML = `
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        ${(() => {
                            const firstSong = songs.find(s => songIds.includes(s.id));
                            return firstSong
                                ? `<img src="${firstSong.coverUrl}" class="w-full h-full object-cover">`
                                : `<i class="ph ph-playlist text-gray-500 text-lg"></i>`;
                        })()}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-bold text-white truncate">${pl.name}</p>
                        <div class="flex items-center gap-2 flex-wrap mt-0.5">
                            <span class="text-xs ${pl.is_public ? 'text-spotify-green' : 'text-gray-500'}">
                                <i class="ph ph-${pl.is_public ? 'globe' : 'lock'} text-xs"></i> ${pl.is_public ? 'Publik' : 'Privat'}
                            </span>
                            <span class="text-xs text-gray-500">${songIds.length} lagu</span>
                            <span class="text-xs text-gray-500"><i class="ph ph-headphones text-xs"></i> ${pl.play_count || 0}×</span>
                            ${pl.show_creator && pl.creator_name ? `<span class="text-xs text-gray-400">oleh ${pl.creator_name}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button onclick="adminTogglePlaylistVisibility('${pl.id}', ${pl.is_public})"
                        class="text-xs px-3 py-1.5 rounded-full border ${pl.is_public ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/10' : 'border-spotify-green text-spotify-green hover:bg-spotify-green/10'} transition-colors font-bold">
                        ${pl.is_public ? 'Jadikan Privat' : 'Jadikan Publik'}
                    </button>
                    <button onclick="adminDeletePublicPlaylist('${pl.id}', '${pl.name.replace(/'/g, "\\'")}')"
                        class="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors" title="Hapus">
                        <i class="ph-fill ph-trash text-base"></i>
                    </button>
                </div>`;
            container.appendChild(row);
        });
    } catch (e) {
        console.error('Gagal memuat admin playlists:', e);
        container.innerHTML = '<p class="text-red-500 text-sm text-center py-8">Gagal memuat playlist.</p>';
    }
}

async function adminTogglePlaylistVisibility(playlistId, currentlyPublic) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('public_playlists').update({ is_public: !currentlyPublic }).eq('id', playlistId);
        showMessage(`Playlist berhasil dijadikan ${currentlyPublic ? 'privat' : 'publik'}`);
        loadAdminPlaylists();
        loadPublicPlaylists(); // refresh beranda
    } catch (e) { showMessage('Gagal mengubah visibilitas.', 'error'); }
}

async function adminDeletePublicPlaylist(playlistId, name) {
    if (!supabaseClient) return;
    if (!confirm(`Hapus playlist "${name}"?`)) return;
    try {
        await supabaseClient.from('public_playlists').delete().eq('id', playlistId);
        showMessage(`Playlist '${name}' dihapus`);
        // Also remove from local cache
        publicPlaylists = publicPlaylists.filter(p => p.id !== playlistId);
        loadAdminPlaylists();
        renderPublicPlaylists();
        closePlaylistDetails();
    } catch (e) { showMessage('Gagal menghapus playlist.', 'error'); }
}

// ==========================================
// PLAYLIST FORMS
// ==========================================
function initPlaylistForms() {
    // Toggle creator section when public is selected
    const visibilityRadios = document.querySelectorAll('input[name="playlist_visibility"]');
    visibilityRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const creatorSection = document.getElementById('creator-section');
            if (creatorSection) {
                creatorSection.classList.toggle('hidden', radio.value !== 'public' || !radio.checked);
            }
        });
    });

    const createForm = document.getElementById('create-playlist-form');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('playlist-name-input').value.trim();
            if (!name) return;

            const visibilityEl = document.querySelector('input[name="playlist_visibility"]:checked');
            const isPublic = visibilityEl?.value === 'public';
            const creatorName = document.getElementById('playlist-creator-input')?.value.trim() || '';
            const showCreator = document.getElementById('playlist-show-creator')?.checked ?? true;

            const submitBtn = createForm.querySelector('button[type="submit"]');
            const origText = submitBtn.innerText;
            submitBtn.innerText = 'Menyimpan...'; submitBtn.disabled = true;

            try {
                if (isPublic && supabaseClient) {
                    // Simpan ke Supabase sebagai playlist publik
                    const newId = 'pub_' + Date.now();
                    const { error } = await supabaseClient.from('public_playlists').insert([{
                        id: newId,
                        name,
                        creator_name: creatorName,
                        show_creator: showCreator,
                        is_public: true,
                        song_ids: [],
                        play_count: 0
                    }]);
                    if (error) throw error;

                    // Also save locally so user can add songs to it
                    const newPlaylist = { id: newId, name, songs: [], isPublic: true, _ownedThisSession: true };
                    customPlaylists.push(newPlaylist);
                    localStorage.setItem('bemspotipai_playlists', JSON.stringify(customPlaylists));

                    showMessage(`Playlist publik '${name}' berhasil dibuat!`);
                    await loadPublicPlaylists(); // refresh beranda
                } else {
                    // Simpan lokal saja (privat)
                    const newPlaylist = { id: 'pl_' + Date.now(), name, songs: [], isPublic: false };
                    customPlaylists.push(newPlaylist);
                    localStorage.setItem('bemspotipai_playlists', JSON.stringify(customPlaylists));
                    showMessage(`Playlist '${name}' berhasil dibuat`);
                }

                closeModal('create-playlist-modal');
                renderSidebarPlaylists();
                if (!document.getElementById('tab-collection').classList.contains('hidden')) renderCustomPlaylists();

                // Reset form
                document.getElementById('playlist-name-input').value = '';
                if (document.getElementById('playlist-creator-input')) document.getElementById('playlist-creator-input').value = '';
                const creatorSection = document.getElementById('creator-section');
                if (creatorSection) creatorSection.classList.add('hidden');
                const privRadio = document.querySelector('input[name="playlist_visibility"][value="private"]');
                if (privRadio) privRadio.checked = true;
            } catch (err) {
                console.error(err);
                showMessage('Gagal membuat playlist: ' + err.message, 'error');
            } finally {
                submitBtn.innerText = origText; submitBtn.disabled = false;
            }
        });
    }

    const confirmDeletePl = document.getElementById('confirm-delete-playlist-btn');
    if (confirmDeletePl) {
        confirmDeletePl.addEventListener('click', async () => {
            if (!playlistToDelete) return;
            const pl = customPlaylists.find(p => p.id === playlistToDelete);
            const plName = pl?.name || 'Playlist';

            // If it's a public playlist, also delete from Supabase
            if (pl?.isPublic && supabaseClient) {
                try {
                    await supabaseClient.from('public_playlists').delete().eq('id', playlistToDelete);
                    publicPlaylists = publicPlaylists.filter(p => p.id !== playlistToDelete);
                    renderPublicPlaylists();
                } catch (e) { console.error('Gagal hapus dari Supabase:', e); }
            }

            customPlaylists = customPlaylists.filter(p => p.id !== playlistToDelete);
            localStorage.setItem('bemspotipai_playlists', JSON.stringify(customPlaylists));
            showMessage(`Playlist '${plName}' berhasil dihapus`, 'error');
            closeModal('delete-playlist-modal'); closePlaylistDetails();
            renderSidebarPlaylists(); renderCustomPlaylists();
            playlistToDelete = null;
        });
    }
}

// ==========================================
// WINDOW ONLOAD
// ==========================================
window.onload = () => {
    // Inisialisasi DOM elements
    playerTitle   = document.getElementById('player-title');
    playerArtist  = document.getElementById('player-artist');
    playerCover   = document.getElementById('player-cover');
    playPauseIcon = document.getElementById('play-pause-icon');
    progressBar   = document.getElementById('progress-bar');
    progressFill  = document.getElementById('progress-fill');
    timeCurrent   = document.getElementById('time-current');
    timeTotal     = document.getElementById('time-total');
    volumeBar     = document.getElementById('volume-bar');
    volumeFill    = document.getElementById('volume-fill');
    iconLike      = document.getElementById('icon-like');
    btnLike       = document.getElementById('btn-like');
    lyricsTitle   = document.getElementById('lyrics-title');
    lyricsArtist  = document.getElementById('lyrics-artist');
    lyricsContent = document.getElementById('lyrics-content');

    // Inisialisasi Supabase client setelah CDN pasti siap
    if (typeof supabase !== 'undefined' && SUPABASE_URL !== 'TARUH_URL_SUPABASE_KAMU_DISINI') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    loadPublicData();
    document.querySelectorAll('aside .nav-item[data-tab="home"]').forEach(i => i.classList.add('text-white'));
    renderCustomPlaylists();
    renderSidebarPlaylists();
    updateUploadBtn();
    initRadioToggles();
    initLoginForm();
    initAddSongForm();
    initEditSongForm();
    initDeleteSong();
    initPlaylistForms();
    initSearch();
    initEasterEgg();

    // Drag-to-scroll artis populer — cegah gambar ikut ke-drag
    const artistGrid = document.getElementById('trending-artists-grid');
    if (artistGrid) {
        let isDown = false, startX, scrollLeft;
        artistGrid.addEventListener('mousedown', e => {
            isDown = true; artistGrid.classList.add('dragging');
            startX = e.pageX - artistGrid.offsetLeft; scrollLeft = artistGrid.scrollLeft;
        });
        artistGrid.addEventListener('mouseleave', () => { isDown = false; artistGrid.classList.remove('dragging'); });
        artistGrid.addEventListener('mouseup', () => { isDown = false; artistGrid.classList.remove('dragging'); });
        artistGrid.addEventListener('mousemove', e => {
            if (!isDown) return; e.preventDefault();
            const x = e.pageX - artistGrid.offsetLeft;
            artistGrid.scrollLeft = scrollLeft - (x - startX) * 1.5;
        });
        // Cegah drag pada semua gambar di dalam grid artis
        artistGrid.addEventListener('dragstart', e => e.preventDefault());
    }

    // Klik nama penyanyi di player → buka halaman artis (artis pertama untuk multi-artis)
    const playerArtistEl = document.getElementById('player-artist');
    if (playerArtistEl) {
        playerArtistEl.style.cursor = 'pointer';
        playerArtistEl.title = 'Lihat halaman artis';
        playerArtistEl.addEventListener('click', () => {
            if (currentSongIndex === -1) return;
            const artistStr = songs[currentSongIndex].artist;
            if (!artistStr) return;
            const firstArtist = getArtistNames(artistStr)[0] || artistStr;
            showArtistPage(firstArtist);
        });
    }

    // Enter listener untuk artist tag inputs
    const addArtistInput = document.getElementById('add-artist-input');
    if (addArtistInput) addArtistInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addArtistTag(); } });
    const editArtistInput = document.getElementById('edit-artist-input');
    if (editArtistInput) editArtistInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addEditArtistTag(); } });

    // Sync header search dengan search tab
    const headerSearch = document.getElementById('header-search-input');
    const searchTabInput = document.getElementById('search-input');
    if (headerSearch && searchTabInput) {
        searchTabInput.addEventListener('input', e => { headerSearch.value = e.target.value; });
    }

    // Easter egg: aktifkan setelah 1 detik
    setTimeout(() => {
        canClickError = true;
        const statusEl = document.getElementById('error-status');
        if (statusEl) statusEl.innerHTML = "<strong>Status:</strong> Failed to resolve server response";
    }, 1000);

    // Error date di 404 screen
    const errDate = document.getElementById('error-date');
    if (errDate) errDate.textContent = new Date().toUTCString();
};