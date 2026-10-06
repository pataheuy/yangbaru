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

// >> Supabase credentials & admin password — diambil dari /api/config saat init
let SUPABASE_URL      = null;
let SUPABASE_ANON_KEY = null;
let ADMIN_PASSWORD    = null;

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

// >> Role & teacher state
let currentRole    = null; // 'murid' | 'guru'
let teachers       = [];   // [{ id, name, username, password, role, hasVoted, votedFor }]
let activeTeacher  = null; // guru yang sedang login


// ============================================================
// === SECTION: 2. INIT ===
// ============================================================

// >> Entry point — dipanggil otomatis saat DOM siap
window.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();            // ambil kredensial dari /api/config
    initSupabaseClient();
    renderWelcomeClassesLoading(); // tampilkan skeleton dulu
    await loadData();              // fetch data dari localStorage + Supabase
    showRoleSelectScreen();        // tampilkan layar pemilihan role
});

// >> Ambil Supabase URL, key, dan admin password dari serverless endpoint
// >> Env var diutamakan. Fallback hardcoded hanya jika fetch gagal total (local dev).
async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            // Utamakan nilai dari server (env var Vercel)
            SUPABASE_URL      = data.url           || SUPABASE_URL;
            SUPABASE_ANON_KEY = data.key           || SUPABASE_ANON_KEY;
            ADMIN_PASSWORD    = data.adminPassword || ADMIN_PASSWORD;
            return; // sukses — tidak perlu fallback
        }
    } catch (e) {
        // fetch gagal total (misal local dev tanpa server)
    }
    // Fallback hardcoded — hanya aktif jika /api/config tidak bisa diakses
    SUPABASE_URL      = SUPABASE_URL      || 'https://puywjdopumlzvmzbcudr.supabase.co';
    SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
    ADMIN_PASSWORD    = ADMIN_PASSWORD    || 'raisarfaketuampm';
}

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

            // Guru
            const { data: tchData } = await supabaseClient
                .from('teachers').select('*').order('name', { ascending: true });
            if (tchData && tchData.length > 0) {
                teachers = tchData.map(t => ({
                    id:       t.id,
                    name:     t.name,
                    password: t.password || '',
                    role:     t.role || 'Guru',
                    hasVoted: t.has_voted || false,
                    votedFor: t.voted_for || null
                }));
                saveTeachersLocal();
            }
        } catch (e) {
            console.log("Supabase unavailable — using local data.");
        }
    }

    // Load teachers dari localStorage jika Supabase tidak aktif
    if (!isSupabaseActive) {
        const storedTeachers = localStorage.getItem('pemira_teachers');
        try { teachers = storedTeachers ? JSON.parse(storedTeachers) : []; } catch(e) { teachers = []; }
    }

    loadVoteLogsLocal(); // load audit log dari localStorage
}

// >> Simpan ke localStorage
function saveClassesLocal()    { localStorage.setItem('pemira_classes',     JSON.stringify(classes));    }
function saveCandidatesLocal() { localStorage.setItem('pemira_candidates',  JSON.stringify(candidates)); }
function saveStudentsLocal()   { localStorage.setItem('pemira_students',    JSON.stringify(students));   }
function saveVoterStatsLocal() { localStorage.setItem('pemira_voter_stats', JSON.stringify(voterStats)); }
function saveTeachersLocal()   { localStorage.setItem('pemira_teachers',    JSON.stringify(teachers));   }

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
// === SECTION: 3b. ROLE SELECTION & TEACHER AUTH ===
// ============================================================

// >> Sembunyikan semua screen utama
function hideAllScreens() {
    const ids = ['roleSelectScreen','teacherSelectScreen','welcomeScreen','studentSelectScreen','homePage','adminPage'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// >> Tampilkan layar pemilihan role (entry point)
function showRoleSelectScreen() {
    hideAllScreens();
    currentRole   = null;
    activeTeacher = null;
    selectedStudent = null;
    const changeBtn = document.getElementById('changeClassNavBtn');
    const homeBtn   = document.getElementById('homeNavBtn');
    if (changeBtn) changeBtn.classList.add('hidden');
    if (homeBtn)   homeBtn.classList.add('hidden');
    const el = document.getElementById('roleSelectScreen');
    if (el) el.classList.remove('hidden');
}

// >> Pilih role: 'murid' atau 'guru'
function selectRole(role) {
    currentRole = role;
    hideAllScreens();
    if (role === 'guru') {
        document.getElementById('teacherSelectScreen').classList.remove('hidden');
        const inp = document.getElementById('teacherSearchInput');
        if (inp) { inp.value = ''; renderTeacherCards(''); setTimeout(() => inp.focus(), 100); }
    } else {
        // Murid — lanjut ke pilih kelas
        renderWelcomeClasses();
        document.getElementById('welcomeScreen').classList.remove('hidden');
    }
}

// >> Filter guru saat ketik di search
function filterTeacherList() {
    renderTeacherCards(document.getElementById('teacherSearchInput').value);
}

// >> Render kartu guru yang cocok dengan query
function renderTeacherCards(filterQuery = '') {
    const container = document.getElementById('teacherListGrid');
    if (!container) return;
    container.innerHTML = '';
    const query = filterQuery.trim();

    if (query.length < 3) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 bg-white/60 border border-dashed border-emerald-200 rounded-2xl p-6 text-slate-400">
                <i class="fa-solid fa-keyboard text-3xl mb-2 text-slate-300 block"></i>
                <p class="text-xs font-semibold">Ketik minimal 3 karakter nama untuk mencari.</p>
            </div>`;
        return;
    }

    const filtered = teachers.filter(t =>
        !t.hasVoted &&
        t.name.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 bg-white rounded-2xl border border-slate-100 p-6 text-slate-400">
                <i class="fa-solid fa-user-slash text-3xl mb-2 text-slate-300 block"></i>
                <p class="text-xs font-semibold">Tidak ditemukan guru "${query}".</p>
                <p class="text-[11px] mt-1 text-slate-400">Periksa ejaan atau hubungi admin.</p>
            </div>`;
        return;
    }

    filtered.forEach(t => {
        const card = document.createElement('div');
        card.className = "bg-white px-5 py-4 rounded-2xl border border-emerald-100 hover:border-emerald-400 cursor-pointer flex items-center justify-between shadow-sm active:scale-[0.98] transition";
        card.onclick = () => selectTeacherAndProceed(t.id);
        card.innerHTML = `
            <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                    <i class="fa-solid fa-chalkboard-user"></i>
                </div>
                <div class="text-left">
                    <h4 class="font-bold text-slate-800 text-base leading-tight">${t.name}</h4>
                    <span class="text-xs text-emerald-600 font-semibold block mt-0.5">
                        ${t.role || 'Guru / Staf'} &nbsp;·&nbsp; Tap untuk memilih
                        <i class="fa-solid fa-arrow-right ml-0.5 text-[10px]"></i>
                    </span>
                </div>
            </div>
            <i class="fa-solid fa-chevron-right text-sm text-emerald-400"></i>`;
        container.appendChild(card);
    });
}

// >> Guru diklik → cek status → buka modal verifikasi password
function selectTeacherAndProceed(teacherId) {
    const t = teachers.find(t => t.id === teacherId);
    if (!t) return;
    if (t.hasVoted) {
        showAlertModal('Sudah Memilih', `${t.name} sudah memberikan suara sebelumnya.`, 'info');
        return;
    }
    openTeacherPasswordModal(t);
}

// >> Buka modal password guru
let pendingTeacherId = null;
function openTeacherPasswordModal(t) {
    pendingTeacherId = t.id;
    document.getElementById('passwordModalTeacherName').innerText = `${t.name} — ${t.role || 'Guru / Staf'}`;
    document.getElementById('teacherPasswordVerifyInput').value   = '';
    document.getElementById('teacherPasswordError').classList.add('hidden');
    const modal = document.getElementById('teacherPasswordModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => document.getElementById('teacherPasswordVerifyInput').focus(), 100);
}

function closeTeacherPasswordModal() {
    pendingTeacherId = null;
    const modal = document.getElementById('teacherPasswordModal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
}

// >> Verifikasi password guru
function verifyTeacherPassword() {
    const t = teachers.find(t => t.id === pendingTeacherId);
    if (!t) { closeTeacherPasswordModal(); return; }

    const entered = document.getElementById('teacherPasswordVerifyInput').value;
    if (entered === t.password) {
        closeTeacherPasswordModal();
        activeTeacher = t;

        // Set banner guru
        const iconEl  = document.getElementById('activeVoterIcon');
        const roleEl  = document.getElementById('activeVoterRoleLabel');
        const btnEl   = document.getElementById('changeVoterBtn');
        const classEl = document.getElementById('activeVoterClass');
        if (iconEl)  { iconEl.className = 'w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold'; iconEl.innerHTML = '<i class="fa-solid fa-chalkboard-user"></i>'; }
        if (roleEl)  roleEl.innerText  = 'Guru / Staf Pemilih';
        if (classEl) { classEl.innerText = t.role || 'Guru / Staf'; classEl.className = 'bg-white text-emerald-700 font-bold text-xs px-3 py-1 rounded-xl border border-emerald-200'; }
        if (btnEl)   { btnEl.innerText = 'Ganti Akun'; btnEl.onclick = () => showRoleSelectScreen(); }

        document.getElementById('activeVoterName').innerText = t.name;

        hideAllScreens();
        document.getElementById('homePage').classList.remove('hidden');
        document.getElementById('changeClassNavBtn').classList.remove('hidden');
        document.getElementById('homeNavBtn').classList.remove('hidden');
        renderCandidatesHome();
    } else {
        document.getElementById('teacherPasswordError').classList.remove('hidden');
        document.getElementById('teacherPasswordVerifyInput').value = '';
        document.getElementById('teacherPasswordVerifyInput').focus();
    }
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
// === SECTION: 4b. SUPABASE: TEACHERS ===
// ============================================================

async function syncTeacherToSupabase(teacher) {
    if (!isSupabaseActive || !supabaseClient || !teacher) return;
    try {
        await supabaseClient.from('teachers').upsert({
            id:        teacher.id,
            name:      teacher.name,
            password:  teacher.password || '',
            role:      teacher.role || 'Guru',
            has_voted: teacher.hasVoted,
            voted_for: teacher.votedFor
        });
    } catch(e) { console.error("syncTeacherToSupabase error:", e); }
}

async function syncMultipleTeachersToSupabase(list) {
    if (!isSupabaseActive || !supabaseClient || !list?.length) return;
    try {
        await supabaseClient.from('teachers').upsert(
            list.map(t => ({
                id: t.id, name: t.name,
                password: t.password || '', role: t.role || 'Guru',
                has_voted: t.hasVoted, voted_for: t.votedFor
            }))
        );
    } catch(e) { console.error("syncMultipleTeachersToSupabase error:", e); }
}

async function deleteTeacherFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('teachers').delete().eq('id', id); }
    catch(e) { console.error("deleteTeacherFromSupabase error:", e); }
}

async function deleteAllTeachersFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('teachers').delete().neq('id', '0'); }
    catch(e) { console.error("deleteAllTeachersFromSupabase error:", e); }
}

async function resetAllTeacherVotesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('teachers')
            .update({ has_voted: false, voted_for: null }).neq('id', '0');
    } catch(e) { console.error("resetAllTeacherVotesInSupabase error:", e); }
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
        const logoFileName  = `gambar/logo${idx + 1}.png`;

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
    // Jika guru sedang aktif, kembali ke role select
    if (currentRole === 'guru') {
        showRoleSelectScreen();
        return;
    }
    selectedStudent = null;
    hideAllScreens();
    document.getElementById('welcomeScreen').classList.remove('hidden');
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
    hideAllScreens();
    document.getElementById('studentSelectScreen').classList.remove('hidden');

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
        currentRole = 'murid';

        // Set banner untuk siswa
        const iconEl  = document.getElementById('activeVoterIcon');
        const roleEl  = document.getElementById('activeVoterRoleLabel');
        const btnEl   = document.getElementById('changeVoterBtn');
        if (iconEl)  { iconEl.className = 'w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold'; iconEl.innerHTML = '<i class="fa-solid fa-user-check"></i>'; }
        if (roleEl)  roleEl.innerText = 'Siswa Pemilih';
        if (btnEl)   { btnEl.innerText = 'Ganti Siswa'; btnEl.onclick = cancelVoterSelection; }

        document.getElementById('activeVoterName').innerText  = st.name;
        document.getElementById('activeVoterClass').innerText = st.grade;
        document.getElementById('activeVoterClass').className = 'bg-white text-blue-700 font-bold text-xs px-3 py-1 rounded-xl border border-blue-200';

        hideAllScreens();
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

// >> Batalkan pilihan siswa, kembali ke role select atau search kelas
function cancelVoterSelection() {
    if (currentRole === 'guru') {
        activeTeacher = null;
        showRoleSelectScreen();
    } else {
        selectedStudent = null;
        showStudentSelectScreen(currentSelectedGrade);
    }
}


// ============================================================
// === SECTION: 9. HALAMAN: PILIH KANDIDAT ===
// ============================================================

// >> Navigasi halaman (dipanggil dari tombol navbar)
function showPage(page) {
    if (page === 'admin') {
        if (!isAdminLoggedIn) { openAdminLoginModal(); return; }
        hideAllScreens();
        document.getElementById('adminPage').classList.remove('hidden');
        document.getElementById('changeClassNavBtn').classList.remove('hidden');
        document.getElementById('homeNavBtn').classList.remove('hidden');
        renderAdminDashboard();
    } else {
        const voter = currentRole === 'guru' ? activeTeacher : selectedStudent;
        if (!voter) { showRoleSelectScreen(); return; }
        hideAllScreens();
        document.getElementById('homePage').classList.remove('hidden');
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
    const voter     = currentRole === 'guru' ? activeTeacher : selectedStudent;
    if (!candidate || !voter) return;

    closeCandidateModal();
    const voterLabel = currentRole === 'guru'
        ? `${voter.name} (${voter.role || 'Guru'})`
        : `${voter.name} (${voter.grade})`;
    document.getElementById('confirmStudentNameDisplay').innerText = voterLabel;
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
    const isGuru    = currentRole === 'guru';
    const voter     = isGuru ? activeTeacher : selectedStudent;
    if (!candidate || !voter) return;

    const activeGrade = isGuru ? (voter.role || 'Guru') : voter.grade;

    // Update hitungan suara
    if (!candidate.votes_by_class) candidate.votes_by_class = {};
    candidate.votes++;
    candidate.votes_by_class[activeGrade] = (candidate.votes_by_class[activeGrade] || 0) + 1;
    if (!isGuru) voterStats[activeGrade] = (voterStats[activeGrade] || 0) + 1;

    // Tandai voter sudah memilih
    voter.hasVoted = true;
    voter.votedFor = candidate.id;

    // Simpan ke localStorage
    saveCandidatesLocal();
    if (isGuru) saveTeachersLocal(); else saveStudentsLocal();
    if (!isGuru) saveVoterStatsLocal();

    // Sync ke Supabase
    if (isSupabaseActive && supabaseClient) {
        try {
            await supabaseClient.from('candidates')
                .update({ votes: candidate.votes, votes_by_class: candidate.votes_by_class })
                .eq('id', candidate.id);
        } catch (err) { console.error("Vote sync error:", err); }
        if (isGuru) syncTeacherToSupabase(voter);
        else        syncStudentToSupabase(voter);
    }

    // Simpan audit log
    await saveVoteLog({
        student_id:     voter.id,
        student_name:   voter.name,
        student_grade:  activeGrade,
        candidate_id:   candidate.id,
        candidate_name: candidate.name,
        candidate_no:   candidate.no,
        voted_at:       new Date().toISOString()
    });

    const votedName = voter.name;
    if (isGuru) activeTeacher = null; else selectedStudent = null;

    closeConfirmVoteModal();
    showAlertModal('Berhasil Memilih!',
        `Suara atas nama ${votedName} (${activeGrade}) untuk ${candidate.name} telah tersimpan.`, 'success');

    if (isGuru) showRoleSelectScreen(); else showWelcomeScreen();
}


// ============================================================

// === SECTION: 11. AUTH ADMIN ===
// ============================================================

function openAdminLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('loginError').classList.add('hidden');
}

function closeAdminLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// >> Alias dipanggil dari footer click 5x
function openAdminAuth() { openAdminLoginModal(); }

function handleAdminLogin(event) {
    event.preventDefault();
    const pass = document.getElementById('adminPasswordInput').value;
    if (pass === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        closeAdminLoginModal();
        showPage('admin');
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('adminPasswordInput').value = '';
    }
}


// ============================================================
// === SECTION: 12. ADMIN: SISWA ===
// ============================================================

// >> (Admin di halaman utama tidak dipakai — admin punya halaman sendiri di /admin/)
// >> Fungsi ini dipertahankan agar tidak ada reference error dari HTML lama.
function openStudentManageModal()  { /* dikelola di admin/app.js */ }
function closeStudentManageModal() { /* dikelola di admin/app.js */ }


// ============================================================
// === SECTION: 13. ADMIN: KANDIDAT ===
// ============================================================

function openCandidateFormModal() {
    document.getElementById('candidateFormId').value    = '';
    document.getElementById('formNo').value             = candidates.length + 1;
    document.getElementById('formName').value           = '';
    document.getElementById('formVisi').value           = '';
    document.getElementById('formMisi').value           = '';
    document.getElementById('formImageFile').value      = '';
    document.getElementById('formModalTitle').innerText = 'Tambah Kandidat Baru';
    const m = document.getElementById('candidateFormModal');
    m.classList.remove('hidden'); m.classList.add('flex');
}

function closeCandidateFormModal() {
    const m = document.getElementById('candidateFormModal');
    m.classList.add('hidden'); m.classList.remove('flex');
}

async function handleSaveCandidate(event) {
    event.preventDefault();
    const id        = document.getElementById('candidateFormId').value;
    const no        = parseInt(document.getElementById('formNo').value);
    const name      = document.getElementById('formName').value.trim();
    const visi      = document.getElementById('formVisi').value.trim();
    const misiList  = document.getElementById('formMisi').value.trim().split('\n').filter(m => m.trim());
    const imageFile = document.getElementById('formImageFile').files[0];
    const candId    = id || ('c_' + Date.now());

    const btn = event.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }

    let imageUrl = imageFile && isSupabaseActive
        ? await uploadCandidateImageToStorage(imageFile, candId) : null;

    if (!imageUrl && imageFile) {
        imageUrl = await new Promise(resolve => {
            const r = new FileReader();
            r.onload = e => resolve(e.target.result);
            r.readAsDataURL(imageFile);
        });
    }

    let saved;
    if (id) {
        saved = candidates.find(c => c.id === id);
        if (saved) {
            saved.no = no; saved.name = name; saved.visi = visi; saved.misi = misiList;
            if (imageUrl) saved.image = imageUrl;
        }
    } else {
        saved = {
            id: candId, no, name,
            image: imageUrl || `https://placehold.co/400x500/2563eb/fff?text=No.${no}`,
            visi, misi: misiList, votes: 0, votes_by_class: {}
        };
        candidates.push(saved);
    }

    saveCandidatesLocal();
    await upsertCandidateToSupabase(saved);
    if (btn) { btn.disabled = false; btn.innerText = 'Simpan Data'; }
    closeCandidateFormModal();
    renderCandidatesHome();
    showAlertModal('Berhasil', 'Data kandidat telah disimpan.', 'success');
}


// ============================================================
// === SECTION: 14. ADMIN: KELAS ===
// ============================================================

function openAddClassModal() {
    renderClassList();
    const m = document.getElementById('classManageModal');
    m.classList.remove('hidden'); m.classList.add('flex');
}

function closeAddClassModal() {
    const m = document.getElementById('classManageModal');
    m.classList.add('hidden'); m.classList.remove('flex');
}

function renderClassList() {
    const container = document.getElementById('classListContainer');
    if (!container) return;
    container.innerHTML = '';
    classes.forEach(cls => {
        const item = document.createElement('div');
        item.className = "flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700";
        item.innerHTML = `
            <span>${cls}</span>
            ${classes.length > 1
                ? `<button onclick="deleteClass('${cls}')" class="text-rose-500 hover:text-rose-700">
                       <i class="fa-solid fa-trash"></i>
                   </button>` : ''}
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
        saveClassesLocal(); renderClassList(); renderWelcomeClasses();
        input.value = '';
        showAlertModal('Berhasil', `Tingkat "${name}" ditambahkan.`, 'success');
    }
}

function deleteClass(className) {
    if (!confirm(`Hapus tingkat "${className}"?`)) return;
    classes = classes.filter(c => c !== className);
    saveClassesLocal(); renderClassList(); renderWelcomeClasses();
}


// ============================================================
// === SECTION: 15. ADMIN: DASHBOARD ===
// ============================================================

// >> (Dashboard dikelola di admin/app.js — fungsi ini untuk index.html admin panel lama)
function renderAdminDashboard() { /* placeholder */ }


// ============================================================
// === SECTION: 16. AUDIT LOG ===
// ============================================================

// voteLogs & auditLogFiltered sudah dideklarasikan di Section 6

function loadVoteLogsLocal() {
    try {
        const raw = localStorage.getItem('pemira_vote_logs');
        voteLogs = raw ? JSON.parse(raw) : [];
    } catch (e) { voteLogs = []; }
}

function saveVoteLogsLocal() {
    localStorage.setItem('pemira_vote_logs', JSON.stringify(voteLogs));
}

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
}

async function clearVoteLogsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('vote_logs').delete().neq('id', '___none___');
    } catch (e) { console.error('clearVoteLogsFromSupabase error:', e); }
}


// ============================================================
// === SECTION: 17-18. EXCEL (tidak dipakai di voter page) ===
// ============================================================
// Excel hanya dipakai di admin/app.js


// ============================================================
// === SECTION: 19. UI HELPERS ===
// ============================================================

function showAlertModal(title, message, type = 'info') {
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText   = title;
    document.getElementById('alertMessage').innerText = message;
    if (type === 'success') {
        icon.className = "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-emerald-100 text-emerald-600";
        icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
        icon.className = "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-blue-100 text-blue-600";
        icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    }
    const m = document.getElementById('alertModal');
    m.classList.remove('hidden'); m.classList.add('flex');
}

function closeAlertModal() {
    const m = document.getElementById('alertModal');
    m.classList.add('hidden'); m.classList.remove('flex');
}
