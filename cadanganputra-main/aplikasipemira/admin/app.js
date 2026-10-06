// ============================================================
//  admin/app.js — Logic Panel Admin PEMIRA BEM SMP
//  Di-load oleh admin/index.html
//
//  SECTION MAP:
//   1. CONFIG & STATE
//   2. INIT
//   3. AUTH ADMIN
//   4. DATA LAYER (load/save localStorage + Supabase)
//   5. SUPABASE: STUDENTS
//   6. SUPABASE: CANDIDATES
//   7. SUPABASE: VOTE LOGS
//   8. DASHBOARD (render stats + charts)
//   9. ADMIN: KANDIDAT (tambah / edit / hapus)
//  10. ADMIN: SISWA (kelola, import, export)
//  11. ADMIN: KELAS
//  12. AUDIT LOG
//  13. EXCEL: TEMPLATE & EKSPOR
//  14. UI HELPERS
// ============================================================


// ============================================================
// === SECTION: 1. CONFIG & STATE ===
// ============================================================

// >> Supabase credentials & admin password — diambil dari /api/config saat init
let SUPABASE_URL      = null;
let SUPABASE_ANON_KEY = null;
let ADMIN_PASSWORD    = null;

// >> Default kelas jika localStorage kosong
const defaultClasses = ["Kelas 7", "Kelas 8", "Kelas 9"];

// >> Supabase runtime
let supabaseClient   = null;
let isSupabaseActive = false;

// >> Chart instances
let voterPieChartInstance     = null;
let candidateBarChartInstance = null;

// >> Data arrays
let classes    = [];
let candidates = [];
let students   = [];
let voterStats = {};

// >> Audit log
let voteLogs         = [];
let auditLogFiltered = [];


// ============================================================
// === SECTION: 2. INIT ===
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();            // ambil kredensial dari /api/config
    initSupabaseClient();
    // Cek apakah session admin masih aktif (sessionStorage)
    if (sessionStorage.getItem('pemira_admin_auth') === '1') {
        showDashboard();
    }
});

// >> Ambil Supabase URL, key, dan admin password dari serverless endpoint
// >> Fallback ke nilai hardcoded jika /api/config tidak tersedia (local dev)
async function loadConfig() {
    // Fallback default untuk local development (Live Server, file://, dll.)
    SUPABASE_URL      = 'https://puywjdopumlzvmzbcudr.supabase.co';
    SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
    ADMIN_PASSWORD    = 'raisarfaketuampm';

    try {
        const res  = await fetch('/api/config');
        if (!res.ok) return; // pakai fallback jika endpoint tidak ada
        const data = await res.json();
        if (data.url)           SUPABASE_URL      = data.url;
        if (data.key)           SUPABASE_ANON_KEY = data.key;
        if (data.adminPassword) ADMIN_PASSWORD    = data.adminPassword;
    } catch (e) {
        // /api/config tidak tersedia (local) — pakai fallback di atas
    }
}

function initSupabaseClient() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
        try {
            supabaseClient   = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            isSupabaseActive = true;
        } catch (e) { isSupabaseActive = false; }
    }
}


// ============================================================
// === SECTION: 3. AUTH ADMIN ===
// ============================================================

// >> Form login submit
function handleAdminLogin(event) {
    event.preventDefault();
    const pass = document.getElementById('adminPasswordInput').value;
    if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('pemira_admin_auth', '1');
        document.getElementById('loginError').classList.add('hidden');
        showDashboard();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('adminPasswordInput').value = '';
    }
}

// >> Tampilkan dashboard setelah login
async function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    await loadData();
    await loadTeachers();
    renderAdminDashboard();
}

// >> Logout — hapus session, kembali ke login screen
function adminLogout() {
    sessionStorage.removeItem('pemira_admin_auth');
    document.getElementById('dashboardScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('adminPasswordInput').value = '';
}


// ============================================================
// === SECTION: 4. DATA LAYER ===
// ============================================================

async function loadData() {
    // localStorage sebagai fallback
    const sc = localStorage.getItem('pemira_classes');
    classes = sc ? JSON.parse(sc) : [...defaultClasses];

    const scd = localStorage.getItem('pemira_candidates');
    candidates = scd ? JSON.parse(scd) : [];

    const ss = localStorage.getItem('pemira_students');
    try { students = ss ? JSON.parse(ss) : []; } catch(e) { students = []; }

    const sv = localStorage.getItem('pemira_voter_stats');
    voterStats = sv ? JSON.parse(sv) : {};

    // Timpa dengan data Supabase jika aktif
    if (isSupabaseActive && supabaseClient) {
        try {
            const { data: cData } = await supabaseClient
                .from('candidates').select('*').order('no', { ascending: true });
            if (cData?.length) {
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
            }

            const { data: sData } = await supabaseClient
                .from('students').select('*').order('name', { ascending: true });
            if (sData?.length) {
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
        } catch(e) { console.log("Supabase unavailable — using local data."); }
    }

    loadVoteLogsLocal();
}

function saveClassesLocal()    { localStorage.setItem('pemira_classes',     JSON.stringify(classes));    }
function saveCandidatesLocal() { localStorage.setItem('pemira_candidates',  JSON.stringify(candidates)); }
function saveStudentsLocal()   { localStorage.setItem('pemira_students',    JSON.stringify(students));   }
function saveVoterStatsLocal() { localStorage.setItem('pemira_voter_stats', JSON.stringify(voterStats)); }


// ============================================================
// === SECTION: 5. SUPABASE: STUDENTS ===
// ============================================================

async function syncStudentToSupabase(s) {
    if (!isSupabaseActive || !supabaseClient || !s) return;
    try {
        await supabaseClient.from('students').upsert({
            id: s.id, name: s.name, grade: s.grade,
            password: s.password || '', has_voted: s.hasVoted, voted_for: s.votedFor
        });
    } catch(e) { console.error("syncStudentToSupabase:", e); }
}

async function syncMultipleStudentsToSupabase(list) {
    if (!isSupabaseActive || !supabaseClient || !list?.length) return;
    try {
        await supabaseClient.from('students').upsert(
            list.map(s => ({ id: s.id, name: s.name, grade: s.grade,
                password: s.password || '', has_voted: s.hasVoted, voted_for: s.votedFor }))
        );
    } catch(e) { console.error("syncMultipleStudentsToSupabase:", e); }
}

async function deleteStudentFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().eq('id', id); }
    catch(e) { console.error("deleteStudentFromSupabase:", e); }
}

async function deleteStudentsByGradeFromSupabase(grade) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().eq('grade', grade); }
    catch(e) { console.error("deleteStudentsByGrade:", e); }
}

async function deleteAllStudentsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().neq('id', '0'); }
    catch(e) { console.error("deleteAllStudents:", e); }
}

async function resetAllStudentVotesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('students')
            .update({ has_voted: false, voted_for: null }).neq('id', '0');
    } catch(e) { console.error("resetAllStudentVotes:", e); }
}


// ============================================================
// === SECTION: 6. SUPABASE: CANDIDATES ===
// ============================================================

async function uploadCandidateImageToStorage(file, candidateId) {
    if (!isSupabaseActive || !supabaseClient || !file) return null;
    try {
        const ext  = file.name.split('.').pop();
        const path = `${candidateId}.${ext}`;
        const { error } = await supabaseClient.storage
            .from('candidate-images').upload(path, file, { upsert: true, contentType: file.type });
        if (error) return null;
        const { data } = supabaseClient.storage.from('candidate-images').getPublicUrl(path);
        return data?.publicUrl || null;
    } catch(e) { return null; }
}

async function upsertCandidateToSupabase(c) {
    if (!isSupabaseActive || !supabaseClient || !c) return;
    try {
        await supabaseClient.from('candidates').upsert({
            id: c.id, no: c.no, name: c.name, image: c.image,
            visi: c.visi, misi: c.misi, votes: c.votes, votes_by_class: c.votes_by_class
        });
    } catch(e) { console.error("upsertCandidate:", e); }
}

async function deleteCandidateFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('candidates').delete().eq('id', id);
        await supabaseClient.storage.from('candidate-images')
            .remove([`${id}.jpg`, `${id}.jpeg`, `${id}.png`, `${id}.webp`]);
    } catch(e) { console.error("deleteCandidate:", e); }
}

async function resetCandidatesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        for (const c of candidates) {
            await supabaseClient.from('candidates')
                .update({ votes: 0, votes_by_class: {} }).eq('id', c.id);
        }
    } catch(e) { console.error("resetCandidates:", e); }
}


// ============================================================
// === SECTION: 7. SUPABASE: VOTE LOGS ===
// ============================================================

function loadVoteLogsLocal() {
    try {
        const raw = localStorage.getItem('pemira_vote_logs');
        voteLogs = raw ? JSON.parse(raw) : [];
    } catch(e) { voteLogs = []; }
}

function saveVoteLogsLocal() {
    localStorage.setItem('pemira_vote_logs', JSON.stringify(voteLogs));
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
        } catch(e) { console.error("loadAuditLog:", e); }
    }
    renderAuditLog(voteLogs);
}

async function clearVoteLogsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('vote_logs').delete().neq('id', '___none___'); }
    catch(e) { console.error("clearVoteLogs:", e); }
}


// ============================================================
// === SECTION: 8. DASHBOARD ===
// ============================================================

function renderAdminDashboard() {
    document.getElementById('statTotalCandidates').innerText = candidates.length;
    document.getElementById('statTotalStudents').innerText   = students.length;
    if (document.getElementById('statTotalTeachers'))
        document.getElementById('statTotalTeachers').innerText = teachers.length;
    document.getElementById('statTotalVotes').innerText      = candidates.reduce((s, c) => s + c.votes, 0);

    // Tabel kandidat
    const tbody  = document.getElementById('adminCandidateTable');
    tbody.innerHTML = '';
    const sorted = [...candidates].sort((a, b) => a.no - b.no);

    if (!sorted.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 text-xs">Belum ada kandidat.</td></tr>`;
    } else {
        sorted.forEach(c => {
            const vbc = c.votes_by_class || {};
            const breakdown = Object.keys(vbc).filter(k => vbc[k] > 0)
                .map(k => `<span class="inline-flex items-center bg-slate-100 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded mr-1">
                    ${k}: <strong class="text-blue-600 ml-1">${vbc[k]}</strong></span>`).join('')
                || '<span class="text-[10px] text-slate-400 italic">Belum ada suara</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 flex items-center gap-3">
                    <img src="${c.image}" alt="${c.name}" class="w-10 h-10 object-cover rounded-full shadow-sm"
                         onerror="this.src='https://placehold.co/40x40/2563eb/fff?text=${c.no}'">
                    <div>
                        <span class="font-bold text-slate-800 block">${c.name}</span>
                        <div class="flex flex-wrap mt-1">${breakdown}</div>
                    </div>
                </td>
                <td class="p-4 font-bold text-blue-600">No. ${c.no}</td>
                <td class="p-4 font-extrabold text-slate-800">${c.votes} <span class="text-xs font-normal text-slate-400">suara</span></td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="editCandidate('${c.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button onclick="deleteCandidateConfirm('${c.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold">
                        <i class="fa-solid fa-trash"></i> Hapus
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    renderPieChart();
    renderBarChart(sorted);
}

function renderPieChart() {
    const ctx = document.getElementById('voterPieChart').getContext('2d');
    if (voterPieChartInstance) voterPieChartInstance.destroy();
    voterPieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: classes,
            datasets: [{
                data: classes.map(g => voterStats[g] || 0),
                backgroundColor: ['#0284c7','#0d9488','#2563eb','#f59e0b','#10b981','#8b5cf6'],
                borderWidth: 2, borderColor: '#fff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } }
        }
    });
}

function renderBarChart(sorted) {
    const ctx = document.getElementById('candidateBarChart').getContext('2d');
    if (candidateBarChartInstance) candidateBarChartInstance.destroy();
    candidateBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(c => `No.${c.no} ${c.name.split(' ')[0]}`),
            datasets: [{
                label: 'Suara', data: sorted.map(c => c.votes),
                backgroundColor: '#2563eb', borderRadius: 8, hoverBackgroundColor: '#1d4ed8'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: { legend: { display: false } }
        }
    });
}


// ============================================================
// === SECTION: 9. ADMIN: KANDIDAT ===
// ============================================================

function openAddCandidateModal() {
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

function editCandidate(id) {
    const c = candidates.find(c => c.id === id);
    if (!c) return;
    document.getElementById('candidateFormId').value    = c.id;
    document.getElementById('formNo').value             = c.no;
    document.getElementById('formName').value           = c.name;
    document.getElementById('formVisi').value           = c.visi;
    document.getElementById('formMisi').value           = c.misi.join('\n');
    document.getElementById('formImageFile').value      = '';
    document.getElementById('formModalTitle').innerText = 'Edit Kandidat';
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
    renderAdminDashboard();
    showAlertModal('Berhasil', 'Data kandidat telah disimpan.', 'success');
}

async function deleteCandidateConfirm(id) {
    const c = candidates.find(c => c.id === id);
    if (!c || !confirm(`Hapus kandidat "${c.name}"?`)) return;
    candidates = candidates.filter(c => c.id !== id);
    saveCandidatesLocal();
    await deleteCandidateFromSupabase(id);
    renderAdminDashboard();
    showAlertModal('Terhapus', 'Kandidat berhasil dihapus.', 'info');
}

async function resetVotesConfirm() {
    if (!confirm("PERINGATAN: Reset semua suara dan status pemilih (siswa + guru)?")) return;
    candidates.forEach(c => { c.votes = 0; c.votes_by_class = {}; });
    students.forEach(s => { s.hasVoted = false; s.votedFor = null; });
    teachers.forEach(t => { t.hasVoted = false; t.votedFor = null; });
    voterStats = {};
    saveCandidatesLocal(); saveStudentsLocal(); saveVoterStatsLocal(); saveTeachersLocal();
    await Promise.all([
        resetAllStudentVotesInSupabase(),
        resetCandidatesInSupabase(),
        clearVoteLogsFromSupabase(),
        resetAllTeacherVotesInSupabase()
    ]);
    voteLogs = []; saveVoteLogsLocal();
    renderAdminDashboard();
    showAlertModal('Berhasil Reset', 'Semua suara dan status pemilihan telah direset.', 'info');
}


// ============================================================
// === SECTION: 10. ADMIN: SISWA ===
// ============================================================

function openStudentManageModal() {
    const sel = document.getElementById('adminStudentGradeSelect');
    sel.innerHTML = classes.map(g => `<option value="${g}">${g}</option>`).join('');
    currentVoterTab = 'siswa';
    // Reset tab ke siswa
    switchVoterTab('siswa');
    renderAdminStudentManager();
    updateTabCounts();
    const m = document.getElementById('studentManageModal');
    m.classList.remove('hidden'); m.classList.add('flex');
}

function closeStudentManageModal() {
    const m = document.getElementById('studentManageModal');
    m.classList.add('hidden'); m.classList.remove('flex');
}

function renderAdminStudentManager() {
    const grade = document.getElementById('adminStudentGradeSelect').value;
    document.getElementById('adminActiveFullClass').innerText = grade;

    const kelasData = students.filter(s => s.grade === grade);
    document.getElementById('studentCountBadge').innerText = `${kelasData.length} Siswa`;

    const tbody = document.getElementById('adminStudentTableBody');
    tbody.innerHTML = '';

    if (!kelasData.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada siswa. Tambah manual, impor Excel, atau klik "30 Siswa".</td></tr>`;
        return;
    }

    kelasData.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2.5 pl-4 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-2.5 font-bold text-slate-800">${s.name}</td>
            <td class="p-2.5">
                <span class="font-mono text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">${s.password || '—'}</span>
                <button onclick="editStudentPassword('${s.id}')" class="ml-1 text-sky-500 hover:text-sky-700 text-[10px]">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
            <td class="p-2.5">
                ${s.hasVoted
                    ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold text-[10px]">Sudah Memilih</span>'
                    : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold text-[10px]">Belum Memilih</span>'
                }
            </td>
            <td class="p-2.5 text-right pr-4 space-x-1">
                <button onclick="editStudentName('${s.id}')" class="text-blue-600 hover:text-blue-800 text-[11px] font-semibold">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                ${s.hasVoted
                    ? `<button onclick="resetSingleStudentVote('${s.id}')" class="text-amber-600 hover:text-amber-800 text-[11px] font-semibold">
                           <i class="fa-solid fa-rotate-left"></i> Reset
                       </button>` : ''}
                <button onclick="deleteSingleStudent('${s.id}')" class="text-rose-600 hover:text-rose-800 text-[11px] font-semibold">
                    <i class="fa-solid fa-trash"></i> Hapus
                </button>
            </td>`;
        tbody.appendChild(tr);
    });
}

function editStudentName(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    const n = prompt("Edit Nama Siswa:", s.name);
    if (n?.trim()) {
        s.name = n.trim();
        saveStudentsLocal(); syncStudentToSupabase(s);
        renderAdminStudentManager(); renderAdminDashboard();
        showAlertModal('Berhasil', 'Nama siswa diperbarui.', 'success');
    }
}

function editStudentPassword(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    const p = prompt("Edit Password Siswa:", s.password || '');
    if (p !== null && p.trim()) {
        s.password = p.trim();
        saveStudentsLocal(); syncStudentToSupabase(s);
        renderAdminStudentManager();
        showAlertModal('Berhasil', 'Password diperbarui.', 'success');
    }
}

function handleAddStudent(e) {
    e.preventDefault();
    const grade    = document.getElementById('adminStudentGradeSelect').value;
    const nameEl   = document.getElementById('newStudentNameInput');
    const passEl   = document.getElementById('newStudentPasswordInput');
    const name     = nameEl.value.trim();
    const password = passEl.value.trim();
    if (!name || !password) return;

    const ns = {
        id: `std_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
        name, grade, password, hasVoted: false, votedFor: null
    };
    students.push(ns);
    saveStudentsLocal(); syncStudentToSupabase(ns);
    nameEl.value = ''; passEl.value = '';
    renderAdminStudentManager(); renderAdminDashboard();
}

function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const grade  = document.getElementById('adminStudentGradeSelect').value;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const wb  = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws  = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (!rows?.length) { showAlertModal('File Kosong', 'Tidak ada data dalam file.', 'info'); return; }

            let nameCol = 0, passCol = -1;
            if (Array.isArray(rows[0])) {
                const fi = (kws) => rows[0].findIndex(c => c && kws.some(k => c.toString().toLowerCase().includes(k)));
                const fn = fi(['nama','name']); const fp = fi(['password','pass','sandi']);
                if (fn !== -1) nameCol = fn;
                if (fp !== -1) passCol = fp;
            }
            const startRow = rows[0]?.[nameCol]?.toString().toLowerCase().match(/nama|name/) ? 1 : 0;
            const batch = [];
            for (let i = startRow; i < rows.length; i++) {
                const row  = rows[i];
                const name = row?.[nameCol]?.toString().trim();
                if (!name) continue;
                const pass = passCol !== -1 ? row[passCol]?.toString().trim() : `pass${i}`;
                const ns = {
                    id: `std_${Date.now()}_${i}_${Math.random().toString(36).substr(2,3)}`,
                    name, grade, password: pass || `pass${i}`, hasVoted: false, votedFor: null
                };
                students.push(ns); batch.push(ns);
            }
            saveStudentsLocal(); syncMultipleStudentsToSupabase(batch);
            renderAdminStudentManager(); renderAdminDashboard();
            showAlertModal('Import Berhasil', `${batch.length} siswa ditambahkan ke ${grade}.`, 'success');
        } catch(err) {
            showAlertModal('Gagal Import', 'Format file tidak valid. Gunakan .xlsx atau .csv.', 'info');
        } finally { event.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
}

function autoFillClassStudents() {
    const grade = document.getElementById('adminStudentGradeSelect').value;
    const cur   = students.filter(s => s.grade === grade).length;
    const batch = [];
    for (let i = 1; i <= 30; i++) {
        const ns = {
            id: `std_${Date.now()}_${i}_${Math.random().toString(36).substr(2,3)}`,
            name: `Siswa ${cur + i} ${grade}`, grade,
            password: `siswa${cur + i}`, hasVoted: false, votedFor: null
        };
        students.push(ns); batch.push(ns);
    }
    saveStudentsLocal(); syncMultipleStudentsToSupabase(batch);
    renderAdminStudentManager(); renderAdminDashboard();
    showAlertModal('Berhasil', `30 siswa baru ditambahkan ke ${grade}.`, 'success');
}

function deleteSingleStudent(id) {
    students = students.filter(s => s.id !== id);
    saveStudentsLocal(); deleteStudentFromSupabase(id);
    renderAdminStudentManager(); renderAdminDashboard();
}

function resetSingleStudentVote(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    s.hasVoted = false; s.votedFor = null;
    saveStudentsLocal(); syncStudentToSupabase(s);
    renderAdminStudentManager(); renderAdminDashboard();
}

function clearStudentsOfActiveGrade() {
    const grade = document.getElementById('adminStudentGradeSelect').value;
    if (!confirm(`Hapus semua siswa di ${grade}?`)) return;
    students = students.filter(s => s.grade !== grade);
    saveStudentsLocal(); deleteStudentsByGradeFromSupabase(grade);
    renderAdminStudentManager(); renderAdminDashboard();
}

function clearAllStudentsAllGrades() {
    if (!confirm("YAKIN? Hapus SEMUA siswa dari semua kelas?")) return;
    students = [];
    saveStudentsLocal(); deleteAllStudentsFromSupabase();
    renderAdminStudentManager(); renderAdminDashboard();
    showAlertModal('Terhapus', 'Semua data siswa telah dihapus.', 'info');
}


// ============================================================
// === SECTION: 11. ADMIN: KELAS ===
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
        saveClassesLocal(); renderClassList(); renderAdminDashboard();
        input.value = '';
        showAlertModal('Berhasil', `Tingkat "${name}" ditambahkan.`, 'success');
    }
}

function deleteClass(className) {
    if (!confirm(`Hapus tingkat "${className}"?`)) return;
    classes = classes.filter(c => c !== className);
    saveClassesLocal(); renderClassList(); renderAdminDashboard();
}


// ============================================================
// === SECTION: 12. AUDIT LOG ===
// ============================================================

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

function renderAuditLog(entries) {
    auditLogFiltered = entries;
    const tbody   = document.getElementById('auditLogTableBody');
    const countEl = document.getElementById('auditLogCount');
    if (!tbody) return;
    countEl.textContent = `${entries.length} entri`;

    if (!entries.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs italic">Belum ada data.</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    entries.forEach((log, idx) => {
        const dt    = log.voted_at ? new Date(log.voted_at) : null;
        const waktu = dt ? dt.toLocaleString('id-ID', {
            day:'2-digit', month:'short', year:'numeric',
            hour:'2-digit', minute:'2-digit', second:'2-digit'
        }) : '—';
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        tr.innerHTML = `
            <td class="p-3 pl-5 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 text-slate-500 whitespace-nowrap">${waktu}</td>
            <td class="p-3 font-semibold text-slate-800">${log.student_name || '—'}</td>
            <td class="p-3"><span class="bg-sky-100 text-sky-700 text-[11px] font-bold px-2 py-0.5 rounded-lg">${log.student_grade || '—'}</span></td>
            <td class="p-3 font-semibold text-blue-700">${log.candidate_name || '—'}</td>
            <td class="p-3"><span class="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-lg">No. ${log.candidate_no ?? '—'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAuditLog() {
    const qS = (document.getElementById('auditSearchStudent')?.value  || '').toLowerCase().trim();
    const qC = (document.getElementById('auditSearchCandidate')?.value|| '').toLowerCase().trim();
    const qCl= (document.getElementById('auditFilterClass')?.value    || '');
    renderAuditLog(voteLogs.filter(l =>
        (!qS  || (l.student_name   || '').toLowerCase().includes(qS))  &&
        (!qC  || (l.candidate_name || '').toLowerCase().includes(qC))  &&
        (!qCl || l.student_grade === qCl)
    ));
}


// ============================================================
// === SECTION: 13. EXCEL: TEMPLATE & EKSPOR ===
// ============================================================

function downloadStudentTemplate() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    const wb = XLSX.utils.book_new();

    const wsPetunjuk = XLSX.utils.aoa_to_sheet([
        ['PETUNJUK PENGISIAN TEMPLATE DATA SISWA'],
        [''],
        ['1. Kolom "Nama" wajib diisi dengan nama lengkap siswa.'],
        ['2. Kolom "Password" diisi password yang digunakan saat memilih.'],
        ['3. Import dilakukan per kelas — pilih kelas dulu sebelum klik "Import Excel".'],
        ['4. Hapus baris contoh sebelum diisi data asli.'],
    ]);
    wsPetunjuk['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');

    ['Kelas 7','Kelas 8','Kelas 9'].forEach(kls => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['No','Nama','Password'],
            ['1','Ahmad Fauzi','fauzi123'],
            ['2','Siti Rahayu','rahayu456'],
            [''],
            ['← Hapus baris contoh, isi data asli di sini'],
        ]);
        ws['!cols'] = [{ wch:6 },{ wch:30 },{ wch:20 }];
        XLSX.utils.book_append_sheet(wb, ws, kls);
    });

    XLSX.writeFile(wb, 'Template_DataSiswa_PEMIRA.xlsx');
}

function exportStudentsExcelAll() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    if (!students.length) { showAlertModal('Kosong', 'Belum ada siswa.', 'info'); return; }

    const wb = XLSX.utils.book_new();
    let total = 0;
    classes.forEach(kls => {
        const data = students.filter(s => s.grade === kls);
        if (!data.length) return;
        const rows = [['No','Nama Siswa','Password','Status Suara']];
        data.forEach((s, i) => rows.push([i+1, s.name, s.password||'', s.hasVoted?'Sudah Memilih':'Belum Memilih']));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch:6 },{ wch:30 },{ wch:20 },{ wch:18 }];
        XLSX.utils.book_append_sheet(wb, ws, kls);
        total += data.length;
    });
    if (!wb.SheetNames.length) { showAlertModal('Kosong', 'Tidak ada siswa.', 'info'); return; }
    const fname = `DataSiswa_PEMIRA_SemuaKelas_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    showAlertModal('Ekspor Berhasil', `${total} siswa dari ${wb.SheetNames.length} kelas diekspor.`, 'success');
}

function exportStudentsExcelCurrentGrade() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    const grade = document.getElementById('adminStudentGradeSelect').value;
    const data  = students.filter(s => s.grade === grade);
    if (!data.length) { showAlertModal('Kosong', `Belum ada siswa di ${grade}.`, 'info'); return; }

    const rows = [['No','Nama Siswa','Password','Status Suara']];
    data.forEach((s, i) => rows.push([i+1, s.name, s.password||'', s.hasVoted?'Sudah Memilih':'Belum Memilih']));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch:6 },{ wch:30 },{ wch:20 },{ wch:18 }];
    XLSX.utils.book_append_sheet(wb, ws, grade);
    const fname = `DataSiswa_PEMIRA_${grade.replace(' ','')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    showAlertModal('Ekspor Berhasil', `${data.length} siswa dari ${grade} diekspor.`, 'success');
}


// ============================================================
// === SECTION: 14. UI HELPERS ===
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


// ============================================================
// === SECTION TAMBAHAN: GURU / STAF ===
// ============================================================

// >> teachers array — sumber kebenaran guru di memory
let teachers = [];
let currentVoterTab = 'siswa'; // 'siswa' | 'guru'

// >> Load teachers dari localStorage + Supabase
async function loadTeachers() {
    const stored = localStorage.getItem('pemira_teachers');
    try { teachers = stored ? JSON.parse(stored) : []; } catch(e) { teachers = []; }

    if (isSupabaseActive && supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('teachers').select('*').order('name', { ascending: true });
            if (data && data.length > 0) {
                teachers = data.map(t => ({
                    id:       t.id,
                    name:     t.name,
                    username: t.username,
                    password: t.password || '',
                    role:     t.role || 'Guru',
                    hasVoted: t.has_voted || false,
                    votedFor: t.voted_for || null
                }));
                saveTeachersLocal();
            }
        } catch(e) { console.log("Supabase teachers unavailable — using local data."); }
    }
}

function saveTeachersLocal() {
    localStorage.setItem('pemira_teachers', JSON.stringify(teachers));
}

// >> Supabase CRUD teachers
async function syncTeacherToSupabase(t) {
    if (!isSupabaseActive || !supabaseClient || !t) return;
    try {
        await supabaseClient.from('teachers').upsert({
            id: t.id, name: t.name, username: t.username,
            password: t.password || '', role: t.role || 'Guru',
            has_voted: t.hasVoted, voted_for: t.votedFor
        });
    } catch(e) { console.error("syncTeacher:", e); }
}

async function syncMultipleTeachersToSupabase(list) {
    if (!isSupabaseActive || !supabaseClient || !list?.length) return;
    try {
        await supabaseClient.from('teachers').upsert(
            list.map(t => ({
                id: t.id, name: t.name, username: t.username,
                password: t.password || '', role: t.role || 'Guru',
                has_voted: t.hasVoted, voted_for: t.votedFor
            }))
        );
    } catch(e) { console.error("syncMultipleTeachers:", e); }
}

async function deleteTeacherFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('teachers').delete().eq('id', id); }
    catch(e) { console.error("deleteTeacher:", e); }
}

async function deleteAllTeachersFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('teachers').delete().neq('id', '0'); }
    catch(e) { console.error("deleteAllTeachers:", e); }
}

async function resetAllTeacherVotesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('teachers')
            .update({ has_voted: false, voted_for: null }).neq('id', '0');
    } catch(e) { console.error("resetTeacherVotes:", e); }
}

// >> Tab switcher: 'siswa' | 'guru'
function switchVoterTab(tab) {
    currentVoterTab = tab;
    const btnSiswa = document.getElementById('tabSiswaBtn');
    const btnGuru  = document.getElementById('tabGuruBtn');
    const panelS   = document.getElementById('panelSiswa');
    const panelG   = document.getElementById('panelGuru');

    if (tab === 'siswa') {
        btnSiswa.className = 'px-4 py-2 font-bold text-xs rounded-xl transition bg-sky-600 text-white shadow-sm';
        btnGuru.className  = 'px-4 py-2 font-bold text-xs rounded-xl transition bg-slate-100 text-slate-600 hover:bg-slate-200';
        panelS.classList.remove('hidden');
        panelG.classList.add('hidden');
    } else {
        btnGuru.className  = 'px-4 py-2 font-bold text-xs rounded-xl transition bg-emerald-600 text-white shadow-sm';
        btnSiswa.className = 'px-4 py-2 font-bold text-xs rounded-xl transition bg-slate-100 text-slate-600 hover:bg-slate-200';
        panelG.classList.remove('hidden');
        panelS.classList.add('hidden');
        renderAdminTeacherManager();
    }
    updateTabCounts();
}

function updateTabCounts() {
    const cS = document.getElementById('countTabSiswa');
    const cG = document.getElementById('countTabGuru');
    if (cS) cS.textContent = students.length;
    if (cG) cG.textContent = teachers.length;
}

// >> Render tabel guru di admin
function renderAdminTeacherManager() {
    const tbody = document.getElementById('adminTeacherTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!teachers.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 text-xs">Belum ada guru. Tambah manual atau import Excel.</td></tr>`;
        return;
    }

    teachers.forEach((t, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2.5 pl-4 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-2.5 font-bold text-slate-800">${t.name}</td>
            <td class="p-2.5 font-mono text-[11px] text-slate-600">${t.username}</td>
            <td class="p-2.5">
                <span class="font-mono text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">${t.password || '—'}</span>
                <button onclick="editTeacherPassword('${t.id}')" class="ml-1 text-sky-500 hover:text-sky-700 text-[10px]">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
            <td class="p-2.5">
                ${t.hasVoted
                    ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold text-[10px]">Sudah Memilih</span>'
                    : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold text-[10px]">Belum Memilih</span>'
                }
            </td>
            <td class="p-2.5 text-right pr-4 space-x-1">
                <button onclick="editTeacherName('${t.id}')" class="text-blue-600 hover:text-blue-800 text-[11px] font-semibold">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                ${t.hasVoted
                    ? `<button onclick="resetSingleTeacherVote('${t.id}')" class="text-amber-600 hover:text-amber-800 text-[11px] font-semibold">
                           <i class="fa-solid fa-rotate-left"></i> Reset
                       </button>` : ''}
                <button onclick="deleteSingleTeacher('${t.id}')" class="text-rose-600 hover:text-rose-800 text-[11px] font-semibold">
                    <i class="fa-solid fa-trash"></i> Hapus
                </button>
            </td>`;
        tbody.appendChild(tr);
    });
}

// >> Tambah guru manual
function handleAddTeacher(e) {
    e.preventDefault();
    const name     = document.getElementById('newTeacherNameInput').value.trim();
    const username = document.getElementById('newTeacherUsernameInput').value.trim();
    const password = document.getElementById('newTeacherPasswordInput').value.trim();
    if (!name || !username || !password) return;

    // Cek username unik
    if (teachers.find(t => t.username === username)) {
        showAlertModal('Username Duplikat', `Username "${username}" sudah digunakan.`, 'info');
        return;
    }

    const nt = {
        id: `tch_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
        name, username, password, role: 'Guru', hasVoted: false, votedFor: null
    };
    teachers.push(nt);
    saveTeachersLocal();
    syncTeacherToSupabase(nt);

    document.getElementById('newTeacherNameInput').value     = '';
    document.getElementById('newTeacherUsernameInput').value = '';
    document.getElementById('newTeacherPasswordInput').value = '';

    renderAdminTeacherManager();
    updateTabCounts();
    renderAdminDashboard();
    showAlertModal('Berhasil', `Guru "${name}" ditambahkan.`, 'success');
}

// >> Edit nama guru
function editTeacherName(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    const n = prompt("Edit Nama Guru:", t.name);
    if (n?.trim()) {
        t.name = n.trim();
        saveTeachersLocal(); syncTeacherToSupabase(t);
        renderAdminTeacherManager();
        showAlertModal('Berhasil', 'Nama guru diperbarui.', 'success');
    }
}

// >> Edit password guru
function editTeacherPassword(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    const p = prompt("Edit Password Guru:", t.password || '');
    if (p !== null && p.trim()) {
        t.password = p.trim();
        saveTeachersLocal(); syncTeacherToSupabase(t);
        renderAdminTeacherManager();
        showAlertModal('Berhasil', 'Password guru diperbarui.', 'success');
    }
}

// >> Hapus satu guru
function deleteSingleTeacher(id) {
    teachers = teachers.filter(t => t.id !== id);
    saveTeachersLocal(); deleteTeacherFromSupabase(id);
    renderAdminTeacherManager(); updateTabCounts(); renderAdminDashboard();
}

// >> Reset suara satu guru
function resetSingleTeacherVote(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    t.hasVoted = false; t.votedFor = null;
    saveTeachersLocal(); syncTeacherToSupabase(t);
    renderAdminTeacherManager();
}

// >> Hapus semua guru
function clearAllTeachers() {
    if (!confirm("Hapus SEMUA data guru / staf?")) return;
    teachers = [];
    saveTeachersLocal(); deleteAllTeachersFromSupabase();
    renderAdminTeacherManager(); updateTabCounts(); renderAdminDashboard();
    showAlertModal('Terhapus', 'Semua data guru telah dihapus.', 'info');
}

// >> Import Excel guru (kolom: Nama | Username | Password)
function handleTeacherExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (!rows?.length) { showAlertModal('File Kosong', 'Tidak ada data.', 'info'); return; }

            const fi = (kws) => rows[0].findIndex(c => c && kws.some(k => c.toString().toLowerCase().includes(k)));
            const nameCol     = fi(['nama','name']);
            const usernameCol = fi(['username','user','nip']);
            const passCol     = fi(['password','pass','sandi']);
            const startRow    = (nameCol !== -1 && rows[0]?.[nameCol]?.toString().toLowerCase().match(/nama|name/)) ? 1 : 0;

            const batch = [];
            for (let i = startRow; i < rows.length; i++) {
                const row      = rows[i];
                const name     = nameCol !== -1     ? row[nameCol]?.toString().trim()     : row[0]?.toString().trim();
                const username = usernameCol !== -1 ? row[usernameCol]?.toString().trim() : row[1]?.toString().trim();
                const pass     = passCol !== -1     ? row[passCol]?.toString().trim()     : row[2]?.toString().trim();
                if (!name || !username) continue;

                // Skip duplikat username
                if (teachers.find(t => t.username === username)) continue;

                const nt = {
                    id: `tch_${Date.now()}_${i}_${Math.random().toString(36).substr(2,3)}`,
                    name, username, password: pass || `pass${i}`,
                    role: 'Guru', hasVoted: false, votedFor: null
                };
                teachers.push(nt); batch.push(nt);
            }
            saveTeachersLocal(); syncMultipleTeachersToSupabase(batch);
            renderAdminTeacherManager(); updateTabCounts(); renderAdminDashboard();
            showAlertModal('Import Berhasil', `${batch.length} guru ditambahkan.`, 'success');
        } catch(err) {
            showAlertModal('Gagal Import', 'Format file tidak valid.', 'info');
        } finally { event.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
}

// >> Unduh template Excel guru
function downloadTeacherTemplate() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['No', 'Nama', 'Username', 'Password'],
        ['1', 'Budi Santoso, S.Pd.', 'guru01', 'pass123'],
        ['2', 'Siti Rahmawati, M.Pd.', 'guru02', 'pass456'],
        ['', '← Hapus baris contoh, isi data asli di sini'],
    ]);
    ws['!cols'] = [{ wch:6 }, { wch:30 }, { wch:20 }, { wch:20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Guru');
    XLSX.writeFile(wb, 'Template_DataGuru_PEMIRA.xlsx');
}

// >> Ekspor data guru ke Excel
function exportTeachersExcel() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    if (!teachers.length) { showAlertModal('Kosong', 'Belum ada data guru.', 'info'); return; }
    const rows = [['No', 'Nama', 'Username', 'Password', 'Status Suara']];
    teachers.forEach((t, i) => rows.push([
        i + 1, t.name, t.username, t.password || '',
        t.hasVoted ? 'Sudah Memilih' : 'Belum Memilih'
    ]));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch:6 }, { wch:30 }, { wch:20 }, { wch:20 }, { wch:18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Guru');
    XLSX.writeFile(wb, `DataGuru_PEMIRA_${new Date().toISOString().slice(0,10)}.xlsx`);
    showAlertModal('Ekspor Berhasil', `${teachers.length} guru diekspor.`, 'success');
}
