// ========== VARIABLES GLOBAL ==========
let zIndex = 100;
let pinnedApps = ['settings', 'files', 'browser', 'photos', 'notes', 'terminal', 'calendar', 'calculator', 'weather', 'music', 'video'];
let dockItems = [];
let contextMenuTarget = null;
let soundLevel = 75;
let brightnessLevel = 80;
let wifiOn = true;
let batteryLevel = 92;
let widgets = [];
let hideTimer = null;
let mouseY = 0;
let cameraStream = null;

// File Manager variables
let currentFolder = 'home';
let selectedFiles = [];
let fileSystem = {
    home: {
        name: 'Home',
        type: 'folder',
        items: ['documents', 'downloads', 'pictures', 'music', 'videos', 'project', 'tugas.docx', 'wallpaper.jpg', 'lagu.mp3', 'video.mp4', 'setup.exe', 'data.xlsx']
    },
    documents: {
        name: 'Documents',
        type: 'folder',
        items: ['tugas.docx', 'data.xlsx', 'notes.txt', 'proposal.pdf']
    },
    downloads: {
        name: 'Downloads',
        type: 'folder',
        items: ['setup.exe', 'installer.dmg', 'archive.zip']
    },
    pictures: {
        name: 'Pictures',
        type: 'folder',
        items: ['wallpaper.jpg', 'foto1.png', 'foto2.jpg', 'screenshot.png']
    },
    music: {
        name: 'Music',
        type: 'folder',
        items: ['lagu.mp3', 'song1.mp3', 'song2.mp3', 'playlist.m3u']
    },
    videos: {
        name: 'Videos',
        type: 'folder',
        items: ['video.mp4', 'movie.mp4', 'clip.avi']
    },
    project: {
        name: 'Project',
        type: 'folder',
        items: ['index.html', 'style.css', 'script.js', 'readme.txt']
    }
};

let fileDetails = {
    'tugas.docx': { type: 'document', size: '245 KB', modified: '2025-02-20', icon: '📄' },
    'data.xlsx': { type: 'spreadsheet', size: '180 KB', modified: '2025-02-19', icon: '📊' },
    'notes.txt': { type: 'text', size: '2 KB', modified: '2025-02-21', icon: '📝' },
    'proposal.pdf': { type: 'pdf', size: '1.2 MB', modified: '2025-02-18', icon: '📕' },
    'wallpaper.jpg': { type: 'image', size: '850 KB', modified: '2025-02-17', icon: '🖼️' },
    'foto1.png': { type: 'image', size: '2.1 MB', modified: '2025-02-16', icon: '🖼️' },
    'foto2.jpg': { type: 'image', size: '1.5 MB', modified: '2025-02-15', icon: '🖼️' },
    'screenshot.png': { type: 'image', size: '320 KB', modified: '2025-02-21', icon: '📸' },
    'lagu.mp3': { type: 'audio', size: '3.5 MB', modified: '2025-02-14', icon: '🎵' },
    'song1.mp3': { type: 'audio', size: '4.2 MB', modified: '2025-02-13', icon: '🎵' },
    'song2.mp3': { type: 'audio', size: '3.8 MB', modified: '2025-02-12', icon: '🎵' },
    'playlist.m3u': { type: 'playlist', size: '1 KB', modified: '2025-02-11', icon: '📋' },
    'video.mp4': { type: 'video', size: '12 MB', modified: '2025-02-10', icon: '🎬' },
    'movie.mp4': { type: 'video', size: '25 MB', modified: '2025-02-09', icon: '🎬' },
    'clip.avi': { type: 'video', size: '8 MB', modified: '2025-02-08', icon: '🎬' },
    'setup.exe': { type: 'application', size: '5.2 MB', modified: '2025-02-07', icon: '💾' },
    'installer.dmg': { type: 'application', size: '4.5 MB', modified: '2025-02-06', icon: '💾' },
    'archive.zip': { type: 'archive', size: '2.8 MB', modified: '2025-02-05', icon: '🗜️' },
    'index.html': { type: 'code', size: '3 KB', modified: '2025-02-21', icon: '🌐' },
    'style.css': { type: 'code', size: '2 KB', modified: '2025-02-21', icon: '🎨' },
    'script.js': { type: 'code', size: '5 KB', modified: '2025-02-21', icon: '⚙️' },
    'readme.txt': { type: 'text', size: '1 KB', modified: '2025-02-21', icon: '📝' }
};

let recycleBin = [];
let musicPlaylist = [];
let currentMusicIndex = 0;

// App definitions
const apps = {
    'files': {
        title: 'File Explorer', w: 900, h: 550,
        content: `<div class="file-manager-placeholder"></div>`
    },
    'browser': {
        title: 'Pufutara Browser (Bing)', w: 950, h: 600,
        content: `
            <div class="browser-window">
                <div class="browser-toolbar">
                    <div class="browser-nav-buttons">
                        <button class="browser-nav-btn" onclick="browserGoBack(this)"><i class="fas fa-arrow-left"></i></button>
                        <button class="browser-nav-btn" onclick="browserGoForward(this)"><i class="fas fa-arrow-right"></i></button>
                        <button class="browser-nav-btn" onclick="browserRefresh(this)"><i class="fas fa-redo-alt"></i></button>
                    </div>
                    <div class="browser-url-container">
                        <input type="text" class="browser-url" placeholder="Cari dengan Bing atau ketik URL" value="about:blank" onkeydown="browserHandleUrl(event, this)">
                        <button class="browser-go" onclick="browserGo(this)"><i class="fas fa-search"></i></button>
                    </div>
                </div>
                <div class="browser-content">
                    <iframe class="browser-frame" id="browser-frame" src="about:blank" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" style="display: none;"></iframe>
                    <div class="browser-home" id="browser-home" style="display: flex;">
                        <div class="bing-logo">Bing</div>
                        <input type="text" class="search-box-home" placeholder="Cari dengan Bing" onkeydown="browserHomeSearch(event, this)">
                        <div class="browser-home-buttons">
                            <button class="browser-home-btn" onclick="browserSearch(this)">Cari</button>
                        </div>
                    </div>
                </div>
            </div>
        `
    },
    'terminal': {
        title: 'Terminal', w: 600, h: 400,
        content: `<div class="terminal">
            <div class="terminal-line"><span class="terminal-prompt">$</span> welcome to pufutara terminal</div>
            <div class="terminal-line"><span class="terminal-prompt">$</span> type 'help' for commands</div>
            <div class="terminal-line"><span class="terminal-prompt">$</span> <input type="text" class="terminal-input" onkeydown="handleTerminalCommand(event)"></div>
        </div>`
    },
    'settings': {
        title: 'Pengaturan Sistem', w: 700, h: 500,
        content: `
            <div class="settings-window">
                <div class="settings-sidebar">
                    <div class="settings-menu-item active" data-section="general" onclick="switchSettingsSection('general', this)">
                        <i class="fas fa-sliders-h"></i> Umum
                    </div>
                    <div class="settings-menu-item" data-section="display" onclick="switchSettingsSection('display', this)">
                        <i class="fas fa-sun"></i> Tampilan
                    </div>
                    <div class="settings-menu-item" data-section="sound" onclick="switchSettingsSection('sound', this)">
                        <i class="fas fa-volume-up"></i> Suara
                    </div>
                    <div class="settings-menu-item" data-section="network" onclick="switchSettingsSection('network', this)">
                        <i class="fas fa-wifi"></i> Jaringan
                    </div>
                    <div class="settings-menu-item" data-section="privacy" onclick="switchSettingsSection('privacy', this)">
                        <i class="fas fa-lock"></i> Privasi
                    </div>
                    <div class="settings-menu-item" data-section="about" onclick="switchSettingsSection('about', this)">
                        <i class="fas fa-info-circle"></i> Tentang
                    </div>
                </div>
                <div class="settings-content">
                    <!-- General Section -->
                    <div class="settings-section active" id="settings-general">
                        <h2>Umum</h2>
                        <div class="settings-group">
                            <div class="settings-group-title">Preferensi</div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Tema Gelap
                                    <small>Gunakan mode gelap di seluruh sistem</small>
                                </div>
                                <div class="settings-control">
                                    <div class="settings-toggle" onclick="toggleSetting('darkMode', this)"></div>
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Notifikasi
                                    <small>Tampilkan notifikasi dari aplikasi</small>
                                </div>
                                <div class="settings-control">
                                    <div class="settings-toggle active" onclick="toggleSetting('notifications', this)"></div>
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Bahasa
                                    <small>Pilih bahasa antarmuka</small>
                                </div>
                                <div class="settings-control">
                                    <select class="settings-select" onchange="changeSetting('language', this.value)">
                                        <option value="id">Indonesia</option>
                                        <option value="en">English</option>
                                        <option value="es">Español</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Display Section -->
                    <div class="settings-section" id="settings-display">
                        <h2>Tampilan</h2>
                        <div class="settings-group">
                            <div class="settings-group-title">Latar Belakang</div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Wallpaper
                                    <small>Ubah gambar latar belakang</small>
                                </div>
                                <div class="settings-control">
                                    <button onclick="openApp('wallpaper')" style="padding:6px 12px; border-radius:6px; border:1px solid #d1d5db; background:white; cursor:pointer;">Pilih</button>
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Kecerahan
                                    <small>Sesuaikan tingkat kecerahan layar</small>
                                </div>
                                <div class="settings-control">
                                    <input type="range" class="settings-slider" min="10" max="100" value="${brightnessLevel}" oninput="setBrightness(this.value)" onchange="setBrightness(this.value)">
                                    <span style="margin-left:8px; font-size:13px;">${brightnessLevel}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="settings-group">
                            <div class="settings-group-title">Skala</div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Ukuran Teks
                                    <small>Perbesar atau perkecil teks</small>
                                </div>
                                <div class="settings-control">
                                    <select class="settings-select" onchange="changeSetting('fontSize', this.value)">
                                        <option value="small">Kecil</option>
                                        <option value="medium" selected>Sedang</option>
                                        <option value="large">Besar</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sound Section -->
                    <div class="settings-section" id="settings-sound">
                        <h2>Suara</h2>
                        <div class="settings-group">
                            <div class="settings-group-title">Volume</div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Volume Sistem
                                    <small>Atur tingkat volume keseluruhan</small>
                                </div>
                                <div class="settings-control">
                                    <input type="range" class="settings-slider" min="0" max="100" value="${soundLevel}" oninput="setSound(this.value)" onchange="setSound(this.value)">
                                    <span style="margin-left:8px; font-size:13px;">${soundLevel}%</span>
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Efek Suara
                                    <small>Putar suara saat interaksi</small>
                                </div>
                                <div class="settings-control">
                                    <div class="settings-toggle active" onclick="toggleSetting('soundEffects', this)"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Network Section -->
                    <div class="settings-section" id="settings-network">
                        <h2>Jaringan</h2>
                        <div class="settings-group">
                            <div class="settings-group-title">WiFi</div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    WiFi
                                    <small>Nyalakan atau matikan WiFi</small>
                                </div>
                                <div class="settings-control">
                                    <div class="settings-toggle ${wifiOn ? 'active' : ''}" onclick="toggleWifi(); this.classList.toggle('active')"></div>
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Jaringan Tersedia
                                </div>
                                <div class="settings-control">
                                    <button style="padding:6px 12px; border-radius:6px; border:1px solid #d1d5db; background:white; cursor:pointer;" onclick="alert('Pencarian jaringan...')">Cari</button>
                                </div>
                            </div>
                        </div>
                        <div class="settings-info-box">
                            <i class="fas fa-info-circle"></i> Status: Terhubung ke "Pufutara_5G"
                        </div>
                    </div>
                    
                    <!-- Privacy Section -->
                    <div class="settings-section" id="settings-privacy">
                        <h2>Privasi</h2>
                        <div class="settings-group">
                            <div class="settings-group-title">Izin</div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Lokasi
                                    <small>Akses lokasi perangkat</small>
                                </div>
                                <div class="settings-control">
                                    <div class="settings-toggle" onclick="toggleSetting('location', this)"></div>
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Kamera
                                    <small>Akses kamera</small>
                                </div>
                                <div class="settings-control">
                                    <div class="settings-toggle" onclick="toggleSetting('camera', this)"></div>
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">
                                    Mikrofon
                                    <small>Akses mikrofon</small>
                                </div>
                                <div class="settings-control">
                                    <div class="settings-toggle" onclick="toggleSetting('microphone', this)"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- About Section -->
                    <div class="settings-section" id="settings-about">
                        <h2>Tentang</h2>
                        <div class="settings-info-box" style="text-align:center; padding:24px;">
                            <div style="font-size:48px; margin-bottom:16px;">🖥️</div>
                            <h3 style="margin:0 0 8px; font-size:20px;">Pufutara OS</h3>
                            <p style="color:#6b7280; margin-bottom:16px;">Versi 5.5 Ultimate Edition</p>
                            <p style="font-size:13px;">Sistem operasi web buatan Indonesia.<br>Dibangun dengan cinta untuk pengalaman desktop modern.</p>
                            <hr style="margin:20px 0; border:0; border-top:1px solid #e5e7eb;">
                            <p style="font-size:12px; color:#9ca3af;">© 2025 Pufutara. Semua hak dilindungi.</p>
                        </div>
                    </div>
                </div>
            </div>
        `
    },
    'calculator': {
        title: 'Kalkulator', w: 280, h: 380,
        content: `<div style="padding:15px; height:100%; display:flex; flex-direction:column;">
            <input type="text" class="calc-display" id="calc-res" readonly value="0">
            <div class="calc-grid" style="padding:0;">
                <button class="calc-btn" onclick="c('C')">C</button><button class="calc-btn" onclick="c('/')">/</button><button class="calc-btn" onclick="c('*')">×</button><button class="calc-btn" onclick="c('back')">⌫</button>
                <button class="calc-btn" onclick="c('7')">7</button><button class="calc-btn" onclick="c('8')">8</button><button class="calc-btn" onclick="c('9')">9</button><button class="calc-btn" onclick="c('-')">-</button>
                <button class="calc-btn" onclick="c('4')">4</button><button class="calc-btn" onclick="c('5')">5</button><button class="calc-btn" onclick="c('6')">6</button><button class="calc-btn" onclick="c('+')">+</button>
                <button class="calc-btn" onclick="c('1')">1</button><button class="calc-btn" onclick="c('2')">2</button><button class="calc-btn" onclick="c('3')">3</button><button class="calc-btn orange" onclick="calc()" style="grid-row:span 2;">=</button>
                <button class="calc-btn" onclick="c('0')" style="grid-column:span 2">0</button><button class="calc-btn" onclick="c('.')">.</button>
            </div>
        </div>`
    },
    'calendar': {
        title: 'Kalender', w: 450, h: 500,
        content: `<div class="calendar-app">
            <div class="calendar-header">
                <h2 id="cal-month-year">Maret 2025</h2>
                <div class="calendar-nav">
                    <button onclick="calendarPrevMonth()"><i class="fas fa-chevron-left"></i></button>
                    <button onclick="calendarNextMonth()"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            <div class="calendar-weekdays">
                <div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div><div>Min</div>
            </div>
            <div class="calendar-dates" id="calendar-dates"></div>
        </div>`
    },
    'music': {
        title: 'Music Player', w: 450, h: 500,
        content: `<div class="music-player-enhanced">
            <h3 style="margin-top:0; margin-bottom:15px;">Music Player</h3>
            <div class="file-input">
                <input type="file" id="music-file-input" accept="audio/*" multiple onchange="handleMusicFiles(this.files)">
                <label for="music-file-input">Pilih file audio</label>
            </div>
            <audio id="music-audio" controls style="width:100%; margin:10px 0;"></audio>
            <div class="playlist" id="music-playlist"></div>
        </div>`
    },
    'video': {
        title: 'Video Player', w: 700, h: 500,
        content: `<div class="video-player-enhanced">
            <video id="video-player" controls style="width:100%; flex:1; background:#000;"></video>
            <div class="video-controls">
                <input type="file" id="video-file-input" accept="video/*" onchange="handleVideoFile(this.files[0])">
                <span>Pilih file video</span>
            </div>
        </div>`
    },
    'camera': {
        title: 'Kamera', w: 600, h: 450,
        content: `
        <div class="camera-container">
            <video id="camera-video" class="camera-video" autoplay playsinline></video>
            <div class="camera-controls">
                <button class="camera-btn capture" onclick="capturePhoto()"><i class="fas fa-camera"></i></button>
                <button class="camera-btn" onclick="toggleCamera()"><i class="fas fa-sync-alt"></i></button>
            </div>
            <div class="camera-flash" id="camera-flash"></div>
        </div>
        <script>
            (function() {
                let video = document.getElementById('camera-video');
                let currentStream = null;
                let usingFrontCamera = true;
                
                function startCamera(facingMode = 'user') {
                    if(currentStream) currentStream.getTracks().forEach(track => track.stop());
                    navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode }, audio: false })
                    .then(function(stream) {
                        video.srcObject = stream;
                        currentStream = stream;
                        window.cameraStream = stream;
                    }).catch(function(err) { alert('Tidak dapat mengakses kamera. Pastikan izin diberikan.'); });
                }
                window.toggleCamera = function() { usingFrontCamera = !usingFrontCamera; startCamera(usingFrontCamera ? 'user' : 'environment'); };
                window.capturePhoto = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);
                    const flash = document.getElementById('camera-flash');
                    flash.classList.add('active');
                    setTimeout(() => flash.classList.remove('active'), 100);
                    const link = document.createElement('a');
                    link.download = 'pufutara-photo-' + Date.now() + '.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                };
                startCamera('user');
            })();
        <\/script>
        `
    },
    'photos': {
        title: 'Photos', w: 600, h: 450,
        content: `<div class="app-content">
            <h3 style="margin-top:0;">Galeri Foto</h3>
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
                <div style="aspect-ratio:1; background:#e5e7eb; border-radius:8px;"></div>
                <div style="aspect-ratio:1; background:#d1d5db; border-radius:8px;"></div>
                <div style="aspect-ratio:1; background:#9ca3af; border-radius:8px;"></div>
            </div>
        </div>`
    },
    'yt': {
        title: 'YouTube Player', w: 600, h: 400,
        content: `
            <iframe src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%;"></iframe>
            <div class="iframe-overlay" style="position:absolute; inset:0; display:none;"></div>`
    },
    'notes': {
        title: 'Catatan', w: 350, h: 400,
        content: `<textarea style="width:100%; height:100%; border:none; padding:20px; resize:none; outline:none; font-family:Inter; font-size:15px; line-height:1.6;" placeholder="Ketik ide brilianmu..."></textarea>`
    },
    'texteditor': {
        title: 'Text Editor', w: 500, h: 400,
        content: `<textarea style="width:100%; height:100%; border:none; padding:20px; resize:none; outline:none; font-family:'Courier New', monospace; font-size:14px;" placeholder="Mulai menulis..."></textarea>`
    },
    'sites': {
        title: 'Sites Builder', w: 850, h: 550,
        content: `<div style="display:flex; flex-direction:column; height:100%;">
            <div style="height:50px; border-bottom:1px solid #ddd; display:flex; align-items:center; padding:0 20px; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;"><div style="width:24px; height:24px; background:#6366f1; border-radius:4px;"></div><span style="font-weight:600; color:#444;">Situs Tanpa Judul</span></div>
                <button onclick="alert('Berhasil dipublikasikan (Bohongan)!')" style="background:#6366f1; color:white; border:none; padding:8px 20px; border-radius:4px; cursor:pointer;">Publikasikan</button>
            </div>
            <div style="flex:1; display:flex; background:#f0f0f0;">
                <div style="flex:1; margin:20px; background:white; box-shadow:0 2px 10px rgba(0,0,0,0.1); display:flex; flex-direction:column;">
                    <div style="height:200px; background:#e0e7ff; display:flex; align-items:end; padding:20px; border-bottom:1px solid #eee;"><h1 style="margin:0; font-size:32px; color:#333;">Judul Halaman Anda</h1></div>
                    <div style="padding:40px; color:#666;">Klik di sini untuk mengedit konten...</div>
                </div>
                <div style="width:200px; background:white; border-left:1px solid #ddd; padding:15px;">
                    <h4 style="margin-top:0;">Sisipkan</h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <button style="padding:10px; border:1px solid #ddd; background:white;">Kotak Teks</button>
                        <button style="padding:10px; border:1px solid #ddd; background:white;">Gambar</button>
                        <button style="padding:10px; border:1px solid #ddd; background:white;">Drive</button>
                        <button style="padding:10px; border:1px solid #ddd; background:white;">Sematkan</button>
                    </div>
                </div>
            </div>
        </div>`
    },
    'wallpaper': {
        title: 'Wallpaper Settings', w: 500, h: 450,
        content: `
        <div style="height:100%; display:flex; flex-direction:column;">
            <div class="wallpaper-tabs">
                <div class="wallpaper-tab active" onclick="switchWallpaperTab('gallery')">Galeri</div>
                <div class="wallpaper-tab" onclick="switchWallpaperTab('upload')">Upload</div>
                <div class="wallpaper-tab" onclick="switchWallpaperTab('colors')">Warna</div>
            </div>
            <div class="wallpaper-tab-content active" id="wallpaper-gallery">
                <div class="wallpaper-grid">
                    <div class="wallpaper-item" onclick="applyWallpaper('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop')"><img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&auto=format&fit=crop" class="wallpaper-preview"></div>
                    <div class="wallpaper-item" onclick="applyWallpaper('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop')"><img src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&auto=format&fit=crop" class="wallpaper-preview"></div>
                    <div class="wallpaper-item" onclick="applyWallpaper('https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop')"><img src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&auto=format&fit=crop" class="wallpaper-preview"></div>
                    <div class="wallpaper-item" onclick="applyWallpaper('https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop')"><img src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&auto=format&fit=crop" class="wallpaper-preview"></div>
                    <div class="wallpaper-item" onclick="applyWallpaper('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop')"><img src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&auto=format&fit=crop" class="wallpaper-preview"></div>
                    <div class="wallpaper-item" onclick="applyWallpaper('https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&auto=format&fit=crop')"><img src="https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&auto=format&fit=crop" class="wallpaper-preview"></div>
                </div>
            </div>
            <div class="wallpaper-tab-content" id="wallpaper-upload">
                <div class="wallpaper-grid"><div class="wallpaper-upload-area" onclick="document.getElementById('file-upload').click()"><div class="wallpaper-upload-icon">📤</div><div class="wallpaper-upload-text">Klik untuk upload gambar</div><div class="wallpaper-upload-text" style="font-size:12px; margin-top:5px;">Format: JPG, PNG, GIF</div></div></div>
                <input type="file" id="file-upload" accept="image/*" style="display:none" onchange="handleWallpaperUpload(event)">
            </div>
            <div class="wallpaper-tab-content" id="wallpaper-colors">
                <div class="wallpaper-grid">
                    <div class="wallpaper-item" style="background:#f9fafb" onclick="applyColorWallpaper('#f9fafb')">Light Gray</div>
                    <div class="wallpaper-item" style="background:#e5e7eb" onclick="applyColorWallpaper('#e5e7eb')">Gray</div>
                    <div class="wallpaper-item" style="background:#dbeafe" onclick="applyColorWallpaper('#dbeafe')">Blue Light</div>
                    <div class="wallpaper-item" style="background:#fef3c7" onclick="applyColorWallpaper('#fef3c7')">Yellow Light</div>
                    <div class="wallpaper-item" style="background:#fce7f3" onclick="applyColorWallpaper('#fce7f3')">Pink Light</div>
                    <div class="wallpaper-item" style="background:#dcfce7" onclick="applyColorWallpaper('#dcfce7')">Green Light</div>
                </div>
            </div>
        </div>`
    },
    'wheel': {
        title: 'Spin Wheel', w: 350, h: 420,
        content: `<div style="display:flex; flex-direction:column; height:100%; align-items:center; justify-content:center; padding:10px;"><canvas id="wheelCanvas" width="300" height="300"></canvas><button onclick="spinWheel()" style="margin-top:15px; background:#111; color:#fff; border:none; padding:10px 40px; border-radius:99px; font-weight:600; cursor:pointer;">PUTAR</button></div>`
    },
    'weather': {
        title: 'Weather', w: 350, h: 300,
        content: `<div class="app-content" style="text-align:center;"><div style="font-size:60px;">☀️</div><div style="font-size:40px; font-weight:700;">32°C</div><div style="color:#666;">Cerah, Jakarta</div><div style="margin-top:20px; font-size:14px; color:#555;">Kelembaban: 65%</div><div style="font-size:14px; color:#555;">Angin: 10 km/h</div></div>`
    },
    'maps': {
        title: 'Maps', w: 600, h: 500,
        content: `<div class="app-content"><h3 style="margin-top:0;">Peta</h3><div style="background:#e5e7eb; height:300px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#666;">🗺️ Peta akan tampil di sini</div></div>`
    },
    'contacts': {
        title: 'Contacts', w: 400, h: 450,
        content: `<div class="app-content"><h3 style="margin-top:0;">Kontak</h3><div style="display:flex; flex-direction:column; gap:10px;"><div style="display:flex; align-items:center; gap:10px; padding:10px; background:#f9fafb; border-radius:8px;"><div style="width:40px; height:40px; background:#3b82f6; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center;">A</div><div><div style="font-weight:600;">Andi</div><div style="font-size:12px; color:#666;">08123456789</div></div></div><div style="display:flex; align-items:center; gap:10px; padding:10px; background:#f9fafb; border-radius:8px;"><div style="width:40px; height:40px; background:#10b981; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center;">B</div><div><div style="font-weight:600;">Budi</div><div style="font-size:12px; color:#666;">08987654321</div></div></div></div></div>`
    },
    'mail': {
        title: 'Mail', w: 600, h: 500,
        content: `<div class="app-content"><h3 style="margin-top:0;">Email</h3><div style="display:flex; flex-direction:column; gap:10px;"><div style="padding:15px; background:#f9fafb; border-radius:8px; cursor:pointer;"><div style="font-weight:600;">Selamat Datang di Pufutara OS</div><div style="font-size:12px; color:#666;">From: System Admin</div></div><div style="padding:15px; background:#f9fafb; border-radius:8px; cursor:pointer;"><div style="font-weight:600;">Update Sistem Tersedia</div><div style="font-size:12px; color:#666;">From: Update Center</div></div></div></div>`
    },
    'snake': {
        title: 'Snake', w: 500, h: 500,
        content: `<div class="game-container"><h3>Snake Game</h3><p>Coming soon...</p></div>`
    },
    'tictactoe': {
        title: 'Tic Tac Toe', w: 400, h: 450,
        content: `<div class="game-container"><h3>Tic Tac Toe</h3><p>Coming soon...</p></div>`
    },
    'memory': {
        title: 'Memory Game', w: 450, h: 500,
        content: `<div class="game-container"><h3>Memory Game</h3><p>Coming soon...</p></div>`
    }
};

// ========== LOCKSCREEN LOGIC ==========
const CORRECT_PASSWORD = "coba tanya putra";
const lockscreen = document.getElementById('lockscreen');
const desktop = document.getElementById('desktop');
const passwordPanel = document.getElementById('passwordPanel');
const passwordInput = document.getElementById('passwordInput');
const errorDiv = document.getElementById('lockscreen-error');

function updateLockscreenClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('lockscreen-time').innerText = timeStr;
    document.getElementById('lockscreen-date').innerText = dateStr;
}
setInterval(updateLockscreenClock, 1000);
updateLockscreenClock();

window.showPasswordPanel = function() {
    passwordPanel.classList.add('show');
    passwordInput.focus();
};

passwordInput.addEventListener('keydown', function(e) {
    if(e.key === 'Enter') {
        if(this.value === CORRECT_PASSWORD) {
            lockscreen.style.opacity = '0';
            setTimeout(() => {
                lockscreen.style.display = 'none';
                desktop.style.display = 'block';
                setTimeout(() => {
                    desktop.classList.add('loaded');
                    initSystem();
                }, 50);
            }, 500);
        } else {
            errorDiv.style.display = 'block';
            this.value = '';
            this.focus();
        }
    }
});

// ========== WELCOME & BOOT SEQUENCE ==========
window.onload = () => {
    // Preload wallpaper
    const img = new Image();
    img.src = '../foto/wallpapersemua.png';
    
    setTimeout(() => { 
        document.getElementById('welcome-bar').style.width = '100%'; 
    }, 100);
    
    setTimeout(() => {
        const welcomeScreen = document.getElementById('welcome-screen');
        const bootScreen = document.getElementById('boot-screen');
        
        welcomeScreen.style.opacity = '0';
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
            bootScreen.style.opacity = '1';
            
            setTimeout(() => { 
                document.getElementById('boot-bar').style.width = '100%'; 
            }, 500);
            
            setTimeout(() => {
                bootScreen.style.opacity = '0';
                setTimeout(() => {
                    bootScreen.style.display = 'none';
                    lockscreen.style.display = 'flex';
                }, 1000);
            }, 3000);
        }, 800);
    }, 3500);
    
    // Initialize start menu items
    initStartMenu();
};

// ========== START MENU INIT ==========
function initStartMenu() {
    const startGrid = document.getElementById('start-grid');
    const appItems = [
        // System Apps
        { id: 'files', icon: '📁', label: 'File Explorer' },
        { id: 'browser', icon: '🌍', label: 'Browser' },
        { id: 'terminal', icon: '💻', label: 'Terminal' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
        { id: 'calculator', icon: '🧮', label: 'Calculator' },
        { id: 'calendar', icon: '📅', label: 'Calendar' },
        
        // Media Apps
        { id: 'music', icon: '🎵', label: 'Music Player' },
        { id: 'camera', icon: '📷', label: 'Camera' },
        { id: 'photos', icon: '🖼️', label: 'Photos' },
        { id: 'video', icon: '🎬', label: 'Video Player' },
        { id: 'yt', icon: '📺', label: 'YouTube' },
        
        // Productivity
        { id: 'notes', icon: '📝', label: 'Notes' },
        { id: 'texteditor', icon: '📄', label: 'Text Editor' },
        { id: 'sites', icon: '🌐', label: 'Sites Builder', color: '#6366f1' },
        
        // Utilities
        { id: 'wallpaper', icon: '🎨', label: 'Wallpaper' },
        { id: 'wheel', icon: '🎡', label: 'Spin Wheel' },
        { id: 'weather', icon: '☀️', label: 'Weather' },
        { id: 'maps', icon: '🗺️', label: 'Maps' },
        { id: 'contacts', icon: '📇', label: 'Contacts' },
        { id: 'mail', icon: '✉️', label: 'Mail' },
        
        // Games
        { id: 'snake', icon: '🐍', label: 'Snake' },
        { id: 'tictactoe', icon: '⭕❌', label: 'Tic Tac Toe' },
        { id: 'memory', icon: '🧠', label: 'Memory' }
    ];
    
    appItems.forEach(app => {
        const item = document.createElement('div');
        item.className = 'start-item';
        item.setAttribute('onclick', `openApp('${app.id}'); toggleStart()`);
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'start-icon';
        iconDiv.textContent = app.icon;
        if (app.color) iconDiv.style.color = app.color;
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'start-label';
        labelDiv.textContent = app.label;
        
        item.appendChild(iconDiv);
        item.appendChild(labelDiv);
        startGrid.appendChild(item);
    });
}

// ========== FUNGSI INISIALISASI DESKTOP ==========
function initSystem() {
    loadSavedData();
    updateClock();
    setInterval(updateClock, 1000);
    updateHomeClock();
    setInterval(updateHomeClock, 1000);
    initDock();
    document.addEventListener('click', closeContextMenu);
    document.addEventListener('contextmenu', closeContextMenu);
    setupAutoHide();
    loadWidgets();
    
    document.querySelectorAll('.start-item').forEach(item => {
        item.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const appId = this.getAttribute('onclick')?.match(/openApp\('(.+?)'\)/)?.[1];
            if(appId) showContextMenu(e, appId, 'start');
        });
    });
}

function setupAutoHide() {
    const desktop = document.getElementById('desktop');
    const topBar = document.getElementById('topBar');
    const dockContainer = document.getElementById('dockContainer');
    let hideTimeout;
    
    desktop.addEventListener('mousemove', (e) => {
        mouseY = e.clientY;
        topBar.classList.remove('hidden');
        dockContainer.classList.remove('hidden');
        clearTimeout(hideTimeout);
        if (e.clientY > 50) {
            hideTimeout = setTimeout(() => {
                if (mouseY > 100) {
                    topBar.classList.add('hidden');
                    dockContainer.classList.add('hidden');
                }
            }, 3000);
        }
    });
    
    topBar.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        topBar.classList.remove('hidden');
    });
    
    dockContainer.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        dockContainer.classList.remove('hidden');
    });
}

// ========== LOAD/SAVE DATA ==========
function loadSavedData() {
    const savedPinned = localStorage.getItem('pufutara_pinned_apps');
    if(savedPinned) pinnedApps = JSON.parse(savedPinned);
    
    const savedWallpaper = localStorage.getItem('pufutara_wallpaper');
    if(savedWallpaper) {
        document.getElementById('desktop').style.backgroundImage = `url(${savedWallpaper})`;
    }
    
    const savedSound = localStorage.getItem('pufutara_sound');
    if(savedSound) {
        soundLevel = parseInt(savedSound);
        document.getElementById('sound-value').textContent = soundLevel + '%';
        document.getElementById('sound-slider').value = soundLevel;
    }
    
    const savedBrightness = localStorage.getItem('pufutara_brightness');
    if(savedBrightness) {
        brightnessLevel = parseInt(savedBrightness);
        document.getElementById('brightness-value').textContent = brightnessLevel + '%';
        document.getElementById('brightness-slider').value = brightnessLevel;
    }
    
    const savedRecycleBin = localStorage.getItem('pufutara_recyclebin');
    if(savedRecycleBin) {
        recycleBin = JSON.parse(savedRecycleBin);
    }
}

function savePinnedApps() {
    localStorage.setItem('pufutara_pinned_apps', JSON.stringify(pinnedApps));
}

function saveWallpaper(url) {
    localStorage.setItem('pufutara_wallpaper', url);
    document.getElementById('desktop').style.backgroundImage = `url(${url})`;
}

function saveSystemSettings() {
    localStorage.setItem('pufutara_sound', soundLevel);
    localStorage.setItem('pufutara_brightness', brightnessLevel);
}

function saveWidgets() {
    const widgetsData = widgets.map(w => ({
        type: w.type,
        x: w.x,
        y: w.y
    }));
    localStorage.setItem('pufutara_widgets', JSON.stringify(widgetsData));
}

function loadWidgets() {
    const savedWidgets = localStorage.getItem('pufutara_widgets');
    if(savedWidgets) {
        const widgetsData = JSON.parse(savedWidgets);
        widgetsData.forEach(widgetData => {
            createWidget(widgetData.type, widgetData.x, widgetData.y);
        });
    }
}

function saveRecycleBin() {
    localStorage.setItem('pufutara_recyclebin', JSON.stringify(recycleBin));
}

// ========== CLOCK ==========
function updateClock() {
    const now = new Date();
    const dateOpts = { weekday: 'short', day: 'numeric', month: 'short' };
    const timeOpts = { hour: '2-digit', minute: '2-digit' };
    const dateStr = now.toLocaleDateString('id-ID', dateOpts);
    const timeStr = now.toLocaleTimeString('id-ID', timeOpts).replace('.', ':');
    document.getElementById('clock').innerText = `${dateStr} - ${timeStr}`;
}

function updateHomeClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('home-time').innerText = timeStr;
    document.getElementById('home-date').innerText = dateStr;
}

// ========== WIDGETS ==========
function toggleWidgetTray() {
    document.getElementById('widgetTray').classList.toggle('show');
}

function closeWidgetTray() {
    document.getElementById('widgetTray').classList.remove('show');
}

function addWidget(type) {
    const x = Math.random() * (window.innerWidth - 200);
    const y = Math.random() * (window.innerHeight - 200) + 50;
    createWidget(type, x, y);
    closeWidgetTray();
}

function createWidget(type, x = 100, y = 100) {
    const widgetId = 'widget-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const widget = document.createElement('div');
    widget.className = 'widget';
    widget.id = widgetId;
    widget.style.left = x + 'px';
    widget.style.top = y + 'px';
    
    let content = '';
    switch(type) {
        case 'clock':
            content = `
                <div class="widget-header"><span>Jam & Tanggal</span><span class="widget-close" onclick="removeWidget('${widgetId}')">×</span></div>
                <div class="clock-widget">
                    <div class="clock-time" id="${widgetId}-time">00:00</div>
                    <div class="clock-date" id="${widgetId}-date">...</div>
                </div>`;
            break;
        case 'system':
            content = `
                <div class="widget-header"><span>Sistem Monitor</span><span class="widget-close" onclick="removeWidget('${widgetId}')">×</span></div>
                <div class="system-widget">
                    <div class="widget-row"><span>CPU</span><span id="${widgetId}-cpu">${Math.floor(Math.random()*30+30)}%</span></div>
                    <div class="progress-bar"><div class="progress-fill" id="${widgetId}-cpu-bar"></div></div>
                    <div class="widget-row"><span>RAM</span><span id="${widgetId}-ram">${Math.floor(Math.random()*30+40)}%</span></div>
                    <div class="progress-bar"><div class="progress-fill" id="${widgetId}-ram-bar"></div></div>
                    <div class="widget-row"><span>Disk</span><span id="${widgetId}-disk">${Math.floor(Math.random()*20+20)}%</span></div>
                    <div class="progress-bar"><div class="progress-fill" id="${widgetId}-disk-bar"></div></div>
                </div>`;
            break;
        case 'weather':
            content = `
                <div class="widget-header"><span>Cuaca</span><span class="widget-close" onclick="removeWidget('${widgetId}')">×</span></div>
                <div class="weather-widget">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div style="font-size:40px;" id="${widgetId}-icon">☀️</div>
                        <div><div class="temp" id="${widgetId}-temp">32°C</div><div class="desc" id="${widgetId}-desc">Cerah, Jakarta</div></div>
                    </div>
                </div>`;
            break;
        case 'notes':
            content = `
                <div class="widget-header"><span>Catatan Cepat</span><span class="widget-close" onclick="removeWidget('${widgetId}')">×</span></div>
                <div class="notes-widget"><textarea id="${widgetId}-notes" placeholder="Tulis catatan di sini..."></textarea></div>`;
            break;
        case 'calendar':
            const now = new Date();
            const days = ['M','S','S','R','K','J','S'];
            let calendarHTML = '<div class="widget-header"><span>Kalender</span><span class="widget-close" onclick="removeWidget(\''+widgetId+'\')">×</span></div>';
            calendarHTML += '<div class="calendar-widget" style="text-align:center;font-size:11px;">';
            calendarHTML += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:5px;">';
            days.forEach(day => calendarHTML += `<div>${day}</div>`);
            calendarHTML += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';
            for(let i=1; i<=31; i++) {
                const isToday = i === now.getDate() ? 'today' : '';
                calendarHTML += `<div class="cal-date ${isToday}">${i}</div>`;
            }
            calendarHTML += '</div></div>';
            content = calendarHTML;
            break;
        case 'music':
            content = `
                <div class="widget-header"><span>Kontrol Musik</span><span class="widget-close" onclick="removeWidget('${widgetId}')">×</span></div>
                <div class="music-widget">
                    <div style="text-align:center;margin-bottom:10px;"><div style="font-weight:600;font-size:13px;">Now Playing</div><div style="font-size:11px;color:#666;">Lagu Favorit</div></div>
                    <div class="music-controls">
                        <button onclick="musicControl('prev')">⏮</button>
                        <button onclick="musicControl('play')">▶️</button>
                        <button onclick="musicControl('next')">⏭</button>
                    </div>
                </div>`;
            break;
    }
    
    widget.innerHTML = content;
    document.getElementById('widgets-area').appendChild(widget);
    makeDraggable(widget);
    widgets.push({ id: widgetId, type: type, x: x, y: y });
    updateWidgetData(widgetId, type);
    saveWidgets();
}

function makeDraggable(element) {
    let pos1=0,pos2=0,pos3=0,pos4=0;
    element.querySelector('.widget-header').onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e = e || window.event; e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.classList.add('dragging');
    }
    
    function elementDrag(e) {
        e = e || window.event; e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        const newTop = element.offsetTop - pos2;
        const newLeft = element.offsetLeft - pos1;
        if (newTop >= 40 && newTop <= window.innerHeight - element.offsetHeight) element.style.top = newTop + "px";
        if (newLeft >= 0 && newLeft <= window.innerWidth - element.offsetWidth) element.style.left = newLeft + "px";
        const widgetId = element.id;
        const widgetIndex = widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex !== -1) { widgets[widgetIndex].x = newLeft; widgets[widgetIndex].y = newTop; }
    }
    
    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
        element.classList.remove('dragging');
        saveWidgets();
    }
}

function updateWidgetData(widgetId, type) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    
    switch(type) {
        case 'clock':
            const now = new Date();
            const timeStr = now.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}).replace('.',':');
            const dateStr = now.toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
            if(widget.querySelector('.clock-time')) {
                widget.querySelector('.clock-time').innerText = timeStr;
                widget.querySelector('.clock-date').innerText = dateStr;
            }
            break;
        case 'system':
            const cpu = Math.floor(Math.random()*30+30);
            const ram = Math.floor(Math.random()*30+40);
            const disk = Math.floor(Math.random()*20+20);
            if(widget.querySelector(`#${widgetId}-cpu`)) {
                widget.querySelector(`#${widgetId}-cpu`).innerText = cpu+'%';
                widget.querySelector(`#${widgetId}-ram`).innerText = ram+'%';
                widget.querySelector(`#${widgetId}-disk`).innerText = disk+'%';
                widget.querySelector(`#${widgetId}-cpu-bar`).style.width = cpu+'%';
                widget.querySelector(`#${widgetId}-ram-bar`).style.width = ram+'%';
                widget.querySelector(`#${widgetId}-disk-bar`).style.width = disk+'%';
            }
            break;
    }
}

function removeWidget(widgetId) {
    const widget = document.getElementById(widgetId);
    if(widget) { 
        widget.remove(); 
        widgets = widgets.filter(w => w.id !== widgetId); 
        saveWidgets(); 
    }
}

setInterval(() => {
    widgets.forEach(w => updateWidgetData(w.id, w.type));
}, 5000);

// ========== START MENU ==========
function toggleStart(e) { 
    if(e) e.stopPropagation(); 
    document.getElementById('startMenu').classList.toggle('show'); 
}

function closeStartMenu(e) { 
    const menu = document.getElementById('startMenu'); 
    if (menu.classList.contains('show')) menu.classList.remove('show'); 
}

// ========== DOCK LOGIC dengan Drag & Drop ==========
function initDock() {
    const dock = document.getElementById('dock');
    // Tombol start
    const startBtn = document.createElement('div');
    startBtn.className = 'dock-icon no-drag';
    startBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 4H10V10H4V4Z" fill="#111"/><path d="M14 4H20V10H14V4Z" fill="#111"/><path d="M4 14H10V20H4V14Z" fill="#111"/><path d="M14 14H20V20H14V14Z" fill="#111"/></svg>`;
    startBtn.addEventListener('click', toggleStart);
    dock.appendChild(startBtn);
    
    pinnedApps.forEach(appId => addToDock(appId));
    enableDockDragDrop();
}

function addToDock(appId) {
    const dock = document.getElementById('dock');
    if(dockItems.includes(appId)) return;
    const icon = document.createElement('div');
    icon.className = 'dock-icon';
    icon.dataset.appId = appId;
    icon.innerHTML = getAppEmoji(appId);
    icon.addEventListener('click', (e) => { if(e.button===0) openApp(appId); });
    icon.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e, appId, 'dock'); });
    dock.appendChild(icon);
    dockItems.push(appId);
    makeIconDraggable(icon);
}

function removeFromDock(appId) {
    const icon = document.querySelector(`.dock-icon[data-app-id="${appId}"]`);
    if(icon) { 
        icon.remove(); 
        dockItems = dockItems.filter(id => id !== appId); 
    }
}

function updateDockState(appId, isOpen) {
    const icon = document.querySelector(`.dock-icon[data-app-id="${appId}"]`);
    if(icon) { 
        if(isOpen) icon.classList.add('active'); 
        else icon.classList.remove('active'); 
    }
}

function makeIconDraggable(icon) {
    if (icon.classList.contains('no-drag')) return;
    icon.addEventListener('mousedown', startDockDrag);
}

// Variabel untuk drag dock
let dockDragItem = null;
let dockDragClone = null;
let dockDragStartIndex = -1;

function startDockDrag(e) {
    if (e.button !== 0) return;
    const icon = e.currentTarget;
    if (icon.classList.contains('no-drag')) return;
    
    e.preventDefault();
    
    dockDragItem = icon;
    const parent = icon.parentNode;
    dockDragStartIndex = Array.from(parent.children).indexOf(icon);
    
    dockDragClone = icon.cloneNode(true);
    dockDragClone.classList.add('dock-drag-clone');
    dockDragClone.style.width = icon.offsetWidth + 'px';
    dockDragClone.style.height = icon.offsetHeight + 'px';
    dockDragClone.style.left = e.clientX - icon.offsetWidth/2 + 'px';
    dockDragClone.style.top = e.clientY - icon.offsetHeight/2 + 'px';
    dockDragClone.style.opacity = '0.8';
    dockDragClone.style.pointerEvents = 'none';
    document.body.appendChild(dockDragClone);
    
    icon.classList.add('dragging');
    
    document.addEventListener('mousemove', onDockDrag);
    document.addEventListener('mouseup', stopDockDrag);
}

function onDockDrag(e) {
    if (!dockDragItem) return;
    e.preventDefault();
    
    dockDragClone.style.left = e.clientX - dockDragClone.offsetWidth/2 + 'px';
    dockDragClone.style.top = e.clientY - dockDragClone.offsetHeight/2 + 'px';
    
    const dock = document.getElementById('dock');
    const icons = dock.querySelectorAll('.dock-icon');
    let targetIndex = -1;
    for (let i = 0; i < icons.length; i++) {
        const rect = icons[i].getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
            targetIndex = i;
            break;
        }
    }
    
    if (targetIndex !== -1 && targetIndex !== dockDragStartIndex && targetIndex !== 0) {
        const parent = dock;
        const children = Array.from(parent.children);
        if (targetIndex < dockDragStartIndex) {
            parent.insertBefore(dockDragItem, children[targetIndex]);
        } else {
            parent.insertBefore(dockDragItem, children[targetIndex + 1]);
        }
        dockDragStartIndex = targetIndex;
    }
}

function stopDockDrag(e) {
    if (!dockDragItem) return;
    
    if (dockDragClone) {
        dockDragClone.remove();
        dockDragClone = null;
    }
    
    dockDragItem.classList.remove('dragging');
    
    const dock = document.getElementById('dock');
    const icons = dock.querySelectorAll('.dock-icon:not(:first-child)');
    const newPinned = [];
    icons.forEach(icon => {
        const appId = icon.dataset.appId;
        if (appId) newPinned.push(appId);
    });
    pinnedApps = newPinned;
    savePinnedApps();
    
    dockDragItem = null;
    dockDragStartIndex = -1;
    
    document.removeEventListener('mousemove', onDockDrag);
    document.removeEventListener('mouseup', stopDockDrag);
}

function enableDockDragDrop() {
    const icons = document.querySelectorAll('.dock-icon:not(.no-drag)');
    icons.forEach(icon => {
        icon.removeEventListener('mousedown', startDockDrag);
        icon.addEventListener('mousedown', startDockDrag);
    });
}

// ========== CONTEXT MENU ==========
function showContextMenu(e, appId, source) {
    e.preventDefault(); e.stopPropagation();
    contextMenuTarget = {appId, source};
    const menu = document.getElementById('contextMenu');
    const isPinned = pinnedApps.includes(appId);
    document.getElementById('context-pin').style.display = isPinned ? 'none' : 'flex';
    document.getElementById('context-unpin').style.display = isPinned ? 'flex' : 'none';
    document.getElementById('context-open').style.display = source === 'dock' ? 'none' : 'flex';
    menu.style.left = e.clientX + 'px';
    menu.style.top = (e.clientY - menu.offsetHeight - 10) + 'px';
    const menuRect = menu.getBoundingClientRect();
    if(menuRect.top < 0) menu.style.top = e.clientY + 10 + 'px';
    menu.classList.add('show');
}

function closeContextMenu() { 
    document.getElementById('contextMenu').classList.remove('show'); 
}

function contextOpenApp() { 
    if(contextMenuTarget) { 
        openApp(contextMenuTarget.appId); 
        closeContextMenu(); 
    } 
}

function contextPinApp() { 
    if(contextMenuTarget) { 
        const {appId}=contextMenuTarget; 
        if(!pinnedApps.includes(appId)) { 
            pinnedApps.push(appId); 
            savePinnedApps(); 
            addToDock(appId); 
        } 
        closeContextMenu(); 
    } 
}

function contextUnpinApp() { 
    if(contextMenuTarget) { 
        const {appId}=contextMenuTarget; 
        pinnedApps = pinnedApps.filter(id=>id!==appId); 
        savePinnedApps(); 
        removeFromDock(appId); 
        closeContextMenu(); 
    } 
}

function getAppEmoji(appId) {
    const emojis = {
        'files':'📁','browser':'🌍','terminal':'💻','settings':'⚙️','calculator':'🧮','calendar':'📅','music':'🎵',
        'camera':'📷','photos':'🖼️','video':'🎬','yt':'📺','notes':'📝','texteditor':'📄','sites':'🌐',
        'wallpaper':'🎨','wheel':'🎡','weather':'☀️','maps':'🗺️','contacts':'📇','mail':'✉️',
        'snake':'🐍','tictactoe':'⭕❌','memory':'🧠'
    };
    return emojis[appId] || '📱';
}

// ========== SYSTEM CONTROLS ==========
function toggleControl(type) { 
    closeAllDropdowns(); 
    document.getElementById(`${type}-dropdown`).classList.toggle('show'); 
}

function closeAllDropdowns() { 
    document.querySelectorAll('.control-dropdown').forEach(d => d.classList.remove('show')); 
}

function setSound(level) { 
    soundLevel=level; 
    document.getElementById('sound-value').textContent=level+'%'; 
    document.getElementById('sound-slider').value=level; 
    saveSystemSettings(); 
}

function setBrightness(level) { 
    brightnessLevel=level; 
    document.getElementById('brightness-value').textContent=level+'%'; 
    document.getElementById('brightness-slider').value=level; 
    document.getElementById('desktop').style.filter=`brightness(${level/100})`; 
    saveSystemSettings(); 
}

function toggleWifi() { 
    wifiOn=!wifiOn; 
    document.getElementById('wifi-icon').textContent=wifiOn?'📶':'✖️'; 
    document.getElementById('wifi-value').textContent=wifiOn?'Connected':'Disabled'; 
    document.getElementById('wifi-status').textContent=wifiOn?'Matikan':'Nyala'; 
}

function musicControl(action) { 
    alert({ 
        'prev':'⏮ Musik sebelumnya',
        'play':'▶️ Memutar musik',
        'next':'⏭ Musik berikutnya' 
    }[action]); 
}

// ========== POWER MANAGEMENT ==========
function shutdown() {
    if(confirm('Apakah Anda yakin ingin mematikan sistem?')) {
        if(cameraStream) { 
            cameraStream.getTracks().forEach(t=>t.stop()); 
            cameraStream=null; 
        }
        document.querySelectorAll('.window').forEach(win=>win.remove());
        widgets.forEach(w=>{ 
            const el=document.getElementById(w.id); 
            if(el) el.remove(); 
        });
        widgets=[]; 
        saveWidgets();
        desktop.style.display='none';
        lockscreen.style.display='flex';
        lockscreen.style.opacity='1';
        passwordInput.value='';
        passwordInput.focus();
        errorDiv.style.display='none';
        passwordPanel.classList.remove('show');
    }
}

document.getElementById('sound-slider').addEventListener('input', function(){ setSound(this.value); });
document.getElementById('brightness-slider').addEventListener('input', function(){ setBrightness(this.value); });

// ========== FILE MANAGER FUNCTIONS ==========
function openFileManager() {
    openApp('files');
}

function renderFileManager(container) {
    const folder = fileSystem[currentFolder];
    if (!folder) return;
    
    let items = folder.items || [];
    
    const searchInput = container.querySelector('.file-search-input');
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        items = items.filter(item => item.toLowerCase().includes(searchTerm));
    }
    
    let html = `
    <div class="file-manager">
        <div class="file-sidebar">
            <div class="file-sidebar-section">
                <div class="file-sidebar-title">FOLDERS</div>
                <div class="file-sidebar-item ${currentFolder === 'home' ? 'active' : ''}" onclick="navigateToFolder('home')">
                    <i class="fas fa-home"></i> Home
                </div>
                <div class="file-sidebar-item ${currentFolder === 'documents' ? 'active' : ''}" onclick="navigateToFolder('documents')">
                    <i class="fas fa-file-alt"></i> Documents
                </div>
                <div class="file-sidebar-item ${currentFolder === 'downloads' ? 'active' : ''}" onclick="navigateToFolder('downloads')">
                    <i class="fas fa-download"></i> Downloads
                </div>
                <div class="file-sidebar-item ${currentFolder === 'pictures' ? 'active' : ''}" onclick="navigateToFolder('pictures')">
                    <i class="fas fa-image"></i> Pictures
                </div>
                <div class="file-sidebar-item ${currentFolder === 'music' ? 'active' : ''}" onclick="navigateToFolder('music')">
                    <i class="fas fa-music"></i> Music
                </div>
                <div class="file-sidebar-item ${currentFolder === 'videos' ? 'active' : ''}" onclick="navigateToFolder('videos')">
                    <i class="fas fa-video"></i> Videos
                </div>
                <div class="file-sidebar-item ${currentFolder === 'project' ? 'active' : ''}" onclick="navigateToFolder('project')">
                    <i class="fas fa-code"></i> Project
                </div>
            </div>
            <div class="file-sidebar-section">
                <div class="file-sidebar-title">STORAGE</div>
                <div class="file-sidebar-item" onclick="openRecycleBin()">
                    <i class="fas fa-trash"></i> Recycle Bin
                    ${recycleBin.length ? `<span style="margin-left:auto; background:#ef4444; color:white; padding:2px 6px; border-radius:10px; font-size:10px;">${recycleBin.length}</span>` : ''}
                </div>
            </div>
        </div>
        <div class="file-main">
            <div class="file-toolbar">
                <button class="file-toolbar-btn" onclick="navigateBack()"><i class="fas fa-arrow-left"></i> Back</button>
                <button class="file-toolbar-btn" onclick="createNewFolder()"><i class="fas fa-folder-plus"></i> New Folder</button>
                <button class="file-toolbar-btn" onclick="compressSelected()"><i class="fas fa-file-archive"></i> Compress</button>
                <button class="file-toolbar-btn" onclick="deleteSelected()"><i class="fas fa-trash"></i> Delete</button>
                <div class="file-toolbar-search">
                    <i class="fas fa-search"></i>
                    <input type="text" class="file-search-input" placeholder="Search files..." oninput="searchFiles(this.value)">
                </div>
            </div>
            <div class="file-path">
                <span class="file-path-item" onclick="navigateToFolder('home')">Home</span>
                ${getPathBreadcrumbs()}
            </div>
            <div class="file-grid-container">
                <div class="file-grid" id="file-grid">
                    ${renderFileGrid(items)}
                </div>
            </div>
        </div>
        <div class="file-preview" id="file-preview">
            <div class="file-preview-header">Preview</div>
            <div class="file-preview-content" id="file-preview-content">
                <div style="color:#6b7280; text-align:center; padding:20px;">Pilih file untuk preview</div>
            </div>
        </div>
    </div>
    `;
    
    container.innerHTML = html;
    setupDragAndDrop(container);
}

function getPathBreadcrumbs() {
    if (currentFolder === 'home') return '';
    
    let path = '';
    const folder = fileSystem[currentFolder];
    if (folder) {
        path = `<span class="file-path-separator">/</span><span class="file-path-item" onclick="navigateToFolder('${currentFolder}')">${folder.name}</span>`;
    }
    return path;
}

function renderFileGrid(items) {
    if (items.length === 0) {
        return '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#6b7280;">Folder kosong</div>';
    }
    
    return items.map(item => {
        const isFolder = fileSystem[item] !== undefined;
        const details = fileDetails[item] || { type: 'unknown', size: '0 KB', modified: '2025-02-21', icon: isFolder ? '📁' : '📄' };
        const icon = isFolder ? '📁' : (details.icon || '📄');
        const isSelected = selectedFiles.includes(item);
        
        return `
        <div class="file-grid-item ${isSelected ? 'selected' : ''}" 
             data-filename="${item}"
             ondblclick="openFile('${item}')"
             onclick="selectFile('${item}', event)"
             draggable="true"
             ondragstart="dragStart(event, '${item}')"
             ondragend="dragEnd(event)"
             ondrop="dropOnItem(event, '${item}')"
             ondragover="dragOver(event)">
            <div class="file-grid-icon">${icon}</div>
            <div class="file-grid-name" title="${item}">${item}</div>
            <div class="file-grid-size">${isFolder ? 'Folder' : details.size}</div>
        </div>
        `;
    }).join('');
}

function navigateToFolder(folderId) {
    if (fileSystem[folderId]) {
        currentFolder = folderId;
        selectedFiles = [];
        const win = document.querySelector('.window[id^="win-files"]');
        if (win) {
            renderFileManager(win.querySelector('.win-content'));
        }
    }
}

function navigateBack() {
    if (currentFolder !== 'home') {
        navigateToFolder('home');
    }
}

function selectFile(filename, event) {
    if (event.ctrlKey) {
        const index = selectedFiles.indexOf(filename);
        if (index === -1) {
            selectedFiles.push(filename);
        } else {
            selectedFiles.splice(index, 1);
        }
    } else {
        selectedFiles = [filename];
    }
    
    const win = document.querySelector('.window[id^="win-files"]');
    if (win) {
        const items = win.querySelectorAll('.file-grid-item');
        items.forEach(item => {
            if (selectedFiles.includes(item.dataset.filename)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    updatePreview(filename);
}

function updatePreview(filename) {
    const previewContent = document.getElementById('file-preview-content');
    if (!previewContent) return;
    
    const details = fileDetails[filename];
    const isFolder = fileSystem[filename] !== undefined;
    
    if (isFolder) {
        previewContent.innerHTML = `
            <div class="file-preview-icon">📁</div>
            <div class="file-preview-info">
                <div class="file-preview-info-row"><span class="file-preview-label">Name:</span><span class="file-preview-value">${filename}</span></div>
                <div class="file-preview-info-row"><span class="file-preview-label">Type:</span><span class="file-preview-value">Folder</span></div>
                <div class="file-preview-info-row"><span class="file-preview-label">Items:</span><span class="file-preview-value">${fileSystem[filename].items.length}</span></div>
            </div>
        `;
    } else if (details) {
        let previewHtml = `
            <div class="file-preview-icon">${details.icon || '📄'}</div>
            <div class="file-preview-info">
                <div class="file-preview-info-row"><span class="file-preview-label">Name:</span><span class="file-preview-value">${filename}</span></div>
                <div class="file-preview-info-row"><span class="file-preview-label">Type:</span><span class="file-preview-value">${details.type}</span></div>
                <div class="file-preview-info-row"><span class="file-preview-label">Size:</span><span class="file-preview-value">${details.size}</span></div>
                <div class="file-preview-info-row"><span class="file-preview-label">Modified:</span><span class="file-preview-value">${details.modified}</span></div>
            </div>
        `;
        
        if (details.type === 'image') {
            previewHtml = `
                <img src="https://via.placeholder.com/200?text=${filename}" class="file-preview-image" alt="Preview">
                ${previewHtml}
            `;
        } else if (details.type === 'video') {
            previewHtml = `
                <video class="file-preview-video" controls>
                    <source src="#" type="video/mp4">
                    Your browser does not support video.
                </video>
                ${previewHtml}
            `;
        } else if (details.type === 'text' || details.type === 'code') {
            previewHtml = `
                <div class="file-preview-text">Ini adalah contoh isi file teks.\n\nFile: ${filename}\nUkuran: ${details.size}\n\nLorem ipsum dolor sit amet...</div>
                ${previewHtml}
            `;
        }
        
        previewContent.innerHTML = previewHtml;
    }
}

function openFile(filename) {
    const isFolder = fileSystem[filename] !== undefined;
    if (isFolder) {
        navigateToFolder(filename);
    } else {
        const details = fileDetails[filename];
        if (details) {
            if (details.type === 'image') {
                alert(`Membuka gambar: ${filename}`);
            } else if (details.type === 'audio') {
                alert(`Memutar musik: ${filename}`);
            } else if (details.type === 'video') {
                alert(`Memutar video: ${filename}`);
                openApp('video');
            } else if (details.type === 'document' || details.type === 'text' || details.type === 'code') {
                alert(`Membuka dokumen: ${filename}`);
                openApp('texteditor');
            } else {
                alert(`Membuka file: ${filename}`);
            }
        }
    }
}

function searchFiles(query) {
    const win = document.querySelector('.window[id^="win-files"]');
    if (win) {
        renderFileManager(win.querySelector('.win-content'));
    }
}

function createNewFolder() {
    const folderName = prompt('Masukkan nama folder baru:');
    if (folderName && folderName.trim()) {
        const newFolderId = folderName.toLowerCase().replace(/\s+/g, '_');
        if (!fileSystem[newFolderId]) {
            fileSystem[newFolderId] = {
                name: folderName,
                type: 'folder',
                items: []
            };
            fileSystem[currentFolder].items.push(newFolderId);
            
            const win = document.querySelector('.window[id^="win-files"]');
            if (win) {
                renderFileManager(win.querySelector('.win-content'));
            }
        } else {
            alert('Folder dengan nama tersebut sudah ada!');
        }
    }
}

function deleteSelected() {
    if (selectedFiles.length === 0) {
        alert('Pilih file/folder yang akan dihapus');
        return;
    }
    
    if (confirm(`Yakin ingin menghapus ${selectedFiles.length} item ke Recycle Bin?`)) {
        selectedFiles.forEach(filename => {
            const index = fileSystem[currentFolder].items.indexOf(filename);
            if (index !== -1) {
                fileSystem[currentFolder].items.splice(index, 1);
                
                const details = fileDetails[filename] || { type: 'folder', size: '0 KB', modified: new Date().toISOString().split('T')[0], icon: '📁' };
                recycleBin.push({
                    name: filename,
                    originalPath: currentFolder,
                    deletedAt: new Date().toISOString(),
                    details: details
                });
            }
        });
        
        selectedFiles = [];
        saveRecycleBin();
        
        const win = document.querySelector('.window[id^="win-files"]');
        if (win) {
            renderFileManager(win.querySelector('.win-content'));
        }
    }
}

function compressSelected() {
    if (selectedFiles.length === 0) {
        alert('Pilih file/folder yang akan dikompres');
        return;
    }
    
    const zipName = prompt('Nama file archive:', 'archive.zip');
    if (zipName) {
        alert(`Membuat archive ${zipName} dengan ${selectedFiles.length} item (simulasi)`);
    }
}

function openRecycleBin() {
    const win = document.querySelector('.window[id^="win-files"]');
    if (!win) return;
    
    let html = `
    <div class="recycle-bin">
        <div class="recycle-bin-header">
            <span>Recycle Bin</span>
            <div class="recycle-bin-actions">
                <button class="recycle-bin-btn" onclick="emptyRecycleBin()"><i class="fas fa-trash-alt"></i> Empty</button>
                <button class="recycle-bin-btn" onclick="closeRecycleBin()"><i class="fas fa-times"></i> Close</button>
            </div>
        </div>
        <div class="recycle-bin-list" id="recycle-bin-list">
            ${renderRecycleBin()}
        </div>
    </div>
    `;
    
    win.querySelector('.win-content').innerHTML = html;
}

function renderRecycleBin() {
    if (recycleBin.length === 0) {
        return '<div style="text-align:center; padding:40px; color:#6b7280;">Recycle Bin kosong</div>';
    }
    
    return recycleBin.map((item, index) => {
        const date = new Date(item.deletedAt).toLocaleString();
        return `
        <div class="recycle-bin-item" data-index="${index}">
            <div class="recycle-bin-icon">${item.details.icon || '📄'}</div>
            <div class="recycle-bin-details">
                <div class="recycle-bin-name">${item.name}</div>
                <div class="recycle-bin-meta">${item.details.size} • Dihapus: ${date}</div>
            </div>
            <div class="recycle-bin-restore" onclick="restoreFromRecycleBin(${index})" title="Restore">
                <i class="fas fa-undo-alt"></i>
            </div>
        </div>
        `;
    }).join('');
}

function restoreFromRecycleBin(index) {
    const item = recycleBin[index];
    if (item) {
        if (fileSystem[item.originalPath]) {
            fileSystem[item.originalPath].items.push(item.name);
        }
        
        recycleBin.splice(index, 1);
        saveRecycleBin();
        openRecycleBin();
    }
}

function emptyRecycleBin() {
    if (confirm('Yakin ingin mengosongkan Recycle Bin? Item akan dihapus permanen.')) {
        recycleBin = [];
        saveRecycleBin();
        openRecycleBin();
    }
}

function closeRecycleBin() {
    const win = document.querySelector('.window[id^="win-files"]');
    if (win) {
        renderFileManager(win.querySelector('.win-content'));
    }
}

function setupDragAndDrop(container) {
    const grid = container.querySelector('.file-grid');
    if (!grid) return;
    
    grid.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedFile = e.dataTransfer.getData('text/plain');
        if (draggedFile && fileSystem[currentFolder]) {
            alert(`Memindahkan ${draggedFile} ke folder ${currentFolder} (simulasi)`);
        }
    });
}

function dragStart(e, filename) {
    e.dataTransfer.setData('text/plain', filename);
    e.target.classList.add('dragging');
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
}

function dropOnItem(e, targetFilename) {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedFile = e.dataTransfer.getData('text/plain');
    if (draggedFile && draggedFile !== targetFilename) {
        const isTargetFolder = fileSystem[targetFilename] !== undefined;
        
        if (isTargetFolder) {
            alert(`Memindahkan ${draggedFile} ke folder ${targetFilename} (simulasi)`);
        }
    }
}

function dragOver(e) {
    e.preventDefault();
}

// ========== BROWSER FUNCTIONS ==========
function browserGoBack(btn) { 
    const win = btn.closest('.window'); 
    const frame = win.querySelector('.browser-frame'); 
    try { 
        frame.contentWindow.history.back(); 
        setTimeout(() => {
            try {
                win.querySelector('.browser-url').value = frame.contentWindow.location.href;
            } catch(e) {}
        }, 100);
    } catch(e) { 
        alert('Tidak dapat kembali'); 
    } 
}

function browserGoForward(btn) { 
    const win = btn.closest('.window'); 
    const frame = win.querySelector('.browser-frame'); 
    try { 
        frame.contentWindow.history.forward(); 
        setTimeout(() => {
            try {
                win.querySelector('.browser-url').value = frame.contentWindow.location.href;
            } catch(e) {}
        }, 100);
    } catch(e) { 
        alert('Tidak dapat maju'); 
    } 
}

function browserRefresh(btn) { 
    const win = btn.closest('.window'); 
    const frame = win.querySelector('.browser-frame'); 
    frame.src = frame.src; 
}

function browserGo(btn) {
    const win = btn.closest('.window'); 
    const urlInput = win.querySelector('.browser-url'); 
    let url = urlInput.value.trim();
    if(!url) return;
    
    let fullUrl = url;
    if(!url.includes('.') || url.includes(' ')) {
        fullUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(url);
    } else {
        if(!url.startsWith('http')) fullUrl = 'https://' + url;
    }
    
    const frame = win.querySelector('.browser-frame');
    frame.src = fullUrl;
    frame.style.display = 'block';
    win.querySelector('.browser-home').style.display = 'none';
    win.querySelector('.browser-url').value = fullUrl;
}

function browserHandleUrl(e, input) { 
    if(e.key === 'Enter') browserGo(input); 
}

function browserHomeSearch(e, input) {
    if(e.key === 'Enter') {
        const win = input.closest('.window'); 
        const query = input.value.trim();
        if(!query) return;
        const url = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
        const frame = win.querySelector('.browser-frame');
        frame.src = url;
        frame.style.display = 'block';
        win.querySelector('.browser-home').style.display = 'none';
        win.querySelector('.browser-url').value = url;
    }
}

function browserSearch(btn) {
    const win = btn.closest('.window'); 
    const input = win.querySelector('.search-box-home'); 
    const query = input.value.trim();
    if(!query) return;
    const url = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
    const frame = win.querySelector('.browser-frame');
    frame.src = url;
    frame.style.display = 'block';
    win.querySelector('.browser-home').style.display = 'none';
    win.querySelector('.browser-url').value = url;
}

function setupBrowserFrame(frame) {
    frame.addEventListener('load', function() {
        try {
            const iframeDoc = frame.contentDocument || frame.contentWindow.document;
            const links = iframeDoc.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', function(e) {
                    setTimeout(() => {
                        try {
                            const win = frame.closest('.window');
                            win.querySelector('.browser-url').value = frame.contentWindow.location.href;
                        } catch(err) {}
                    }, 100);
                });
            });
            
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes) {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeName === 'A') {
                                node.removeAttribute('target');
                            } else if (node.querySelectorAll) {
                                node.querySelectorAll('a[target="_blank"]').forEach(a => a.removeAttribute('target'));
                            }
                        });
                    }
                });
            });
            
            observer.observe(iframeDoc.body, { childList: true, subtree: true });
            iframeDoc.querySelectorAll('a[target="_blank"]').forEach(a => a.removeAttribute('target'));
            
        } catch(e) {
            console.log('Cross-origin iframe, tidak bisa memanipulasi link');
        }
    });
}

// ========== SETTINGS FUNCTIONS ==========
function switchSettingsSection(section, element) {
    document.querySelectorAll('.settings-menu-item').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(el=>el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById(`settings-${section}`).classList.add('active');
}

function toggleSetting(setting, toggleElement) { 
    toggleElement.classList.toggle('active'); 
    console.log(`${setting} toggled: ${toggleElement.classList.contains('active')}`); 
}

function changeSetting(setting, value) { 
    console.log(`${setting} changed to: ${value}`); 
}

// ========== CALENDAR FUNCTIONS ==========
let currentCalendarDate = new Date();

function updateCalendarDisplay() {
    const monthYearEl = document.getElementById('cal-month-year');
    const datesEl = document.getElementById('calendar-dates');
    if (!monthYearEl || !datesEl) return;
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    monthYearEl.innerText = monthNames[currentCalendarDate.getMonth()] + ' ' + currentCalendarDate.getFullYear();
    
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    
    let html = '';
    let startGap = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startGap; i++) {
        html += `<div class="calendar-date other-month"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = (d === today.getDate() && 
                        currentCalendarDate.getMonth() === today.getMonth() && 
                        currentCalendarDate.getFullYear() === today.getFullYear()) ? 'today' : '';
        html += `<div class="calendar-date ${isToday}">${d}</div>`;
    }
    datesEl.innerHTML = html;
}

function calendarPrevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    updateCalendarDisplay();
}

function calendarNextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    updateCalendarDisplay();
}

// ========== MUSIC PLAYER FUNCTIONS ==========
function handleMusicFiles(files) {
    if (!files.length) return;
    const win = document.querySelector('.window[id^="win-music"]');
    if (!win) return;
    const audio = win.querySelector('#music-audio');
    const playlistEl = win.querySelector('#music-playlist');
    
    musicPlaylist = [];
    for (let file of files) {
        musicPlaylist.push({
            name: file.name,
            url: URL.createObjectURL(file)
        });
    }
    
    playlistEl.innerHTML = '';
    musicPlaylist.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'playlist-item' + (index === currentMusicIndex ? ' playing' : '');
        div.innerHTML = `<i class="fas fa-music"></i> ${item.name}`;
        div.onclick = () => playMusic(index);
        playlistEl.appendChild(div);
    });
    
    if (musicPlaylist.length > 0) {
        currentMusicIndex = 0;
        audio.src = musicPlaylist[0].url;
        audio.play();
    }
}

function playMusic(index) {
    const win = document.querySelector('.window[id^="win-music"]');
    if (!win) return;
    const audio = win.querySelector('#music-audio');
    const playlistItems = win.querySelectorAll('.playlist-item');
    playlistItems.forEach((item, i) => {
        if (i === index) item.classList.add('playing');
        else item.classList.remove('playing');
    });
    currentMusicIndex = index;
    audio.src = musicPlaylist[index].url;
    audio.play();
}

// ========== VIDEO PLAYER FUNCTIONS ==========
function handleVideoFile(file) {
    if (!file) return;
    const win = document.querySelector('.window[id^="win-video"]');
    if (!win) return;
    const video = win.querySelector('#video-player');
    video.src = URL.createObjectURL(file);
    video.load();
    video.play();
}

// ========== WINDOW MANAGER ==========
function openApp(id) {
    updateDockState(id,true);
    if(!dockItems.includes(id)&&!pinnedApps.includes(id)) { addToDock(id); }
    if(document.getElementById('win-'+id)) { bringToFront(document.getElementById('win-'+id)); return; }
    
    let app = apps[id];
    if (!app) {
        app = { title: id, w: 500, h: 400, content: `<div class="app-content"><h3>${id} App</h3><p>Aplikasi sedang dalam pengembangan.</p></div>` };
    }
    
    const win=document.createElement('div'); 
    win.className='window'; 
    win.id='win-'+id; 
    win.style.width=app.w+'px'; 
    win.style.height=app.h+'px';
    const centerX=(window.innerWidth/2)-(app.w/2); 
    const centerY=(window.innerHeight/2)-(app.h/2);
    win.style.left=centerX+'px'; 
    win.style.top=centerY+'px'; 
    win.style.zIndex=++zIndex;
    
    win.innerHTML=`
        <div class="win-header" onmousedown="startDrag(event, '${win.id}')">
            <div style="width:40px"></div>
            <div class="win-title">${app.title}</div>
            <div class="win-controls">
                <button class="win-btn btn-max" onclick="maximizeWindow('${win.id}')"></button>
                <button class="win-btn btn-min" onclick="minimizeWindow('${win.id}')"></button>
                <button class="win-btn btn-close" onclick="closeWindow('${win.id}')"></button>
            </div>
        </div>
        <div class="win-content">${app.content}</div>
        <div class="resize-handle" onmousedown="startResize(event, '${win.id}')"></div>
    `;
    win.addEventListener('mousedown',()=>{ bringToFront(win); updateDockState(id,true); });
    win.addEventListener('transitionend',function(e){ 
        if(e.propertyName==='opacity'&&!this.classList.contains('open')){ 
            updateDockState(id,false); 
            if(!pinnedApps.includes(id)) removeFromDock(id); 
        } 
    });
    document.getElementById('windows-area').appendChild(win);
    setTimeout(()=>win.classList.add('open'),10);
    
    if(id==='wheel') setTimeout(initWheel,100);
    if(id==='calendar') setTimeout(() => { updateCalendarDisplay(); }, 100);
    if(id==='wallpaper') initWallpaperApp();
    if(id==='browser') {
        setTimeout(() => {
            const frame = win.querySelector('.browser-frame');
            if(frame) setupBrowserFrame(frame);
        }, 200);
    }
    if(id==='files') {
        setTimeout(() => {
            renderFileManager(win.querySelector('.win-content'));
        }, 100);
    }
}

function closeWindow(winId) {
    const win=document.getElementById(winId);
    const vid=win.querySelector('video');
    if(vid&&vid.srcObject) vid.srcObject.getTracks().forEach(t=>t.stop());
    const appId=winId.replace('win-','');
    updateDockState(appId,false);
    win.classList.remove('open');
    setTimeout(()=>{ 
        if(win.parentNode) win.remove(); 
        if(!pinnedApps.includes(appId)) removeFromDock(appId); 
    },300);
}

function minimizeWindow(winId) {
    const win=document.getElementById(winId); 
    const appId=winId.replace('win-','');
    win.style.transform='scale(0.8) translateY(100px)'; 
    win.style.opacity='0'; 
    win.style.pointerEvents='none';
    updateDockState(appId,false);
    setTimeout(()=>{ win.style.display='none'; },300);
}

function maximizeWindow(winId) {
    const win=document.getElementById(winId);
    if(win.classList.contains('maximized')) {
        const app=apps[winId.replace('win-','')]||{w:800,h:500};
        win.style.width=app.w+'px'; 
        win.style.height=app.h+'px';
        win.style.top=((window.innerHeight/2)-(app.h/2))+'px'; 
        win.style.left=((window.innerWidth/2)-(app.w/2))+'px';
        win.classList.remove('maximized');
    } else {
        win.style.width='100%'; 
        win.style.height=(window.innerHeight-36)+'px'; 
        win.style.top='36px'; 
        win.style.left='0';
        win.classList.add('maximized');
    }
    bringToFront(win);
}

function bringToFront(el) { 
    el.style.zIndex=++zIndex; 
    const appId=el.id.replace('win-',''); 
    updateDockState(appId,true); 
}

// ========== TERMINAL ==========
function handleTerminalCommand(e) {
    if(e.key==='Enter') {
        const input=e.target; 
        const cmd=input.value.toLowerCase(); 
        input.value='';
        const terminal=input.closest('.terminal');
        const output=document.createElement('div'); 
        output.className='terminal-line'; 
        output.innerHTML=`<span class="terminal-prompt">$</span> ${cmd}`;
        terminal.appendChild(output);
        let response='';
        switch(cmd) {
            case 'help': response='Commands: help, clear, date, time, echo [text], ls, pwd'; break;
            case 'clear': terminal.innerHTML='<div class="terminal-line"><span class="terminal-prompt">$</span> Terminal cleared</div><div class="terminal-line"><span class="terminal-prompt">$</span> <input type="text" class="terminal-input" onkeydown="handleTerminalCommand(event)"></div>'; return;
            case 'date': response=new Date().toLocaleDateString(); break;
            case 'time': response=new Date().toLocaleTimeString(); break;
            case 'ls': response='Documents  Downloads  Pictures  Music  Videos  Project'; break;
            case 'pwd': response='/home/user'; break;
            default: if(cmd.startsWith('echo ')) response=cmd.substring(5); else response=`Command not found: ${cmd}`;
        }
        const result=document.createElement('div'); 
        result.className='terminal-line'; 
        result.textContent=response;
        terminal.appendChild(result);
        const newInput=document.createElement('div'); 
        newInput.className='terminal-line'; 
        newInput.innerHTML='<span class="terminal-prompt">$</span> <input type="text" class="terminal-input" onkeydown="handleTerminalCommand(event)">';
        terminal.appendChild(newInput);
        terminal.scrollTop=terminal.scrollHeight;
        newInput.querySelector('input').focus();
    }
}

// ========== CALCULATOR ==========
let calcExp='';
function c(val) {
    const disp=document.getElementById('calc-res'); 
    if(!disp)return;
    if(val==='C'){ calcExp=''; disp.value='0'; }
    else if(val==='back'){ calcExp=calcExp.slice(0,-1); disp.value=calcExp||'0'; }
    else{ calcExp+=val; disp.value=calcExp; }
}
function calc(){ 
    try{ 
        document.getElementById('calc-res').value=eval(calcExp); 
        calcExp=document.getElementById('calc-res').value; 
    } catch{ 
        document.getElementById('calc-res').value='Error'; 
    } 
}

// ========== WHEEL ==========
let wheelCtx, wheelAngle=0;
const wheelItems=['Pufu','Miaw','Jackpot','Zonk','Handy','Coba Lagi'];
const colors=['#ffffff','#f3f4f6'];

function initWheel(){ 
    const cvs=document.getElementById('wheelCanvas'); 
    if(!cvs) return; 
    wheelCtx=cvs.getContext('2d'); 
    drawWheel(); 
}

function drawWheel(){
    if(!wheelCtx) return;
    const w=300,h=300,cx=w/2,cy=h/2,r=140;
    wheelCtx.clearRect(0,0,w,h);
    const slice=2*Math.PI/wheelItems.length;
    wheelItems.forEach((item,i)=>{
        wheelCtx.beginPath(); 
        wheelCtx.moveTo(cx,cy);
        wheelCtx.arc(cx,cy,r,wheelAngle+i*slice,wheelAngle+(i+1)*slice);
        wheelCtx.fillStyle=colors[i%2]; 
        wheelCtx.fill();
        wheelCtx.save(); 
        wheelCtx.translate(cx,cy); 
        wheelCtx.rotate(wheelAngle+i*slice+slice/2);
        wheelCtx.textAlign="right"; 
        wheelCtx.fillStyle="#111"; 
        wheelCtx.font="bold 14px Inter";
        wheelCtx.fillText(item,r-10,5); 
        wheelCtx.restore();
    });
    wheelCtx.beginPath(); 
    wheelCtx.moveTo(w-10,cy); 
    wheelCtx.lineTo(w-30,cy-10); 
    wheelCtx.lineTo(w-30,cy+10);
    wheelCtx.fillStyle='#111'; 
    wheelCtx.fill();
}

function spinWheel(){ 
    let speed=0.5, dec=0.005; 
    function anim(){ 
        wheelAngle+=speed; 
        speed-=dec; 
        drawWheel(); 
        if(speed>0) requestAnimationFrame(anim); 
    } 
    anim(); 
}

// ========== WALLPAPER ==========
function initWallpaperApp(){ 
    setTimeout(()=>{ 
        document.querySelectorAll('#wallpaper-gallery .wallpaper-item').forEach(item=>{ 
            item.addEventListener('click',function(){ 
                document.querySelectorAll('#wallpaper-gallery .wallpaper-item').forEach(i=>i.classList.remove('active')); 
                this.classList.add('active'); 
            }); 
        }); 
    },100); 
}

function switchWallpaperTab(tabName){
    document.querySelectorAll('.wallpaper-tab').forEach(tab=>tab.classList.remove('active'));
    document.querySelector(`.wallpaper-tab[onclick*="${tabName}"]`).classList.add('active');
    document.querySelectorAll('.wallpaper-tab-content').forEach(c=>c.classList.remove('active'));
    document.getElementById(`wallpaper-${tabName}`).classList.add('active');
}

function applyWallpaper(url){ 
    saveWallpaper(url); 
    alert('Wallpaper berhasil diubah!'); 
}

function applyColorWallpaper(color){ 
    document.getElementById('desktop').style.backgroundImage='none'; 
    document.getElementById('desktop').style.backgroundColor=color; 
    localStorage.setItem('pufutara_wallpaper',color); 
}

function handleWallpaperUpload(event){
    const file=event.target.files[0]; 
    if(!file) return;
    if(!file.type.match('image.*')){ 
        alert('Hanya file gambar yang diperbolehkan!'); 
        return; 
    }
    const reader=new FileReader(); 
    reader.onload=function(e){ 
        applyWallpaper(e.target.result); 
    }; 
    reader.readAsDataURL(file);
}

// ========== DRAG WINDOW ==========
let isDragging=false, currentWin=null, offset={x:0,y:0};

function startDrag(e,id){ 
    isDragging=true; 
    currentWin=document.getElementById(id); 
    const rect=currentWin.getBoundingClientRect(); 
    offset.x=e.clientX-rect.left; 
    offset.y=e.clientY-rect.top; 
    currentWin.classList.add('dragging'); 
    bringToFront(currentWin); 
}

document.addEventListener('mousemove',(e)=>{ 
    if(!isDragging||!currentWin) return; 
    e.preventDefault(); 
    currentWin.style.left=(e.clientX-offset.x)+'px'; 
    currentWin.style.top=(e.clientY-offset.y)+'px'; 
});

document.addEventListener('mouseup',()=>{ 
    if(currentWin) currentWin.classList.remove('dragging'); 
    isDragging=false; 
    currentWin=null; 
});

// ========== RESIZE WINDOW ==========
let isResizing=false, resizeWin=null;

function startResize(e,id){ 
    e.stopPropagation(); 
    isResizing=true; 
    resizeWin=document.getElementById(id); 
}

document.addEventListener('mousemove',(e)=>{ 
    if(!isResizing||!resizeWin) return; 
    resizeWin.style.width=(e.clientX-resizeWin.getBoundingClientRect().left)+'px'; 
    resizeWin.style.height=(e.clientY-resizeWin.getBoundingClientRect().top)+'px'; 
});

document.addEventListener('mouseup',()=>{ 
    isResizing=false; 
    resizeWin=null; 
});