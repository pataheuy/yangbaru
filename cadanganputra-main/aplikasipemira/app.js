// ============================================================
//  aplikasipemira/app.js — Logic Utama PEMIRA BEM SMP
//
//  SECTION MAP:
//   1. CONFIG & STATE
//   2. INIT
//   3. NAVIGATION & SCREEN
//   4. DATA LAYER
//   5. SUPABASE SYNC
//   6. ROLE SELECT & TEACHER
//   7. STUDENT SELECT & PASSWORD
//   8. VOTING
//   9. CANDIDATE DISPLAY
//  10. ADMIN (in-page)
//  11. UI HELPERS
// ============================================================


// ============================================================
// === SECTION: 1. CONFIG & STATE ===
// ============================================================

let SUPABASE_URL      = 'https://puywjdopumlzvmzbcudr.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
let ADMIN_PASSWORD    = 'kpu2026';

const defaultClasses = ['Kelas 7', 'Kelas 8', 'Kelas 9'];

let supabaseClient   = null;
let isSupabaseActive = false;

let classes          = [];
let candidates       = [];
let students         = [];
let teachers         = [];
let voterStats       = {};
let voteLogs         = [];

let selectedStudent  = null;
let activeTeacher    = null;
let currentRole      = null;
let selectedCandidate = null;
let pendingStudentId  = null;
let pendingTeacherId  = null;
let countdownInterval = null;


// ============================================================
// === SECTION: 2. INIT ===
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {
    initSupabaseClient();
    renderWelcomeClassesLoading();
    showRoleSelectScreen(); // tampilkan dulu, jangan tunggu Supabase
    await loadData();
    await loadTeachers();
    // Refresh kelas di welcome screen kalau user masih di sana,
    // tapi JANGAN redirect kalau user sudah pindah screen
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
        renderWelcomeClasses();
    }
});

function initSupabaseClient() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
        try {
            supabaseClient   = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            isSupabaseActive = true;
        } catch (e) { isSupabaseActive = false; }
    }
}


// ============================================================
// === SECTION: 3. NAVIGATION & SCREEN ===
// ============================================================

function hideAllScreens() {
    ['roleSelectScreen','teacherSelectScreen','welcomeScreen','subClassScreen','studentSelectScreen','homePage']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    // Bersihkan countdown modal kalau masih jalan
    clearInterval(countdownInterval);
}

function showRoleSelectScreen() {
    hideAllScreens();
    currentRole     = null;
    activeTeacher   = null;
    selectedStudent = null;
    const changeBtn = document.getElementById('changeClassNavBtn');
    const homeBtn   = document.getElementById('homeNavBtn');
    if (changeBtn) changeBtn.classList.add('hidden');
    if (homeBtn)   homeBtn.classList.add('hidden');
    const el = document.getElementById('roleSelectScreen');
    if (el) el.classList.remove('hidden');
    stopClosingTimer();
    updateClosingTimeUI();
}

function selectRole(role) {
    currentRole = role;
    if (role === 'guru') {
        // Tampilkan modal akses guru dulu
        openGuruAccessModal();
    } else {
        hideAllScreens();
        showWelcomeScreen();
    }
}

function showWelcomeScreen() {
    hideAllScreens();
    const screen    = document.getElementById('welcomeScreen');
    const changeBtn = document.getElementById('changeClassNavBtn');
    const homeBtn   = document.getElementById('homeNavBtn');
    if (screen)    screen.classList.remove('hidden');
    if (changeBtn) changeBtn.classList.add('hidden');
    if (homeBtn)   homeBtn.classList.add('hidden');
    renderWelcomeClasses();
}

function showPage(page) {
    if (page === 'home') {
        const voter = currentRole === 'guru' ? activeTeacher : selectedStudent;
        if (!voter) { showRoleSelectScreen(); return; }
        hideAllScreens();
        const homePage = document.getElementById('homePage');
        if (homePage) homePage.classList.remove('hidden');
        renderCandidatesHome();
        return;
    }
    const voter = currentRole === 'guru' ? activeTeacher : selectedStudent;
    if (!voter) { showRoleSelectScreen(); return; }
    hideAllScreens();
    const homePage = document.getElementById('homePage');
    if (homePage) homePage.classList.remove('hidden');
    renderCandidatesHome();
}

function cancelVoterSelection() {
    selectedStudent = null;
    activeTeacher   = null;
    showRoleSelectScreen();
}


// ============================================================
// === SECTION: 4. DATA LAYER ===
// ============================================================

async function loadData() {
    const sc = localStorage.getItem('pemira_classes');
    classes = sc ? JSON.parse(sc) : [...defaultClasses];

    const scd = localStorage.getItem('pemira_candidates');
    candidates = scd ? JSON.parse(scd) : [];

    const ss = localStorage.getItem('pemira_students');
    try { students = ss ? JSON.parse(ss) : []; } catch(e) { students = []; }

    const sv = localStorage.getItem('pemira_voter_stats');
    voterStats = sv ? JSON.parse(sv) : {};

    if (isSupabaseActive && supabaseClient) {
        try {
            const { data: cData, error: cErr } = await supabaseClient
                .from('candidates').select('*').order('no', { ascending: true });
            if (!cErr && cData) {
                candidates = cData.map(c => ({
                    id:             c.id,
                    no:             c.no,
                    name:           c.name,
                    image:          c.image,
                    visi:           c.visi,
                    misi:           Array.isArray(c.misi) ? c.misi : (typeof c.misi === 'string' ? JSON.parse(c.misi) : []),
                    votes:          c.votes || 0,
                    votes_by_class: c.votes_by_class || {}
                }));
                saveCandidatesLocal();
            }

            const { data: sData, error: sErr } = await supabaseClient
                .from('students').select('*').order('name', { ascending: true });
            if (!sErr && sData) {
                // Selalu pakai data Supabase — termasuk kalau kosong (siswa dihapus)
                students = sData.map(s => ({
                    id:       s.id,
                    name:     s.name,
                    grade:    s.grade,
                    password: s.password || '',
                    hasVoted: s.has_voted || false,
                    votedFor: s.voted_for || null
                }));
                saveStudentsLocal();
            }
        } catch(e) { console.log('Supabase unavailable — using local data.'); }
    }
    loadVoteLogsLocal();

    // Load waktu vote dari Supabase
    if (isSupabaseActive && supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('settings')
                .select('key, value')
                .in('key', ['pemira_open_time', 'pemira_close_time']);
            if (data) {
                data.forEach(row => {
                    if (row.key === 'pemira_open_time')
                        row.value ? localStorage.setItem('pemira_open_time', row.value) : localStorage.removeItem('pemira_open_time');
                    if (row.key === 'pemira_close_time')
                        row.value ? localStorage.setItem('pemira_close_time', row.value) : localStorage.removeItem('pemira_close_time');
                });
            }
        } catch(e) {}
    }
}

async function loadTeachers() {
    const lt = localStorage.getItem('pemira_teachers');
    try { teachers = lt ? JSON.parse(lt) : []; } catch(e) { teachers = []; }

    if (isSupabaseActive && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('teachers').select('*').order('name', { ascending: true });
            if (!error && data) {
                // Selalu pakai data Supabase — termasuk kalau kosong
                teachers = data.map(t => ({
                    id:       t.id,
                    name:     t.name,
                    username: t.username || '',
                    password: t.password || '',
                    role:     t.role || 'Guru',
                    hasVoted: t.has_voted || false,
                    votedFor: t.voted_for || null
                }));
                saveTeachersLocal();
            }
        } catch(e) {}
    }
}

function saveClassesLocal()    { localStorage.setItem('pemira_classes',     JSON.stringify(classes));    }
function saveCandidatesLocal() { localStorage.setItem('pemira_candidates',  JSON.stringify(candidates)); }
function saveStudentsLocal()   { localStorage.setItem('pemira_students',    JSON.stringify(students));   }
function saveTeachersLocal()   { localStorage.setItem('pemira_teachers',    JSON.stringify(teachers));   }
function saveVoterStatsLocal() { localStorage.setItem('pemira_voter_stats', JSON.stringify(voterStats)); }

function loadVoteLogsLocal() {
    try {
        const raw = localStorage.getItem('pemira_vote_logs');
        voteLogs = raw ? JSON.parse(raw) : [];
    } catch(e) { voteLogs = []; }
}

function saveVoteLogsLocal() {
    localStorage.setItem('pemira_vote_logs', JSON.stringify(voteLogs));
}


// ============================================================
// === SECTION: 5. SUPABASE SYNC ===
// ============================================================

async function syncStudentVoteToSupabase(s) {
    if (!isSupabaseActive || !supabaseClient || !s) return;
    try {
        await supabaseClient.from('students')
            .update({ has_voted: s.hasVoted, voted_for: s.votedFor }).eq('id', s.id);
    } catch(e) { console.error('syncStudentVote error:', e); }
}

async function syncTeacherVoteToSupabase(t) {
    if (!isSupabaseActive || !supabaseClient || !t) return;
    try {
        await supabaseClient.from('teachers')
            .update({ has_voted: t.hasVoted, voted_for: t.votedFor }).eq('id', t.id);
    } catch(e) { console.error('syncTeacherVote error:', e); }
}

async function syncCandidateVotesToSupabase(c) {
    if (!isSupabaseActive || !supabaseClient || !c) return;
    try {
        await supabaseClient.from('candidates')
            .update({ votes: c.votes, votes_by_class: c.votes_by_class }).eq('id', c.id);
    } catch(e) { console.error('syncCandidateVotes error:', e); }
}

async function insertVoteLogToSupabase(log) {
    if (!isSupabaseActive || !supabaseClient || !log) return;
    try {
        await supabaseClient.from('vote_logs').insert([{
            id:             log.id,
            student_id:     log.student_id,
            student_name:   log.student_name,
            student_grade:  log.student_grade,
            candidate_id:   log.candidate_id,
            candidate_name: log.candidate_name,
            candidate_no:   log.candidate_no,
            voted_at:       log.voted_at
        }]);
    } catch(e) { console.error('insertVoteLog error:', e); }
}


// ============================================================
// === SECTION: 6. ROLE SELECT & TEACHER ===
// ============================================================

const GURU_ACCESS_PASSWORD = 'guruassyifa';

// --- Step 1: Modal akses mode guru ---
function openGuruAccessModal() {
    const inp = document.getElementById('guruAccessInput');
    const err = document.getElementById('guruAccessError');
    if (inp) inp.value = '';
    if (err) err.classList.add('hidden');
    const modal = document.getElementById('guruAccessModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); setTimeout(() => inp?.focus(), 100); }
}

function closeGuruAccessModal() {
    const modal = document.getElementById('guruAccessModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    currentRole = null; // batalkan pilihan role
}

function verifyGuruAccess() {
    const inp = document.getElementById('guruAccessInput');
    const err = document.getElementById('guruAccessError');
    if (!inp) return;
    if (inp.value.trim() === GURU_ACCESS_PASSWORD) {
        closeGuruAccessModal();
        // Lanjut ke halaman cari nama guru
        hideAllScreens();
        const screen = document.getElementById('teacherSelectScreen');
        if (screen) screen.classList.remove('hidden');
        const searchInp = document.getElementById('teacherSearchInput');
        if (searchInp) { searchInp.value = ''; renderTeacherCards(''); setTimeout(() => searchInp.focus(), 100); }
    } else {
        if (err) err.classList.remove('hidden');
        inp.value = '';
        setTimeout(() => inp.focus(), 50);
    }
}

// --- Step 2: Cari & tampilkan daftar guru ---
function renderTeacherCards(query) {
    const grid = document.getElementById('teacherListGrid');
    if (!grid) return;

    const q = query.trim().toLowerCase();
    if (q.length < 3) {
        grid.innerHTML = `<div class="text-center text-slate-400 text-sm py-8">Ketik minimal 3 karakter untuk mencari nama.</div>`;
        return;
    }

    const filtered = teachers.filter(t => t.name.toLowerCase().includes(q));
    if (!filtered.length) {
        grid.innerHTML = `<div class="text-center text-slate-400 text-sm py-8">Tidak ada guru / staf dengan nama "<strong>${query}</strong>".</div>`;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(t => {
        const div = document.createElement('div');
        div.className = `bg-white border rounded-2xl px-4 py-3 flex items-center justify-between transition hover:border-emerald-400 hover:shadow-sm ${t.hasVoted ? 'opacity-60' : 'cursor-pointer'}`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-sm">${t.name.charAt(0)}</div>
                <div>
                    <p class="font-bold text-sm text-slate-800">${t.name}</p>
                    <p class="text-[10px] text-slate-400">${t.role || 'Guru'}</p>
                </div>
            </div>
            ${t.hasVoted
                ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Sudah Memilih</span>'
                : '<span class="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">Belum Memilih</span>'
            }`;
        if (!t.hasVoted) div.onclick = () => openTeacherConfirmModal(t.id);
        grid.appendChild(div);
    });
}

function filterTeacherList() {
    const inp = document.getElementById('teacherSearchInput');
    if (inp) renderTeacherCards(inp.value);
}

// --- Step 3: Modal konfirmasi identitas guru ---
function openTeacherConfirmModal(teacherId) {
    pendingTeacherId = teacherId;
    const t = teachers.find(t => t.id === teacherId);
    if (!t) return;
    const nameEl    = document.getElementById('teacherConfirmName');
    const nameBtnEl = document.getElementById('teacherConfirmNameBtn');
    if (nameEl)    nameEl.textContent    = t.name;
    if (nameBtnEl) nameBtnEl.textContent = t.name.split(' ')[0]; // nama depan saja di tombol
    const modal = document.getElementById('teacherConfirmModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeTeacherConfirmModal() {
    const modal = document.getElementById('teacherConfirmModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    pendingTeacherId = null;
}

function confirmTeacherIdentity() {
    const t = teachers.find(t => t.id === pendingTeacherId);
    if (!t) return;
    activeTeacher = t;
    currentRole   = 'guru';
    closeTeacherConfirmModal();
    showHomePage();
}

// Fungsi lama — dipertahankan sebagai stub agar tidak error jika ada referensi lain
function openTeacherPasswordModal(id) { openTeacherConfirmModal(id); }
function closeTeacherPasswordModal()  { closeTeacherConfirmModal(); }
function verifyTeacherPassword()      { confirmTeacherIdentity(); }


// ============================================================
// === SECTION: 7. STUDENT SELECT & PASSWORD ===
// ============================================================

function renderWelcomeClassesLoading() {
    const grid = document.getElementById('classCardGrid');
    if (!grid) return;
    grid.innerHTML = defaultClasses.map(() => `
        <div class="bg-white rounded-3xl border border-slate-100 p-8 animate-pulse">
            <div class="w-12 h-12 bg-slate-200 rounded-2xl mx-auto mb-4"></div>
            <div class="h-4 bg-slate-200 rounded mx-auto w-24"></div>
        </div>`).join('');
}

function renderWelcomeClasses() {
    const grid = document.getElementById('classCardGrid');
    if (!grid) return;
    grid.innerHTML = '';
    classes.forEach(grade => {
        const gradeNorm  = grade.trim();
        const allInGrade = students.filter(s => getParentGrade(s.grade) === gradeNorm);
        const total  = allInGrade.length;
        const voted  = allInGrade.filter(s => s.hasVoted).length;
        const pct    = total ? Math.round((voted / total) * 100) : 0;
        const div    = document.createElement('div');
        div.className = 'class-card bg-white rounded-3xl border border-slate-100 p-8 cursor-pointer flex flex-col items-center space-y-4 shadow-sm';
        div.onclick   = () => selectGrade(grade);
        div.innerHTML = `
            <div class="w-14 h-14 gradient-btn text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">${grade.replace('Kelas ', '')}</div>
            <div class="text-center">
                <h3 class="text-xl font-bold text-slate-800">${grade}</h3>
                <p class="text-xs text-slate-500 mt-1">${total} siswa terdaftar</p>
            </div>
            <div class="w-full">
                <div class="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Partisipasi</span><span>${voted}/${total}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5">
                    <div class="gradient-btn h-1.5 rounded-full transition-all" style="width:${pct}%"></div>
                </div>
            </div>`;
        grid.appendChild(div);
    });
}

// Helper: ambil kelas induk dari grade string
// "Kelas 7A" → "Kelas 7", "Kelas 7" → "Kelas 7", "Kelas 8B" → "Kelas 8"
function getParentGrade(grade) {
    // Cek apakah grade cocok dengan salah satu kelas induk
    for (const cls of classes) {
        if (grade === cls) return cls;
        // "Kelas 7A", "Kelas 7 A", "Kelas 7-A"
        if (grade.startsWith(cls) && grade.length > cls.length) return cls;
    }
    return grade; // fallback: grade itu sendiri
}

// Helper: ambil sub kelas dari grade string
// "Kelas 7A" → "A", "Kelas 7" → ""
function getSubClass(grade) {
    for (const cls of classes) {
        if (grade === cls) return '';
        if (grade.startsWith(cls) && grade.length > cls.length) {
            return grade.slice(cls.length).trim().toUpperCase();
        }
    }
    return '';
}

function selectGrade(grade) {
    // Cek apakah ada sub kelas untuk kelas ini
    const subClasses = [...new Set(
        students
            .filter(s => getParentGrade(s.grade) === grade && getSubClass(s.grade) !== '')
            .map(s => getSubClass(s.grade))
    )].sort();

    if (subClasses.length > 0) {
        // Tampilkan layar pilih sub kelas
        showSubClassScreen(grade, subClasses);
    } else {
        // Tidak ada sub kelas, langsung ke pencarian siswa
        goToStudentSelect(grade);
    }
}

function showSubClassScreen(grade, subClasses) {
    hideAllScreens();
    const screen = document.getElementById('subClassScreen');
    const badge  = document.getElementById('subClassParentBadge');
    if (screen) screen.classList.remove('hidden');
    if (badge)  badge.textContent = grade;

    const grid = document.getElementById('subClassCardGrid');
    if (!grid) return;
    grid.innerHTML = '';

    subClasses.forEach(sub => {
        const fullGrade  = grade + sub;
        const total      = students.filter(s => s.grade === fullGrade).length;
        const voted      = students.filter(s => s.grade === fullGrade && s.hasVoted).length;
        const pct        = total ? Math.round((voted / total) * 100) : 0;
        const div        = document.createElement('div');
        div.className    = 'class-card bg-white rounded-3xl border border-slate-100 p-6 cursor-pointer flex flex-col items-center space-y-3 shadow-sm';
        div.onclick      = () => goToStudentSelect(fullGrade);
        div.innerHTML    = `
            <div class="w-12 h-12 gradient-btn text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-md">${sub}</div>
            <div class="text-center">
                <h3 class="text-lg font-bold text-slate-800">${grade} ${sub}</h3>
                <p class="text-xs text-slate-500 mt-0.5">${total} siswa</p>
            </div>
            <div class="w-full">
                <div class="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Partisipasi</span><span>${voted}/${total}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5">
                    <div class="gradient-btn h-1.5 rounded-full transition-all" style="width:${pct}%"></div>
                </div>
            </div>`;
        grid.appendChild(div);
    });
}

function goToStudentSelect(fullGrade) {
    hideAllScreens();
    const screen = document.getElementById('studentSelectScreen');
    const badge  = document.getElementById('fullClassBadge');
    const backBtn = document.getElementById('studentSelectBackBtn');

    if (screen) screen.classList.remove('hidden');
    if (badge)  badge.textContent = fullGrade;

    // Tombol kembali: kalau ada sub kelas → kembali ke sub kelas screen, kalau tidak → welcome
    const parentGrade = getParentGrade(fullGrade);
    if (backBtn) {
        if (fullGrade !== parentGrade) {
            // Ada sub kelas — kembali ke sub class screen
            backBtn.onclick = () => selectGrade(parentGrade);
            backBtn.innerHTML = `<i class="fa-solid fa-arrow-left mr-2"></i> Kembali ke ${parentGrade}`;
        } else {
            backBtn.onclick = () => showWelcomeScreen();
            backBtn.innerHTML = `<i class="fa-solid fa-arrow-left mr-2"></i> Kembali ke Pilih Kelas`;
        }
    }

    const inp = document.getElementById('studentSearchInput');
    if (inp) { inp.value = ''; renderStudentList(fullGrade, ''); setTimeout(() => inp.focus(), 100); }
}

function filterStudentList() {
    const inp   = document.getElementById('studentSearchInput');
    const badge = document.getElementById('fullClassBadge');
    if (inp && badge) renderStudentList(badge.textContent, inp.value);
}

function renderStudentList(grade, query) {
    const grid = document.getElementById('studentListGrid');
    if (!grid) return;

    const q = query.trim().toLowerCase();
    if (q.length < 3) {
        grid.innerHTML = `<div class="text-center text-slate-400 text-sm py-8">Ketik minimal 3 karakter untuk mencari nama siswa.</div>`;
        return;
    }

    const filtered = students.filter(s => s.grade === grade && s.name.toLowerCase().includes(q));
    if (!filtered.length) {
        grid.innerHTML = `<div class="text-center text-slate-400 text-sm py-8">Tidak ada siswa "<strong>${query}</strong>" di ${grade}.</div>`;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(s => {
        const div = document.createElement('div');
        div.className = `student-card bg-white border rounded-2xl px-4 py-3 flex items-center justify-between ${s.hasVoted ? 'disabled-student' : 'cursor-pointer'}`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center font-bold text-sm">${s.name.charAt(0)}</div>
                <div>
                    <p class="font-bold text-sm text-slate-800">${s.name}</p>
                    <p class="text-[10px] text-slate-400">${s.grade}</p>
                </div>
            </div>
            ${s.hasVoted
                ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Sudah Memilih</span>'
                : '<span class="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">Belum Memilih</span>'
            }`;
        if (!s.hasVoted) div.onclick = () => openStudentPasswordModal(s.id);
        grid.appendChild(div);
    });
}

function openStudentPasswordModal(studentId) {
    pendingStudentId = studentId;
    const s      = students.find(s => s.id === studentId);
    if (!s) return;
    const nameEl = document.getElementById('passwordModalStudentName');
    const inp    = document.getElementById('studentPasswordInput');
    const errEl  = document.getElementById('passwordError');
    if (nameEl) nameEl.textContent = s.name;
    if (inp)    inp.value = '';
    if (errEl)  errEl.classList.add('hidden');
    const modal = document.getElementById('studentPasswordModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); setTimeout(() => inp?.focus(), 100); }
}

function closeStudentPasswordModal() {
    const modal = document.getElementById('studentPasswordModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    pendingStudentId = null;
}

function verifyStudentPassword() {
    const s   = students.find(s => s.id === pendingStudentId);
    const inp = document.getElementById('studentPasswordInput');
    const err = document.getElementById('passwordError');
    if (!s || !inp) return;

    if (inp.value.trim() === s.password) {
        selectedStudent = s;
        currentRole     = 'murid';
        closeStudentPasswordModal();
        showHomePage();
    } else {
        if (err) err.classList.remove('hidden');
        inp.value = '';
        setTimeout(() => inp.focus(), 50);
    }
}

function showHomePage() {
    hideAllScreens();
    const homePage  = document.getElementById('homePage');
    const changeBtn = document.getElementById('changeClassNavBtn');
    const homeBtn   = document.getElementById('homeNavBtn');
    if (homePage)  homePage.classList.remove('hidden');
    if (changeBtn) changeBtn.classList.remove('hidden');
    if (homeBtn)   homeBtn.classList.remove('hidden');

    const voter = currentRole === 'guru' ? activeTeacher : selectedStudent;
    const name  = voter?.name || '--';
    const grade = currentRole === 'guru' ? (voter?.role || 'Guru') : (voter?.grade || '--');

    const nameEl  = document.getElementById('activeVoterName');
    const classEl = document.getElementById('activeVoterClass');
    const roleEl  = document.getElementById('activeVoterRoleLabel');
    const iconEl  = document.getElementById('activeVoterIcon');
    const btnEl   = document.getElementById('changeVoterBtn');

    if (nameEl)  nameEl.textContent  = name;
    if (classEl) classEl.textContent = grade;
    if (roleEl)  roleEl.textContent  = currentRole === 'guru' ? 'Guru / Staf' : 'Siswa Pemilih';
    if (iconEl)  iconEl.innerHTML    = currentRole === 'guru'
        ? '<i class="fa-solid fa-chalkboard-user"></i>'
        : '<i class="fa-solid fa-user-check"></i>';
    if (btnEl)   btnEl.textContent   = currentRole === 'guru' ? 'Ganti Guru' : 'Ganti Siswa';

    renderCandidatesHome();
    updateClosingTimeUI();
}// ============================================================
// === SECTION: 8. VOTING ===
// ============================================================

function openCandidateModal(candidateId) {
    const c = candidates.find(c => c.id === candidateId);
    if (!c) return;
    selectedCandidate = c;

    const img    = document.getElementById('modalImg');
    const no     = document.getElementById('modalNo');
    const name   = document.getElementById('modalName');
    const visi   = document.getElementById('modalVisi');
    const misiEl = document.getElementById('modalMisi');

    if (img)    img.src            = c.image;
    if (no)     no.textContent     = `No. Urut ${c.no}`;
    if (name)   name.textContent   = c.name;
    if (visi)   visi.textContent   = c.visi;
    if (misiEl) {
        misiEl.innerHTML = '';
        const misiList = Array.isArray(c.misi) ? c.misi : [];
        misiList.forEach(m => {
            const li = document.createElement('li');
            li.textContent = m;
            misiEl.appendChild(li);
        });
    }

    const modal = document.getElementById('candidateModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeCandidateModal() {
    const modal = document.getElementById('candidateModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

function openVoteConfirmation() {
    const voter = currentRole === 'guru' ? activeTeacher : selectedStudent;
    if (!voter || !selectedCandidate) return;

    // Cek waktu vote
    if (isPemiraClosed()) {
        closeCandidateModal();
        showAlertModal('Pemilihan Ditutup', 'Maaf, waktu pemilihan telah berakhir.', 'info');
        return;
    }
    if (isPemiraNotYetOpen()) {
        closeCandidateModal();
        const ot = new Date(loadOpenTime()).toLocaleString('id-ID', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' });
        showAlertModal('Belum Dimulai', `Pemilihan belum dibuka. Dibuka pada <strong>${ot}</strong>`, 'info');
        return;
    }

    // Cek sudah memilih
    if (voter.hasVoted) {
        closeCandidateModal();
        return;
    }

    closeCandidateModal();
    const nameEl   = document.getElementById('confirmStudentNameDisplay');
    const candEl   = document.getElementById('confirmCandidateName');
    const btn      = document.getElementById('finalVoteBtn');
    const textEl   = document.getElementById('finalVoteText');
    const timerEl  = document.getElementById('countdownTimer');

    if (nameEl) nameEl.textContent = voter.name;
    if (candEl) candEl.textContent = selectedCandidate.name;

    // Reset tombol
    if (btn)    { btn.disabled = true; btn.className = 'w-full bg-slate-300 text-slate-500 font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 cursor-not-allowed'; }
    if (textEl) textEl.textContent = 'Tunggu 3 Detik...';
    if (timerEl) timerEl.textContent = '3';

    const modal = document.getElementById('confirmVoteModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }

    let count = 3;
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        count--;
        if (timerEl) timerEl.textContent = count;
        if (count <= 0) {
            clearInterval(countdownInterval);
            if (btn)    { btn.disabled = false; btn.className = 'w-full gradient-btn text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2'; }
            if (textEl) textEl.textContent = 'Ya, Saya Yakin Memilih!';
        }
    }, 1000);
}

function closeConfirmVoteModal() {
    clearInterval(countdownInterval);
    const modal = document.getElementById('confirmVoteModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function executeVote() {
    const voter = currentRole === 'guru' ? activeTeacher : selectedStudent;
    // Guard: cek hasVoted DAN flag isVoting untuk cegah double-click race condition
    if (!voter || !selectedCandidate || voter.hasVoted) return;
    if (executeVote._running) return;
    executeVote._running = true;

    // Guard waktu vote (safety net kedua)
    if (isPemiraClosed()) {
        executeVote._running = false;
        closeConfirmVoteModal();
        showAlertModal('Pemilihan Ditutup', 'Maaf, waktu pemilihan telah berakhir.', 'info');
        return;
    }
    if (isPemiraNotYetOpen()) {
        executeVote._running = false;
        closeConfirmVoteModal();
        showAlertModal('Belum Dimulai', 'Pemilihan belum dibuka.', 'info');
        return;
    }

    // ── Tampilkan status loading di tombol, modal tetap terbuka ─────────────
    const finalBtn  = document.getElementById('finalVoteBtn');
    const finalText = document.getElementById('finalVoteText');
    const cancelBtn = document.querySelector('#confirmVoteModal button[onclick="closeConfirmVoteModal()"]');
    if (finalBtn) {
        finalBtn.disabled = true;
        finalBtn.className = 'w-full bg-amber-400 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 cursor-not-allowed';
    }
    if (finalText) finalText.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Sedang Menyimpan...';
    if (cancelBtn) cancelBtn.disabled = true;

    // Update kandidat
    const c = candidates.find(c => c.id === selectedCandidate.id);
    if (!c) return;
    c.votes = (c.votes || 0) + 1;
    c.votes_by_class = c.votes_by_class || {};
    const gradeKey = currentRole === 'guru' ? (voter.role || 'Guru') : voter.grade;
    c.votes_by_class[gradeKey] = (c.votes_by_class[gradeKey] || 0) + 1;

    // Update voter
    voter.hasVoted = true;
    voter.votedFor = c.id;

    // Update voterStats
    voterStats[gradeKey] = (voterStats[gradeKey] || 0) + 1;

    // Vote log
    const log = {
        id:             `log_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
        student_id:     voter.id,
        student_name:   voter.name,
        student_grade:  gradeKey,
        candidate_id:   c.id,
        candidate_name: c.name,
        candidate_no:   c.no,
        voted_at:       new Date().toISOString()
    };
    voteLogs.push(log);

    // Simpan lokal
    saveCandidatesLocal();
    saveVoterStatsLocal();
    saveVoteLogsLocal();
    if (currentRole === 'guru') saveTeachersLocal(); else saveStudentsLocal();

    // Sync Supabase
    await Promise.all([
        syncCandidateVotesToSupabase(c),
        currentRole === 'guru' ? syncTeacherVoteToSupabase(voter) : syncStudentVoteToSupabase(voter),
        insertVoteLogToSupabase(log)
    ]);

    closeConfirmVoteModal();
    executeVote._running = false;
    showVoteSuccessScreen(voter, c);
}

function showVoteSuccessScreen(voter, candidate) {
    hideAllScreens();
    const changeBtn = document.getElementById('changeClassNavBtn');
    const homeBtn   = document.getElementById('homeNavBtn');
    if (changeBtn) changeBtn.classList.add('hidden');
    if (homeBtn)   homeBtn.classList.add('hidden');

    // Buat layar sukses sementara
    const main = document.querySelector('main');
    if (!main) return;

    const existingSuccess = document.getElementById('successScreen');
    if (existingSuccess) existingSuccess.remove();

    const div = document.createElement('section');
    div.id = 'successScreen';
    div.className = 'w-full max-w-md mx-auto text-center py-12 px-6 animate-fade-in-up my-auto';
    div.innerHTML = `
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-4">
            <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl">
                <i class="fa-solid fa-circle-check"></i>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Suara Berhasil!</h2>
            <p class="text-slate-500 text-sm"><strong>${voter.name}</strong> telah berhasil memilih <strong>${candidate.name}</strong>.</p>
            <p class="text-xs text-slate-400">Terima kasih telah berpartisipasi dalam PEMIRA BEM SMP.</p>
            <button onclick="handleAfterVote()" class="w-full gradient-btn text-white font-bold py-3 rounded-2xl text-sm transition mt-2">
                <i class="fa-solid fa-rotate-left mr-2"></i> Kembali ke Halaman Awal
            </button>
        </div>`;
    main.appendChild(div);
}

function handleAfterVote() {
    const s = document.getElementById('successScreen');
    if (s) s.remove();
    selectedStudent  = null;
    activeTeacher    = null;
    currentRole      = null;
    selectedCandidate = null;
    showRoleSelectScreen();
}


// ============================================================
// === SECTION: 9. CANDIDATE DISPLAY ===
// ============================================================

function renderCandidatesHome() {
    const container = document.getElementById('candidateList');
    if (!container) return;
    container.innerHTML = '';

    const sorted = [...candidates].sort((a, b) => a.no - b.no);

    if (!sorted.length) {
        container.innerHTML = `
            <div class="w-full max-w-md mx-auto text-center py-12 px-6 bg-white rounded-3xl border border-slate-100 text-slate-400">
                <i class="fa-solid fa-users-slash text-4xl mb-3 text-slate-300"></i>
                <p class="text-sm font-medium">Belum ada calon Presiden BEM yang terdaftar.</p>
            </div>`;
        return;
    }

    sorted.forEach(c => {
        const card     = document.createElement('div');
        card.className = 'candidate-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between w-56 text-center cursor-pointer group';
        card.onclick   = () => openCandidateModal(c.id);
        card.innerHTML = `
            <div>
                <div class="relative h-56 w-full overflow-hidden bg-slate-100">
                    <img src="${c.image}" alt="${c.name}" class="img-hover-zoom w-full h-full object-cover">
                    <span class="absolute top-3 left-3 gradient-btn text-white font-black text-xs px-3 py-1 rounded-full shadow-md">No. ${c.no}</span>
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
            </div>`;
        container.appendChild(card);
    });
}


// ============================================================
// === SECTION: 10. ADMIN (in-page) ===
// ============================================================

// ============================================================
// === SECTION: 10. ADMIN (stub — full logic di admin/app.js) ===
// ============================================================

// Fungsi admin kandidat — stub (full logic di admin/app.js)
function openAddCandidateModal()          { alert('Gunakan halaman admin terpisah.'); }
function closeCandidateFormModal()        {}
function handleSaveCandidate(e)           { e.preventDefault(); }
function deleteCandidateConfirm(id)       {}
function openAddClassModal()              {
    const m = document.getElementById('classManageModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
    renderClassList();
}
function closeAddClassModal()             {
    const m = document.getElementById('classManageModal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

function renderClassList() {
    const container = document.getElementById('classListContainer');
    if (!container) return;
    container.innerHTML = '';
    classes.forEach(g => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200';
        div.innerHTML = `
            <span class="text-sm font-semibold text-slate-700">${g}</span>
            <button onclick="deleteClass('${g}')" class="text-rose-500 hover:text-rose-700 text-xs font-semibold">
                <i class="fa-solid fa-trash"></i>
            </button>`;
        container.appendChild(div);
    });
}

function handleAddClass(e) {
    e.preventDefault();
    const inp = document.getElementById('newClassNameInput');
    if (!inp) return;
    const name = inp.value.trim();
    if (!name || classes.includes(name)) return;
    classes.push(name);
    saveClassesLocal();
    inp.value = '';
    renderClassList();
}

function deleteClass(name) {
    classes = classes.filter(g => g !== name);
    saveClassesLocal();
    renderClassList();
}


// ============================================================
// === SECTION: 11. UI HELPERS ===
// ============================================================

function handleFooterClick() {
    // easter egg dihapus
}

function showAlertModal(title, message, type = 'info') {
    const icon      = document.getElementById('alertIcon');
    const titleEl   = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    const modal     = document.getElementById('alertModal');
    if (!modal) return;
    if (titleEl)   titleEl.innerText   = title;
    if (messageEl) messageEl.innerText = message;
    if (icon) {
        if (type === 'success') {
            icon.className = 'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-emerald-100 text-emerald-600';
            icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        } else {
            icon.className = 'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-blue-100 text-blue-600';
            icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        }
    }
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ============================================================
// === WAKTU VOTE (mulai + tutup) ===
// ============================================================

const CLOSE_TIME_KEY = 'pemira_close_time';
const OPEN_TIME_KEY  = 'pemira_open_time';
let closingTimerInterval = null;

function loadCloseTime() { return localStorage.getItem(CLOSE_TIME_KEY) || ''; }
function loadOpenTime()  { return localStorage.getItem(OPEN_TIME_KEY)  || ''; }

function isPemiraClosed() {
    const ct = loadCloseTime();
    return ct ? new Date() >= new Date(ct) : false;
}
function isPemiraNotYetOpen() {
    const ot = loadOpenTime();
    return ot ? new Date() < new Date(ot) : false;
}
function isVotingBlocked() {
    return isPemiraClosed() || isPemiraNotYetOpen();
}

// Dipanggil saat showHomePage() dan showRoleSelectScreen()
function updateClosingTimeUI() {
    const ct  = loadCloseTime();
    const ot  = loadOpenTime();
    const now = new Date();

    // --- roleSelectScreen banner ---
    const roleBanner = document.getElementById('roleSelectClosedBanner');
    if (roleBanner) {
        if (isPemiraClosed()) {
            roleBanner.classList.remove('hidden');
            roleBanner.innerHTML = '<i class="fa-solid fa-lock text-base"></i><span>Pemilihan telah ditutup. Terima kasih atas partisipasi Anda.</span>';
        } else if (isPemiraNotYetOpen()) {
            roleBanner.classList.remove('hidden');
            const openDate = new Date(ot).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
            roleBanner.innerHTML = `<i class="fa-solid fa-hourglass-start text-base"></i><span>Pemilihan belum dimulai. Dibuka pada <strong>${openDate}</strong></span>`;
            roleBanner.className = 'bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl px-5 py-4 text-sm font-semibold flex items-center justify-center gap-2';
        } else {
            roleBanner.classList.add('hidden');
            roleBanner.className = 'hidden bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 text-sm font-semibold flex items-center justify-center gap-2';
        }
    }

    // --- homePage countdown banner ---
    const banner      = document.getElementById('closingTimeBanner');
    const bannerText  = document.getElementById('closingTimeBannerText');
    const bannerIcon  = document.getElementById('closingTimeBannerIcon');
    const countdownEl = document.getElementById('closingTimeCountdown');
    if (!banner) return;

    // Kalau tidak ada waktu sama sekali → sembunyikan
    if (!ct && !ot) {
        banner.classList.add('hidden');
        stopClosingTimer();
        return;
    }

    banner.classList.remove('hidden');

    if (isPemiraClosed()) {
        banner.className = 'max-w-5xl mx-auto rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm font-semibold bg-rose-50 border border-rose-200 text-rose-700';
        if (bannerIcon)  bannerIcon.className  = 'fa-solid fa-lock text-base';
        if (bannerText)  bannerText.textContent = 'Pemilihan telah ditutup';
        if (countdownEl) countdownEl.textContent = '';
        stopClosingTimer();
    } else if (isPemiraNotYetOpen()) {
        // Belum mulai — hitung mundur ke waktu mulai
        banner.className = 'max-w-5xl mx-auto rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-700';
        if (bannerIcon) bannerIcon.className = 'fa-solid fa-hourglass-start text-base';
        const openLabel = new Date(ot).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        if (bannerText) bannerText.textContent = `Mulai: ${openLabel}`;
        startClosingTimer(); // timer akan hitung mundur ke ot dulu
    } else {
        // Sedang berlangsung — hitung mundur ke waktu tutup (kalau ada)
        if (ct) {
            banner.className = 'max-w-5xl mx-auto rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700';
            if (bannerIcon) bannerIcon.className = 'fa-solid fa-circle-check text-base';
            const closeLabel = new Date(ct).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
            if (bannerText) bannerText.textContent = `Tutup: ${closeLabel}`;
            startClosingTimer();
        } else if (ot) {
            // Hanya ada waktu mulai, sudah lewat → berlangsung tanpa batas tutup
            banner.className = 'max-w-5xl mx-auto rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700';
            if (bannerIcon)  bannerIcon.className  = 'fa-solid fa-circle-check text-base';
            if (bannerText)  bannerText.textContent = 'Voting sedang berlangsung';
            if (countdownEl) countdownEl.textContent = '';
            stopClosingTimer();
        }
    }
}

function startClosingTimer() {
    stopClosingTimer();
    closingTimerInterval = setInterval(() => {
        const ct  = loadCloseTime();
        const ot  = loadOpenTime();
        const now = new Date();
        const countdownEl = document.getElementById('closingTimeCountdown');

        // Tentukan target waktu: kalau belum mulai → hitung ke ot, kalau sudah mulai → ke ct
        let target = null;
        let mode   = '';
        if (ot && now < new Date(ot)) {
            target = new Date(ot);
            mode   = 'opening';
        } else if (ct) {
            target = new Date(ct);
            mode   = 'closing';
        }

        if (!target) { stopClosingTimer(); updateClosingTimeUI(); return; }

        const diff = target - now;

        if (diff <= 0) {
            stopClosingTimer();
            updateClosingTimeUI();
            const homePage = document.getElementById('homePage');
            if (mode === 'closing' && homePage && !homePage.classList.contains('hidden')) {
                showAlertModal('Pemilihan Ditutup', 'Waktu pemilihan telah habis. Terima kasih!', 'info');
                setTimeout(() => showRoleSelectScreen(), 2000);
            } else if (mode === 'opening') {
                // Baru mulai — refresh UI tanpa redirect
                updateClosingTimeUI();
            }
            return;
        }

        const totalSec = Math.floor(diff / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const pad = n => String(n).padStart(2, '0');
        if (countdownEl) {
            countdownEl.textContent = h > 0
                ? `${pad(h)}:${pad(m)}:${pad(s)}`
                : `${pad(m)}:${pad(s)}`;
        }
    }, 1000);
}

function stopClosingTimer() {
    if (closingTimerInterval) {
        clearInterval(closingTimerInterval);
        closingTimerInterval = null;
    }
}