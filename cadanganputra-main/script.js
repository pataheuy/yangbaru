// ============================================================
// SCRIPT UTAMA — Putra Azzam Elfathin Portfolio
// ============================================================

// ===== DATA PROYEK =====
// Untuk nambah proyek baru, copy salah satu blok di bawah dan isi:
//   no        : nomor urut
//   title     : judul proyek
//   titlePrefix: bagian awal yang diberi warna abu (opsional, biasanya 'Pufutara')
//   kategori  : badge kecil di kartu
//   desc      : deskripsi singkat
//   cover     : path foto — taruh di folder /foto/ lalu tulis '/foto/namafile.png'
//   link      : URL tujuan saat kartu diklik
//   category  : 'web' atau 'desktop' (untuk filter)
// ---------------------------------------------------------------
const proyekData = [
    // --- Web Apps ---
    { no: 1,  title: 'PufutaraOS',           titlePrefix: 'Pufutara', kategori: 'OS',                     cover: '/foto/os.png',          link: '/os/index.html',                                          category: 'web',     best: true,  desc: 'Sistem operasi modern berbasis web. Cita-cita Putra waktu kecil akhirnya terwujud di PC Labkom!' },
    { no: 2,  title: 'PufutaraArchive',       titlePrefix: 'Pufutara', kategori: 'Web App',                cover: '/foto/archive.png',      link: '/archive/index.html',                                     category: 'web',     desc: 'Platform pusat proyek web dengan desain modern, rounded, dan minimalis.' },
    { no: 3,  title: 'MutabaahOS',                                     kategori: 'Startup',                cover: '/foto/mutabaahos.png',   link: 'https://mutabaahos.vercel.app',                           category: 'desktop', desc: 'Landing page proyek full stack dan full keren. InsyaAllah jadi startup baru di Indo.' },
    { no: 4,  title: 'PufutaraTube',          titlePrefix: 'Pufutara', kategori: 'Media',                  cover: '/foto/tube.png',         link: '/tube/index.html',                                        category: 'web',     desc: 'Tempat nonton video favorit tanpa iklan yang mengganggu fokus koding kamu.' },
    { no: 5,  title: 'PufutaraChat',          titlePrefix: 'Pufutara', kategori: 'Comm',                   cover: '/foto/chat.png',         link: '/chat/index.html',                                        category: 'web',     best: true,  desc: 'Obrolan Simple, tambah akun, login, langsung chat ke semua orang secara real-time.' },
    { no: 6,  title: 'PufutaraDrive',         titlePrefix: 'Pufutara', kategori: 'Cloud',                  cover: '/foto/cloud.png',        link: '/drive/index.html',                                       category: 'web',     best: true,  desc: 'Simpan file-file penting proyek kodingan kamu dengan aman dan mudah diakses di mana saja.' },
    { no: 7,  title: 'PufutaraGallery',       titlePrefix: 'Pufutara', kategori: 'Fullstack',              cover: '/foto/image.png',        link: '/gallery/index.html',                                     category: 'web',     desc: 'Proyek Full Stack pertama Putra! Upload foto otomatis tersimpan ke server untuk dilihat semua orang.' },
    { no: 8,  title: 'PufutaraAudio',         titlePrefix: 'Pufutara', kategori: 'Audio',                  cover: '/foto/mp3music.png',     link: '/audio/index.html',                                       category: 'web',     desc: 'Dengerin lo-fi beat dan ambience alam biar koding makin chill dan nggak spaneng.' },
    { no: 9,  title: 'Pufutara MiniGames',    titlePrefix: 'Pufutara', kategori: 'Fun',                    cover: '/foto/game.png',         link: '/game/index.html',                                        category: 'web',     best: true,  desc: 'Kumpulan game ringan buat refreshing otak setelah pusing ngurusin bug di HTML.' },
    { no: 10, title: 'Pufutara ProPaint',     titlePrefix: 'Pufutara', kategori: 'Design',                 cover: '/foto/paint.png',        link: '/paint/index.html',                                       category: 'web',     best: true,  desc: 'Gambar dan sketsa apa saja dengan mudah. Aplikasi simpel, tapi tools-nya profesional.' },
    { no: 11, title: 'Pufutara Writer',       titlePrefix: 'Pufutara', kategori: 'Writing',                cover: '/foto/writer.png',       link: '/write/index.html',                                       category: 'web',     desc: 'Pengolahan kata yang cepat dan ringan. Cocok buat nulis ide proyek yang tiba-tiba muncul.' },
    { no: 12, title: 'Pufutara DigLib',       titlePrefix: 'Pufutara', kategori: 'Library',                cover: '/foto/diglib.png',       link: '/library/index.html',                                     category: 'web',     desc: 'Perpustakaan digital dan info cuaca Jalancagak biar tau kapan harus bawa payung ke Labkom.' },
    { no: 13, title: 'Pufutara SpinWheel',    titlePrefix: 'Pufutara', kategori: 'Tools',                  cover: '/foto/spinwheel.png',    link: '/spin/index.html',                                        category: 'web',     desc: 'Putuskan kelompok belajar atau pilihan sulit lainnya dengan roda tak terduga ini.' },
    { no: 14, title: 'Pufutara Workspace',    titlePrefix: 'Pufutara', kategori: 'Hub',                    cover: '/foto/workspace.png',    link: '/work/index.html',                                        category: 'web',     desc: 'Hub pusat aplikasi produktivitas Pufutara, gabungan dari berbagai proyek jadi satu.' },
    { no: 15, title: 'Pufutara ToDo List',    titlePrefix: 'Pufutara', kategori: 'Focus',                  cover: '/foto/Todo.png',         link: '/todo/index.html',                                        category: 'web',     desc: 'List tugas simpel dan modern untuk Putra yang pelupa biar jadwal tetap teratur.' },
    { no: 16, title: 'Pufutara Habit Tracker',titlePrefix: 'Pufutara', kategori: 'Goals',                  cover: '/foto/habit.png',        link: '/habit/index.html',                                       category: 'web',     desc: 'Pantau proses membangun kebiasaan baik dan hilangkan kebiasaan buruk setiap hari.' },
    { no: 17, title: 'Pufutara News & Calc',  titlePrefix: 'Pufutara', kategori: 'Utility',                cover: '/foto/news.png',         link: '/news/landing.html',                                      category: 'web',     desc: 'Baca berita terbaru atau pakai kalkulator sains akurat buat bantu tugas Labkom kamu.' },
    { no: 18, title: 'Pufutara Web V2',       titlePrefix: 'Pufutara', kategori: 'Official',               cover: '/foto/webv2.png',        link: 'https://pufuta.vercel.app',                               category: 'web',     desc: "Website utama Putra versi terbaru. Modern, cepat, dan pastinya tetap 'putraganteng'." },
    { no: 19, title: 'Pufutara Web V1',       titlePrefix: 'Pufutara', kategori: 'History',                cover: '/foto/webv1.png',        link: 'https://kanay.vercel.app',                                category: 'web',     desc: 'Saksi bisu perjalanan di BEM. Tanya anak BEM se-Sikma kalau mau tau sejarah web ini!' },
    { no: 20, title: 'Pufutara AI',           titlePrefix: 'Pufutara', kategori: 'AI',                     cover: '/foto/ai1.png',          link: 'https://pufutaraai.vercel.app',                           category: 'web',     desc: 'AI chatbot menggunakan Gemini API key sebagai dasar AI nya.' },
    { no: 21, title: 'Pufutara Calc Pro',     titlePrefix: 'Pufutara', kategori: 'Utility',                cover: '/foto/calculator.png',   link: '/calc/index.html',                                        category: 'web',     desc: 'Kalkulator modern dengan fungsi sains, persentase, dan riwayat perhitungan.' },
    { no: 22, title: 'Pufutara Vote System',  titlePrefix: 'Pufutara', kategori: 'Web',                    cover: '/foto/vote.png',         link: '/vote/index.html',                                        category: 'web',     desc: 'Sistem voting sederhana untuk menentukan pilihan kelas atau keputusan bersama.' },
    { no: 23, title: 'Pufutara Quiz App',     titlePrefix: 'Pufutara', kategori: 'Edu',                    cover: '/foto/quiz.png',         link: '/quiz/index.html',                                        category: 'web',     desc: 'Uji pengetahuanmu lewat kuis interaktif. Pilihan gacor dan leaderboard seru.' },
    { no: 24, title: 'Pufutara StikiNot',     titlePrefix: 'Pufutara', kategori: 'App',                    cover: '/foto/stikinot.png',     link: '/stikinot/index.html',                                    category: 'desktop', desc: 'Aplikasi catatan ringan, mendukung rich text dan fitur praktis lainnya.' },
    { no: 25, title: 'Pufutara Cahier',       titlePrefix: 'Pufutara', kategori: 'Note',                   cover: '/foto/cashier.png',      link: '/kasir/index.html',                                       category: 'web',     desc: 'Jurnal digital minimalis. Catat ide atau tugas sekolah dengan antarmuka menenangkan.' },
    { no: 26, title: 'Pufutara Shop',         titlePrefix: 'Pufutara', kategori: 'Store',                  cover: '/foto/shop.png',         link: '/shop/index.html',                                        category: 'web',     desc: 'Toko merchandise resmi Pufutara. Dukung terus karya lokal.' },
    { no: 27, title: 'Pufutara Browser',      titlePrefix: 'Pufutara', kategori: 'Tools',                  cover: '/foto/browser.png',      link: '/browser/index.html',                                     category: 'desktop', desc: 'Browser cepat, ringan dan modern! dibuat dari framework electron.' },
    { no: 28, title: 'Mang Pey',                                        kategori: 'Client',                cover: '/foto/mangpey.png',      link: '/dapurmangpey/index.html',                                category: 'web',     desc: 'Web buat temen pertama putra. dibuat saat gabut di hari minggu di ruang BEM.' },
    { no: 29, title: 'KLS WEB',                                         kategori: 'Pro',                   cover: '/foto/klsweb.png',       link: '/kls/index.html',                                         category: 'web',     desc: 'Landing page website organisasi authot pufutara. Kece banget kek profesional.' },
    { no: 30, title: 'DepDik Putra Web',                                kategori: 'Our lovely Departement', cover: '/foto/depdikweb.png',   link: '/depdikweb/index.html',                                   category: 'web',     desc: 'Web departmen pendidikan bem asbosch. dibuat dengan alasan untuk menyaingi web bapuk S.id depdik putri yg bayi pun bisa bikin' },
    { no: 31, title: 'PufutaraCBT',                                     kategori: 'Concept',               cover: '/foto/sarankritik.png',  link: 'cbt/index.html',                                          category: 'web',     best: true,  desc: 'CBT bersih dan aman! gaperlu pakai exam browser lagi! otoamtis fullscreen! dan kalo keluar otomatis di Ban.' },
    { no: 32, title: 'Online Order System',                             kategori: 'E-Commerce',            cover: '/foto/shop.png',         link: '/onlineorder/index.html',                                 category: 'web',     desc: 'Sistem pemesanan online modern dan praktis. Kelola pesanan, menu, dan transaksi dengan mudah!' },
    { no: 33, title: 'Aplikasi Pemira',                                 kategori: 'Voting',                cover: '/foto/vote.png',         link: '/aplikasipemira/index.html',                              category: 'web',     desc: 'Aplikasi pemilihan raya digital yang aman dan transparan. Real-time counting dan hasil instan!' },
    { no: 34, title: 'Kabinet Literasi',                                kategori: 'Education',             cover: '/foto/diglib.png',       link: '/Kabinetliterasi/index.html',                             category: 'web',     desc: 'Portal edukasi dan literasi digital untuk kabinet BEM. Berbagi ilmu, artikel, dan materi pembelajaran.' },
];

// ===== RENDER PROYEK =====
function renderProyek() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.innerHTML = proyekData.map((p, idx) => {
        // Skip proyek terbaik — sudah tampil di section tersendiri
        if (p.best) return '';

        const titleHTML = p.titlePrefix 
            ? `<span class="bg-gradient-to-r from-slate-500 to-slate-400 bg-clip-text text-transparent">${p.titlePrefix}</span>${p.title.replace(p.titlePrefix, '')}`
            : p.title;
        
        const delay = (idx % 4) * 80; // Stagger animasi per 4 kartu
        
        return `
            <a href="${p.link}" target="_blank" class="group block no-underline reveal-on-scroll" data-delay="${delay}" data-category="${p.category}">
                <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 h-full flex flex-col">
                    <div class="card-image-container relative lazy-cover" data-cover="${p.cover}" role="img" aria-label="Cover proyek ${p.title}"></div>
                    <div class="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <span class="text-[0.5rem] sm:text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">${String(p.no).padStart(2, '0')}</span>
                        <span class="h-[1px] w-2 sm:w-4 bg-black/10"></span>
                        <span class="text-[0.5rem] sm:text-[0.6rem] font-bold text-black/40 uppercase tracking-widest">${p.kategori}</span>
                    </div>
                    <h3 class="text-[0.9rem] sm:text-[1.05rem] font-bold mb-1 sm:mb-1.5 tracking-tight leading-tight sm:leading-normal">${titleHTML}</h3>
                    <p class="text-slate-500 text-[0.65rem] sm:text-[0.75rem] leading-relaxed">${p.desc}</p>
                </div>
            </a>
        `;
    }).join('');

    // Re-apply reveal observer dipanggil dari luar setelah revealObserver siap
}

// ============================================================
// NAVBAR MOBILE
// ============================================================
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const hamburgerLines = menuBtn ? menuBtn.querySelectorAll('.hamburger-line') : [];
let menuOpen = false;

if (menuBtn) menuBtn.addEventListener('click', () => {
    menuOpen = !menuOpen;
    menuBtn.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
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

const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuOpen = false;
        menuBtn && menuBtn.setAttribute('aria-expanded', 'false');
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

// ===== LAZY LOAD COVER IMAGES =====
const lazyCoverObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const cover = el.dataset.cover;
            if (cover) el.style.setProperty('--card-cover', `url('${cover}')`);
            lazyCoverObserver.unobserve(el);
        }
    });
}, { rootMargin: '200px 0px' });

// Fungsi untuk observe semua cover gambar
function observeLazyCovers() {
    document.querySelectorAll('#projects-grid .lazy-cover').forEach(el => lazyCoverObserver.observe(el));
    // Juga observe kartu proyek terbaik
    document.querySelectorAll('#proyek-terbaik-grid .lazy-cover').forEach(el => lazyCoverObserver.observe(el));
}

// Init: render proyek dari data, lalu observe kartu-kartunya
renderProyek();
// Observe setelah render — kartu yang langsung di viewport akan muncul via observer
document.querySelectorAll('#projects-grid .reveal-on-scroll').forEach(el => {
    revealObserver.observe(el);
});
// Observe gambar cover proyek
observeLazyCovers();

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
            
            // Re-observe lazy cover untuk card yang baru ditampilkan
            const lazyCover = card.querySelector('.lazy-cover');
            if (lazyCover && !lazyCover.style.getPropertyValue('--card-cover')) {
                lazyCoverObserver.observe(lazyCover);
            }
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
        fileUrl: 'foto/1.jpg'
    },
    {
        id: 2,
        type: 'video',
        title: 'Pak Ulil diwawancara',
        desc: 'video sus yang daya temukan di google drive',
        fileUrl: 'media/paulil.mp4'
    },
    {
        id: 3,
        type: 'foto',
        title: 'Putra Pidato Ketua Pelaksana',
        desc: 'ketuplak harbuknas 2026 di smpit assyifa!',
        icon: 'fa-users',
        fileUrl: 'foto/2.png'
    },
    {
        id: 4,
        type: 'foto',
        title: 'Putra OSN IPS',
        desc: 'masuk web seabagai perwakilan sekolah',
        icon: 'fa-image',
        fileUrl: 'foto/3.jpg'
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

// Untuk nambah: copy salah satu baris, isi nama/periode/peran
const organisasiData = [
    { nama: 'Ketua Komunitas Literasi Sekolah',               periode: 'SMPIT Assyifa Boarding School Jalancagak',                       peran: '2025-2026' },
    { nama: 'Sekretaris Halaqoh BPA Hamas',                   periode: 'Kelompok Bina Pribadi Assyifa — Ust. Syaiful Anwar',   peran: '2025-2026' },
    { nama: 'Sekretaris Org. Mitra Duta Kesehatan Asrama',    periode: 'Organisasi asrama dari pembinaan',                               peran: '2025-2026' },
    { nama: 'Pengurus BEM Departemen Pendidikan',             periode: 'Organisasi tertinggi setara OSIS negri, di Assyifa',             peran: '2025-2026' },
    { nama: 'Pengurus divisi Humas dan ASFERA 2026',          periode: 'Bertanggung jawab mendokumentasikan acara dengan baik',          peran: '2025-2026' },
    { nama: 'Anggota Organisasi Angkatan — Keagamaan',        periode: 'Organisasi angkatan 17 "Revourner" di Assyifa',                  peran: '2025-2026' },
    { nama: 'Anggota Komunitas Literasi Sekolah',             periode: 'Sebelum jadi ketua — kabinet Ki Hadjar Dewantara',               peran: '2025-2026' },
];

// Untuk nambah: copy salah satu baris, isi tahun/judul/desc
const prestasiData = [
    { tahun: '2026',        judul: 'Medali Emas ISSC Bidang IPS',    desc: 'Lomba online resmi dari Pusat kejuaraan Sains Nasional ( PUSKANAS )' },
    { tahun: '2026',        judul: 'Medali Emas OLIMNUS Bidang IPS',    desc: 'Lomba online resmi dari Pusat kejuaraan Sains Nasional ( PUSKANAS )' },
    { tahun: '2026',        judul: 'Medali Emas OLIMNUS Bidang B.Indo',    desc: 'Lomba online resmi dari Pusat kejuaraan Sains Nasional ( PUSKANAS )' },
    { tahun: '2026',        judul: 'Medali Perunggu OLIMNUS Bidang IPA',    desc: 'Lomba online resmi dari Pusat kejuaraan Sains Nasional ( PUSKANAS )' },
    { tahun: '2026',        judul: 'Medali Emas KSPI Bidang IPS',    desc: 'Lomba online resmi dari Pusat kejuaraan Sains Nasional ( PUSKANAS )' },
    { tahun: '2026',        judul: 'Medali perunggu KSPI Bidang IPA',    desc: 'Lomba online resmi dari Pusat kejuaraan Sains Nasional ( PUSKANAS )' },
    { tahun: '2026',        judul: 'Juara 2 Santri Cinta Lingkungan',    desc: 'Juara 2 konsisten membantu membersihkan lingkungan sekolah Assyifa.' },
    { tahun: '2026',        judul: 'Dormitory Award — Hafalan Terbanyak', desc: 'Kategori reguler pembinaan: 2 Juz 10 Halaman dalam satu semester.' },
    { tahun: '2026',        judul: 'Klub OSN SMPIT Assyifa (Tahap 3)',    desc: 'Pelatihan Olimpiade Sains Nasional tingkat sekolah tahap lanjut.' },
    { tahun: '2026',        judul: 'KOSSMI IPS Provinsi',                 desc: 'Peserta Kompetisi Sains Siswa Muslim Indonesia tingkat Jawa Barat.' },
    { tahun: '2020–2026',   judul: 'Ranking 3 Ijazah SDIT Al-Hikmah',    desc: 'Peringkat 3 rata-rata nilai selama 6 tahun (Angkatan 18).' },
    { tahun: '2019',        judul: 'Juara 3 Mewarnai',                    desc: 'Pemenang lomba tingkat kelas 2 SDIT Al-Hikmah.' },
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
        <div class="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 hover:border-primary hover:bg-white hover:shadow-md transition-all duration-200">
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

// ============================================================
// HERO ENTRANCE ANIMATION (sync dengan opening intro)
// ============================================================
(function () {
    const heroLeft  = document.getElementById('hero-left');
    const heroRight = document.getElementById('hero-right');

    function triggerHero() {
        if (heroLeft)  { setTimeout(() => heroLeft.classList.add('hero-visible'),  0);   }
        if (heroRight) { setTimeout(() => heroRight.classList.add('hero-visible'), 200); }
    }

    // Kalau intro sudah pernah ditampilkan di sesi ini, langsung tampilkan hero
    if (sessionStorage.getItem('pufutara_intro_shown')) {
        triggerHero();
    } else {
        // Sync dengan waktu opening fade-out: 1900ms + sedikit overlap 200ms
        setTimeout(triggerHero, 2100);
    }
})();

// ============================================================
// ACTIVE NAV HIGHLIGHT ON SCROLL
// ============================================================
const navLinks = document.querySelectorAll('header nav a[href^="#"]');
const pageSections = document.querySelectorAll('section[id]');

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            navLinks.forEach(link => {
                link.classList.remove('nav-active');
                if (link.getAttribute('href') === '#' + entry.target.id) {
                    link.classList.add('nav-active');
                }
            });
        }
    });
}, { threshold: 0.25, rootMargin: '-56px 0px -40% 0px' });

pageSections.forEach(section => navObserver.observe(section));

// ============================================================
// BACK TO TOP BUTTON
// ============================================================
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }, { passive: true });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================================
// TYPING ANIMATION (HERO)
// ============================================================
const typingWords = ['Santri Developer', 'Web Developer', 'Electron.js Enthusiast', 'Next.js Learner', 'Pufutara Creator'];
let wordIdx = 0, charIdx = 0, isDeleting = false;
const typingEl = document.getElementById('typing-text');

function typeEffect() {
    if (!typingEl) return;
    const currentWord = typingWords[wordIdx];
    if (isDeleting) {
        typingEl.textContent = currentWord.substring(0, charIdx - 1);
        charIdx--;
    } else {
        typingEl.textContent = currentWord.substring(0, charIdx + 1);
        charIdx++;
    }
    let speed = isDeleting ? 60 : 110;
    if (!isDeleting && charIdx === currentWord.length) {
        speed = 1800;
        isDeleting = true;
    } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        wordIdx = (wordIdx + 1) % typingWords.length;
        speed = 300;
    }
    setTimeout(typeEffect, speed);
}
// ── Navbar: muncul setelah animasi "Elfathin" selesai ──
// Elfathin: delay 2200ms dari triggerLines + ~700ms animasi masuk = 2900ms
(function () {
    // showNavbar dipanggil dari stats chain setelah semua counter selesai
    // Saat returning (session lama), langsung tampil
    var isReturning = sessionStorage.getItem('pufutara_intro_shown');
    if (isReturning) {
        var header = document.getElementById('site-header');
        if (header) {
            header.style.display = 'block';
            header.getBoundingClientRect();
            header.style.transition    = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1), background 0.4s ease, border-color 0.4s ease';
            header.style.opacity       = '1';
            header.style.transform     = 'translateY(0)';
            header.style.pointerEvents = 'all';
        }
    }
    // First visit: navbar dikendalikan window.showNavbar() dari stats chain
    window._showNavbar = function() {
        var header = document.getElementById('site-header');
        if (!header) return;
        header.style.display = 'block';
        header.getBoundingClientRect();
        header.style.transition    = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1), background 0.4s ease, border-color 0.4s ease';
        header.style.backdropFilter = 'blur(12px)';
        header.style.webkitBackdropFilter = 'blur(12px)';
        header.style.opacity       = '1';
        header.style.transform     = 'translateY(0)';
        header.style.pointerEvents = 'all';
    };
})();

// ============================================================
// STATS COUNTER ANIMATION
// ============================================================
function animateCounter(el, target, duration, onDone) {
    if (el.dataset.animated) { if (onDone) onDone(); return; }
    el.dataset.animated = '1';
    duration = duration || 1200;

    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
        start += step;
        if (start >= target) {
            el.textContent = target + '+';
            clearInterval(timer);
            if (onDone) onDone();
        } else {
            el.textContent = Math.floor(start) + '+';
        }
    }, 16);
}

// ── Hero stats: muncul satu per satu, counter tuntas dulu baru lanjut ──
(function () {
    const stats = [
        { itemId: 'stat-item-proyek',  sepId: null,       counterId: 'stat-proyek',  target: 32 },
        { itemId: 'stat-item-tahun',   sepId: 'stat-sep-1', counterId: 'stat-tahun',   target: 2  },
        { itemId: 'stat-item-org',     sepId: 'stat-sep-2', counterId: 'stat-org',     target: 7  },
        { itemId: 'stat-item-prestasi',sepId: 'stat-sep-3', counterId: 'stat-prestasi',target: 12 },
    ];

    function showStat(index, onAllDone) {
        if (index >= stats.length) {
            if (onAllDone) onAllDone();
            return;
        }
        const s = stats[index];
        const item = document.getElementById(s.itemId);
        const sep  = s.sepId ? document.getElementById(s.sepId) : null;
        const counter = document.getElementById(s.counterId);

        // Munculkan separator terlebih dahulu (kecuali stat pertama)
        if (sep) {
            sep.style.opacity = '1';
        }

        // Munculkan stat item dengan animasi
        if (item) {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
            item.style.filter = 'blur(0)';
        }

        // Tunggu 150ms (stat mulai kelihatan), lalu jalankan counter
        setTimeout(function () {
            // Durasi counter: org=500ms, tahun=400ms, lainnya=1200ms
            var duration = s.itemId === 'stat-item-org' ? 500
                         : s.itemId === 'stat-item-tahun' ? 400
                         : 1200;
            animateCounter(counter, s.target, duration, function () {
                // Counter selesai → jeda 200ms → lanjut stat berikutnya
                setTimeout(function () {
                    showStat(index + 1, onAllDone);
                }, 200);
            });
        }, 150);
    }

    function startStatChain() {
        setTimeout(function () {
            var statsEl = document.getElementById('hero-stats');
            var descEl  = document.getElementById('hero-desc');

            // Hitung offset: seberapa jauh stats harus naik ke posisi desc
            var offsetY = 0;
            if (statsEl && descEl) {
                var statsRect = statsEl.getBoundingClientRect();
                var descRect  = descEl.getBoundingClientRect();
                // Desc ada di atas stats dalam DOM — offset negatif (naik)
                offsetY = descRect.top + descRect.height / 2 - (statsRect.top + statsRect.height / 2);
            }

            // STEP 1: geser stats ke posisi celah desc (tanpa transisi)
            if (statsEl) {
                statsEl.classList.add('stats-displaced');
                statsEl.style.transform = 'translateY(' + offsetY + 'px)';
            }

            // STEP 2: jalankan counter satu per satu di posisi "celah" desc
            showStat(0, function () {
                // Semua counter selesai — STEP 3: flyback ke posisi asli
                if (statsEl) {
                    statsEl.classList.remove('stats-displaced');
                    statsEl.classList.add('stats-flyback');
                    // Force repaint
                    statsEl.getBoundingClientRect();
                    statsEl.style.transform = 'translateY(0)';
                }

                // Setelah flyback selesai (800ms) — muncul navbar + desc
                setTimeout(function() {
                    if (statsEl) {
                        statsEl.classList.remove('stats-flyback');
                        statsEl.style.transform = '';
                    }

                    // Navbar
                    if (window._showNavbar) window._showNavbar();

                    // Desc muncul
                    var desc = document.getElementById('hero-desc');
                    if (desc) {
                        desc.style.opacity   = '1';
                        desc.style.transform = 'translateY(0)';
                        desc.style.filter    = 'blur(0)';
                    }

                    // Typing + CTA 400ms setelah desc
                    setTimeout(function() {
                        var typing   = document.getElementById('hero-typing');
                        var cta      = document.getElementById('hero-cta');
                        var keahlian = document.getElementById('keahlian');

                        [typing, cta].forEach(function(el) {
                            if (el) {
                                el.style.opacity   = '1';
                                el.style.transform = 'translateY(0)';
                                el.style.filter    = 'blur(0)';
                            }
                        });
                        if (keahlian) {
                            keahlian.style.animationDelay = '0ms';
                            keahlian.classList.add('hero-line-visible');
                        }
                        setTimeout(typeEffect, 100);
                    }, 400);

                }, 850);
            });

        }, 2200 + 700 + 300 + 500); // = 3700ms setelah triggerLines
    }

    // Sinkron dengan triggerLines
    const isReturning = sessionStorage.getItem('pufutara_intro_shown');
    const triggerBase = isReturning ? 50 : 2650;
    setTimeout(startStatChain, triggerBase);
})();

// ── Counter di luar hero: IntersectionObserver ──
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            if (!el.classList.contains('hero-counter')) {
                animateCounter(el, parseInt(el.dataset.count), 1500, null);
            }
            statsObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => statsObserver.observe(el));
