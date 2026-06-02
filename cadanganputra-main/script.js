// ============================================================
// SCRIPT UTAMA — Putra Azzam Elfathin Portfolio
// ============================================================

// ===== NAVBAR MOBILE =====
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const hamburgerLines = menuBtn.querySelectorAll('.hamburger-line');
let menuOpen = false;

menuBtn.addEventListener('click', () => {
    menuOpen = !menuOpen;
    if (menuOpen) {
        mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
        mobileMenu.style.opacity = '1';
        mobileMenu.classList.add('menu-open');
        mobileMenu.style.borderBottom = '1px solid #e2e8f0';
        hamburgerLines[0].style.transform = 'translateY(7px) rotate(45deg)';
        hamburgerLines[1].style.opacity = '0';
        hamburgerLines[1].style.transform = 'scaleX(0)';
        hamburgerLines[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
        mobileMenu.style.maxHeight = '0';
        mobileMenu.style.opacity = '0';
        mobileMenu.classList.remove('menu-open');
        mobileMenu.style.borderBottom = '';
        hamburgerLines[0].style.transform = '';
        hamburgerLines[1].style.opacity = '1';
        hamburgerLines[1].style.transform = '';
        hamburgerLines[2].style.transform = '';
    }
});

const mobileLinks = mobileMenu.querySelectorAll('a');
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuOpen = false;
        mobileMenu.style.maxHeight = '0';
        mobileMenu.style.opacity = '0';
        mobileMenu.classList.remove('menu-open');
        mobileMenu.style.borderBottom = '';
        hamburgerLines[0].style.transform = '';
        hamburgerLines[1].style.opacity = '1';
        hamburgerLines[1].style.transform = '';
        hamburgerLines[2].style.transform = '';
    });
});

// ===== ANIMASI MASUK (INTERSECTION OBSERVER) =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const el = entry.target;
            // Hero pakai data-delay apa adanya (1000ms), elemen lain base 400ms + stagger
            const isHero = el.closest('#hero') !== null;
            const stagger = parseInt(el.dataset.delay || 0);
            const delay = isHero ? stagger : 200 + stagger;
            setTimeout(() => {
                el.classList.add('is-visible');
            }, delay);
            revealObserver.unobserve(el);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    revealObserver.observe(el);
});

// ===== FILTER PROYEK =====
const filterBtns = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
            b.classList.remove('bg-primary', 'text-white');
            b.classList.add('text-slate-500', 'hover:text-primary');
        });
        btn.classList.add('bg-primary', 'text-white');
        btn.classList.remove('text-slate-500', 'hover:text-primary');

        const target = btn.getAttribute('data-target');
        projectCards.forEach(card => {
            if (target === 'semua' || card.getAttribute('data-category') === target) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// ============================================================
// GALERI DINAMIS
// ============================================================
let galleryData = [
    {
        id: 1,
        type: 'foto',
        title: 'Putra masuk google',
        desc: 'apa saja yang penting selesai.',
        icon: 'fa-laptop-code',
        fileUrl: '1.png'
    },
    {
        id: 2,
        type: 'video',
        title: 'Pak Ulil diwawancara',
        desc: 'video sus yang daya temukan di google drive',
        fileUrl: 'paulil.mp4'
    },
    {
        id: 3,
        type: 'foto',
        title: 'random',
        desc: 'gatau ah serah nanti aja',
        icon: 'fa-users',
        fileUrl: '2.png'
    },
    {
        id: 4,
        type: 'foto',
        title: 'Foto Baru',
        desc: 'Ganti src gambar ini dengan foto kamu.',
        icon: 'fa-image',
        fileUrl: '3.png'
    }
];

function renderGallery(filterType = 'semua') {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';

    galleryData.forEach(item => {
        if (filterType !== 'semua' && item.type !== filterType) return;

        const card = document.createElement('div');
        card.className = "gallery-item bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl overflow-hidden shadow-sm group hover:border-slate-400 transition-all duration-300 animate-[fadeIn_0.3s_ease]";
        card.setAttribute('data-type', item.type);

        let mediaPreviewHtml = '';

        if (item.type === 'foto') {
            if (item.fileUrl) {
                mediaPreviewHtml = `
                    <div class="h-36 md:h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <img src="${item.fileUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in" alt="${item.title}" onclick="openLightbox('${item.fileUrl}', '${item.title.replace(/'/g, "\\'")}')">
                        <span class="absolute top-2 left-2 bg-white text-primary text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-slate-200 shadow-sm">FOTO</span>
                    </div>`;
            } else {
                mediaPreviewHtml = `
                    <div class="h-36 md:h-56 bg-gradient-to-tr from-slate-200 to-slate-300 relative flex items-center justify-center p-4">
                        <i class="fa-solid ${item.icon || 'fa-image'} text-4xl md:text-6xl text-slate-700 opacity-85 group-hover:scale-110 transition-transform duration-300"></i>
                        <span class="absolute top-2 left-2 bg-white text-primary text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-slate-200">FOTO</span>
                    </div>`;
            }
        } else if (item.type === 'video') {
            mediaPreviewHtml = `
                <div class="h-36 md:h-56 bg-slate-800 relative flex items-center justify-center p-4 cursor-pointer" onclick="playRealVideo('${item.fileUrl}', '${item.title.replace(/'/g, "\\'")}')">
                    <div class="absolute inset-0 bg-slate-900 opacity-50 group-hover:opacity-40 transition-opacity"></div>
                    ${item.fileUrl && !item.fileUrl.startsWith('http') ?
                        `<video src="${item.fileUrl}" class="absolute inset-0 w-full h-full object-cover opacity-80"></video>` : ''
                    }
                    <i class="fa-solid fa-circle-play text-3xl md:text-5xl text-white z-10 opacity-90 group-hover:scale-125 transition-transform duration-300 shadow-lg"></i>
                    <span class="absolute top-2 left-2 bg-red-600 text-white text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md shadow-sm">VIDEO</span>
                    <div class="absolute bottom-2 right-2 text-[9px] md:text-[10px] text-white/95 bg-black/60 px-2 py-0.5 rounded z-10 font-mono tracking-wider">PUTAR</div>
                </div>`;
        }

        card.innerHTML = `
            ${mediaPreviewHtml}
            <div class="p-3 md:p-5">
                <h4 class="font-bold text-sm md:text-base text-primary">${item.title}</h4>
                <p class="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1 leading-relaxed">${item.desc}</p>
            </div>`;

        grid.appendChild(card);
    });
}

const galleryFilterBtns = document.querySelectorAll('.gallery-filter-btn');
galleryFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        galleryFilterBtns.forEach(b => {
            b.classList.remove('bg-primary', 'text-white');
            b.classList.add('text-slate-500', 'hover:text-primary');
        });
        btn.classList.add('bg-primary', 'text-white');
        btn.classList.remove('text-slate-500', 'hover:text-primary');
        renderGallery(btn.getAttribute('data-target'));
    });
});

// ============================================================
// VIDEO MODAL
// ============================================================
const videoModal = document.getElementById('video-modal');
const modalVideoTitle = document.getElementById('modal-video-title');
const realVideoPlayer = document.getElementById('real-video-player');

function playRealVideo(url, title) {
    if (!url || url === 'null') {
        url = 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    modalVideoTitle.textContent = title;
    realVideoPlayer.src = url;
    videoModal.classList.remove('hidden');
    videoModal.style.opacity = '0';
    requestAnimationFrame(() => {
        videoModal.style.transition = 'opacity 0.25s ease';
        videoModal.style.opacity = '1';
    });
    document.body.style.overflow = 'hidden';
    realVideoPlayer.play().catch(() => {});
}

function closeVideoModal() {
    videoModal.style.transition = 'opacity 0.2s ease';
    videoModal.style.opacity = '0';
    setTimeout(() => {
        videoModal.classList.add('hidden');
        videoModal.style.opacity = '';
        videoModal.style.transition = '';
    }, 200);
    document.body.style.overflow = '';
    realVideoPlayer.pause();
    realVideoPlayer.src = '';
}

// ============================================================
// LIGHTBOX FOTO
// ============================================================
function openLightbox(src, alt) {
    const lb = document.getElementById('photo-lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    img.alt = alt || '';
    lb.classList.remove('hidden');
    lb.style.opacity = '0';
    img.style.transform = 'scale(0.88)';
    img.style.transition = 'transform 0.35s cubic-bezier(0.2,1,0.3,1)';
    requestAnimationFrame(() => {
        lb.style.transition = 'opacity 0.25s ease';
        lb.style.opacity = '1';
        img.style.transform = 'scale(1)';
    });
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('photo-lightbox');
    const img = document.getElementById('lightbox-img');
    lb.style.transition = 'opacity 0.2s ease';
    img.style.transition = 'transform 0.2s ease';
    lb.style.opacity = '0';
    img.style.transform = 'scale(0.92)';
    setTimeout(() => {
        lb.classList.add('hidden');
        lb.style.opacity = '';
        img.style.transform = '';
    }, 200);
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
        closeVideoModal();
    }
});

// Init galeri
renderGallery('semua');

// ============================================================
// AUDIO PLAYER (POJOK LAGU)
// ============================================================
const playlist = [
    {
        title: "Mejikuhibiniu",
        desc: "waduh",
        category: "Kaciw",
        audioSrc: "mejikuhibiniu.mp3"
    },
    {
        title: "kosong",
        desc: "kosong",
        category: "-",
        audioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    {
        title: "kosong",
        desc: "kosong",
        category: "-g",
        audioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
    }
];

let currentSongIndex = 0;
let isPlaying = false;

const audioElement = document.getElementById('real-audio-element');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const songTitle = document.getElementById('song-title');
const songDesc = document.getElementById('song-desc');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const widgetHeader = document.getElementById('widget-header');
const playerBody = document.getElementById('player-body');
const toggleIcon = document.getElementById('toggle-icon');
const songSelectorBtns = document.querySelectorAll('.song-selector-btn');

function loadSong(index) {
    currentSongIndex = index;
    const song = playlist[index];
    songTitle.textContent = song.title;
    songDesc.textContent = song.desc;
    audioElement.src = song.audioSrc;

    songSelectorBtns.forEach(btn => {
        const btnIdx = parseInt(btn.getAttribute('data-index'));
        if (btnIdx === index) {
            btn.classList.add('bg-slate-100', 'text-primary', 'font-bold');
            btn.classList.remove('text-slate-700');
        } else {
            btn.classList.remove('bg-slate-100', 'text-primary', 'font-bold');
            btn.classList.add('text-slate-700');
        }
    });
}

function playAudio() {
    isPlaying = true;
    audioElement.play().catch(() => {});
    playIcon.className = "fa-solid fa-pause";
}

function pauseAudio() {
    isPlaying = false;
    audioElement.pause();
    playIcon.className = "fa-solid fa-play ml-0.5";
}

playBtn.addEventListener('click', () => {
    if (isPlaying) pauseAudio();
    else playAudio();
});

function nextSong() {
    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= playlist.length) nextIndex = 0;
    loadSong(nextIndex);
    if (isPlaying) playAudio();
}

nextBtn.addEventListener('click', nextSong);

prevBtn.addEventListener('click', () => {
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    loadSong(prevIndex);
    if (isPlaying) playAudio();
});

audioElement.addEventListener('timeupdate', () => {
    const currentTime = audioElement.currentTime;
    const duration = audioElement.duration || 0;
    progressBar.style.width = `${(currentTime / duration) * 100}%`;
    currentTimeEl.textContent = formatTime(currentTime);
    durationTimeEl.textContent = formatTime(duration);
});

function formatTime(secs) {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

progressContainer.addEventListener('click', (e) => {
    const duration = audioElement.duration || 0;
    audioElement.currentTime = (e.offsetX / progressContainer.clientWidth) * duration;
});

audioElement.addEventListener('ended', nextSong);

widgetHeader.addEventListener('click', () => {
    playerBody.classList.toggle('hidden');
    toggleIcon.className = playerBody.classList.contains('hidden')
        ? "fa-solid fa-chevron-up text-xs"
        : "fa-solid fa-chevron-down text-xs";
});

songSelectorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadSong(parseInt(btn.getAttribute('data-index')));
        playAudio();
    });
});

loadSong(0);

// ============================================================
// SOSMED COMING SOON TOAST
// ============================================================
function sosmedComingSoon(e) {
    e.preventDefault();
    const toast = document.getElementById('kolaborasi-toast');
    if (!toast) return;
    toast.textContent = 'Maaf, saat ini belum ada. Insyaallah kapan-kapan! 🙏';
    toast.style.backgroundColor = '#0f172a';
    toast.style.opacity = '1';
    clearTimeout(window._sosmedToastTimer);
    window._sosmedToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}


// (Logika Supabase form kolaborasi ada di inline script di index.html)
