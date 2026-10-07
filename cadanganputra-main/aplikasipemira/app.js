// ============================================================
// === SECTION: 9. HALAMAN: PILIH KANDIDAT ===
// ============================================================

// >> Navigasi halaman (dipanggil dari tombol navbar)
function showPage(page) {
    if (page === 'admin') {
        if (!isAdminLoggedIn) { openAdminLoginModal(); return; }
        hideAllScreens();
        const adminPage = document.getElementById('adminPage');
        const changeClassNavBtn = document.getElementById('changeClassNavBtn');
        const homeNavBtn = document.getElementById('homeNavBtn');

        if (adminPage) adminPage.classList.remove('hidden');
        if (changeClassNavBtn) changeClassNavBtn.classList.remove('hidden');
        if (homeNavBtn) homeNavBtn.classList.remove('hidden');

        if (typeof renderAdminDashboard === 'function') {
            renderAdminDashboard();
        }
        return;
    }

    const voter = currentRole === 'guru' ? activeTeacher : selectedStudent;
    if (!voter) { showRoleSelectScreen(); return; }
    hideAllScreens();
    const homePage = document.getElementById('homePage');
    if (homePage) homePage.classList.remove('hidden');
    renderCandidatesHome();
}

// >> Render grid kartu kandidat
function renderCandidatesHome() {
    const container = document.getElementById('candidateList');
    if (!container) return;
    container.innerHTML = '';

    const sorted = [...candidates].sort((a, b) => a.no - b.no);

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="w-full max-w-md mx-auto text-center py-12 px-6 bg-white rounded-3xl border border-slate-100 text-slate-400">
                <i class="fa-solid fa-users-slash text-4xl mb-3 text-slate-300"></i>
                <p class="text-sm font-medium">Belum ada calon Presiden BEM yang terdaftar.</p>
            </div>
        `;
        return;
    }

    sorted.forEach(c => {
        const card     = document.createElement('div');
        card.className = "candidate-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between w-56 text-center cursor-pointer group";
        card.onclick   = () => openCandidateModal(c.id);
        card.innerHTML = `
            <div>
                <div class="relative h-56 w-full overflow-hidden bg-slate-100">
                    <img src="${c.image}" alt="${c.name}" class="img-hover-zoom w-full h-full object-cover">
                    <span class="absolute top-3 left-3 gradient-btn text-white font-black text-xs px-3 py-1 rounded-full shadow-md">
                        No. ${c.no}
                    </span>
                </div>
                <div class="px-4 pt-4 pb-3">
                    <h3 class="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug">${c.name}</h3>
                </div>
            </div>
            <div class="px-4 pb-4">
                <div class="w-full bg-sky-50 group-hover:bg-sky-100 text-sky-700 font-bold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5">
                    <span>Lihat Visi & Misi</span>
                    <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
