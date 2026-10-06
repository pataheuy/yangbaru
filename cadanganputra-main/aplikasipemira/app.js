// ============================================================
//  app.js — Logic utama Aplikasi PEMIRA BEM SMP
//  Di-load oleh index.html setelah semua CDN library siap.
//
//  CARA BACA FILE INI (untuk AI maupun manusia):
//  Setiap section dibatasi blok === SECTION: <NAMA> ===
//  Urutan section:
//   1. CONFIG & STATE        — konstanta + variabel global
//   2. INIT                  — DOMContentLoaded + setup awal
//   3. DATA LAYER            — load/save localStorage & Supabase
//   4. SUPABASE: STUDENTS    — upsert / delete / reset via Supabase
//   5. SUPABASE: CANDIDATES  — upsert / delete / storage upload
//   6. SUPABASE: VOTE LOGS   — insert / load / clear vote_logs
//   7. HALAMAN: WELCOME      — tampilkan kartu kelas di beranda
//   8. HALAMAN: PILIH SISWA  — pencarian & seleksi siswa
//   9. HALAMAN: PILIH KANDIDAT — render kartu & modal kandidat
//  10. ALUR VOTING           — konfirmasi & eksekusi suara
//  11. AUTH ADMIN            — login / logout admin
//  12. ADMIN: SISWA          — modal kelola data siswa
//  13. ADMIN: KANDIDAT       — tambah / edit / hapus kandidat
//  14. ADMIN: KELAS          — tambah / hapus tingkat kelas
//  15. ADMIN: DASHBOARD      — statistik & chart
//  16. AUDIT LOG             — tampilkan & filter log suara
//  17. EXCEL: TEMPLATE       — unduh template kosong
//  18. EXCEL: EKSPOR         — ekspor data siswa ke Excel
//  19. UI HELPERS            — showAlertModal, closeAlertModal
// ============================================================


// ============================================================
// === SECTION: 1. CONFIG & STATE ===
// ============================================================

// >> Supabase credentials — ganti jika project berubah
const SUPABASE_URL      = "https://puywjdopumlzvmzbcudr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc";

// >> Admin password (plaintext, dicocokkan langsung)
const ADMIN_PASSWORD = 'raisarfaketuampm';

// >> Kelas default jika localStorage kosong
const defaultClasses    = ["Kelas 7", "Kelas 8", "Kelas 9"];
const defaultCandidates = []; // kandidat sepenuhnya dari Supabase / admin

// >> Supabase runtime objects
let supabaseClient   = null;
let isSupabaseActive = false;

// >> Chart instances (disimpan agar bisa destroy sebelum re-render)
let voterPieChartInstance    = null;
let candidateBarChartInstance = null;

// >> Data arrays — sumber kebenaran utama di memory
let classes    = [];   // ["Kelas 7", "Kelas 8", "Kelas 9"]
let candidates = [];   // [{ id, no, name, image, visi, misi[], votes, votes_by_class{} }]
let students   = [];   // [{ id, name, grade, password, hasVoted, votedFor }]
let voterStats = {};   // { "Kelas 7": 12, "Kelas 8": 5, ... } — sudah usang, backup dari hasVoted

// >> Session state
let currentSelectedGrade = "";   // kelas yang sedang diproses di halaman pilih siswa
let selectedStudent      = null; // siswa yang sedang login & akan memilih
let pendingStudentId     = null; // ID siswa yang sedang diverifikasi passwordnya

// >> Admin & voting state
let isAdminLoggedIn   = false;
let selectedCandidateId = null;  // kandidat yang dipilih di modal visi/misi
let countdownInterval  = null;   // interval timer konfirmasi voting

// >> Footer secret click counter
let footerClickCount = 0;
let footerClickTimer = null;


// ============================================================
// === SECTION: 2. INIT ===
// ============================================================

// >> Entry point — dipanggil otomatis saat DOM siap
window.addEventListener('DOMContentLoaded', async () => {
    initSupabaseClient();
    renderWelcomeClassesLoading(); // tampilkan skeleton dulu
    await loadData();              // fetch data dari localStorage + Supabase
    renderWelcomeClasses();        // render kartu kelas
});

// >> Inisialisasi koneksi Supabase
function initSupabaseClient() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
        try {
            supabaseClient   = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            isSupabaseActive = true;
        } catch (err) {
            isSupabaseActive = false;
        }
    } else {
        isSupabaseActive = false;
    }
}

// >> Klik footer 5x cepat → buka login admin (hidden trigger)
function handleFooterClick() {
    footerClickCount++;
    clearTimeout(footerClickTimer);

    if (footerClickCount >= 5) {
        footerClickCount = 0;
        openAdminAuth();
    } else {
        footerClickTimer = setTimeout(() => { footerClickCount = 0; }, 1500);
    }
}


// ============================================================
// === SECTION: 3. DATA LAYER ===
// ============================================================
// Urutan prioritas data: Supabase (jika aktif) > localStorage > default

async function loadData() {
    // --- Baca dari localStorage dulu sebagai fallback ---
    const storedClasses = localStorage.getItem('pemira_classes');
    classes = storedClasses ? JSON.parse(storedClasses) : [...defaultClasses];

    const storedCandidates = localStorage.getItem('pemira_candidates');
    candidates = storedCandidates ? JSON.parse(storedCandidates) : [...defaultCandidates];

    const storedStudents = localStorage.getItem('pemira_students');
    if (storedStudents) {
        try { students = JSON.parse(storedStudents); } catch (e) { students = []; }
    } else {
        students = generateDefaultSampleStudents();
        saveStudentsLocal();
    }

    const storedStats = localStorage.getItem('pemira_voter_stats');
    voterStats = storedStats ? JSON.parse(storedStats) : {};

    // --- Jika Supabase aktif, timpa dengan data terbaru dari cloud ---
    if (isSupabaseActive && supabaseClient) {
        try {
            // Kandidat
            const { data: candData } = await supabaseClient
                .from('candidates').select('*').order('no', { ascending: true });
            if (candData && candData.length > 0) {
                candidates = candData.map(c => ({
                    id:             c.id,
                    no:             c.no,
                    name:           c.name,
                    image:          c.image,
                    visi:           c.visi,
                    misi:           Array.isArray(c.misi) ? c.misi : (typeof c.misi === 'string' ? JSON.parse(c.misi) : []),
                    votes:          c.votes || 0,
                    votes_by_class: c.votes_by_class || {}
                }));
            }

            // Siswa
            const { data: stdData } = await supabaseClient
                .from('students').select('*').order('name', { ascending: true });
            if (stdData && stdData.length > 0) {
                students = stdData.map(s => ({
                    id:       s.id,
                    name:     s.name,
                    grade:    s.grade,
                    password: s.password || '',
                    hasVoted: s.has_voted || false,
                    votedFor: s.voted_for || null
                }));
                saveStudentsLocal();
            }
        } catch (e) {
            console.log("Supabase unavailable — using local data.");
        }
    }

    loadVoteLogsLocal(); // load audit log dari localStorage
}

// >> Simpan ke localStorage
function saveClassesLocal()    { localStorage.setItem('pemira_classes',     JSON.stringify(classes));    }
function saveCandidatesLocal() { localStorage.setItem('pemira_candidates',  JSON.stringify(candidates)); }
function saveStudentsLocal()   { localStorage.setItem('pemira_students',    JSON.stringify(students));   }
function saveVoterStatsLocal() { localStorage.setItem('pemira_voter_stats', JSON.stringify(voterStats)); }

// >> Buat 10 siswa contoh per kelas jika belum ada data
function generateDefaultSampleStudents() {
    const list = [];
    let count = 1;
    classes.forEach(g => {
        for (let i = 1; i <= 10; i++) {
            list.push({
                id:       `std_${count++}`,
                name:     `Siswa ${i} ${g}`,
                grade:    g,
                password: `siswa${i}`,
                hasVoted: false,
                votedFor: null
            });
        }
    });
    return list;
}


// ============================================================
// === SECTION: 4. SUPABASE: STUDENTS ===
// ============================================================

// >> Sinkron satu siswa ke Supabase (upsert)
async function syncStudentToSupabase(student) {
    if (!isSupabaseActive || !supabaseClient || !student) return;
    try {
        await supabaseClient.from('students').upsert({
            id:        student.id,
            name:      student.name,
            grade:     student.grade,
            password:  student.password || '',
            has_voted: student.hasVoted,
            voted_for: student.votedFor
        });
    } catch (e) { console.error("syncStudentToSupabase error:", e); }
}

// >> Sinkron banyak siswa sekaligus (batch upsert)
async function syncMultipleStudentsToSupabase(studentList) {
    if (!isSupabaseActive || !supabaseClient || !studentList?.length) return;
    try {
        const payload = studentList.map(s => ({
            id:        s.id,
            name:      s.name,
            grade:     s.grade,
            password:  s.password || '',
            has_voted: s.hasVoted,
            voted_for: s.votedFor
        }));
        await supabaseClient.from('students').upsert(payload);
    } catch (e) { console.error("syncMultipleStudentsToSupabase error:", e); }
}

// >> Hapus satu siswa dari Supabase
async function deleteStudentFromSupabase(studentId) {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('students').delete().eq('id', studentId);
    } catch (e) { console.error("deleteStudentFromSupabase error:", e); }
}

// >> Hapus semua siswa satu kelas dari Supabase
async function deleteStudentsByGradeFromSupabase(grade) {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('students').delete().eq('grade', grade);
    } catch (e) { console.error("deleteStudentsByGradeFromSupabase error:", e); }
}

// >> Hapus SEMUA siswa dari Supabase
async function deleteAllStudentsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('students').delete().neq('id', '0');
    } catch (e) { console.error("deleteAllStudentsFromSupabase error:", e); }
}

// >> Reset has_voted & voted_for semua siswa di Supabase
async function resetAllStudentVotesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('students')
            .update({ has_voted: false, voted_for: null })
            .neq('id', '0');
    } catch (e) { console.error("resetAllStudentVotesInSupabase error:", e); }
}


// ============================================================
// === SECTION: 5. SUPABASE: CANDIDATES ===
// ============================================================

// >> Upload foto kandidat ke Storage bucket "candidate-images"
// >> Return: URL publik | null jika gagal
async function uploadCandidateImageToStorage(file, candidateId) {
    if (!isSupabaseActive || !supabaseClient || !file) return null;
    try {
        const ext      = file.name.split('.').pop();
        const filePath = `${candidateId}.${ext}`;

        const { error: upErr } = await supabaseClient.storage
            .from('candidate-images')
            .upload(filePath, file, { upsert: true, contentType: file.type });

        if (upErr) { console.warn("Storage upload error:", upErr.message); return null; }

        const { data: urlData } = supabaseClient.storage
            .from('candidate-images').getPublicUrl(filePath);

        return urlData?.publicUrl || null;
    } catch (e) { console.error("uploadCandidateImageToStorage error:", e); return null; }
}

// >> Upsert satu kandidat ke tabel candidates
async function upsertCandidateToSupabase(candidate) {
    if (!isSupabaseActive || !supabaseClient || !candidate) return;
    try {
        await supabaseClient.from('candidates').upsert({
            id:             candidate.id,
            no:             candidate.no,
            name:           candidate.name,
            image:          candidate.image,
            visi:           candidate.visi,
            misi:           candidate.misi,
            votes:          candidate.votes,
            votes_by_class: candidate.votes_by_class
        });
    } catch (e) { console.error("upsertCandidateToSupabase error:", e); }
}

// >> Hapus kandidat dari tabel + Storage
async function deleteCandidateFromSupabase(candidateId) {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('candidates').delete().eq('id', candidateId);
        await supabaseClient.storage.from('candidate-images')
            .remove([`${candidateId}.jpg`, `${candidateId}.jpeg`, `${candidateId}.png`, `${candidateId}.webp`]);
    } catch (e) { console.error("deleteCandidateFromSupabase error:", e); }
}

// >> Reset votes & votes_by_class semua kandidat ke 0 / {}
async function resetCandidatesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        for (const c of candidates) {
            await supabaseClient.from('candidates')
                .update({ votes: 0, votes_by_class: {} }).eq('id', c.id);
        }
    } catch (e) { console.error("resetCandidatesInSupabase error:", e); }
}


// ============================================================
// === SECTION: 6. SUPABASE: VOTE LOGS ===
// ============================================================

let voteLogs         = []; // array log di memory + localStorage
let auditLogFiltered = []; // copy setelah filter diterapkan

// >> Baca dari localStorage
function loadVoteLogsLocal() {
    try {
        const raw = localStorage.getItem('pemira_vote_logs');
        voteLogs = raw ? JSON.parse(raw) : [];
    } catch (e) { voteLogs = []; }
}

// >> Tulis ke localStorage
function saveVoteLogsLocal() {
    localStorage.setItem('pemira_vote_logs', JSON.stringify(voteLogs));
}

// >> Simpan satu entri log: localStorage + Supabase insert
async function saveVoteLog(entry) {
    entry.id = entry.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    voteLogs.push(entry);
    saveVoteLogsLocal();

    if (isSupabaseActive && supabaseClient) {
        try {
            await supabaseClient.from('vote_logs').insert({
                id:             entry.id,
                student_id:     entry.student_id,
                student_name:   entry.student_name,
                student_grade:  entry.student_grade,
                candidate_id:   entry.candidate_id,
                candidate_name: entry.candidate_name,
                candidate_no:   entry.candidate_no,
                voted_at:       entry.voted_at
            });
        } catch (e) { console.error('saveVoteLog Supabase error:', e); }
    }
}

// >> Muat ulang semua log dari Supabase lalu render tabel
async function loadAuditLogFromSupabase() {
    if (isSupabaseActive && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('vote_logs').select('*').order('voted_at', { ascending: false });
            if (!error && data) {
                voteLogs = data.map(r => ({
                    id:             r.id,
                    student_id:     r.student_id,
                    student_name:   r.student_name,
                    student_grade:  r.student_grade,
                    candidate_id:   r.candidate_id,
                    candidate_name: r.candidate_name,
                    candidate_no:   r.candidate_no,
                    voted_at:       r.voted_at
                }));
                saveVoteLogsLocal();
            }
        } catch (e) { console.error('loadAuditLogFromSupabase error:', e); }
    }
    renderAuditLog(voteLogs);
}

// >> Hapus semua log dari Supabase (dipakai saat reset suara)
async function clearVoteLogsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('vote_logs').delete().neq('id', '___none___');
    } catch (e) { console.error('clearVoteLogsFromSupabase error:', e); }
}


// ============================================================
// === SECTION: 7. HALAMAN: WELCOME ===
// ============================================================

// >> Tampilkan skeleton saat data belum dimuat
function renderWelcomeClassesLoading() {
    const container = document.getElementById('classCardGrid');
    if (!container) return;
    let html = '';
    for (let i = 0; i < 3; i++) {
        html += `
            <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4 animate-pulse">
                <div class="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500">
                    <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
                </div>
                <div class="w-full text-center space-y-2">
                    <div class="h-6 bg-slate-200 rounded-lg w-1/2 mx-auto"></div>
                    <div class="h-3 bg-slate-100 rounded-md w-3/4 mx-auto"></div>
                </div>
                <div class="h-8 bg-sky-50/70 rounded-full w-3/4 mx-auto mt-2 flex items-center justify-center">
                    <span class="text-[11px] font-semibold text-sky-400">Memuat Data...</span>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// >> Render kartu kelas (Kelas 7, Kelas 8, Kelas 9)
function renderWelcomeClasses() {
    const container = document.getElementById('classCardGrid');
    container.innerHTML = '';

    classes.forEach((cls, idx) => {
        const classStudents = students.filter(st => st.grade === cls);
        const votedCount    = classStudents.filter(st => st.hasVoted).length;
        const logoFileName  = `logo${idx + 1}.png`;

        const card = document.createElement('div');
        card.className = "class-card bg-white p-8 rounded-3xl border border-slate-100 shadow-sm cursor-pointer flex flex-col items-center justify-center space-y-4";
        card.onclick    = () => showStudentSelectScreen(cls);
        card.innerHTML  = `
            <div class="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center overflow-hidden p-2">
                <img src="${logoFileName}" alt="${cls}" class="w-full h-full object-contain"
                    onerror="this.onerror=null; this.src='https://placehold.co/100x100/0284c7/ffffff?text=${encodeURIComponent(cls)}';">
            </div>
            <div>
                <h3 class="text-2xl font-bold text-slate-800">${cls}</h3>
                <p class="text-xs text-slate-400 mt-1">${classStudents.length} Siswa (${votedCount} Memilih)</p>
            </div>
            <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                Masuk & Cari Nama <i class="fa-solid fa-arrow-right ml-1 text-[10px]"></i>
            </span>
        `;
        container.appendChild(card);
    });
}

// >> Tampilkan halaman selamat datang (reset semua state sementara)
function showWelcomeScreen() {
    selectedStudent = null;
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('studentSelectScreen').classList.add('hidden');
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('changeClassNavBtn').classList.add('hidden');
    document.getElementById('homeNavBtn').classList.add('hidden');
    renderWelcomeClasses();
}


// ============================================================
// === SECTION: 8. HALAMAN: PILIH SISWA ===
// ============================================================

// >> Masuk ke halaman pencarian siswa untuk kelas tertentu
function showStudentSelectScreen(grade) {
    currentSelectedGrade = grade;
    document.getElementById('fullClassBadge').innerText = grade;
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('studentSelectScreen').classList.remove('hidden');
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');

    const searchInput = document.getElementById('studentSearchInput');
    searchInput.value = '';
    renderStudentCards(''); // kosongkan dulu
    setTimeout(() => searchInput.focus(), 100);
}

// >> Dipanggil saat input search berubah (oninput)
function filterStudentList() {
    renderStudentCards(document.getElementById('studentSearchInput').value);
}

// >> Render kartu siswa yang cocok dengan query
// >> Hanya tampil setelah min 3 karakter, dan hanya siswa yang belum memilih
function renderStudentCards(filterQuery = '') {
    const container = document.getElementById('studentListGrid');
    container.innerHTML = '';
    const query = filterQuery.trim();

    if (query.length < 3) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 bg-white/60 border border-dashed border-slate-200 rounded-2xl p-6 text-slate-400">
                <i class="fa-solid fa-keyboard text-3xl mb-2 text-slate-300 block"></i>
                <p class="text-xs font-semibold">Ketik minimal 3 karakter nama Anda untuk mencari.</p>
            </div>
        `;
        return;
    }

    const filtered = students.filter(s =>
        s.grade === currentSelectedGrade &&
        !s.hasVoted &&
        s.name.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 bg-white rounded-2xl border border-slate-100 p-6 text-slate-400">
                <i class="fa-solid fa-user-slash text-3xl mb-2 text-slate-300 block"></i>
                <p class="text-xs font-semibold">Tidak ditemukan siswa "${query}" di ${currentSelectedGrade}.</p>
                <p class="text-[11px] mt-1 text-slate-400">Periksa ejaan atau hubungi admin.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(st => {
        const card = document.createElement('div');
        card.className = "student-card bg-white px-5 py-4 rounded-2xl border border-sky-100 hover:border-sky-400 cursor-pointer flex items-center justify-between shadow-sm active:scale-[0.98] transition";
        card.onclick    = () => selectStudentAndProceed(st.id);
        card.innerHTML  = `
            <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="text-left">
                    <h4 class="font-bold text-slate-800 text-base leading-tight">${st.name}</h4>
                    <span class="text-xs text-sky-600 font-semibold block mt-0.5">
                        ${st.grade} &nbsp;·&nbsp; Tap untuk memilih
                        <i class="fa-solid fa-arrow-right ml-0.5 text-[10px]"></i>
                    </span>
                </div>
            </div>
            <i class="fa-solid fa-chevron-right text-sm text-sky-400"></i>
        `;
        container.appendChild(card);
    });
}

// >> Siswa diklik → cek status → buka modal verifikasi password
function selectStudentAndProceed(studentId) {
    const st = students.find(s => s.id === studentId);
    if (!st) return;

    if (st.hasVoted) {
        showAlertModal('Sudah Memilih', `${st.name} sudah memberikan suara. Satu siswa hanya boleh memilih satu kali!`, 'info');
        return;
    }
    openStudentPasswordModal(st);
}

// >> Buka modal verifikasi password siswa
function openStudentPasswordModal(st) {
    pendingStudentId = st.id;
    document.getElementById('passwordModalStudentName').innerText = `${st.name} — ${st.grade}`;
    document.getElementById('studentPasswordInput').value = '';
    document.getElementById('passwordError').classList.add('hidden');
    const modal = document.getElementById('studentPasswordModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('studentPasswordInput').focus(), 100);
}

// >> Tutup modal verifikasi password
function closeStudentPasswordModal() {
    pendingStudentId = null;
    const modal = document.getElementById('studentPasswordModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// >> Verifikasi password yang diinput siswa
function verifyStudentPassword() {
    const st = students.find(s => s.id === pendingStudentId);
    if (!st) { closeStudentPasswordModal(); return; }

    const entered = document.getElementById('studentPasswordInput').value;
    if (entered === st.password) {
        closeStudentPasswordModal();
        // Lanjut ke halaman kandidat
        selectedStudent = st;
        document.getElementById('activeVoterName').innerText  = st.name;
        document.getElementById('activeVoterClass').innerText = st.grade;
        document.getElementById('studentSelectScreen').classList.add('hidden');
        document.getElementById('homePage').classList.remove('hidden');
        document.getElementById('changeClassNavBtn').classList.remove('hidden');
        document.getElementById('homeNavBtn').classList.remove('hidden');
        renderCandidatesHome();
    } else {
        document.getElementById('passwordError').classList.remove('hidden');
        document.getElementById('studentPasswordInput').value = '';
        document.getElementById('studentPasswordInput').focus();
    }
}

// >> Batalkan pilihan siswa, kembali ke halaman search kelas ini
function cancelVoterSelection() {
    selectedStudent = null;
    showStudentSelectScreen(currentSelectedGrade);
}


// ============================================================
// === SECTION: 9. HALAMAN: PILIH KANDIDAT ===
// ============================================================

// >> Navigasi halaman (dipanggil dari tombol navbar)
function showPage(page) {
    const homePage    = document.getElementById('homePage');
    const adminPage   = document.getElementById('adminPage');
    const welcomeScreen = document.getElementById('welcomeScreen');

    if (page === 'admin') {
        if (!isAdminLoggedIn) { openAdminLoginModal(); return; }
        welcomeScreen.classList.add('hidden');
        document.getElementById('studentSelectScreen').classList.add('hidden');
        homePage.classList.add('hidden');
        adminPage.classList.remove('hidden');
        document.getElementById('changeClassNavBtn').classList.remove('hidden');
        document.getElementById('homeNavBtn').classList.remove('hidden');
        renderAdminDashboard();
    } else {
        if (!selectedStudent) { showWelcomeScreen(); return; }
        welcomeScreen.classList.add('hidden');
        document.getElementById('studentSelectScreen').classList.add('hidden');
        homePage.classList.remove('hidden');
        adminPage.classList.add('hidden');
        renderCandidatesHome();
    }
}

// >> Render grid kartu kandidat
function renderCandidatesHome() {
    const container = document.getElementById('candidateList');
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

// >> Buka modal visi/misi kandidat
function openCandidateModal(id) {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;

    selectedCandidateId = id;
    document.getElementById('modalImg').src      = candidate.image;
    document.getElementById('modalNo').innerText  = `Nomor Urut ${candidate.no}`;
    document.getElementById('modalName').innerText = candidate.name;
    document.getElementById('modalVisi').innerText = `"${candidate.visi}"`;

    const misiList = document.getElementById('modalMisi');
    misiList.innerHTML = '';
    candidate.misi.forEach(m => {
        const li = document.createElement('li');
        li.innerText = m;
        misiList.appendChild(li);
    });

    const modal = document.getElementById('candidateModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// >> Tutup modal visi/misi
function closeCandidateModal() {
    const modal = document.getElementById('candidateModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}


// ============================================================
// === SECTION: 10. ALUR VOTING ===
// ============================================================

// >> Dari modal kandidat → buka modal konfirmasi suara
function openVoteConfirmation() {
    const candidate = candidates.find(c => c.id === selectedCandidateId);
    if (!candidate || !selectedStudent) return;

    closeCandidateModal();
    document.getElementById('confirmStudentNameDisplay').innerText = `${selectedStudent.name} (${selectedStudent.grade})`;
    document.getElementById('confirmCandidateName').innerText      = candidate.name;

    // Reset timer
    let timeLeft    = 3;
    const timerEl   = document.getElementById('countdownTimer');
    const finalBtn  = document.getElementById('finalVoteBtn');
    const finalText = document.getElementById('finalVoteText');

    timerEl.innerText      = timeLeft;
    finalBtn.disabled      = true;
    finalBtn.className     = "w-full bg-slate-300 text-slate-500 font-bold py-3.5 rounded-2xl transition flex items-center justify-center space-x-2 cursor-not-allowed";
    finalText.innerText    = `Tunggu ${timeLeft} Detik...`;

    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText   = timeLeft;
        finalText.innerText = `Tunggu ${timeLeft} Detik...`;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            timerEl.innerText   = "0";
            finalBtn.disabled   = false;
            finalBtn.className  = "w-full gradient-btn text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg";
            finalText.innerText = "Saya Yakin Memilih Presiden BEM Ini";
        }
    }, 1000);

    const modal = document.getElementById('confirmVoteModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// >> Tutup modal konfirmasi
function closeConfirmVoteModal() {
    clearInterval(countdownInterval);
    const modal = document.getElementById('confirmVoteModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// >> Eksekusi suara setelah tombol dikonfirmasi
async function executeVote() {
    const candidate = candidates.find(c => c.id === selectedCandidateId);
    if (!candidate || !selectedStudent) return;

    if (!candidate.votes_by_class) candidate.votes_by_class = {};
    const activeGrade = selectedStudent.grade;

    // Update hitungan suara
    candidate.votes++;
    candidate.votes_by_class[activeGrade] = (candidate.votes_by_class[activeGrade] || 0) + 1;
    voterStats[activeGrade] = (voterStats[activeGrade] || 0) + 1;

    // Tandai siswa sudah memilih
    selectedStudent.hasVoted = true;
    selectedStudent.votedFor = candidate.id;

    // Simpan ke localStorage
    saveCandidatesLocal();
    saveStudentsLocal();
    saveVoterStatsLocal();

    // Sync ke Supabase
    if (isSupabaseActive && supabaseClient) {
        try {
            await supabaseClient.from('candidates')
                .update({ votes: candidate.votes, votes_by_class: candidate.votes_by_class })
                .eq('id', candidate.id);
        } catch (err) { console.error("Vote sync to Supabase error:", err); }
        syncStudentToSupabase(selectedStudent);
    }

    // Simpan audit log
    await saveVoteLog({
        student_id:     selectedStudent.id,
        student_name:   selectedStudent.name,
        student_grade:  activeGrade,
        candidate_id:   candidate.id,
        candidate_name: candidate.name,
        candidate_no:   candidate.no,
        voted_at:       new Date().toISOString()
    });

    const votedName = selectedStudent.name;
    selectedStudent = null;

    closeConfirmVoteModal();
    showAlertModal('Berhasil Memilih!',
        `Suara atas nama ${votedName} (${activeGrade}) untuk ${candidate.name} telah tersimpan.`, 'success');
    showWelcomeScreen();
}


// ============================================================
// === SECTION: 11. AUTH ADMIN ===
// ============================================================

// >> Cek status login sebelum ke panel admin
function openAdminAuth() {
    if (isAdminLoggedIn) { showPage('admin'); }
    else                 { openAdminLoginModal(); }
}

function openAdminLoginModal() {
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('loginError').classList.add('hidden');
    const modal = document.getElementById('adminLoginModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAdminLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function handleAdminLogin(event) {
    event.preventDefault();
    const pass = document.getElementById('adminPasswordInput').value;
    if (pass === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        closeAdminLoginModal();
        showPage('admin');
        showAlertModal('Login Berhasil', 'Selamat datang di Panel Admin BEM SMP.', 'success');
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    showWelcomeScreen();
    showAlertModal('Selesai', 'Anda telah keluar dari mode admin.', 'info');
}


// ============================================================
// === SECTION: 12. ADMIN: SISWA ===
// ============================================================

// >> Buka modal kelola siswa (populate dropdown kelas)
function openStudentManageModal() {
    const gradeSelect = document.getElementById('adminStudentGradeSelect');
    gradeSelect.innerHTML = classes.map(g => `<option value="${g}">${g}</option>`).join('');
    renderAdminStudentManager();
    const modal = document.getElementById('studentManageModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeStudentManageModal() {
    const modal = document.getElementById('studentManageModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// >> Render tabel siswa di modal (filter berdasarkan dropdown kelas)
function renderAdminStudentManager() {
    const selectedGrade = document.getElementById('adminStudentGradeSelect').value;
    document.getElementById('adminActiveFullClass').innerText = selectedGrade;

    const classStudents = students.filter(st => st.grade === selectedGrade);
    document.getElementById('studentCountBadge').innerText = `${classStudents.length} Siswa`;

    const tbody = document.getElementById('adminStudentTableBody');
    tbody.innerHTML = '';

    if (classStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-4 text-center text-slate-400">
                    Belum ada siswa. Tambah manual, impor Excel, atau klik "30 Siswa".
                </td>
            </tr>
        `;
        return;
    }

    classStudents.forEach((st, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2.5 pl-4 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-2.5 font-bold text-slate-800">${st.name}</td>
            <td class="p-2.5">
                <span class="font-mono text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                    ${st.password || '<span class="text-slate-400 italic">—</span>'}
                </span>
                <button onclick="editStudentPassword('${st.id}')" class="ml-1 text-sky-500 hover:text-sky-700 text-[10px]">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
            <td class="p-2.5">
                ${st.hasVoted
                    ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold text-[10px]">Sudah Memilih</span>'
                    : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold text-[10px]">Belum Memilih</span>'
                }
            </td>
            <td class="p-2.5 text-right pr-4 space-x-1">
                <button onclick="editStudentName('${st.id}')" class="text-blue-600 hover:text-blue-800 text-[11px] font-semibold">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                ${st.hasVoted
                    ? `<button onclick="resetSingleStudentVote('${st.id}')" class="text-amber-600 hover:text-amber-800 text-[11px] font-semibold">
                           <i class="fa-solid fa-rotate-left"></i> Reset
                       </button>`
                    : ''
                }
                <button onclick="deleteSingleStudent('${st.id}')" class="text-rose-600 hover:text-rose-800 text-[11px] font-semibold">
                    <i class="fa-solid fa-trash"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// >> Edit nama siswa via prompt
function editStudentName(id) {
    const st = students.find(s => s.id === id);
    if (!st) return;
    const newName = prompt("Edit Nama Siswa:", st.name);
    if (newName && newName.trim()) {
        st.name = newName.trim();
        saveStudentsLocal();
        syncStudentToSupabase(st);
        renderAdminStudentManager();
        renderAdminDashboard();
        showAlertModal('Berhasil', 'Nama siswa diperbarui.', 'success');
    }
}

// >> Edit password siswa via prompt
function editStudentPassword(id) {
    const st = students.find(s => s.id === id);
    if (!st) return;
    const newPass = prompt("Edit Password Siswa:", st.password || '');
    if (newPass !== null && newPass.trim()) {
        st.password = newPass.trim();
        saveStudentsLocal();
        syncStudentToSupabase(st);
        renderAdminStudentManager();
        showAlertModal('Berhasil', 'Password siswa diperbarui.', 'success');
    }
}

// >> Form tambah siswa satu per satu (submit dari HTML)
function handleAddStudent(e) {
    e.preventDefault();
    const selectedGrade = document.getElementById('adminStudentGradeSelect').value;
    const nameInput     = document.getElementById('newStudentNameInput');
    const passInput     = document.getElementById('newStudentPasswordInput');
    const name     = nameInput.value.trim();
    const password = passInput.value.trim();

    if (name && password) {
        const newStudent = {
            id:       `std_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name,
            grade:    selectedGrade,
            password,
            hasVoted: false,
            votedFor: null
        };
        students.push(newStudent);
        saveStudentsLocal();
        syncStudentToSupabase(newStudent);
        nameInput.value = '';
        passInput.value = '';
        renderAdminStudentManager();
        renderAdminDashboard();
    }
}

// >> Import siswa dari file Excel menggunakan SheetJS
// >> Kolom yang dicari: "Nama"/"Name" dan "Password"/"Sandi"
function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const selectedGrade = document.getElementById('adminStudentGradeSelect').value;
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data      = new Uint8Array(e.target.result);
            const workbook  = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData  = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!jsonData?.length) {
                showAlertModal('File Kosong', 'Tidak ada data dalam file Excel.', 'info');
                return;
            }

            // Auto-detect kolom Nama & Password dari baris header
            let nameColIdx = 0, passColIdx = -1;
            if (Array.isArray(jsonData[0])) {
                const headerRow = jsonData[0];
                const fi = (keywords) => headerRow.findIndex(
                    cell => cell && keywords.some(k => cell.toString().toLowerCase().includes(k))
                );
                const fn = fi(['nama', 'name']);
                const fp = fi(['password', 'pass', 'sandi']);
                if (fn !== -1) nameColIdx = fn;
                if (fp !== -1) passColIdx = fp;
            }

            // Skip baris header jika ada
            const hasHeader = jsonData[0]?.[nameColIdx]?.toString().toLowerCase().match(/nama|name/);
            const startRow  = hasHeader ? 1 : 0;

            const newBatch = [];
            for (let i = startRow; i < jsonData.length; i++) {
                const row  = jsonData[i];
                const name = row?.[nameColIdx]?.toString().trim();
                if (!name) continue;
                const pass = passColIdx !== -1 ? row[passColIdx]?.toString().trim() : `pass${i}`;
                newBatch.push({
                    id:       `std_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 3)}`,
                    name,
                    grade:    selectedGrade,
                    password: pass || `pass${i}`,
                    hasVoted: false,
                    votedFor: null
                });
                students.push(newBatch[newBatch.length - 1]);
            }

            saveStudentsLocal();
            syncMultipleStudentsToSupabase(newBatch);
            renderAdminStudentManager();
            renderAdminDashboard();
            showAlertModal('Import Berhasil', `${newBatch.length} siswa ditambahkan ke ${selectedGrade}.`, 'success');
        } catch (err) {
            console.error("handleExcelUpload error:", err);
            showAlertModal('Gagal Import', 'Format file tidak valid. Gunakan .xlsx atau .csv.', 'info');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// >> Auto-generate 30 siswa contoh untuk kelas aktif
function autoFillClassStudents() {
    const selectedGrade   = document.getElementById('adminStudentGradeSelect').value;
    const currentCount    = students.filter(st => st.grade === selectedGrade).length;
    const newBatch = [];

    for (let i = 1; i <= 30; i++) {
        const stObj = {
            id:       `std_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 3)}`,
            name:     `Siswa ${currentCount + i} ${selectedGrade}`,
            grade:    selectedGrade,
            password: `siswa${currentCount + i}`,
            hasVoted: false,
            votedFor: null
        };
        students.push(stObj);
        newBatch.push(stObj);
    }

    saveStudentsLocal();
    syncMultipleStudentsToSupabase(newBatch);
    renderAdminStudentManager();
    renderAdminDashboard();
    showAlertModal('Berhasil', `30 siswa baru ditambahkan ke ${selectedGrade}.`, 'success');
}

// >> Hapus satu siswa
function deleteSingleStudent(id) {
    students = students.filter(st => st.id !== id);
    saveStudentsLocal();
    deleteStudentFromSupabase(id);
    renderAdminStudentManager();
    renderAdminDashboard();
}

// >> Reset status suara satu siswa
function resetSingleStudentVote(id) {
    const st = students.find(s => s.id === id);
    if (!st) return;
    st.hasVoted = false;
    st.votedFor = null;
    saveStudentsLocal();
    syncStudentToSupabase(st);
    renderAdminStudentManager();
    renderAdminDashboard();
}

// >> Hapus semua siswa di kelas aktif
function clearStudentsOfActiveGrade() {
    const selectedGrade = document.getElementById('adminStudentGradeSelect').value;
    if (!confirm(`Hapus semua siswa di ${selectedGrade}?`)) return;
    students = students.filter(st => st.grade !== selectedGrade);
    saveStudentsLocal();
    deleteStudentsByGradeFromSupabase(selectedGrade);
    renderAdminStudentManager();
    renderAdminDashboard();
}

// >> Hapus SEMUA siswa semua kelas
function clearAllStudentsAllGrades() {
    if (!confirm("YAKIN? Ini akan MENGHAPUS SEMUA siswa dari SEMUA kelas!")) return;
    students = [];
    saveStudentsLocal();
    deleteAllStudentsFromSupabase();
    renderAdminStudentManager();
    renderAdminDashboard();
    showAlertModal('Terhapus', 'Semua data siswa telah dihapus.', 'info');
}


// ============================================================
// === SECTION: 13. ADMIN: KANDIDAT ===
// ============================================================

// >> Buka modal tambah kandidat baru (form kosong)
function openAddCandidateModal() {
    document.getElementById('candidateFormId').value      = '';
    document.getElementById('formNo').value               = candidates.length + 1;
    document.getElementById('formName').value             = '';
    document.getElementById('formVisi').value             = '';
    document.getElementById('formMisi').value             = '';
    document.getElementById('formImageFile').value        = '';
    document.getElementById('formModalTitle').innerText   = 'Tambah Calon Presiden BEM';
    const modal = document.getElementById('candidateFormModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// >> Buka modal edit kandidat (isi form dengan data lama)
function editCandidate(id) {
    const c = candidates.find(c => c.id === id);
    if (!c) return;
    document.getElementById('candidateFormId').value    = c.id;
    document.getElementById('formNo').value             = c.no;
    document.getElementById('formName').value           = c.name;
    document.getElementById('formVisi').value           = c.visi;
    document.getElementById('formMisi').value           = c.misi.join('\n');
    document.getElementById('formImageFile').value      = '';
    document.getElementById('formModalTitle').innerText = 'Edit Data Kandidat';
    const modal = document.getElementById('candidateFormModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCandidateFormModal() {
    const modal = document.getElementById('candidateFormModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// >> Simpan kandidat baru / edit (submit dari form HTML)
async function handleSaveCandidate(event) {
    event.preventDefault();

    const id        = document.getElementById('candidateFormId').value;
    const no        = parseInt(document.getElementById('formNo').value);
    const name      = document.getElementById('formName').value.trim();
    const visi      = document.getElementById('formVisi').value.trim();
    const misiList  = document.getElementById('formMisi').value.trim()
                        .split('\n').filter(m => m.trim());
    const imageFile = document.getElementById('formImageFile').files[0];

    const candidateId = id || ('c_' + Date.now());

    // Disable tombol submit sementara
    const submitBtn = event.target.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = 'Menyimpan...'; }

    // 1. Coba upload ke Supabase Storage
    let imageUrl = imageFile && isSupabaseActive
        ? await uploadCandidateImageToStorage(imageFile, candidateId)
        : null;

    // 2. Fallback ke base64 lokal
    if (!imageUrl && imageFile) {
        imageUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(imageFile);
        });
    }

    // 3. Update atau buat objek kandidat
    let savedCandidate;
    if (id) {
        savedCandidate = candidates.find(c => c.id === id);
        if (savedCandidate) {
            savedCandidate.no   = no;
            savedCandidate.name = name;
            savedCandidate.visi = visi;
            savedCandidate.misi = misiList;
            if (imageUrl) savedCandidate.image = imageUrl;
        }
    } else {
        savedCandidate = {
            id:             candidateId,
            no,
            name,
            image:          imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400',
            visi,
            misi:           misiList,
            votes:          0,
            votes_by_class: {}
        };
        candidates.push(savedCandidate);
    }

    // 4. Simpan
    saveCandidatesLocal();
    await upsertCandidateToSupabase(savedCandidate);

    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Simpan Data'; }
    closeCandidateFormModal();
    renderAdminDashboard();
    renderCandidatesHome();
    showAlertModal('Berhasil', 'Data kandidat telah diperbarui.', 'success');
}

// >> Hapus kandidat setelah konfirmasi
async function deleteCandidateConfirm(id) {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;
    if (!confirm(`Hapus kandidat "${candidate.name}"?`)) return;

    candidates = candidates.filter(c => c.id !== id);
    saveCandidatesLocal();
    await deleteCandidateFromSupabase(id);
    renderAdminDashboard();
    renderCandidatesHome();
    showAlertModal('Terhapus', 'Kandidat berhasil dihapus.', 'info');
}

// >> Reset semua suara + status siswa setelah konfirmasi
async function resetVotesConfirm() {
    if (!confirm("PERINGATAN: Reset semua suara dan status pemilih?")) return;

    candidates.forEach(c => { c.votes = 0; c.votes_by_class = {}; });
    students.forEach(st => { st.hasVoted = false; st.votedFor = null; });
    voterStats = {};

    saveCandidatesLocal();
    saveStudentsLocal();
    saveVoterStatsLocal();

    await Promise.all([
        resetAllStudentVotesInSupabase(),
        resetCandidatesInSupabase(),
        clearVoteLogsFromSupabase()
    ]);

    voteLogs = [];
    saveVoteLogsLocal();

    renderWelcomeClasses();
    renderAdminDashboard();
    showAlertModal('Berhasil Reset', 'Semua suara dan status pemilihan telah direset.', 'info');
}


// ============================================================
// === SECTION: 14. ADMIN: KELAS ===
// ============================================================

function openAddClassModal() {
    renderClassList();
    const modal = document.getElementById('classManageModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAddClassModal() {
    const modal = document.getElementById('classManageModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function renderClassList() {
    const container = document.getElementById('classListContainer');
    container.innerHTML = '';
    classes.forEach(cls => {
        const item = document.createElement('div');
        item.className = "flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700";
        item.innerHTML = `
            <span>${cls}</span>
            ${classes.length > 1
                ? `<button onclick="deleteClass('${cls}')" class="text-rose-500 hover:text-rose-700">
                       <i class="fa-solid fa-trash"></i>
                   </button>`
                : ''
            }
        `;
        container.appendChild(item);
    });
}

function handleAddClass(e) {
    e.preventDefault();
    const input = document.getElementById('newClassNameInput');
    const name  = input.value.trim();
    if (name && !classes.includes(name)) {
        classes.push(name);
        saveClassesLocal();
        renderClassList();
        renderWelcomeClasses();
        input.value = '';
        showAlertModal('Berhasil', `Tingkat "${name}" ditambahkan.`, 'success');
    }
}

function deleteClass(className) {
    if (!confirm(`Hapus tingkat "${className}"?`)) return;
    classes = classes.filter(c => c !== className);
    saveClassesLocal();
    renderClassList();
    renderWelcomeClasses();
    renderAdminDashboard();
}


// ============================================================
// === SECTION: 15. ADMIN: DASHBOARD ===
// ============================================================

function renderAdminDashboard() {
    // Statistik ringkasan
    document.getElementById('statTotalCandidates').innerText = candidates.length;
    document.getElementById('statTotalStudents').innerText   = students.length;
    document.getElementById('statTotalVotes').innerText      = candidates.reduce((s, c) => s + c.votes, 0);

    // Tabel kandidat
    const tableBody = document.getElementById('adminCandidateTable');
    tableBody.innerHTML = '';
    const sorted = [...candidates].sort((a, b) => a.no - b.no);

    if (!sorted.length) {
        tableBody.innerHTML = `
            <tr><td colspan="4" class="p-6 text-center text-slate-400 text-xs">
                Belum ada kandidat. Silakan tambah kandidat baru.
            </td></tr>
        `;
    } else {
        sorted.forEach(c => {
            const vbc = c.votes_by_class || {};
            let breakdown = Object.keys(vbc)
                .filter(k => vbc[k] > 0)
                .map(k => `<span class="inline-flex items-center bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-md mr-1 mt-1">
                    ${k}: <strong class="text-blue-600 ml-1">${vbc[k]}</strong>
                </span>`)
                .join('') || '<span class="text-[10px] text-slate-400 italic">Belum ada suara</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 flex items-center space-x-3">
                    <img src="${c.image}" alt="${c.name}" class="w-10 h-10 object-cover rounded-full shadow-sm">
                    <div>
                        <span class="font-bold text-slate-800 block">${c.name}</span>
                        <div class="flex flex-wrap items-center mt-1">${breakdown}</div>
                    </div>
                </td>
                <td class="p-4 font-bold text-blue-600">No. ${c.no}</td>
                <td class="p-4">
                    <span class="text-base font-extrabold text-slate-800">${c.votes}</span>
                    <span class="text-xs text-slate-500"> Suara Total</span>
                </td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="editCandidate('${c.id}')" class="text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 text-xs">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button onclick="deleteCandidateConfirm('${c.id}')" class="text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 text-xs">
                        <i class="fa-solid fa-trash"></i> Hapus
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    renderPieChart();
    renderBarChart(sorted);
}

// >> Pie chart: partisipasi pemilih per kelas
function renderPieChart() {
    const ctx    = document.getElementById('voterPieChart').getContext('2d');
    const labels = classes;
    const data   = classes.map(g => voterStats[g] || 0);

    if (voterPieChartInstance) voterPieChartInstance.destroy();

    voterPieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#0284c7','#0d9488','#2563eb','#f59e0b','#10b981','#8b5cf6'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }, padding: 12 }
                }
            }
        }
    });
}

// >> Bar chart: perolehan suara per kandidat
function renderBarChart(sortedCandidates) {
    const ctx    = document.getElementById('candidateBarChart').getContext('2d');
    const labels = sortedCandidates.map(c => `No. ${c.no} ${c.name.split(' ')[0]}`);
    const data   = sortedCandidates.map(c => c.votes);

    if (candidateBarChartInstance) candidateBarChartInstance.destroy();

    candidateBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Jumlah Suara',
                data,
                backgroundColor: '#2563eb',
                borderRadius: 8,
                hoverBackgroundColor: '#1d4ed8'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
                x: { ticks: { font: { size: 11 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}


// ============================================================
// === SECTION: 16. AUDIT LOG ===
// ============================================================

// >> Tampilkan panel audit log, isi dropdown kelas, load data
async function showAuditLog() {
    const panel = document.getElementById('auditLogPanel');
    panel.classList.remove('hidden');

    const sel = document.getElementById('auditFilterClass');
    sel.innerHTML = '<option value="">— Semua Kelas —</option>';
    classes.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g; opt.textContent = g;
        sel.appendChild(opt);
    });

    loadVoteLogsLocal();
    renderAuditLog(voteLogs);
    await loadAuditLogFromSupabase();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideAuditLog() {
    document.getElementById('auditLogPanel').classList.add('hidden');
}

// >> Render baris tabel audit log
function renderAuditLog(entries) {
    auditLogFiltered = entries;
    const tbody   = document.getElementById('auditLogTableBody');
    const countEl = document.getElementById('auditLogCount');
    if (!tbody) return;

    countEl.textContent = `${entries.length} entri`;

    if (!entries.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs italic">Belum ada data pemilihan.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    entries.forEach((log, idx) => {
        const dt    = log.voted_at ? new Date(log.voted_at) : null;
        const waktu = dt ? dt.toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : '—';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        tr.innerHTML = `
            <td class="p-3 pl-5 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 text-slate-500 whitespace-nowrap">${waktu}</td>
            <td class="p-3 font-semibold text-slate-800">${log.student_name || '—'}</td>
            <td class="p-3">
                <span class="bg-sky-100 text-sky-700 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                    ${log.student_grade || '—'}
                </span>
            </td>
            <td class="p-3 font-semibold text-blue-700">${log.candidate_name || '—'}</td>
            <td class="p-3">
                <span class="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                    No. ${log.candidate_no ?? '—'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// >> Filter audit log (dipanggil dari oninput/onchange di HTML)
function filterAuditLog() {
    const qStudent   = (document.getElementById('auditSearchStudent')?.value   || '').toLowerCase().trim();
    const qCandidate = (document.getElementById('auditSearchCandidate')?.value || '').toLowerCase().trim();
    const qClass     = (document.getElementById('auditFilterClass')?.value     || '');

    const filtered = voteLogs.filter(log => {
        const matchStudent   = !qStudent   || (log.student_name   || '').toLowerCase().includes(qStudent);
        const matchCandidate = !qCandidate || (log.candidate_name || '').toLowerCase().includes(qCandidate);
        const matchClass     = !qClass     || log.student_grade === qClass;
        return matchStudent && matchCandidate && matchClass;
    });

    renderAuditLog(filtered);
}


// ============================================================
// === SECTION: 17. EXCEL: TEMPLATE ===
// ============================================================

// >> Unduh template Excel kosong untuk pengisian data siswa.
// >> Header kolom: No | Nama | Password
// >> Satu sheet per kelas + sheet Petunjuk
function downloadStudentTemplate() {
    if (!window.XLSX) {
        showAlertModal('SheetJS Belum Siap', 'Library XLSX belum termuat. Muat ulang halaman.', 'info');
        return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet petunjuk
    const wsPetunjuk = XLSX.utils.aoa_to_sheet([
        ['PETUNJUK PENGISIAN TEMPLATE DATA SISWA'],
        [''],
        ['1. Kolom "Nama" wajib diisi dengan nama lengkap siswa.'],
        ['2. Kolom "Password" diisi password yang akan digunakan siswa saat memilih.'],
        ['   Jika dikosongkan, sistem membuat password otomatis (pass1, pass2, dst.).'],
        ['3. Kolom "No" adalah nomor urut (opsional).'],
        ['4. Import dilakukan per kelas — pilih kelas dulu sebelum klik "Import Excel".'],
        ['5. Hapus baris contoh sebelum diisi data asli, atau tambahkan di bawahnya.'],
    ]);
    wsPetunjuk['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');

    // Sheet template per kelas
    const header  = ['No', 'Nama', 'Password'];
    const contoh  = [
        ['1', 'Ahmad Fauzi',   'fauzi123'],
        ['2', 'Siti Rahayu',   'rahayu456'],
        ['3', 'Budi Santoso',  'budi789'],
        [''],
        ['← Hapus baris contoh ini, isi dengan data siswa asli'],
    ];
    const colWidths = [{ wch: 6 }, { wch: 30 }, { wch: 20 }];

    ['Kelas 7', 'Kelas 8', 'Kelas 9'].forEach(kls => {
        const ws = XLSX.utils.aoa_to_sheet([header, ...contoh]);
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, kls);
    });

    XLSX.writeFile(wb, 'Template_DataSiswa_PEMIRA.xlsx');
}


// ============================================================
// === SECTION: 18. EXCEL: EKSPOR ===
// ============================================================

// >> Ekspor semua siswa semua kelas → tiap kelas = satu sheet
function exportStudentsExcelAll() {
    if (!window.XLSX) {
        showAlertModal('SheetJS Belum Siap', 'Library XLSX belum termuat. Muat ulang halaman.', 'info');
        return;
    }
    if (!students.length) {
        showAlertModal('Data Kosong', 'Belum ada siswa untuk diekspor.', 'info');
        return;
    }

    const wb = XLSX.utils.book_new();
    let totalDiekspor = 0;

    classes.forEach(kls => {
        const kelasData = students.filter(s => s.grade === kls);
        if (!kelasData.length) return;

        const rows = [['No', 'Nama Siswa', 'Password', 'Status Suara']];
        kelasData.forEach((s, i) => rows.push([
            i + 1, s.name, s.password || '',
            s.hasVoted ? 'Sudah Memilih' : 'Belum Memilih'
        ]));

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, ws, kls);
        totalDiekspor += kelasData.length;
    });

    if (!wb.SheetNames.length) {
        showAlertModal('Data Kosong', 'Tidak ada siswa di semua kelas.', 'info');
        return;
    }

    const namaFile = `DataSiswa_PEMIRA_SemuaKelas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, namaFile);
    showAlertModal('Ekspor Berhasil',
        `${totalDiekspor} siswa dari ${wb.SheetNames.length} kelas diekspor ke "${namaFile}".`, 'success');
}

// >> Ekspor siswa hanya untuk kelas yang dipilih di dropdown
function exportStudentsExcelCurrentGrade() {
    if (!window.XLSX) {
        showAlertModal('SheetJS Belum Siap', 'Library XLSX belum termuat. Muat ulang halaman.', 'info');
        return;
    }

    const selectedGrade = document.getElementById('adminStudentGradeSelect').value;
    const kelasData     = students.filter(s => s.grade === selectedGrade);

    if (!kelasData.length) {
        showAlertModal('Data Kosong', `Belum ada siswa di ${selectedGrade}.`, 'info');
        return;
    }

    const rows = [['No', 'Nama Siswa', 'Password', 'Status Suara']];
    kelasData.forEach((s, i) => rows.push([
        i + 1, s.name, s.password || '',
        s.hasVoted ? 'Sudah Memilih' : 'Belum Memilih'
    ]));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, selectedGrade);

    const namaFile = `DataSiswa_PEMIRA_${selectedGrade.replace(' ', '')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, namaFile);
    showAlertModal('Ekspor Berhasil',
        `${kelasData.length} siswa dari ${selectedGrade} diekspor ke "${namaFile}".`, 'success');
}


// ============================================================
// === SECTION: 19. UI HELPERS ===
// ============================================================

// >> Tampilkan modal alert (success / info)
function showAlertModal(title, message, type = 'info') {
    const alertModal = document.getElementById('alertModal');
    const alertIcon  = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText   = title;
    document.getElementById('alertMessage').innerText = message;

    if (type === 'success') {
        alertIcon.className = "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-emerald-100 text-emerald-600";
        alertIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
        alertIcon.className = "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-blue-100 text-blue-600";
        alertIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    }

    alertModal.classList.remove('hidden');
    alertModal.classList.add('flex');
}

function closeAlertModal() {
    const alertModal = document.getElementById('alertModal');
    alertModal.classList.add('hidden');
    alertModal.classList.remove('flex');
}
