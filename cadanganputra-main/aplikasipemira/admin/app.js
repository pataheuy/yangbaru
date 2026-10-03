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

// >> Supabase credentials & admin password — hardcoded langsung
let SUPABASE_URL      = 'https://puywjdopumlzvmzbcudr.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
let ADMIN_PASSWORD    = 'kpu2026';

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
let teachers   = [];
let voterStats = {};

// >> Audit log
let voteLogs         = [];
let auditLogFiltered = [];

// >> Tab state
let currentVoterTab = 'siswa';

// >> Auto-refresh interval
let dashboardRefreshInterval = null;

// Safe DOM helper to prevent null classList errors on admin pages
const getEl = (id) => document.getElementById(id);

// ============================================================
// === SECTION: 2. INIT ===
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    initSupabaseClient();
    if (sessionStorage.getItem('pemira_admin_auth') === '1') {
        showDashboard();
    }
});

// >> loadConfig tidak dipakai lagi — semua nilai hardcoded di atas
async function loadConfig() {}

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

function handleAdminLogin(event) {
    event.preventDefault();
    const passInput = getEl('adminPasswordInput');
    const loginError = getEl('loginError');
    if (!passInput || !loginError) return;

    const pass = passInput.value;
    if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('pemira_admin_auth', '1');
        loginError.classList.add('hidden');
        showDashboard();
    } else {
        loginError.classList.remove('hidden');
        passInput.value = '';
    }
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
                saveCandidatesLocal();
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
    recalculateDashboardStatsFromVoteLogs();
}

function saveClassesLocal()    { localStorage.setItem('pemira_classes',     JSON.stringify(classes));    }
function saveCandidatesLocal() { localStorage.setItem('pemira_candidates',  JSON.stringify(candidates)); }
function saveStudentsLocal()   { localStorage.setItem('pemira_students',    JSON.stringify(students));   }
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

function recalculateDashboardStatsFromVoteLogs() {
    const gradeCounts = {};
    const candidateCounts = {};
    const candidateClassBreakdown = {};

    candidates.forEach(c => {
        c.votes = 0;
        c.votes_by_class = {};
    });

    voteLogs.forEach(log => {
        const gradeKey = (log.student_grade || 'Umum').trim();
        gradeCounts[gradeKey] = (gradeCounts[gradeKey] || 0) + 1;

        if (!log.candidate_id) return;
        candidateCounts[log.candidate_id] = (candidateCounts[log.candidate_id] || 0) + 1;

        const map = candidateClassBreakdown[log.candidate_id] || {};
        map[gradeKey] = (map[gradeKey] || 0) + 1;
        candidateClassBreakdown[log.candidate_id] = map;
    });

    candidates.forEach(c => {
        c.votes = candidateCounts[c.id] || 0;
        c.votes_by_class = candidateClassBreakdown[c.id] || {};
    });

    voterStats = gradeCounts;
    saveCandidatesLocal();
    saveVoterStatsLocal();
}

async function showDashboard() {
    const loginScreen     = getEl('loginScreen');
    const dashboardScreen = getEl('dashboardScreen');
    const logoutBtn       = getEl('logoutBtn');

    if (!loginScreen || !dashboardScreen || !logoutBtn) {
        console.error('showDashboard: elemen tidak ditemukan', { loginScreen, dashboardScreen, logoutBtn });
        return;
    }

    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');

    try {
        await loadData();
        await loadTeachers();
        renderAdminDashboard();
    } catch(e) {
        console.error('showDashboard error:', e);
    }

    startDashboardAutoRefresh();
}

// >> Auto-refresh dashboard setiap 15 detik — ambil vote_logs terbaru dari Supabase
function startDashboardAutoRefresh() {
    stopDashboardAutoRefresh(); // clear dulu kalau ada yang jalan
    dashboardRefreshInterval = setInterval(async () => {
        if (!isSupabaseActive || !supabaseClient) return;
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
                recalculateDashboardStatsFromVoteLogs();
                renderAdminDashboard();
                // Update audit log kalau sedang terbuka
                const auditPanel = getEl('auditLogPanel');
                if (auditPanel && !auditPanel.classList.contains('hidden')) {
                    filterAuditLog();
                }
            }
        } catch(e) { console.error('auto-refresh error:', e); }
    }, 15000); // setiap 15 detik
}

function stopDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }
}

function adminLogout() {
    sessionStorage.removeItem('pemira_admin_auth');
    stopDashboardAutoRefresh();

    const dashboardScreen = getEl('dashboardScreen');
    const loginScreen = getEl('loginScreen');
    const logoutBtn = getEl('logoutBtn');
    const adminPasswordInput = getEl('adminPasswordInput');

    if (dashboardScreen) dashboardScreen.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (adminPasswordInput) adminPasswordInput.value = '';
}

// ============================================================
// === SECTION: 8. DASHBOARD ===
// ============================================================

function renderAdminDashboard() {
    const statCandidates = getEl('statTotalCandidates');
    const statStudents = getEl('statTotalStudents');
    const statVotes = getEl('statTotalVotes');
    const tbody = getEl('adminCandidateTable');

    if (statCandidates) statCandidates.innerText = candidates.length;
    if (statStudents) statStudents.innerText = students.length;
    const teachersEl = getEl('statTotalTeachers');
    if (teachersEl) teachersEl.innerText = teachers.length;

    const totalVotesFromStats = Object.values(voterStats).reduce((s, v) => s + (Number(v) || 0), 0);
    const totalVotesFromCandidates = candidates.reduce((s, c) => s + (Number(c.votes) || 0), 0);
    const finalTotalVotes = totalVotesFromStats > 0 ? totalVotesFromStats : totalVotesFromCandidates;
    if (statVotes) statVotes.innerText = finalTotalVotes;

    if (!tbody) return;
    tbody.innerHTML = '';
    const sorted = [...candidates].sort((a, b) => (a.no || 0) - (b.no || 0));

    if (!sorted.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 text-xs">Belum ada kandidat.</td></tr>`;
    } else {
        sorted.forEach(c => {
            const vbc = c.votes_by_class || {};
            const breakdown = Object.keys(vbc).filter(k => vbc[k] > 0)
                .map(k => `<span class="inline-flex items-center bg-slate-100 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded mr-1">${k}: <strong class="text-blue-600 ml-1">${vbc[k]}</strong></span>`).join('')
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
                <td class="p-4 font-extrabold text-slate-800">${Number(c.votes) || 0} <span class="text-xs font-normal text-slate-400">suara</span></td>
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

// ── Warna tetap per kelompok untuk grafik ──────────────────────────────────────
// Warna cerah: Kelas 7 = biru langit, Kelas 8 = hijau toska, Kelas 9 = oranye, Guru = hijau
const CLASS_COLOR_MAP = {
    '7': '#38bdf8',  // sky-400 — biru langit cerah
    '8': '#34d399',  // emerald-400 — hijau toska cerah
    '9': '#fb923c',  // orange-400 — oranye cerah
};
const CLASS_COLOR_FALLBACK = ['#a78bfa','#f472b6','#facc15','#4ade80','#60a5fa','#f87171'];
const GURU_BAR_COLOR = '#4ade80';  // green-400 — hijau cerah
const NOT_YET_COLOR  = '#e2e8f0';

function getClassBarColor(label, idx) {
    for (const [digit, color] of Object.entries(CLASS_COLOR_MAP)) {
        if (label.includes(digit)) return color;
    }
    if (label.toLowerCase().includes('guru') || label.toLowerCase().includes('staf')) return GURU_BAR_COLOR;
    return CLASS_COLOR_FALLBACK[idx % CLASS_COLOR_FALLBACK.length];
}

// Urutkan labels: kelas dari kecil ke besar (7→8→9), lalu guru di bawah
function getSortedGroupLabels() {
    const sorted = [...classes].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });
    return [...sorted, 'Guru / Staf'];
}

function renderPieChart() {
    const canvas = getEl('voterPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (voterPieChartInstance) voterPieChartInstance.destroy();

    // Reset tinggi ke fixed
    canvas.parentElement.style.height = '224px';

    // Hitung sudah memilih per kelas + guru — gunakan urutan kelas 7→8→9→guru
    const allLabels = getSortedGroupLabels();
    const classLabels = allLabels.filter(l => !l.toLowerCase().includes('guru') && !l.toLowerCase().includes('staf'));
    const classVoted  = classLabels.map(g => voterStats[g] || 0);
    const guruVoted   = teachers.filter(t => t.hasVoted).length;

    const allVoted  = [...classVoted, guruVoted];
    const allColors = allLabels.map((lbl, i) => getClassBarColor(lbl, i));

    // Hanya tampilkan segmen yang > 0 agar pie tidak kosong
    const filtered = allLabels
        .map((lbl, i) => ({ label: lbl, value: allVoted[i], color: allColors[i] }))
        .filter(d => d.value > 0);

    const hasData = filtered.length > 0;

    voterPieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: hasData ? filtered.map(d => d.label) : ['Belum ada suara'],
            datasets: [{
                data:            hasData ? filtered.map(d => d.value) : [1],
                backgroundColor: hasData ? filtered.map(d => d.color) : ['#e2e8f0'],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 11 },
                        padding: 10,
                        boxWidth: 12,
                    }
                },
                tooltip: {
                    enabled: hasData,
                    callbacks: {
                        label: (ctx) => {
                            const i = ctx.dataIndex;
                            const lbl  = filtered[i]?.label || '';
                            const val  = filtered[i]?.value || 0;
                            const total = filtered.reduce((s, d) => s + d.value, 0);
                            const pct  = total > 0 ? Math.round(val / total * 100) : 0;
                            // Cari total pemilih untuk kelas ini
                            const classIdx = classLabels.indexOf(lbl);
                            const classTotal = classIdx >= 0
                                ? students.filter(s => getParentGrade(s.grade) === lbl).length
                                : teachers.length;
                            return ` ${lbl}: ${val} suara (${pct}% dari total) — ${classTotal} pemilih`;
                        }
                    }
                }
            }
        }
    });
}

function renderBarChart(sorted) {
    const canvas = getEl('candidateBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (candidateBarChartInstance) candidateBarChartInstance.destroy();

    // Kelompok: tiap kelas + guru (urutan: 7→8→9→guru)
    const allGroups = getSortedGroupLabels();
    const classLabels = allGroups.filter(l => !l.toLowerCase().includes('guru') && !l.toLowerCase().includes('staf'));

    // Tiap group jadi 1 dataset (stacked), ambil suara per kandidat per kelas
    const datasets = allGroups.map(grp => {
        const isGuru = grp.toLowerCase().includes('guru') || grp.toLowerCase().includes('staf');
        return {
            label: grp,
            data: sorted.map(c => {
                if (isGuru) {
                    // suara guru = total votes kandidat dikurangi suara dari semua kelas siswa
                    const studentVotes = classLabels.reduce((s, cls) => s + (c.votes_by_class?.[cls] || 0), 0);
                    return Math.max(0, (Number(c.votes) || 0) - studentVotes);
                }
                return c.votes_by_class?.[grp] || 0;
            }),
            backgroundColor: getClassBarColor(grp, allGroups.indexOf(grp)),
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
            stack: 'kandidat',
        };
    });

    candidateBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(c => `No.${c.no} ${c.name.split(' ')[0]}`),
            datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 10, boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const c = sorted[items[0]?.dataIndex];
                            return c ? `No.${c.no} — ${c.name}` : '';
                        },
                        label: (ctx) => {
                            const val = ctx.raw;
                            if (!val) return null;
                            return ` ${ctx.dataset.label}: ${val} suara`;
                        },
                        footer: (items) => {
                            const total = items.reduce((s, i) => s + (i.raw || 0), 0);
                            const c = sorted[items[0]?.dataIndex];
                            return `Total: ${c ? Number(c.votes) || 0 : total} suara`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================================
// === SECTION: 10. ADMIN: SISWA ===
// ============================================================

function openStudentManageModal() {
    const sel = getEl('adminStudentGradeSelect');
    if (!sel) return;
    sel.innerHTML = classes.map(g => `<option value="${g}">${g}</option>`).join('');
    // Reset sub kelas
    const subEl = getEl('adminStudentSubClassInput');
    if (subEl) subEl.value = '';
    currentVoterTab = 'siswa';
    switchVoterTab('siswa');
    renderAdminStudentManager();
    updateTabCounts();
    const m = getEl('studentManageModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function closeStudentManageModal() {
    const m = getEl('studentManageModal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

// Helper: ambil kelas induk dari grade string
function getParentGrade(grade) {
    for (const cls of classes) {
        if (grade === cls) return cls;
        if (grade.startsWith(cls) && grade.length > cls.length) return cls;
    }
    return grade;
}

// Helper: build full grade dari dropdown + input sub kelas
function buildFullGrade() {
    const base = getEl('adminStudentGradeSelect')?.value || '';
    const sub  = (getEl('adminStudentSubClassInput')?.value || '').trim().toUpperCase();
    return sub ? base + sub : base;
}

function renderAdminStudentManager() {
    const gradeEl = getEl('adminStudentGradeSelect');
    const titleEl = getEl('adminActiveFullClass');
    const badgeEl = getEl('studentCountBadge');
    if (!gradeEl || !titleEl || !badgeEl) return;

    const baseGrade = gradeEl.value;
    const sub       = (getEl('adminStudentSubClassInput')?.value || '').trim().toUpperCase();
    const fullGrade = sub ? baseGrade + sub : baseGrade;

    titleEl.innerText = fullGrade;

    const searchEl = getEl('adminStudentSearchInput');
    if (searchEl) searchEl.value = '';

    // Kalau sub kelas diisi → filter exact, kalau kosong → tampilkan semua sub kelas dalam kelas ini
    const kelasData = sub
        ? students.filter(s => s.grade === fullGrade)
        : students.filter(s => getParentGrade(s.grade) === baseGrade);

    badgeEl.innerText = `${kelasData.length} Siswa`;
    renderStudentRows(kelasData);
}

function filterAdminStudentTable() {
    const baseGrade = getEl('adminStudentGradeSelect')?.value || '';
    const sub       = (getEl('adminStudentSubClassInput')?.value || '').trim().toUpperCase();
    const fullGrade = sub ? baseGrade + sub : baseGrade;
    const query     = (getEl('adminStudentSearchInput')?.value || '').toLowerCase().trim();
    const badgeEl   = getEl('studentCountBadge');

    const kelasData = sub
        ? students.filter(s => s.grade === fullGrade)
        : students.filter(s => getParentGrade(s.grade) === baseGrade);

    const filtered = query ? kelasData.filter(s => s.name.toLowerCase().includes(query)) : kelasData;
    if (badgeEl) badgeEl.innerText = `${filtered.length} Siswa`;
    renderStudentRows(filtered);
}

function renderStudentRows(data) {
    const tbody = getEl('adminStudentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Tidak ada siswa yang cocok.</td></tr>`;
        return;
    }

    data.forEach((s, idx) => {
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

// ============================================================
// === SECTION: 11. ADMIN: KELAS ===
// ============================================================

function openAddClassModal() {
    renderClassList();
    const m = getEl('classManageModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function closeAddClassModal() {
    const m = getEl('classManageModal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

function renderClassList() {
    const container = getEl('classListContainer');
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

// ============================================================
// === SECTION: 12. AUDIT LOG ===
// ============================================================

async function showAuditLog() {
    const overlay = getEl('auditLogOverlay');
    if (!overlay) return;

    // Isi dropdown filter kelas audit log — "Semua", kelas-kelas, lalu "Guru / Staf"
    const sel = getEl('auditFilterClass');
    if (sel) {
        sel.innerHTML = '<option value="">— Semua —</option>';
        classes.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; sel.appendChild(o); });
        const oGuru = document.createElement('option');
        oGuru.value = '__guru__'; oGuru.textContent = 'Guru / Staf';
        sel.appendChild(oGuru);
    }

    overlay.classList.remove('hidden'); overlay.classList.add('flex');

    loadVoteLogsLocal();
    recalculateDashboardStatsFromVoteLogs();
    renderAuditLog(voteLogs);
    await loadAuditLogFromSupabase();
}

function hideAuditLog() {
    const overlay = getEl('auditLogOverlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
}

function renderBelumMemilihTable() {
    const tbody   = getEl('belumMemilihTableBody');
    const countEl = getEl('belumMemilihCount');
    if (!tbody) return;

    const filterGrade = getEl('belumMemilihFilterClass')?.value || '';
    const onlyGuru    = getEl('belumMemilihFilterGuru')?.checked || false;

    const belumSiswa = onlyGuru ? [] :
        students.filter(s => !s.hasVoted && (!filterGrade || s.grade === filterGrade));
    const belumGuru  = teachers.filter(t => !t.hasVoted && (!filterGrade || filterGrade === ''));

    const semua = [
        ...belumSiswa.map(s => ({ name: s.name, grade: s.grade,          password: s.password || '—', type: 'siswa' })),
        ...belumGuru.map(t  => ({ name: t.name, grade: t.role || 'Guru', password: t.password || '—', type: 'guru'  }))
    ].sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));

    if (countEl) countEl.textContent = `${semua.length} orang`;
    tbody.innerHTML = '';

    if (!semua.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-emerald-600 font-semibold text-xs">🎉 Semua sudah memilih!</td></tr>`;
        return;
    }

    semua.forEach((p, idx) => {
        const badgeCls = p.type === 'guru'
            ? 'bg-emerald-100 text-emerald-700'
            : p.grade.includes('7') ? 'bg-blue-100 text-blue-700'
            : p.grade.includes('8') ? 'bg-violet-100 text-violet-700'
            : p.grade.includes('9') ? 'bg-rose-100 text-rose-700'
            : 'bg-sky-100 text-sky-700';
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-amber-50/40 transition';
        tr.innerHTML = `
            <td class="p-3 pl-5 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 font-semibold text-slate-800">${p.name}</td>
            <td class="p-3">
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${badgeCls}">${p.grade}</span>
            </td>
            <td class="p-3 font-mono text-slate-600 text-[11px] bg-slate-50/50">${p.password}</td>`;
        tbody.appendChild(tr);
    });
}

// Panel belum vote — fullscreen overlay
function showBelumVotePanel() {
    const overlay = getEl('belumVoteOverlay');
    if (!overlay) return;

    const sel = getEl('belumVoteFilterClass');
    if (sel) {
        sel.innerHTML = '<option value="">— Semua —</option>';
        classes.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; sel.appendChild(o); });
        const oGuru = document.createElement('option');
        oGuru.value = '__guru__'; oGuru.textContent = 'Guru / Staf';
        sel.appendChild(oGuru);
    }
    const search = getEl('belumVoteSearch');
    if (search) search.value = '';

    overlay.classList.remove('hidden'); overlay.classList.add('flex');
    renderBelumVotePanel();
}

function hideBelumVotePanel() {
    const overlay = getEl('belumVoteOverlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
}

function renderBelumVotePanel() {
    const tbody   = getEl('belumVoteTableBody');
    const countEl = getEl('belumVoteCount');
    if (!tbody) return;

    const filterVal = getEl('belumVoteFilterClass')?.value || '';
    const query     = (getEl('belumVoteSearch')?.value || '').toLowerCase().trim();
    const onlyGuru  = filterVal === '__guru__';
    const filterGrade = onlyGuru ? '' : filterVal;

    // Siswa belum memilih
    const belumSiswa = onlyGuru ? [] : students
        .filter(s => !s.hasVoted
            && (!filterGrade || s.grade === filterGrade)
            && (!query || s.name.toLowerCase().includes(query)))
        .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name))
        .map(s => ({ name: s.name, grade: s.grade, password: s.password || '—', type: 'siswa' }));

    // Guru belum memilih — hanya tampil kalau bukan filter kelas spesifik
    const belumGuru = filterGrade ? [] : teachers
        .filter(t => !t.hasVoted && (!query || t.name.toLowerCase().includes(query)))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({ name: t.name, grade: t.role || 'Guru', password: t.password || '—', type: 'guru' }));

    const semua = [...belumSiswa, ...belumGuru];

    if (countEl) countEl.textContent = `${semua.length} orang`;
    tbody.innerHTML = '';

    if (!semua.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-emerald-600 font-semibold text-sm">🎉 Semua sudah memilih!</td></tr>`;
        return;
    }

    const gradeColor = (grade, type) => {
        if (type === 'guru')      return 'bg-emerald-100 text-emerald-700';
        if (grade.includes('7')) return 'bg-blue-100 text-blue-700';
        if (grade.includes('8')) return 'bg-violet-100 text-violet-700';
        if (grade.includes('9')) return 'bg-rose-100 text-rose-700';
        return 'bg-slate-100 text-slate-600';
    };

    semua.forEach((p, idx) => {
        // Selang-seling abu-putih
        const rowBg = idx % 2 === 0 ? '' : 'bg-slate-50';
        const tr = document.createElement('tr');
        tr.className = `${rowBg} hover:bg-blue-50/40 transition`;
        tr.innerHTML = `
            <td class="p-3 pl-5 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 font-semibold text-slate-800">${p.name}</td>
            <td class="p-3">
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${gradeColor(p.grade, p.type)}">
                    ${p.grade}
                </span>
            </td>
            <td class="p-3 font-mono text-slate-600 text-[11px]">${p.password}</td>`;
        tbody.appendChild(tr);
    });
}

function exportBelumVoteExcel() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }

    const filterGrade = getEl('belumVoteFilterClass')?.value || '';
    const query       = (getEl('belumVoteSearch')?.value || '').toLowerCase().trim();

    const belumSiswa = students
        .filter(s => !s.hasVoted && (!filterGrade || s.grade === filterGrade) && (!query || s.name.toLowerCase().includes(query)))
        .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));

    const belumGuru = filterGrade ? [] : teachers
        .filter(t => !t.hasVoted && (!query || t.name.toLowerCase().includes(query)))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (!belumSiswa.length && !belumGuru.length) {
        showAlertModal('Kosong', 'Tidak ada data untuk diekspor.', 'info'); return;
    }

    const rows = [['No', 'Nama', 'Kelas / Kategori', 'Password']];
    belumSiswa.forEach((s, i) => rows.push([i + 1, s.name, s.grade, s.password || '']));
    belumGuru.forEach((t, i)  => rows.push([belumSiswa.length + i + 1, t.name, t.role || 'Guru', t.password || '']));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Belum Vote');
    XLSX.writeFile(wb, `BelumVote_${filterGrade || 'Semua'}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showAlertModal('Ekspor Berhasil', `${belumSiswa.length + belumGuru.length} data diekspor.`, 'success');
}

function renderAuditLog(entries) {
    auditLogFiltered = entries;
    const tbody = getEl('auditLogTableBody');
    const countEl = getEl('auditLogCount');
    if (!tbody || !countEl) return;
    countEl.textContent = `${entries.length} entri`;

    if (!entries.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs italic">Belum ada data.</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    entries.forEach((log, idx) => {
        const dt = log.voted_at ? new Date(log.voted_at) : null;
        const waktu = dt ? dt.toLocaleString('id-ID', {
            day:'2-digit', month:'short', year:'numeric',
            hour:'2-digit', minute:'2-digit', second:'2-digit'
        }) : '—';

        // Selang-seling abu-putih
        const rowBg = idx % 2 === 0 ? '' : 'bg-slate-50';

        // Warna badge Kelas: berbeda tiap kelompok
        const gradeLabel = log.student_grade || '—';
        const isGuru = log.is_teacher || (gradeLabel.toLowerCase().includes('guru') || gradeLabel.toLowerCase().includes('staf') || !classes.some(c => gradeLabel.startsWith(c)));
        let gradeBadgeClass;
        if (isGuru) {
            gradeBadgeClass = 'bg-emerald-100 text-emerald-700';
        } else if (gradeLabel.includes('7')) {
            gradeBadgeClass = 'bg-blue-100 text-blue-700';
        } else if (gradeLabel.includes('8')) {
            gradeBadgeClass = 'bg-violet-100 text-violet-700';
        } else if (gradeLabel.includes('9')) {
            gradeBadgeClass = 'bg-rose-100 text-rose-700';
        } else {
            gradeBadgeClass = 'bg-sky-100 text-sky-700';
        }

        const tr = document.createElement('tr');
        tr.className = `${rowBg} hover:bg-blue-50/40 transition`;
        tr.innerHTML = `
            <td class="p-3 pl-5 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 text-slate-500 whitespace-nowrap">${waktu}</td>
            <td class="p-3 font-semibold text-slate-800">${log.student_name || '—'}</td>
            <td class="p-3"><span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${gradeBadgeClass}">${gradeLabel}</span></td>
            <td class="p-3 font-semibold text-slate-700">${log.candidate_name || '—'}</td>
            <td class="p-3"><span class="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-lg">No. ${log.candidate_no ?? '—'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// === SECTION: 5. SUPABASE: STUDENTS ===
// ============================================================

async function syncStudentToSupabase(s) {
    if (!isSupabaseActive || !supabaseClient || !s) return;
    try { await supabaseClient.from('students').upsert({ id: s.id, name: s.name, grade: s.grade, password: s.password || '', has_voted: s.hasVoted, voted_for: s.votedFor }); }
    catch(e) { console.error('syncStudent:', e); }
}

async function syncMultipleStudentsToSupabase(list) {
    if (!isSupabaseActive || !supabaseClient || !list?.length) return;
    try { await supabaseClient.from('students').upsert(list.map(s => ({ id: s.id, name: s.name, grade: s.grade, password: s.password || '', has_voted: s.hasVoted, voted_for: s.votedFor }))); }
    catch(e) { console.error('syncMultipleStudents:', e); }
}

async function deleteStudentFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().eq('id', id); } catch(e) {}
}

async function deleteStudentsByGradeFromSupabase(grade) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().eq('grade', grade); } catch(e) {}
}

async function deleteAllStudentsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().neq('id', '___none___'); } catch(e) {}
}

async function resetAllStudentVotesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').update({ has_voted: false, voted_for: null }).neq('id', '___none___'); } catch(e) {}
}

// ============================================================
// === SECTION: 6. SUPABASE: CANDIDATES ===
// ============================================================

async function uploadCandidateImageToStorage(file, candidateId) {
    if (!isSupabaseActive || !supabaseClient || !file) return null;
    try {
        const ext  = file.name.split('.').pop();
        const path = `${candidateId}.${ext}`;
        const { error } = await supabaseClient.storage.from('candidate-images').upload(path, file, { upsert: true, contentType: file.type });
        if (error) return null;
        const { data } = supabaseClient.storage.from('candidate-images').getPublicUrl(path);
        return data?.publicUrl || null;
    } catch(e) { return null; }
}

async function upsertCandidateToSupabase(c) {
    if (!isSupabaseActive || !supabaseClient || !c) return;
    try { await supabaseClient.from('candidates').upsert({ id: c.id, no: c.no, name: c.name, image: c.image, visi: c.visi, misi: c.misi, votes: c.votes, votes_by_class: c.votes_by_class }); }
    catch(e) { console.error('upsertCandidate:', e); }
}

async function deleteCandidateFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('candidates').delete().eq('id', id);
        await supabaseClient.storage.from('candidate-images').remove([`${id}.jpg`, `${id}.jpeg`, `${id}.png`, `${id}.webp`]);
    } catch(e) {}
}

async function resetCandidatesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { for (const c of candidates) { await supabaseClient.from('candidates').update({ votes: 0, votes_by_class: {} }).eq('id', c.id); } }
    catch(e) {}
}

// ============================================================
// === SECTION: 7. SUPABASE: VOTE LOGS ===
// ============================================================

async function loadAuditLogFromSupabase() {
    if (isSupabaseActive && supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('vote_logs').select('*').order('voted_at', { ascending: false });
            if (error) {
                console.error('loadAuditLog error:', error);
            } else if (data) {
                voteLogs = data.map(r => ({
                    id: r.id,
                    student_id: r.student_id,
                    student_name: r.student_name,
                    student_grade: r.student_grade,
                    candidate_id: r.candidate_id,
                    candidate_name: r.candidate_name,
                    candidate_no: r.candidate_no,
                    voted_at: r.voted_at
                }));
                saveVoteLogsLocal();
                recalculateDashboardStatsFromVoteLogs();
            }
        } catch(e) { console.error('loadAuditLog exception:', e); }
    }
    renderAuditLog(voteLogs);
    renderBelumMemilihTable();
    renderAdminDashboard();
}

async function clearVoteLogsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('vote_logs').delete().neq('id', '___none___'); } catch(e) {}
}

function filterAuditLog() {
    const qStudent   = (getEl('auditSearchStudent')?.value   || '').toLowerCase();
    const qCandidate = (getEl('auditSearchCandidate')?.value || '').toLowerCase();
    const qClass     = (getEl('auditFilterClass')?.value     || '');

    const filtered = voteLogs.filter(log => {
        const grade  = log.student_grade || '';
        const isGuru = log.is_teacher || (!classes.some(c => grade.startsWith(c)) && grade !== '');
        if (qClass === '__guru__' && !isGuru) return false;
        if (qClass && qClass !== '__guru__' && log.student_grade !== qClass) return false;
        if (qStudent   && !(log.student_name   || '').toLowerCase().includes(qStudent))   return false;
        if (qCandidate && !(log.candidate_name || '').toLowerCase().includes(qCandidate)) return false;
        return true;
    });
    renderAuditLog(filtered);
}

// ============================================================
// === SECTION: 9. ADMIN: KANDIDAT ===
// ============================================================

function openAddCandidateModal() {
    if (getEl('candidateFormId'))    getEl('candidateFormId').value    = '';
    if (getEl('formNo'))             getEl('formNo').value             = candidates.length + 1;
    if (getEl('formName'))           getEl('formName').value           = '';
    if (getEl('formVisi'))           getEl('formVisi').value           = '';
    if (getEl('formMisi'))           getEl('formMisi').value           = '';
    if (getEl('formImageFile'))      getEl('formImageFile').value      = '';
    if (getEl('formModalTitle'))     getEl('formModalTitle').innerText = 'Tambah Kandidat Baru';
    const m = getEl('candidateFormModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function editCandidate(id) {
    const c = candidates.find(c => c.id === id);
    if (!c) return;
    if (getEl('candidateFormId'))  getEl('candidateFormId').value    = c.id;
    if (getEl('formNo'))           getEl('formNo').value             = c.no;
    if (getEl('formName'))         getEl('formName').value           = c.name;
    if (getEl('formVisi'))         getEl('formVisi').value           = c.visi;
    if (getEl('formMisi'))         getEl('formMisi').value           = (Array.isArray(c.misi) ? c.misi : []).join('\n');
    if (getEl('formImageFile'))    getEl('formImageFile').value      = '';
    if (getEl('formModalTitle'))   getEl('formModalTitle').innerText = 'Edit Kandidat';
    const m = getEl('candidateFormModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function closeCandidateFormModal() {
    const m = getEl('candidateFormModal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

async function handleSaveCandidate(event) {
    event.preventDefault();
    const id        = getEl('candidateFormId')?.value || '';
    const no        = parseInt(getEl('formNo')?.value || '1');
    const name      = getEl('formName')?.value.trim() || '';
    const visi      = getEl('formVisi')?.value.trim() || '';
    const misiList  = (getEl('formMisi')?.value.trim() || '').split('\n').filter(m => m.trim());
    const imageFile = getEl('formImageFile')?.files[0];
    const candId    = id || ('c_' + Date.now());

    const btn = event.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }

    let imageUrl = imageFile && isSupabaseActive ? await uploadCandidateImageToStorage(imageFile, candId) : null;
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
        if (saved) { saved.no = no; saved.name = name; saved.visi = visi; saved.misi = misiList; if (imageUrl) saved.image = imageUrl; }
    } else {
        saved = { id: candId, no, name, image: imageUrl || `https://placehold.co/400x500/2563eb/fff?text=No.${no}`, visi, misi: misiList, votes: 0, votes_by_class: {} };
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
    if (!confirm('PERINGATAN: Reset semua suara dan status pemilih (siswa + guru)?')) return;
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
    // reset local vote log and recalc from empty logs
    voteLogs = [];
    saveVoteLogsLocal();
    recalculateDashboardStatsFromVoteLogs();
    renderAdminDashboard();
    showAlertModal('Berhasil Reset', 'Semua suara dan status pemilihan telah direset.', 'info');
}

// ============================================================
// === SECTION: 10 (lanjutan). ADMIN: SISWA ===
// ============================================================

function handleAddStudent(e) {
    e.preventDefault();
    const grade    = buildFullGrade();
    const nameEl   = getEl('newStudentNameInput');
    const passEl   = getEl('newStudentPasswordInput');
    if (!grade || !nameEl || !passEl) return;
    const name = nameEl.value.trim();
    const password = passEl.value.trim();
    if (!name || !password) return;

    const ns = { id: `std_${Date.now()}_${Math.random().toString(36).substr(2,4)}`, name, grade, password, hasVoted: false, votedFor: null };
    students.push(ns);
    saveStudentsLocal(); syncStudentToSupabase(ns);
    nameEl.value = ''; passEl.value = '';
    renderAdminStudentManager(); renderAdminDashboard(); updateTabCounts();
}

function editStudentName(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    const n = prompt('Edit Nama Siswa:', s.name);
    if (n?.trim()) { s.name = n.trim(); saveStudentsLocal(); syncStudentToSupabase(s); renderAdminStudentManager(); showAlertModal('Berhasil', 'Nama siswa diperbarui.', 'success'); }
}

function editStudentPassword(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    const p = prompt('Edit Password Siswa:', s.password || '');
    if (p !== null && p.trim()) { s.password = p.trim(); saveStudentsLocal(); syncStudentToSupabase(s); renderAdminStudentManager(); showAlertModal('Berhasil', 'Password diperbarui.', 'success'); }
}

function deleteSingleStudent(id) {
    students = students.filter(s => s.id !== id);
    saveStudentsLocal(); deleteStudentFromSupabase(id);
    renderAdminStudentManager(); renderAdminDashboard(); updateTabCounts();
}

function resetSingleStudentVote(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    s.hasVoted = false; s.votedFor = null;
    saveStudentsLocal(); syncStudentToSupabase(s);
    renderAdminStudentManager();
}

function clearStudentsOfActiveGrade() {
    const grade = buildFullGrade();
    const isSubClass = grade !== getEl('adminStudentGradeSelect')?.value;
    const label = grade;
    if (!grade || !confirm(`Kosongkan semua siswa di ${label}?`)) return;
    if (isSubClass) {
        students = students.filter(s => s.grade !== grade);
        deleteStudentsByGradeFromSupabase(grade);
    } else {
        // Hapus semua sub kelas dalam kelas ini juga
        students = students.filter(s => getParentGrade(s.grade) !== grade);
        deleteStudentsByGradeFromSupabase(grade);
    }
    saveStudentsLocal();
    renderAdminStudentManager(); renderAdminDashboard(); updateTabCounts();
    showAlertModal('Berhasil', `Semua siswa di ${label} dihapus.`, 'info');
}

function clearAllStudentsAllGrades() {
    if (!confirm('Hapus SEMUA data siswa dari semua kelas?')) return;
    students = [];
    saveStudentsLocal(); deleteAllStudentsFromSupabase();
    renderAdminStudentManager(); renderAdminDashboard(); updateTabCounts();
    showAlertModal('Terhapus', 'Semua data siswa dihapus.', 'info');
}

function autoFillClassStudents() {
    const grade = buildFullGrade();
    if (!grade) return;
    const cur = students.filter(s => s.grade === grade).length;
    const batch = [];
    for (let i = 1; i <= 30; i++) {
        const ns = { id: `std_${Date.now()}_${i}_${Math.random().toString(36).substr(2,3)}`, name: `Siswa ${cur + i} ${grade}`, grade, password: `siswa${cur + i}`, hasVoted: false, votedFor: null };
        students.push(ns); batch.push(ns);
    }
    saveStudentsLocal(); syncMultipleStudentsToSupabase(batch);
    renderAdminStudentManager(); renderAdminDashboard(); updateTabCounts();
    showAlertModal('Berhasil', `30 siswa baru ditambahkan ke ${grade}.`, 'success');
}

function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const baseGrade = getEl('adminStudentGradeSelect')?.value || '';
    const subInput  = (getEl('adminStudentSubClassInput')?.value || '').trim().toUpperCase();
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (!rows?.length) { showAlertModal('File Kosong', 'Tidak ada data dalam file.', 'info'); return; }

            let nameCol = 0, passCol = -1, subCol = -1;
            if (Array.isArray(rows[0])) {
                const fi = (kws) => rows[0].findIndex(c => c && kws.some(k => c.toString().toLowerCase().includes(k)));
                const fn = fi(['nama','name']); const fp = fi(['password','pass','sandi']);
                const fs = fi(['sub','kelas sub','sub kelas','subkelas']);
                if (fn !== -1) nameCol = fn;
                if (fp !== -1) passCol = fp;
                if (fs !== -1) subCol  = fs;
            }
            const startRow = rows[0]?.[nameCol]?.toString().toLowerCase().match(/nama|name/) ? 1 : 0;
            const batch = [];
            for (let i = startRow; i < rows.length; i++) {
                const row  = rows[i];
                const name = row?.[nameCol]?.toString().trim();
                if (!name) continue;
                const pass   = passCol !== -1 ? row[passCol]?.toString().trim() : `pass${i}`;
                // Sub kelas: dari kolom file atau dari input, atau dari dropdown
                const fileSub = subCol !== -1 ? (row[subCol]?.toString().trim().toUpperCase() || '') : '';
                const sub     = fileSub || subInput || '';
                const grade   = sub ? baseGrade + sub : baseGrade;
                const ns = { id: `std_${Date.now()}_${i}_${Math.random().toString(36).substr(2,3)}`, name, grade, password: pass || `pass${i}`, hasVoted: false, votedFor: null };
                students.push(ns); batch.push(ns);
            }
            saveStudentsLocal(); syncMultipleStudentsToSupabase(batch);
            renderAdminStudentManager(); renderAdminDashboard(); updateTabCounts();
            showAlertModal('Import Berhasil', `${batch.length} siswa ditambahkan.`, 'success');
        } catch(err) {
            showAlertModal('Gagal Import', 'Format file tidak valid. Gunakan .xlsx atau .csv.', 'info');
        } finally { event.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
}

// ============================================================
// === SECTION: 11 (lanjutan). ADMIN: KELAS ===
// ============================================================

function handleAddClass(e) {
    e.preventDefault();
    const inp = getEl('newClassNameInput');
    if (!inp) return;
    const name = inp.value.trim();
    if (!name || classes.includes(name)) return;
    classes.push(name);
    saveClassesLocal();
    inp.value = '';
    renderClassList();
}

function deleteClass(name) {
    if (classes.length <= 1) { showAlertModal('Tidak Bisa', 'Minimal harus ada 1 kelas.', 'info'); return; }
    classes = classes.filter(g => g !== name);
    saveClassesLocal();
    renderClassList();
}

function updateTabCounts() {
    const cSiswa = getEl('countTabSiswa');
    const cGuru  = getEl('countTabGuru');
    if (cSiswa) cSiswa.textContent = students.length;
    if (cGuru)  cGuru.textContent  = teachers.length;
}

// ============================================================
// === SECTION: 13. EXCEL: TEMPLATE & EKSPOR ===
// ============================================================

function downloadStudentTemplate() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['No', 'Nama', 'Password', 'Sub Kelas'],
        ['1', 'Budi Santoso', 'budi123', 'A'],
        ['2', 'Ani Rahayu', 'ani456', 'A'],
        ['3', 'Dedi Kurniawan', 'dedi789', 'B'],
        ['', '← Hapus baris contoh, isi data asli di sini', '', '← Opsional, kosongkan jika tidak ada sub kelas'],
    ]);
    ws['!cols'] = [{ wch:5 }, { wch:35 }, { wch:20 }, { wch:15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    XLSX.writeFile(wb, 'Template_DataSiswa_PEMIRA.xlsx');
}

function exportStudentsExcelAll() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    if (!students.length) { showAlertModal('Kosong', 'Belum ada data siswa.', 'info'); return; }
    const wb = XLSX.utils.book_new();
    classes.forEach(grade => {
        const kelasData = students.filter(s => s.grade === grade);
        const rows = [['No', 'Nama', 'Password', 'Status Suara']];
        kelasData.forEach((s, i) => rows.push([i + 1, s.name, s.password || '', s.hasVoted ? 'Sudah Memilih' : 'Belum Memilih']));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch:6 }, { wch:35 }, { wch:20 }, { wch:18 }];
        XLSX.utils.book_append_sheet(wb, ws, grade.replace('Kelas ', 'Kls'));
    });
    XLSX.writeFile(wb, `DataSiswa_SemuaKelas_${new Date().toISOString().slice(0,10)}.xlsx`);
    showAlertModal('Ekspor Berhasil', `${students.length} siswa dari semua kelas diekspor.`, 'success');
}

function exportStudentsExcelCurrentGrade() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    const grade = getEl('adminStudentGradeSelect')?.value;
    if (!grade) return;
    const kelasData = students.filter(s => s.grade === grade);
    if (!kelasData.length) { showAlertModal('Kosong', `Belum ada siswa di ${grade}.`, 'info'); return; }
    const rows = [['No', 'Nama', 'Password', 'Status Suara']];
    kelasData.forEach((s, i) => rows.push([i + 1, s.name, s.password || '', s.hasVoted ? 'Sudah Memilih' : 'Belum Memilih']));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch:6 }, { wch:35 }, { wch:20 }, { wch:18 }];
    XLSX.utils.book_append_sheet(wb, ws, grade.replace('Kelas ', 'Kls'));
    XLSX.writeFile(wb, `DataSiswa_${grade.replace(' ','')}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showAlertModal('Ekspor Berhasil', `${kelasData.length} siswa di ${grade} diekspor.`, 'success');
}

// Supabase teacher sync functions
async function syncTeacherToSupabase(t) {
    if (!isSupabaseActive || !supabaseClient || !t) return;
    try { await supabaseClient.from('teachers').upsert({ id: t.id, name: t.name, password: t.password || '', role: t.role || 'Guru', has_voted: t.hasVoted, voted_for: t.votedFor }); }
    catch(e) { console.error('syncTeacher:', e); }
}

async function syncMultipleTeachersToSupabase(list) {
    if (!isSupabaseActive || !supabaseClient || !list?.length) return;
    try { await supabaseClient.from('teachers').upsert(list.map(t => ({ id: t.id, name: t.name, password: t.password || '', role: t.role || 'Guru', has_voted: t.hasVoted, voted_for: t.votedFor }))); }
    catch(e) { console.error('syncMultipleTeachers:', e); }
}

async function deleteTeacherFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('teachers').delete().eq('id', id); } catch(e) {}
}

async function deleteAllTeachersFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('teachers').delete().neq('id', '___none___'); } catch(e) {}
}

async function resetAllTeacherVotesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('teachers').update({ has_voted: false, voted_for: null }).neq('id', '___none___'); } catch(e) {}
}

function renderAdminTeacherManager() {
    const query = (getEl('adminTeacherSearchInput')?.value || '').toLowerCase().trim();
    const data  = query ? teachers.filter(t => t.name.toLowerCase().includes(query)) : teachers;
    renderTeacherRows(data);
}

function filterAdminTeacherTable() {
    renderAdminTeacherManager();
}

function renderTeacherRows(data) {
    const tbody = getEl('adminTeacherTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">${teachers.length ? 'Tidak ada guru yang cocok.' : 'Belum ada guru / staf. Tambah manual atau impor Excel.'}</td></tr>`;
        return;
    }
    data.forEach((t, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2.5 pl-4 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-2.5 font-bold text-slate-800">${t.name}</td>
            <td class="p-2.5">
                <span class="font-mono text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">${t.password || '—'}</span>
                <button onclick="editTeacherPassword('${t.id}')" class="ml-1 text-sky-500 hover:text-sky-700 text-[10px]">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
            <td class="p-2.5">
                ${t.hasVoted
                    ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold text-[10px]">Sudah Memilih</span>'
                    : '<span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold text-[10px]">Belum Memilih</span>'}
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

// ============================================================
// === SECTION: 14. UI HELPERS ===
// ============================================================

function showAlertModal(title, message, type = 'info') {
    const icon = getEl('alertIcon');
    const titleEl = getEl('alertTitle');
    const messageEl = getEl('alertMessage');
    const modal = getEl('alertModal');
    if (!icon || !titleEl || !messageEl || !modal) return;

    titleEl.innerText = title;
    messageEl.innerText = message;
    if (type === 'success') {
        icon.className = "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-emerald-100 text-emerald-600";
        icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
        icon.className = "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl bg-blue-100 text-blue-600";
        icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    }
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function closeAlertModal() {
    const modal = getEl('alertModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ============================================================
// === SECTION: GURU / STAF — State & Load ===
// ============================================================

async function loadTeachers() {
    const stored = localStorage.getItem('pemira_teachers');
    try { teachers = stored ? JSON.parse(stored) : []; } catch(e) { teachers = []; }

    if (isSupabaseActive && supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('teachers').select('*').order('name', { ascending: true });
            if (data?.length) {
                teachers = data.map(t => ({
                    id:       t.id,
                    name:     t.name,
                    password: t.password || '',
                    role:     t.role || 'Guru',
                    hasVoted: t.has_voted || false,
                    votedFor: t.voted_for || null
                }));
                saveTeachersLocal();
            }
        } catch(e) { console.log('Supabase teachers unavailable.'); }
    }
}

function saveTeachersLocal() {
    localStorage.setItem('pemira_teachers', JSON.stringify(teachers));
}

function switchVoterTab(tab) {
    currentVoterTab = tab;
    const btnSiswa = getEl('tabSiswaBtn');
    const btnGuru  = getEl('tabGuruBtn');
    const panelS   = getEl('panelSiswa');
    const panelG   = getEl('panelGuru');
    if (!btnSiswa || !btnGuru || !panelS || !panelG) return;

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

function handleAddTeacher(e) {
    e.preventDefault();
    const nameInput = getEl('newTeacherNameInput');
    const passInput = getEl('newTeacherPasswordInput');
    if (!nameInput || !passInput) return;
    const name     = nameInput.value.trim();
    const password = passInput.value.trim();
    if (!name || !password) return;

    const nt = {
        id: `tch_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
        name, password, role: 'Guru', hasVoted: false, votedFor: null
    };
    teachers.push(nt);
    saveTeachersLocal();
    syncTeacherToSupabase(nt);
    nameInput.value = ''; passInput.value = '';
    renderAdminTeacherManager(); updateTabCounts(); renderAdminDashboard();
    showAlertModal('Berhasil', `Guru "${name}" ditambahkan.`, 'success');
}

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

            const fi       = (kws) => rows[0].findIndex(c => c && kws.some(k => c.toString().toLowerCase().includes(k)));
            const nameCol  = fi(['nama','name']);
            const passCol  = fi(['password','pass','sandi']);
            const startRow = (nameCol !== -1 && rows[0]?.[nameCol]?.toString().toLowerCase().match(/nama|name/)) ? 1 : 0;

            const batch = [];
            for (let i = startRow; i < rows.length; i++) {
                const row  = rows[i];
                const name = nameCol !== -1 ? row[nameCol]?.toString().trim() : row[0]?.toString().trim();
                const pass = passCol !== -1 ? row[passCol]?.toString().trim() : row[1]?.toString().trim();
                if (!name) continue;
                const nt = { id: `tch_${Date.now()}_${i}_${Math.random().toString(36).substr(2,3)}`, name, password: pass || `pass${i}`, role: 'Guru', hasVoted: false, votedFor: null };
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

function downloadTeacherTemplate() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['No', 'Nama', 'Password'],
        ['1', 'Budi Santoso, S.Pd.', 'pass123'],
        ['2', 'Siti Rahmawati, M.Pd.', 'pass456'],
        ['', '← Hapus baris contoh, isi data asli di sini'],
    ]);
    ws['!cols'] = [{ wch:6 }, { wch:35 }, { wch:20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Guru');
    XLSX.writeFile(wb, 'Template_DataGuru_PEMIRA.xlsx');
}

function exportTeachersExcel() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    if (!teachers.length) { showAlertModal('Kosong', 'Belum ada data guru.', 'info'); return; }
    const rows = [['No', 'Nama', 'Password', 'Status Suara']];
    teachers.forEach((t, i) => rows.push([i + 1, t.name, t.password || '', t.hasVoted ? 'Sudah Memilih' : 'Belum Memilih']));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch:6 }, { wch:35 }, { wch:20 }, { wch:18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Guru');
    XLSX.writeFile(wb, `DataGuru_PEMIRA_${new Date().toISOString().slice(0,10)}.xlsx`);
    showAlertModal('Ekspor Berhasil', `${teachers.length} guru diekspor.`, 'success');
}

function editTeacherName(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    const n = prompt('Edit Nama Guru:', t.name);
    if (n?.trim()) {
        t.name = n.trim();
        saveTeachersLocal(); syncTeacherToSupabase(t);
        renderAdminTeacherManager();
        showAlertModal('Berhasil', 'Nama guru diperbarui.', 'success');
    }
}

function editTeacherPassword(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    const p = prompt('Edit Password Guru:', t.password || '');
    if (p !== null && p.trim()) {
        t.password = p.trim();
        saveTeachersLocal(); syncTeacherToSupabase(t);
        renderAdminTeacherManager();
        showAlertModal('Berhasil', 'Password guru diperbarui.', 'success');
    }
}

function deleteSingleTeacher(id) {
    teachers = teachers.filter(t => t.id !== id);
    saveTeachersLocal(); deleteTeacherFromSupabase(id);
    renderAdminTeacherManager(); updateTabCounts(); renderAdminDashboard();
}

function resetSingleTeacherVote(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    t.hasVoted = false; t.votedFor = null;
    saveTeachersLocal(); syncTeacherToSupabase(t);
    renderAdminTeacherManager();
}

function clearAllTeachers() {
    if (!confirm('Hapus SEMUA data guru / staf?')) return;
    teachers = [];
    saveTeachersLocal(); deleteAllTeachersFromSupabase();
    renderAdminTeacherManager(); updateTabCounts(); renderAdminDashboard();
    showAlertModal('Terhapus', 'Semua data guru telah dihapus.', 'info');
}
