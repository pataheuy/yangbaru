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

// ===== FILTER & SEARCH PROYEK =====
const filterBtns = document.querySelectorAll('.filter-btn');
// Semua <a> langsung di dalam #projects-grid adalah kartu proyek
const getAllProjectCards = () => document.querySelectorAll('#projects-grid > a');

let activeFilter = 'semua';
let searchQuery = '';

function updateProjectVisibility() {
    const cards = getAllProjectCards();
    let visibleCount = 0;

    cards.forEach(card => {
        const category = card.getAttribute('data-category') || 'semua';
        const text = card.textContent.toLowerCase();
        const matchFilter = activeFilter === 'semua' || category === activeFilter;
        const matchSearch = searchQuery === '' || text.includes(searchQuery);

        if (matchFilter && matchSearch) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Update info jumlah hasil pencarian
    const resultInfo = document.getElementById('search-result-info');
    const resultNum = document.getElementById('search-result-num');
    if (searchQuery !== '' && resultInfo && resultNum) {
        resultNum.textContent = visibleCount + ' proyek';
        resultInfo.classList.remove('hidden');
    } else if (resultInfo) {
        resultInfo.classList.add('hidden');
    }
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
            b.classList.remove('bg-primary', 'text-white');
            b.classList.add('text-slate-500', 'hover:text-primary');
        });
        btn.classList.add('bg-primary', 'text-white');
        btn.classList.remove('text-slate-500', 'hover:text-primary');

        activeFilter = btn.getAttribute('data-target');
        updateProjectVisibility();
    });
});

// ===== SEARCH BAR =====
const searchInput = document.getElementById('project-search');
const searchClear = document.getElementById('project-search-clear');

if (searchInput) {
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        // Tampilkan/sembunyikan tombol clear
        if (searchQuery !== '') {
            searchClear && searchClear.classList.remove('hidden');
        } else {
            searchClear && searchClear.classList.add('hidden');
        }
        updateProjectVisibility();
    });
}

if (searchClear) {
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.classList.add('hidden');
        updateProjectVisibility();
        searchInput.focus();
    });
}

// ============================================================
// GALERI DINAMIS
// ============================================================
let galleryData = [
    {
        id: 1,
        type: 'foto',
        title: 'Putra masuk google pertamakali',
        desc: 'sesuai judul. ya begitulah.',
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
        title: 'Putra Pidato Ketua Pelaksana',
        desc: 'ketuplak harbuknas 2026 di smpit assyifa!',
        icon: 'fa-users',
        fileUrl: '2.png'
    },
    {
        id: 4,
        type: 'foto',
        title: 'Putra OSN IPS',
        desc: 'masuk web seabagai perwakilan sekolah',
        icon: 'fa-image',
        fileUrl: '3.png'
    }
];

function galleryImgFallback(imgEl, icon) {
    const wrap = imgEl.parentElement;
    imgEl.remove();
    wrap.classList.remove('bg-slate-100');
    wrap.classList.add('bg-gradient-to-tr', 'from-slate-200', 'to-slate-300');
    const i = document.createElement('i');
    i.className = `fa-solid ${icon} text-4xl md:text-6xl text-slate-400`;
    wrap.insertBefore(i, wrap.firstChild);
}

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
                    <div class="h-36 md:h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center" id="img-wrap-${item.id}">
                        <img src="${item.fileUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in" alt="${item.title}"
                            onclick="openLightbox('${item.fileUrl}', '${item.title.replace(/'/g, "\\'")}')"
                            onerror="galleryImgFallback(this, '${item.icon || 'fa-image'}')">
                        <span class="absolute top-2 left-2 bg-white text-primary text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-slate-200 shadow-sm z-10">FOTO</span>
                    </div>`;
            } else {
                mediaPreviewHtml = `
                    <div class="h-36 md:h-56 bg-gradient-to-tr from-slate-200 to-slate-300 relative flex items-center justify-center p-4">
                        <i class="fa-solid ${item.icon || 'fa-image'} text-4xl md:text-6xl text-slate-400 group-hover:scale-110 transition-transform duration-300"></i>
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
// PRESTASI & ORGANISASI
// ============================================================
const organisasiData = [
    { nama: 'Staff humas dan ASFERA 2026',  periode: 'Bertanggung jawab untuk mendokumentasikan acara dengan baik',                 peran: '2025-2026' },
    { nama: 'Ketua Komunitas Literasi Sekolah',   periode: 'Smpit Assyifa Boarding School Jalancagak',                              peran: '2025-2026' },
    { nama: 'Anggota Badan Eksekutif Murid (BEM) Pendidikan', periode: 'Organisasi tertinggi dan sekelas OSIS negri, di Assyifa',   peran: '2025-2026' },
    { nama: 'Sekretaris Organisasi Mitra Duta Kesehatan Asrama',   periode: 'Organisasi Asrama dari pembinaan',                     peran: '2025-2026' },
    { nama: 'Sekretaris Halaqoh BPA', periode: 'Kelompok Bina Pribadi Assyifa Ustad Syaiful Anwar',                                 peran: '2025-2026' },
    { nama: 'Anggota Organisasi Angkatan : Keagamaan',  periode: 'Organisasi angkatan 17. Revourner. di Assyifa',                   peran: '2025-2026' },
    { nama: 'Anggota Komunitas Literasi Sekolah',  periode: 'Sebelum jadi ketua. kabinet Ki Hadjar Dewantara',                      peran: '2025-2026' },

];

const prestasiData = [
    { tahun: '2026',        judul: 'Juara 2 Santri Cinta Lingkungan',    desc: 'juara 2 konsisten membantu membersihkan lingkungan sekolah Assyifa.' },
    { tahun: '2026',        judul: 'Dormitory Award — Hafalan Terbanyak',    desc: 'Kategori reguler pembinaan: 2 Juz 10 Halaman dalam satu semester.' },
    { tahun: '2026',        judul: 'Klub OSN SMPIT Assyifa (Tahap 3)',        desc: 'Pelatihan Olimpiade Sains Nasional tingkat sekolah tahap lanjut.' },
    { tahun: '2026',        judul: 'KOSSMI IPS Provinsi',                    desc: 'Peserta Kompetisi Sains Siswa Muslim Indonesia tingkat Jawa Barat.' },
    { tahun: '2020 – 2026', judul: 'Ranking 3 Ijazah SDIT Al-Hikmah',          desc: 'Peringkat 3 rata-rata nilai selama 6 tahun (Angkatan 18).' },
    { tahun: '2019',        judul: 'Juara 3 Mewarnai',                       desc: 'Pemenang lomba tingkat kelas 2 SDIT Al-Hikmah.' },
];

function renderOrganisasi() {
    const container = document.getElementById('organisasi-list');
    if (!container) return;
    container.innerHTML = organisasiData.map(item => `
        <div class="flex items-center justify-between py-4">
            <div>
                <p class="font-bold text-sm text-primary">${item.nama}</p>
                <p class="text-xs font-semibold text-indigo-600 mt-0.5">${item.periode}</p>
            </div>
            <span class="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full whitespace-nowrap ml-4">${item.peran}</span>
        </div>
    `).join('');
}

function renderPrestasi() {
    const container = document.getElementById('prestasi-list');
    if (!container) return;
    container.innerHTML = prestasiData.map(item => `
        <div class="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 hover:border-primary hover:bg-white hover:shadow-md transition-all duration-200">
            <span class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">${item.tahun}</span>
            <p class="font-bold text-sm text-primary mt-1">${item.judul}</p>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">${item.desc}</p>
        </div>
    `).join('');
}

renderOrganisasi();
renderPrestasi();

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
