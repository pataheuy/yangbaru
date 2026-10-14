// ============================================================
//  admin/app.js â€” Logic Panel Admin PEMIRA BEM SMP
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

// >> Supabase credentials & admin password â€” hardcoded langsung
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

// >> Multi-periode
let periods          = [];
let currentPeriodId  = null;

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

// >> loadConfig tidak dipakai lagi â€” semua nilai hardcoded di atas
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
    const passInput  = getEl('adminPasswordInput');
    const loginError = getEl('loginError');
    if (!passInput || !loginError) return;

    const pass = passInput.value;

    // Kalau yang diketik adalah password belum vote -- jangan proses sebagai login
    if (pass === 'belumvote') {
        passInput.value = '';
        loginError.classList.add('hidden');
        return;
    }

    // Tutup panel belum vote sebelum proses login
    closeLoginBelumVotePanel();

    if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('pemira_admin_auth', '1');
        loginError.classList.add('hidden');
        passInput.value = '';
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

    // Timpa dengan data Supabase jika aktif - filter per periode
    if (isSupabaseActive && supabaseClient && currentPeriodId) {
        try {
            const { data: cData } = await supabaseClient
                .from('candidates').select('*')
                .eq('period_id', currentPeriodId)
                .order('no', { ascending: true });
            if (cData) {
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
                .from('students').select('*')
                .eq('period_id', currentPeriodId)
                .order('name', { ascending: true });
            if (sData) {
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

            const { data: vData } = await supabaseClient
                .from('vote_logs').select('*')
                .eq('period_id', currentPeriodId)
                .order('voted_at', { ascending: false });
            if (vData) {
                voteLogs = vData.map(r => ({
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
        } catch(e) { console.log('Supabase unavailable - using local data.'); }
    } else {
        loadVoteLogsLocal();
    }

    recalculateDashboardStatsFromVoteLogs();
    await loadVoteTimeFromSupabase();
    recalculateDashboardStatsFromVoteLogs();
    await loadVoteTimeFromSupabase();
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
        await loadPeriods();
        await loadData();
        await loadTeachers();
        renderAdminDashboard();
    } catch(e) {
        console.error('showDashboard error:', e);
    }

    startVoterDataPolling();
    startRealtimeSubscription();
}

// >> Auto-refresh dashboard setiap 15 detik â€” ambil vote_logs terbaru dari Supabase
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
                const auditPanel = getEl('auditLogOverlay');
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
    stopVoterDataPolling();
    stopRealtimeSubscription();

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

// â”€â”€ Warna tetap per kelompok untuk grafik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Warna cerah: Kelas 7 = biru langit, Kelas 8 = hijau toska, Kelas 9 = oranye, Guru = hijau
const CLASS_COLOR_MAP = {
    '7': '#38bdf8',  // sky-400 â€” biru langit cerah
    '8': '#34d399',  // emerald-400 â€” hijau toska cerah
    '9': '#fb923c',  // orange-400 â€” oranye cerah
};
const CLASS_COLOR_FALLBACK = ['#a78bfa','#f472b6','#facc15','#4ade80','#60a5fa','#f87171'];
const GURU_BAR_COLOR = '#4ade80';  // green-400 â€” hijau cerah
const NOT_YET_COLOR  = '#e2e8f0';

function getClassBarColor(label, idx) {
    for (const [digit, color] of Object.entries(CLASS_COLOR_MAP)) {
        if (label.includes(digit)) return color;
    }
    if (label.toLowerCase().includes('guru') || label.toLowerCase().includes('staf')) return GURU_BAR_COLOR;
    return CLASS_COLOR_FALLBACK[idx % CLASS_COLOR_FALLBACK.length];
}

// Urutkan labels: kelas dari kecil ke besar (7â†’8â†’9), lalu guru di bawah
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

    // Hitung sudah memilih per kelas + guru â€” gunakan urutan kelas 7â†’8â†’9â†’guru
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
                            return ` ${lbl}: ${val} suara (${pct}% dari total) â€” ${classTotal} pemilih`;
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

    // Kelompok: tiap kelas + guru (urutan: 7â†’8â†’9â†’guru)
    const allGroups = getSortedGroupLabels();
    const classLabels = allGroups.filter(l => !l.toLowerCase().includes('guru') && !l.toLowerCase().includes('staf'));

    // Tiap group jadi 1 dataset (stacked), ambil suara per kandidat per kelas
    const datasets = allGroups.map(grp => {
        const isGuru = grp.toLowerCase().includes('guru') || grp.toLowerCase().includes('staf');
        return {
            label: grp,
            data: sorted.map(c => {
                if (isGuru) {
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
            onClick: (evt, elements) => {
                if (!elements.length) return;
                const el          = elements[0];
                const candidateIdx = el.index;
                const datasetIdx   = el.datasetIndex;
                const grpLabel     = allGroups[datasetIdx];
                const candidate    = sorted[candidateIdx];
                if (candidate && grpLabel) openVoterDrillModal(candidate, grpLabel);
            },
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
                        title: () => '',
                        label: (ctx) => {
                            const val = ctx.raw;
                            if (!val) return null;
                            return ` ${ctx.dataset.label}: ${val} suara (klik untuk detail)`;
                        },
                        footer: (items) => {
                            const c = sorted[items[0]?.dataIndex];
                            return `Total: ${c ? Number(c.votes) || 0 : 0} suara`;
                        }
                    }
                }
            }
        }
    });

    // Ubah cursor jadi pointer saat hover bar
    canvas.style.cursor = 'pointer';
}

// ============================================================
// === VOTER DRILL-DOWN MODAL ===
// ============================================================

function openVoterDrillModal(candidate, grpLabel) {
    const isGuru    = grpLabel.toLowerCase().includes('guru') || grpLabel.toLowerCase().includes('staf');
    const classLabels = getSortedGroupLabels().filter(l => !l.toLowerCase().includes('guru') && !l.toLowerCase().includes('staf'));

    // Ambil log yang sesuai kandidat & grup ini
    let filtered;
    if (isGuru) {
        // Suara guru = yang milih kandidat ini tapi bukan dari kelas siswa manapun
        const studentGrades = new Set(students.map(s => s.grade));
        filtered = voteLogs.filter(l =>
            l.candidate_id === candidate.id &&
            !classLabels.some(cls => (l.student_grade || '').startsWith(cls))
        );
    } else {
        filtered = voteLogs.filter(l =>
            l.candidate_id === candidate.id &&
            (l.student_grade || '').startsWith(grpLabel)
        );
    }

    // Warna badge sesuai grup
    const color = getClassBarColor(grpLabel, getSortedGroupLabels().indexOf(grpLabel));

    // Update modal header
    const titleEl   = getEl('drillModalTitle');
    const subtitleEl = getEl('drillModalSubtitle');
    const badgeEl   = getEl('drillModalBadge');
    const countEl   = getEl('drillModalCount');
    const tbodyEl   = getEl('drillModalTableBody');

    if (titleEl)    titleEl.textContent    = candidate.name;
    if (subtitleEl) subtitleEl.textContent = `No. ${candidate.no} â€” pemilih dari ${grpLabel}`;
    if (badgeEl) {
        badgeEl.textContent  = grpLabel;
        badgeEl.style.background = color;
        badgeEl.style.color      = '#fff';
    }
    if (countEl) countEl.textContent = `${filtered.length} suara`;

    if (tbodyEl) {
        tbodyEl.innerHTML = '';
        if (!filtered.length) {
            tbodyEl.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 text-xs italic">Belum ada suara dari ${grpLabel}</td></tr>`;
        } else {
            filtered
                .sort((a, b) => new Date(a.voted_at) - new Date(b.voted_at))
                .forEach((log, idx) => {
                    const dt = log.voted_at ? new Date(log.voted_at) : null;
                    const waktu = dt ? dt.toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) : 'â€”';
                    const tr = document.createElement('tr');
                    tr.className = idx % 2 === 0 ? '' : 'bg-slate-50';
                    tr.innerHTML = `
                        <td class="p-3 pl-4 font-bold text-slate-400 text-xs">${idx + 1}</td>
                        <td class="p-3 font-semibold text-slate-800 text-xs">${log.student_name || 'â€”'}</td>
                        <td class="p-3 text-slate-500 text-xs whitespace-nowrap">${waktu}</td>`;
                    tbodyEl.appendChild(tr);
                });
        }
    }

    // Tampilkan modal
    const modal = getEl('voterDrillModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeVoterDrillModal() {
    const modal = getEl('voterDrillModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ============================================================
// === SECTION: 10. ADMIN: SISWA ===
// ============================================================

function openStudentManageModal() {
    // Tampilkan password gate dulu
    const gateModal = getEl('voterGateModal');
    const inp       = getEl('voterGateInput');
    const err       = getEl('voterGateError');
    if (inp) inp.value = '';
    if (err) err.classList.add('hidden');
    if (gateModal) { gateModal.classList.remove('hidden'); gateModal.classList.add('flex'); setTimeout(() => inp?.focus(), 100); }
}

function closeVoterGateModal() {
    const m = getEl('voterGateModal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

const VOTER_GATE_PASSWORD = 'jujurdanintegritas';

function verifyVoterGate() {
    const inp = getEl('voterGateInput');
    const err = getEl('voterGateError');
    if (!inp) return;
    if (inp.value.trim() === VOTER_GATE_PASSWORD) {
        closeVoterGateModal();
        _openStudentManageModalDirect();
    } else {
        if (err) err.classList.remove('hidden');
        inp.value = '';
        setTimeout(() => inp.focus(), 50);
    }
}

function _openStudentManageModalDirect() {
    const sel = getEl('adminStudentGradeSelect');
    if (!sel) return;
    sel.innerHTML = classes.map(g => `<option value="${g}">${g}</option>`).join('');
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

    // Kalau sub kelas diisi â†’ filter exact, kalau kosong â†’ tampilkan semua sub kelas dalam kelas ini
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
                <span class="font-mono text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">${s.password || 'â€”'}</span>
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

    // Isi dropdown filter kelas audit log â€” "Semua", kelas-kelas, lalu "Guru / Staf"
    const sel = getEl('auditFilterClass');
    if (sel) {
        sel.innerHTML = '<option value="">â€” Semua â€”</option>';
        classes.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; sel.appendChild(o); });
        const oGuru = document.createElement('option');
        oGuru.value = '__guru__'; oGuru.textContent = 'Guru / Staf';
        sel.appendChild(oGuru);
    }

    // Isi dropdown filter kelas di tabel "belum memilih" dalam audit log
    const selBelum = getEl('belumMemilihFilterClass');
    if (selBelum) {
        selBelum.innerHTML = '<option value="">â€” Semua Kelas â€”</option>';
        classes.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; selBelum.appendChild(o); });
        const oGuru2 = document.createElement('option');
        oGuru2.value = '__guru__'; oGuru2.textContent = 'Guru / Staf';
        selBelum.appendChild(oGuru2);
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

    const filterVal   = getEl('belumMemilihFilterClass')?.value || '';
    const onlyGuru    = filterVal === '__guru__';
    const filterGrade = onlyGuru ? '' : filterVal;

    const belumSiswa = onlyGuru ? [] :
        students.filter(s => !s.hasVoted && (!filterGrade || s.grade === filterGrade));
    const belumGuru  = filterGrade ? [] : teachers.filter(t => !t.hasVoted);

    const semua = [
        ...belumSiswa.map(s => ({ name: s.name, grade: s.grade,          password: s.password || 'â€”', type: 'siswa' })),
        ...belumGuru.map(t  => ({ name: t.name, grade: t.role || 'Guru', password: '',               type: 'guru'  }))
    ].sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));

    if (countEl) countEl.textContent = `${semua.length} orang`;
    tbody.innerHTML = '';

    if (!semua.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-emerald-600 font-semibold text-xs">ðŸŽ‰ Semua sudah memilih!</td></tr>`;
        return;
    }

    semua.forEach((p, idx) => {
        const badgeCls = p.type === 'guru'
            ? 'bg-green-100 text-green-700'
            : p.grade.includes('7') ? 'bg-sky-100 text-sky-600'
            : p.grade.includes('8') ? 'bg-emerald-100 text-emerald-700'
            : p.grade.includes('9') ? 'bg-orange-100 text-orange-600'
            : 'bg-slate-100 text-slate-600';
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-amber-50/40 transition';
        tr.innerHTML = `
            <td class="p-3 pl-5 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 font-semibold text-slate-800">${p.name}</td>
            <td class="p-3">
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${badgeCls}">${p.grade}</span>
            </td>
            <td class="p-3 font-mono text-slate-600 text-[11px] bg-slate-50/50">${p.type === 'guru' ? 'â€”' : p.password}</td>`;
        tbody.appendChild(tr);
    });
}

// Panel belum vote â€” fullscreen overlay
function showBelumVotePanel() {
    const overlay = getEl('belumVoteOverlay');
    if (!overlay) return;

    const sel = getEl('belumVoteFilterClass');
    if (sel) {
        sel.innerHTML = '<option value="">â€” Semua â€”</option>';
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
        .map(s => ({ name: s.name, grade: s.grade, password: s.password || 'â€”', type: 'siswa' }));

    // Guru belum memilih â€” hanya tampil kalau bukan filter kelas spesifik
    const belumGuru = filterGrade ? [] : teachers
        .filter(t => !t.hasVoted && (!query || t.name.toLowerCase().includes(query)))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({ name: t.name, grade: t.role || 'Guru', password: '', type: 'guru' }));

    const semua = [...belumSiswa, ...belumGuru];

    if (countEl) countEl.textContent = `${semua.length} orang`;
    tbody.innerHTML = '';

    if (!semua.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-emerald-600 font-semibold text-sm">ðŸŽ‰ Semua sudah memilih!</td></tr>`;
        return;
    }

    const gradeColor = (grade, type) => {
        if (type === 'guru')      return 'bg-green-100 text-green-700';
        if (grade.includes('7')) return 'bg-sky-100 text-sky-600';
        if (grade.includes('8')) return 'bg-emerald-100 text-emerald-700';
        if (grade.includes('9')) return 'bg-orange-100 text-orange-600';
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
            <td class="p-3 font-mono text-slate-600 text-[11px]">${p.type === 'guru' ? 'â€”' : p.password}</td>`;
        tbody.appendChild(tr);
    });
}

function exportBelumVoteExcel() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }

    const filterVal   = getEl('belumVoteFilterClass')?.value || '';
    const query       = (getEl('belumVoteSearch')?.value || '').toLowerCase().trim();
    const onlyGuru    = filterVal === '__guru__';
    const filterGrade = onlyGuru ? '' : filterVal;

    // Siswa â€” skip semua kalau filter guru
    const belumSiswa = onlyGuru ? [] : students
        .filter(s => !s.hasVoted
            && (!filterGrade || s.grade === filterGrade)
            && (!query || s.name.toLowerCase().includes(query)))
        .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));

    // Guru â€” skip kalau filter kelas spesifik
    const belumGuru = filterGrade ? [] : teachers
        .filter(t => !t.hasVoted && (!query || t.name.toLowerCase().includes(query)))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (!belumSiswa.length && !belumGuru.length) {
        showAlertModal('Kosong', 'Tidak ada data untuk diekspor.', 'info'); return;
    }

    const rows = [['No', 'Nama', 'Kelas / Kategori', 'Password']];
    belumSiswa.forEach((s, i) => rows.push([i + 1, s.name, s.grade, s.password || '']));
    belumGuru.forEach((t, i)  => rows.push([belumSiswa.length + i + 1, t.name, t.role || 'Guru', '']));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Belum Vote');
    const labelFile = onlyGuru ? 'Guru' : (filterGrade || 'Semua');
    XLSX.writeFile(wb, `BelumVote_${labelFile}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showAlertModal('Ekspor Berhasil', `${belumSiswa.length + belumGuru.length} data diekspor (${onlyGuru ? 'Guru / Staf' : filterGrade || 'Semua'}).`, 'success');
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
        }) : 'â€”';

        // Selang-seling abu-putih
        const rowBg = idx % 2 === 0 ? '' : 'bg-slate-50';

        // Warna badge Kelas: berbeda tiap kelompok
        const gradeLabel = log.student_grade || 'â€”';
        const isGuru = log.is_teacher || (gradeLabel.toLowerCase().includes('guru') || gradeLabel.toLowerCase().includes('staf') || !classes.some(c => gradeLabel.startsWith(c)));
        let gradeBadgeClass;
        if (isGuru) {
            gradeBadgeClass = 'bg-green-100 text-green-700';
        } else if (gradeLabel.includes('7')) {
            gradeBadgeClass = 'bg-sky-100 text-sky-600';
        } else if (gradeLabel.includes('8')) {
            gradeBadgeClass = 'bg-emerald-100 text-emerald-700';
        } else if (gradeLabel.includes('9')) {
            gradeBadgeClass = 'bg-orange-100 text-orange-600';
        } else {
            gradeBadgeClass = 'bg-slate-100 text-slate-600';
        }

        const tr = document.createElement('tr');
        tr.className = `${rowBg} hover:bg-blue-50/40 transition`;
        tr.innerHTML = `
            <td class="p-3 pl-5 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 text-slate-500 whitespace-nowrap">${waktu}</td>
            <td class="p-3 font-semibold text-slate-800">${log.student_name || 'â€”'}</td>
            <td class="p-3"><span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${gradeBadgeClass}">${gradeLabel}</span></td>
            <td class="p-3 font-semibold text-slate-700">${log.candidate_name || 'â€”'}</td>
            <td class="p-3"><span class="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-lg">No. ${log.candidate_no ?? 'â€”'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// === SECTION: 5. SUPABASE: STUDENTS ===
// ============================================================

async function syncStudentToSupabase(s) {
    if (!isSupabaseActive || !supabaseClient || !s) return;
    try { await supabaseClient.from('students').upsert({ id: s.id, name: s.name, grade: s.grade, password: s.password || '', has_voted: s.hasVoted, voted_for: s.votedFor, period_id: currentPeriodId }); }
    catch(e) { console.error('syncStudent:', e); }
}

async function syncMultipleStudentsToSupabase(list) {
    if (!isSupabaseActive || !supabaseClient || !list?.length) return;
    try { await supabaseClient.from('students').upsert(list.map(s => ({ id: s.id, name: s.name, grade: s.grade, password: s.password || '', has_voted: s.hasVoted, voted_for: s.votedFor, period_id: currentPeriodId }))); }
    catch(e) { console.error('syncMultipleStudents:', e); }
}

async function deleteStudentFromSupabase(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().eq('id', id); } catch(e) {}
}

async function deleteStudentsByGradeFromSupabase(grade) {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().eq('grade', grade).eq('period_id', currentPeriodId); } catch(e) {}
}

async function deleteAllStudentsFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').delete().eq('period_id', currentPeriodId); } catch(e) {}
}

async function resetAllStudentVotesInSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try { await supabaseClient.from('students').update({ has_voted: false, voted_for: null }).eq('period_id', currentPeriodId); } catch(e) {}
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
    try { await supabaseClient.from('candidates').upsert({ id: c.id, no: c.no, name: c.name, image: c.image, visi: c.visi, misi: c.misi, votes: c.votes, votes_by_class: c.votes_by_class, period_id: currentPeriodId }); }
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
    try { for (const c of candidates) { await supabaseClient.from('candidates').update({ votes: 0, votes_by_class: {} }).eq('id', c.id).eq('period_id', currentPeriodId); } }
    catch(e) {}
}

// ============================================================
// === SECTION: 7. SUPABASE: VOTE LOGS ===
// ============================================================

async function loadAuditLogFromSupabase() {
    if (isSupabaseActive && supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('vote_logs').select('*').eq('period_id', currentPeriodId).order('voted_at', { ascending: false });
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
    try { await supabaseClient.from('vote_logs').delete().eq('period_id', currentPeriodId); } catch(e) {}
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
        ['', 'â† Hapus baris contoh, isi data asli di sini', '', 'â† Opsional, kosongkan jika tidak ada sub kelas'],
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
        // Ambil semua siswa termasuk sub kelas (Kelas 7A, 7B, dll)
        const kelasData = students.filter(s => getParentGrade(s.grade) === grade);
        const rows = [['No', 'Nama', 'Kelas', 'Password', 'Status Suara']];
        kelasData.forEach((s, i) => rows.push([i + 1, s.name, s.grade, s.password || '', s.hasVoted ? 'Sudah Memilih' : 'Belum Memilih']));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch:6 }, { wch:35 }, { wch:12 }, { wch:20 }, { wch:18 }];
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
    try { await supabaseClient.from('teachers').upsert({ id: t.id, name: t.name, password: t.password || '', role: t.role || 'Guru', has_voted: t.hasVoted, voted_for: t.votedFor, period_id: currentPeriodId }); }
    catch(e) { console.error('syncTeacher:', e); }
}

async function syncMultipleTeachersToSupabase(list) {
    if (!isSupabaseActive || !supabaseClient || !list?.length) return;
    try { await supabaseClient.from('teachers').upsert(list.map(t => ({ id: t.id, name: t.name, password: t.password || '', role: t.role || 'Guru', has_voted: t.hasVoted, voted_for: t.votedFor, period_id: currentPeriodId }))); }
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
// === SECTION: GURU / STAF â€” State & Load ===
// ============================================================

async function loadTeachers() {
    const stored = localStorage.getItem('pemira_teachers');
    try { teachers = stored ? JSON.parse(stored) : []; } catch(e) { teachers = []; }

    if (isSupabaseActive && supabaseClient && currentPeriodId) {
        try {
            const { data } = await supabaseClient
                .from('teachers').select('*')
                .eq('period_id', currentPeriodId)
                .order('name', { ascending: true });
            if (data) {
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
        ['No', 'Nama'],
        ['1', 'Budi Santoso, S.Pd.'],
        ['2', 'Siti Rahmawati, M.Pd.'],
        ['', 'â† Hapus baris contoh, isi data asli di sini'],
    ]);
    ws['!cols'] = [{ wch:6 }, { wch:35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Guru');
    XLSX.writeFile(wb, 'Template_DataGuru_PEMIRA.xlsx');
}

function exportTeachersExcel() {
    if (!window.XLSX) { showAlertModal('Error', 'SheetJS belum dimuat.', 'info'); return; }
    if (!teachers.length) { showAlertModal('Kosong', 'Belum ada data guru.', 'info'); return; }
    const rows = [['No', 'Nama', 'Status Suara']];
    teachers.forEach((t, i) => rows.push([i + 1, t.name, t.hasVoted ? 'Sudah Memilih' : 'Belum Memilih']));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch:6 }, { wch:35 }, { wch:18 }];
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

// ============================================================
// === LOGIN PAGE: QUICK BELUM VOTE PANEL ===
// ============================================================

function onLoginPasswordInput() {
    const inp = getEl('adminPasswordInput');
    const panel = getEl('loginBelumVotePanel');
    if (!panel || !inp) return;

    // Hanya tampilkan kalau password yang diketik adalah 'belumvote'
    if (inp.value === 'belumvote') {
        const needsLoad = !students.length && !teachers.length;
        if (needsLoad) {
            initSupabaseClient();
            loadData().then(() => loadTeachers()).then(() => {
                populateLoginBelumVoteFilter();
                renderLoginBelumVote();
            });
        } else {
            populateLoginBelumVoteFilter();
            renderLoginBelumVote();
        }
        panel.classList.remove('hidden'); panel.classList.add('flex');
    } else {
        // Sembunyikan kalau password salah atau belum lengkap
        panel.classList.add('hidden'); panel.classList.remove('flex');
    }
}

function populateLoginBelumVoteFilter() {
    const sel = getEl('loginBelumVoteFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="">â€” Semua â€”</option>';
    classes.forEach(g => {
        const o = document.createElement('option');
        o.value = g; o.textContent = g;
        sel.appendChild(o);
    });
    const oGuru = document.createElement('option');
    oGuru.value = '__guru__'; oGuru.textContent = 'Guru / Staf';
    sel.appendChild(oGuru);
}

function closeLoginBelumVotePanel() {
    const panel = getEl('loginBelumVotePanel');
    if (panel) { panel.classList.add('hidden'); panel.classList.remove('flex'); }
}

function renderLoginBelumVote() {
    const tbody   = getEl('loginBelumVoteBody');
    const countEl = getEl('loginBelumVoteCount');
    if (!tbody) return;

    const filterVal   = getEl('loginBelumVoteFilter')?.value || '';
    const onlyGuru    = filterVal === '__guru__';
    const filterGrade = onlyGuru ? '' : filterVal;

    const belumSiswa = onlyGuru ? [] : students
        .filter(s => !s.hasVoted && (!filterGrade || s.grade === filterGrade))
        .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name))
        .map(s => ({ name: s.name, grade: s.grade, password: s.password || 'â€”', type: 'siswa' }));

    const belumGuru = filterGrade ? [] : teachers
        .filter(t => !t.hasVoted)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({ name: t.name, grade: t.role || 'Guru', password: '', type: 'guru' }));

    const semua = [...belumSiswa, ...belumGuru];
    if (countEl) countEl.textContent = `${semua.length} orang belum vote`;

    tbody.innerHTML = '';
    if (!semua.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-emerald-600 font-semibold text-xs">ðŸŽ‰ Semua sudah memilih!</td></tr>`;
        return;
    }

    const gradeColor = (grade, type) => {
        if (type === 'guru')         return 'bg-green-100 text-green-700';
        if (grade.includes('7'))     return 'bg-sky-100 text-sky-600';
        if (grade.includes('8'))     return 'bg-emerald-100 text-emerald-700';
        if (grade.includes('9'))     return 'bg-orange-100 text-orange-600';
        return 'bg-slate-100 text-slate-600';
    };

    semua.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.className = idx % 2 === 0 ? '' : 'bg-slate-50';
        tr.innerHTML = `
            <td class="p-2.5 pl-4 font-bold text-slate-400">${idx + 1}</td>
            <td class="p-2.5 font-semibold text-slate-800">${p.name}</td>
            <td class="p-2.5">
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${gradeColor(p.grade, p.type)}">${p.grade}</span>
            </td>
            <td class="p-2.5 font-mono text-slate-500 text-[11px]">${p.type === 'guru' ? 'â€”' : p.password}</td>`;
        tbody.appendChild(tr);
    });
}

// ============================================================
// === WAKTU VOTE ===
// ============================================================

const CLOSE_TIME_KEY   = 'pemira_close_time';
const OPEN_TIME_KEY    = 'pemira_open_time';

function loadCloseTime()  { return localStorage.getItem(CLOSE_TIME_KEY) || ''; }
function loadOpenTime()   { return localStorage.getItem(OPEN_TIME_KEY)  || ''; }

function saveCloseTimeLocal(iso) {
    iso ? localStorage.setItem(CLOSE_TIME_KEY, iso) : localStorage.removeItem(CLOSE_TIME_KEY);
}
function saveOpenTimeLocal(iso) {
    iso ? localStorage.setItem(OPEN_TIME_KEY, iso) : localStorage.removeItem(OPEN_TIME_KEY);
}

function isPemiraClosed() {
    const ct = loadCloseTime();
    if (!ct) return false;
    return new Date() >= new Date(ct);
}
function isPemiraNotYetOpen() {
    const ot = loadOpenTime();
    if (!ot) return false;
    return new Date() < new Date(ot);
}

// Helper: format datetime-local value dari ISO string
function isoToDatetimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function openClosingTimeModal() {
    const modal    = getEl('closingTimeModal');
    const inpOpen  = getEl('openingTimeInput');
    const inpClose = getEl('closingTimeInput');
    const statusEl = getEl('closingTimeStatus');
    if (!modal) return;

    if (inpOpen)  inpOpen.value  = isoToDatetimeLocal(loadOpenTime());
    if (inpClose) inpClose.value = isoToDatetimeLocal(loadCloseTime());

    // Status
    if (statusEl) {
        const ot = loadOpenTime();
        const ct = loadCloseTime();
        if (!ot && !ct) {
            statusEl.className = 'mb-4 p-3 rounded-xl text-xs font-semibold text-center bg-slate-50 border border-slate-200 text-slate-500';
            statusEl.textContent = 'Belum diatur â€” voting buka terus';
        } else {
            const now = new Date();
            const fmt = iso => iso ? new Date(iso).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : 'â€”';
            let state, cls, icon;
            if (ct && now >= new Date(ct)) {
                state = 'Voting DITUTUP'; cls = 'bg-rose-50 border-rose-200 text-rose-600'; icon = 'fa-lock';
            } else if (ot && now < new Date(ot)) {
                state = 'Voting BELUM MULAI'; cls = 'bg-amber-50 border-amber-200 text-amber-700'; icon = 'fa-hourglass-start';
            } else {
                state = 'Voting BERLANGSUNG'; cls = 'bg-emerald-50 border-emerald-200 text-emerald-700'; icon = 'fa-check-circle';
            }
            statusEl.className = `mb-4 p-3 rounded-xl text-xs font-semibold text-center ${cls} border`;
            statusEl.innerHTML = `<i class="fa-solid ${icon} mr-1"></i> ${state}<br>
                <span class="font-normal">Mulai: <strong>${fmt(ot)}</strong> &nbsp;|&nbsp; Tutup: <strong>${fmt(ct)}</strong></span>`;
        }
    }

    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function closeClosingTimeModal() {
    const modal = getEl('closingTimeModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function saveVoteTime() {
    const inpOpen  = getEl('openingTimeInput');
    const inpClose = getEl('closingTimeInput');
    const valOpen  = inpOpen?.value  || '';
    const valClose = inpClose?.value || '';

    if (valOpen && valClose && new Date(valOpen) >= new Date(valClose)) {
        showAlertModal('Peringatan', 'Waktu mulai harus sebelum waktu tutup.', 'info');
        return;
    }

    saveOpenTimeLocal(valOpen  ? new Date(valOpen).toISOString()  : '');
    saveCloseTimeLocal(valClose ? new Date(valClose).toISOString() : '');
    await syncVoteTimeToSupabase();
    closeClosingTimeModal();

    const fmt = iso => iso ? new Date(iso).toLocaleString('id-ID', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' }) : 'tidak diatur';
    showAlertModal('Tersimpan', `Mulai: <strong>${fmt(valOpen ? new Date(valOpen).toISOString() : '')}</strong><br>Tutup: <strong>${fmt(valClose ? new Date(valClose).toISOString() : '')}</strong>`, 'success');
}

// Tetap ada agar tombol "Simpan Waktu Tutup" lama tidak error
function saveClosingTime() { saveVoteTime(); }

function clearClosingTime() {
    saveOpenTimeLocal('');
    saveCloseTimeLocal('');
    syncVoteTimeToSupabase();
    closeClosingTimeModal();
    showAlertModal('Dihapus', 'Waktu vote dihapus. Voting tidak memiliki batas waktu.', 'info');
}

// ── Sync waktu vote ke Supabase settings ─────────────────────────────────────
async function syncVoteTimeToSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        await supabaseClient.from('settings').upsert([
            { key: 'pemira_open_time',  value: loadOpenTime()  || '', period_id: currentPeriodId },
            { key: 'pemira_close_time', value: loadCloseTime() || '', period_id: currentPeriodId },
        ]);
    } catch(e) { console.error('syncVoteTime error:', e); }
}

// ── Load waktu vote dari Supabase (dipanggil saat loadData) ──────────────────
async function loadVoteTimeFromSupabase() {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('key, value')
            .in('key', ['pemira_open_time', 'pemira_close_time']);
        if (error || !data) return;
        data.forEach(row => {
            if (row.key === 'pemira_open_time') {
                row.value ? localStorage.setItem(OPEN_TIME_KEY, row.value) : localStorage.removeItem(OPEN_TIME_KEY);
            }
            if (row.key === 'pemira_close_time') {
                row.value ? localStorage.setItem(CLOSE_TIME_KEY, row.value) : localStorage.removeItem(CLOSE_TIME_KEY);
            }
        });
    } catch(e) { console.error('loadVoteTime error:', e); }
}

// ============================================================
// === REALTIME & POLLING â€” Data Pemilih, Belum Vote, Audit Log ===
// ============================================================

let voterDataPollInterval  = null;
let realtimeChannel        = null;

// â”€â”€ Fungsi inti: tarik data terbaru dari Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function refreshVoterData() {
    if (!isSupabaseActive || !supabaseClient) return;
    if (refreshVoterData._running) return;
    refreshVoterData._running = true;
    try {
        // 1. students
        const { data: sData } = await supabaseClient
            .from('students').select('*').order('name', { ascending: true });
        if (sData) {
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

        // 2. teachers
        const { data: tData } = await supabaseClient
            .from('teachers').select('*').order('name', { ascending: true });
        if (tData) {
            teachers = tData.map(t => ({
                id:       t.id,
                name:     t.name,
                password: t.password || '',
                role:     t.role || 'Guru',
                hasVoted: t.has_voted || false,
                votedFor: t.voted_for || null
            }));
            saveTeachersLocal();
        }

        // 3. vote_logs
        const { data: vData } = await supabaseClient
            .from('vote_logs').select('*').order('voted_at', { ascending: false });
        if (vData) {
            voteLogs = vData.map(r => ({
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

        recalculateDashboardStatsFromVoteLogs();
        _applyVoterDataToOpenPanels();

    } catch(e) { console.error('refreshVoterData error:', e); }
    finally { refreshVoterData._running = false; }
}

// â”€â”€ Terapkan data segar ke panel yang sedang terbuka â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _applyVoterDataToOpenPanels() {
    // Dashboard stat cards + charts (selalu)
    renderAdminDashboard();

    // Kelola siswa/guru â€” kalau modal terbuka
    const studentModal = getEl('studentManageModal');
    if (studentModal && !studentModal.classList.contains('hidden')) {
        renderAdminStudentManager();
        renderAdminTeacherManager();
        updateTabCounts();
    }

    // Belum Vote overlay
    const belumVoteOverlay = getEl('belumVoteOverlay');
    if (belumVoteOverlay && !belumVoteOverlay.classList.contains('hidden')) {
        renderBelumVotePanel();
    }

    // Audit Log overlay
    const auditOverlay = getEl('auditLogOverlay');
    if (auditOverlay && !auditOverlay.classList.contains('hidden')) {
        filterAuditLog();
    }
}

// â”€â”€ Mulai polling 5 detik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startVoterDataPolling() {
    stopVoterDataPolling();
    voterDataPollInterval = setInterval(() => {
        refreshVoterData();
    }, 5000);
}

function stopVoterDataPolling() {
    if (voterDataPollInterval) {
        clearInterval(voterDataPollInterval);
        voterDataPollInterval = null;
    }
}

// â”€â”€ Supabase Realtime â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startRealtimeSubscription() {
    if (!isSupabaseActive || !supabaseClient) return;
    // Unsubscribe dulu kalau sudah ada
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    realtimeChannel = supabaseClient
        .channel('voter-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' },   () => refreshVoterData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' },   () => refreshVoterData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_logs' },  () => refreshVoterData())
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Supabase Realtime: subscribed to voter changes');
            }
        });
}

function stopRealtimeSubscription() {
    if (realtimeChannel && supabaseClient) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

// ============================================================
// === EKSPOR HASIL PEMILIHAN (PDF + DOCX) ===
// ============================================================

function openExportModal() {
    const modal = getEl('exportModal');
    if (!modal) return;

    // Hitung preview
    const sorted      = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const winner      = sorted[0];
    const totalVotes  = candidates.reduce((s, c) => s + (Number(c.votes) || 0), 0);
    const totalSiswa  = students.length;
    const totalGuru   = teachers.length;
    const sudahVote   = students.filter(s => s.hasVoted).length + teachers.filter(t => t.hasVoted).length;

    const prev = getEl('exportPreview');
    if (prev) {
        prev.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <i class="fa-solid fa-trophy text-amber-500"></i>
                <span class="font-bold text-slate-700">Pemenang: ${winner ? winner.name + ' (No. ' + winner.no + ')' : 'Belum ada data'}</span>
            </div>
            <div class="grid grid-cols-2 gap-1 text-slate-500">
                <span><i class="fa-solid fa-check-double mr-1 text-teal-500"></i>Total Suara: <strong>${totalVotes}</strong></span>
                <span><i class="fa-solid fa-users mr-1 text-sky-500"></i>Total Pemilih: <strong>${totalSiswa + totalGuru}</strong></span>
                <span><i class="fa-solid fa-circle-check mr-1 text-emerald-500"></i>Sudah Vote: <strong>${sudahVote}</strong></span>
                <span><i class="fa-solid fa-user-clock mr-1 text-amber-500"></i>Belum Vote: <strong>${(totalSiswa + totalGuru) - sudahVote}</strong></span>
                <span><i class="fa-solid fa-user-tie mr-1 text-blue-500"></i>Kandidat: <strong>${candidates.length}</strong></span>
            </div>`;
    }

    // Reset status
    const status = getEl('exportStatus');
    if (status) status.classList.add('hidden');

    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function closeExportModal() {
    const modal = getEl('exportModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

function _exportSetStatus(show, text = '') {
    const el  = getEl('exportStatus');
    const txt = getEl('exportStatusText');
    if (!el) return;
    if (show) { el.classList.remove('hidden'); if (txt) txt.textContent = text; }
    else       { el.classList.add('hidden'); }
}

// â”€â”€ Bangun data laporan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _buildReportData() {
    const sorted  = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const winner  = sorted[0];
    const total   = sorted.reduce((s, c) => s + (Number(c.votes) || 0), 0);
    const allGroups = getSortedGroupLabels();

    const tanggal = new Date().toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return { sorted, winner, total, allGroups, tanggal };
}

// â”€â”€ EKSPOR PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function exportToPDF() {
    if (!window.jspdf || !window.html2canvas) {
        showAlertModal('Library Belum Siap', 'jsPDF atau html2canvas belum dimuat. Coba refresh halaman.', 'info');
        return;
    }
    _exportSetStatus(true, 'Mengambil grafik...');

    try {
        const { jsPDF } = window.jspdf;
        const { sorted, winner, total, tanggal } = _buildReportData();
        const W = 210; const ML = 20; const MR = 20; const CW = W - ML - MR;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        let y = 20;

        const line  = () => { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(ML, y, W - MR, y); y += 4; };
        const gap   = (n = 5) => { y += n; };
        const txt   = (t, size = 10, bold = false, align = 'left', x = ML) => {
            doc.setFontSize(size);
            doc.setFont('times', bold ? 'bold' : 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(t, align === 'center' ? W / 2 : align === 'right' ? W - MR : x, y, { align });
        };

        // Capture grafik
        const barCanvas = getEl('candidateBarChart');
        let barImg = null;
        if (barCanvas) {
            const cap = await html2canvas(barCanvas, { scale: 2, backgroundColor: '#ffffff' });
            barImg = cap.toDataURL('image/png');
        }
        const pieCanvas = getEl('voterPieChart');
        let pieImg = null;
        if (pieCanvas) {
            const cap = await html2canvas(pieCanvas, { scale: 2, backgroundColor: '#ffffff' });
            pieImg = cap.toDataURL('image/png');
        }

        _exportSetStatus(true, 'Membuat PDF...');

        // â”€â”€ Kepala dokumen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        txt('LAPORAN HASIL PEMILIHAN UMUM RAYA', 14, true, 'center');
        y += 6;
        txt('Badan Eksekutif Mahasiswa â€” SMP', 10, false, 'center');
        y += 5;
        line();
        txt(`Tanggal cetak: ${tanggal}`, 9, false, 'left');
        y += 5; line(); gap(3);

        // â”€â”€ Kandidat terpilih â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        txt('I. KANDIDAT TERPILIH', 11, true);
        y += 6;
        txt(`Nama       : ${winner ? winner.name : 'Belum ada data'}`, 10);
        y += 6;
        txt(`Nomor Urut : ${winner ? winner.no : '-'}`, 10);
        y += 6;
        txt(`Perolehan  : ${winner ? (Number(winner.votes) || 0) + ' suara (' + (total > 0 ? Math.round((winner.votes / total) * 100) : 0) + '% dari total)' : '-'}`, 10);
        y += 7; line(); gap(3);

        // â”€â”€ Ringkasan statistik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        txt('II. RINGKASAN STATISTIK', 11, true);
        y += 6;
        const stats = [
            ['Total suara masuk',   `${total} suara`],
            ['Total siswa terdaftar', `${students.length} orang`],
            ['Total guru / staf',   `${teachers.length} orang`],
            ['Sudah memilih',       `${students.filter(s=>s.hasVoted).length + teachers.filter(t=>t.hasVoted).length} orang`],
            ['Belum memilih',       `${students.filter(s=>!s.hasVoted).length + teachers.filter(t=>!t.hasVoted).length} orang`],
        ];
        stats.forEach(([label, val]) => {
            doc.setFontSize(10); doc.setFont('times', 'normal'); doc.setTextColor(0,0,0);
            doc.text(`${label}`, ML + 4, y);
            doc.text(`:  ${val}`, ML + 65, y);
            y += 6;
        });
        y += 4; line(); gap(3);

        // â”€â”€ Tabel perolehan suara â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        txt('III. PEROLEHAN SUARA PER KANDIDAT', 11, true);
        y += 6;

        const colX  = [ML, ML+10, ML+60, ML+115, ML+145];
        const colW  = [10, 50, 55, 30, 25];
        const heads = ['No.', 'Nama Kandidat', 'Rincian per Kelas', 'Total Suara', 'Persentase'];
        const rH = 7;

        // Header
        doc.setFillColor(230, 230, 230);
        doc.rect(ML, y, CW, rH, 'F');
        doc.setDrawColor(0); doc.setLineWidth(0.2);
        doc.rect(ML, y, CW, rH, 'S');
        doc.setFontSize(8); doc.setFont('times', 'bold'); doc.setTextColor(0,0,0);
        heads.forEach((h, i) => doc.text(h, colX[i] + 1, y + 5));
        y += rH;

        sorted.forEach((c, idx) => {
            if (y + rH > 280) { doc.addPage(); y = 20; }
            doc.setFillColor(idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255);
            doc.rect(ML, y, CW, rH, 'F');
            doc.setDrawColor(180); doc.rect(ML, y, CW, rH, 'S');
            doc.setFontSize(8); doc.setFont('times', 'normal'); doc.setTextColor(0,0,0);
            doc.text(`${c.no}`, colX[0] + 1, y + 5);
            doc.text(c.name.substring(0, 26), colX[1] + 1, y + 5);
            const vbc    = c.votes_by_class || {};
            const detail = Object.keys(vbc).filter(k => vbc[k] > 0).map(k => `${k}: ${vbc[k]}`).join(', ') || '-';
            doc.text(detail.substring(0, 28), colX[2] + 1, y + 5);
            const pct    = total > 0 ? Math.round(((c.votes || 0) / total) * 100) : 0;
            doc.setFont('times', 'bold');
            doc.text(`${Number(c.votes) || 0}`, colX[3] + 1, y + 5);
            doc.text(`${pct}%`, colX[4] + 1, y + 5);
            y += rH;
        });
        y += 6; line(); gap(3);

        // â”€â”€ Grafik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (barImg) {
            if (y + 65 > 280) { doc.addPage(); y = 20; }
            txt('IV. GRAFIK PEROLEHAN SUARA', 11, true);
            y += 5;
            doc.addImage(barImg, 'PNG', ML, y, CW, 55);
            y += 59;
            gap(4); line(); gap(3);
        }

        if (pieImg) {
            if (y + 65 > 280) { doc.addPage(); y = 20; }
            txt(`${barImg ? 'V' : 'IV'}. GRAFIK PARTISIPASI PEMILIH`, 11, true);
            y += 5;
            doc.addImage(pieImg, 'PNG', ML, y, 80, 60);
            y += 64;
            gap(4); line(); gap(3);
        }

        // â”€â”€ Tabel partisipasi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const secNum = barImg && pieImg ? 'VI' : (barImg || pieImg) ? 'V' : 'IV';
        if (y + 15 > 280) { doc.addPage(); y = 20; }
        txt(`${secNum}. TINGKAT PARTISIPASI PEMILIH`, 11, true);
        y += 6;

        const pColX = [ML, ML+55, ML+90, ML+130];
        const pHeads = ['Kelas / Kelompok', 'Sudah Memilih', 'Total Pemilih', 'Partisipasi (%)'];
        doc.setFillColor(230,230,230);
        doc.rect(ML, y, CW, rH, 'F');
        doc.setDrawColor(0); doc.rect(ML, y, CW, rH, 'S');
        doc.setFontSize(8); doc.setFont('times', 'bold'); doc.setTextColor(0,0,0);
        pHeads.forEach((h, i) => doc.text(h, pColX[i] + 1, y + 5));
        y += rH;

        const cls_ = getSortedGroupLabels().filter(l => !l.toLowerCase().includes('guru') && !l.toLowerCase().includes('staf'));
        [...cls_, 'Guru / Staf'].forEach((grp, idx) => {
            if (y + rH > 280) { doc.addPage(); y = 20; }
            const isG  = grp.toLowerCase().includes('guru') || grp.toLowerCase().includes('staf');
            const tot_ = isG ? teachers.length : students.filter(s => getParentGrade(s.grade) === grp).length;
            const vot_ = isG ? teachers.filter(t => t.hasVoted).length : students.filter(s => getParentGrade(s.grade) === grp && s.hasVoted).length;
            const pct_ = tot_ > 0 ? Math.round((vot_ / tot_) * 100) : 0;
            doc.setFillColor(idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255);
            doc.rect(ML, y, CW, rH, 'F');
            doc.setDrawColor(180); doc.rect(ML, y, CW, rH, 'S');
            doc.setFontSize(8); doc.setFont('times', 'normal'); doc.setTextColor(0,0,0);
            doc.text(grp, pColX[0] + 1, y + 5);
            doc.text(`${vot_} orang`, pColX[1] + 1, y + 5);
            doc.text(`${tot_} orang`, pColX[2] + 1, y + 5);
            doc.text(`${pct_}%`, pColX[3] + 1, y + 5);
            y += rH;
        });

        // â”€â”€ Footer tiap halaman â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7); doc.setFont('times', 'normal'); doc.setTextColor(100,100,100);
            doc.setDrawColor(180); doc.setLineWidth(0.2);
            doc.line(ML, 288, W - MR, 288);
            doc.text(`Laporan Hasil PEMIRA BEM SMP`, ML, 293);
            doc.text(`Halaman ${i} dari ${pageCount}`, W - MR, 293, { align: 'right' });
        }

        doc.save(`Laporan_PEMIRA_${new Date().toISOString().slice(0,10)}.pdf`);
        _exportSetStatus(false);
        showAlertModal('Berhasil', 'Laporan PDF berhasil diunduh.', 'success');

    } catch(e) {
        console.error('exportToPDF error:', e);
        _exportSetStatus(false);
        showAlertModal('Gagal', 'Gagal membuat PDF: ' + e.message, 'info');
    }
}

// â”€â”€ EKSPOR DOCX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function exportToDocx() {
    if (!window.docx) {
        showAlertModal('Library Belum Siap', 'docx.js belum dimuat. Coba refresh halaman.', 'info');
        return;
    }
    _exportSetStatus(true, 'Mengambil grafik...');

    try {
        const { Document, Packer, Paragraph, Table, TableRow, TableCell,
                TextRun, AlignmentType, WidthType, BorderStyle, ImageRun } = window.docx;

        const { sorted, winner, total, tanggal } = _buildReportData();

        // Capture grafik
        let barImgBase64 = null, barW = 600, barH = 200;
        let pieImgBase64 = null, pieW = 300, pieH = 200;
        const barCanvas = getEl('candidateBarChart');
        if (barCanvas) {
            const c = await html2canvas(barCanvas, { scale: 2, backgroundColor: '#ffffff' });
            barImgBase64 = c.toDataURL('image/png').split(',')[1];
            barW = c.width; barH = c.height;
        }
        const pieCanvas = getEl('voterPieChart');
        if (pieCanvas) {
            const c = await html2canvas(pieCanvas, { scale: 2, backgroundColor: '#ffffff' });
            pieImgBase64 = c.toDataURL('image/png').split(',')[1];
            pieW = c.width; pieH = c.height;
        }

        _exportSetStatus(true, 'Membuat dokumen Word...');

        // Helper border tabel tipis hitam
        const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
        const cellBorder = { top: border, bottom: border, left: border, right: border };

        const hCell = (text, w = 1500) => new TableCell({
            borders: cellBorder,
            shading: { fill: 'D9D9D9' },
            width: { size: w, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 18, font: 'Times New Roman' })] })]
        });

        const dCell = (text, w = 1500, bold = false) => new TableCell({
            borders: cellBorder,
            width: { size: w, type: WidthType.DXA },
            children: [new Paragraph({
                children: [new TextRun({ text: String(text), bold, size: 18, font: 'Times New Roman' })] })]
        });

        const p = (text, size = 20, bold = false, align = AlignmentType.LEFT, spacing = 120) =>
            new Paragraph({ alignment: align, spacing: { after: spacing },
                children: [new TextRun({ text, bold, size, font: 'Times New Roman' })] });

        const sections = [];

        // Judul
        sections.push(
            p('LAPORAN HASIL PEMILIHAN UMUM RAYA', 28, true, AlignmentType.CENTER, 80),
            p('Badan Eksekutif Mahasiswa â€” SMP', 22, false, AlignmentType.CENTER, 80),
            p(`Tanggal cetak: ${tanggal}`, 18, false, AlignmentType.CENTER, 240),
        );

        // I. Kandidat terpilih
        sections.push(
            p('I. Kandidat Terpilih', 22, true, AlignmentType.LEFT, 80),
            p(`Nama           : ${winner ? winner.name : 'Belum ada data'}`, 20, false, AlignmentType.LEFT, 60),
            p(`Nomor Urut     : ${winner ? winner.no : '-'}`, 20, false, AlignmentType.LEFT, 60),
            p(`Perolehan Suara: ${winner ? (Number(winner.votes)||0) + ' suara (' + (total > 0 ? Math.round((winner.votes/total)*100) : 0) + '% dari total)' : '-'}`, 20, false, AlignmentType.LEFT, 200),
        );

        // II. Statistik
        sections.push(p('II. Ringkasan Statistik', 22, true, AlignmentType.LEFT, 80));
        const stats = [
            ['Total suara masuk',      `${total} suara`],
            ['Total siswa terdaftar',  `${students.length} orang`],
            ['Total guru / staf',      `${teachers.length} orang`],
            ['Sudah memilih',          `${students.filter(s=>s.hasVoted).length + teachers.filter(t=>t.hasVoted).length} orang`],
            ['Belum memilih',          `${students.filter(s=>!s.hasVoted).length + teachers.filter(t=>!t.hasVoted).length} orang`],
        ];
        stats.forEach(([k,v]) => sections.push(p(`${k.padEnd(30, ' ')}: ${v}`, 20, false, AlignmentType.LEFT, 60)));
        sections.push(p('', 20, false, AlignmentType.LEFT, 80));

        // III. Tabel suara
        sections.push(p('III. Perolehan Suara per Kandidat', 22, true, AlignmentType.LEFT, 100));
        sections.push(new Table({ rows: [
            new TableRow({ children: [hCell('No.',600), hCell('Nama Kandidat',3200), hCell('Rincian per Kelas',3000), hCell('Total Suara',1200), hCell('Persentase',1000)] }),
            ...sorted.map(c => {
                const vbc    = c.votes_by_class || {};
                const detail = Object.keys(vbc).filter(k=>vbc[k]>0).map(k=>`${k}: ${vbc[k]}`).join(', ') || '-';
                const pct    = total > 0 ? Math.round(((c.votes||0)/total)*100) : 0;
                return new TableRow({ children: [
                    dCell(`${c.no}`, 600),
                    dCell(c.name, 3200, true),
                    dCell(detail, 3000),
                    dCell(`${Number(c.votes)||0}`, 1200, true),
                    dCell(`${pct}%`, 1000),
                ]});
            })
        ], width: { size: 9000, type: WidthType.DXA } }));
        sections.push(p('', 20));

        // IV. Grafik batang
        if (barImgBase64) {
            sections.push(p('IV. Grafik Perolehan Suara', 22, true, AlignmentType.LEFT, 100));
            sections.push(new Paragraph({ children: [new ImageRun({
                data: Uint8Array.from(atob(barImgBase64), c => c.charCodeAt(0)),
                transformation: { width: Math.round(barW / 2.8), height: Math.round(barH / 2.8) }
            })], spacing: { after: 200 } }));
        }

        // V. Grafik pie
        if (pieImgBase64) {
            sections.push(p(`${barImgBase64 ? 'V' : 'IV'}. Grafik Partisipasi Pemilih`, 22, true, AlignmentType.LEFT, 100));
            sections.push(new Paragraph({ children: [new ImageRun({
                data: Uint8Array.from(atob(pieImgBase64), c => c.charCodeAt(0)),
                transformation: { width: Math.round(pieW / 3.5), height: Math.round(pieH / 3.5) }
            })], spacing: { after: 200 } }));
        }

        // Tabel partisipasi
        const secN = barImgBase64 && pieImgBase64 ? 'VI' : (barImgBase64 || pieImgBase64) ? 'V' : 'IV';
        sections.push(p(`${secN}. Tingkat Partisipasi Pemilih`, 22, true, AlignmentType.LEFT, 100));
        const cls_ = getSortedGroupLabels().filter(l => !l.toLowerCase().includes('guru') && !l.toLowerCase().includes('staf'));
        sections.push(new Table({ rows: [
            new TableRow({ children: [hCell('Kelas / Kelompok',2500), hCell('Sudah Memilih',1500), hCell('Total Pemilih',1500), hCell('Partisipasi (%)',1500)] }),
            ...[...cls_, 'Guru / Staf'].map(grp => {
                const isG  = grp.toLowerCase().includes('guru') || grp.toLowerCase().includes('staf');
                const tot_ = isG ? teachers.length : students.filter(s=>getParentGrade(s.grade)===grp).length;
                const vot_ = isG ? teachers.filter(t=>t.hasVoted).length : students.filter(s=>getParentGrade(s.grade)===grp&&s.hasVoted).length;
                const pct_ = tot_ > 0 ? Math.round((vot_/tot_)*100) : 0;
                return new TableRow({ children: [
                    dCell(grp, 2500),
                    dCell(`${vot_} orang`, 1500),
                    dCell(`${tot_} orang`, 1500),
                    dCell(`${pct_}%`, 1500),
                ]});
            })
        ], width: { size: 7000, type: WidthType.DXA } }));

        const doc_ = new Document({ sections: [{ children: sections,
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 } } }
        }] });

        const blob = await Packer.toBlob(doc_);
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `Laporan_PEMIRA_${new Date().toISOString().slice(0,10)}.docx`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        _exportSetStatus(false);
        showAlertModal('Berhasil', 'Dokumen Word berhasil diunduh.', 'success');

    } catch(e) {
        console.error('exportToDocx error:', e);
        _exportSetStatus(false);
        showAlertModal('Gagal', 'Gagal membuat DOCX: ' + e.message, 'info');
    }

}

// ============================================================
// === MULTI-PERIODE ===
// ============================================================

async function loadPeriods() {
    if (!isSupabaseActive || !supabaseClient) {
        // Fallback: buat periode default lokal
        if (!periods.length) {
            periods = [{ id: 'local-default', name: '2026-2027', is_active: true }];
        }
        currentPeriodId = currentPeriodId || periods[0].id;
        renderPeriodTabBar();
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('periods').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        if (data && data.length) {
            periods = data;
        } else {
            // Buat periode default jika belum ada
            const { data: newP } = await supabaseClient
                .from('periods').insert({ name: '2026-2027', is_active: true }).select().single();
            if (newP) periods = [newP];
        }
        // Set currentPeriodId ke periode yang disimpan, atau aktif, atau pertama
        const saved = localStorage.getItem('pemira_current_period_id');
        if (saved && periods.find(p => p.id === saved)) {
            currentPeriodId = saved;
        } else {
            const active = periods.find(p => p.is_active) || periods[0];
            currentPeriodId = active?.id || null;
        }
        renderPeriodTabBar();
    } catch(e) {
        console.error('loadPeriods error:', e);
        if (!periods.length) periods = [{ id: 'local-default', name: '2026-2027', is_active: true }];
        currentPeriodId = periods[0].id;
        renderPeriodTabBar();
    }
}

async function switchToPeriod(id) {
    if (id === currentPeriodId) return;
    currentPeriodId = id;
    localStorage.setItem('pemira_current_period_id', id);
    renderPeriodTabBar();
    // Reset data lokal
    candidates = []; students = []; teachers = []; voteLogs = []; voterStats = {};
    await loadData();
    await loadTeachers();
    renderAdminDashboard();
}

async function createPeriod() {
    const inp = getEl('newPeriodNameInput');
    if (!inp) return;
    const name = inp.value.trim();
    if (!name) { showAlertModal('Peringatan', 'Masukkan nama tahun ajaran.', 'info'); return; }
    if (!/^\d{4}-\d{4}$/.test(name)) {
        showAlertModal('Format Salah', 'Format tahun ajaran: XXXX-XXXX, contoh: 2026-2027', 'info'); return;
    }
    if (periods.find(p => p.name === name)) {
        showAlertModal('Sudah Ada', `Periode ${name} sudah terdaftar.`, 'info'); return;
    }

    if (isSupabaseActive && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('periods').insert({ name, is_active: false }).select().single();
            if (error) throw error;
            periods.push(data);
            inp.value = '';
            closeAddPeriodModal();
            renderPeriodTabBar();
            await switchToPeriod(data.id);
            showAlertModal('Berhasil', `Periode ${name} berhasil ditambahkan.`, 'success');
        } catch(e) { showAlertModal('Gagal', 'Gagal membuat periode: ' + e.message, 'info'); }
    }
}

async function setActivePeriod(id) {
    if (!isSupabaseActive || !supabaseClient) return;
    try {
        // Set semua is_active = false
        await supabaseClient.from('periods').update({ is_active: false }).neq('id', '___none___');
        // Set periode ini aktif
        await supabaseClient.from('periods').update({ is_active: true }).eq('id', id);
        periods = periods.map(p => ({ ...p, is_active: p.id === id }));
        renderPeriodTabBar();
        showAlertModal('Berhasil', `Periode ${periods.find(p=>p.id===id)?.name} ditetapkan sebagai aktif untuk voting.`, 'success');
    } catch(e) { showAlertModal('Gagal', 'Gagal mengatur periode aktif.', 'info'); }
}

async function renamePeriod(id, newName) {
    if (!newName?.trim()) return;
    if (!/^\d{4}-\d{4}$/.test(newName.trim())) {
        showAlertModal('Format Salah', 'Format: XXXX-XXXX', 'info'); return;
    }
    if (isSupabaseActive && supabaseClient) {
        try {
            await supabaseClient.from('periods').update({ name: newName.trim() }).eq('id', id);
            const p = periods.find(p => p.id === id);
            if (p) p.name = newName.trim();
            renderPeriodTabBar();
            closePeriodSettingsModal();
            showAlertModal('Berhasil', 'Nama periode diperbarui.', 'success');
        } catch(e) { showAlertModal('Gagal', 'Gagal mengubah nama.', 'info'); }
    }
}

async function deletePeriod(id) {
    const p = periods.find(p => p.id === id);
    if (!p) return;
    if (periods.length <= 1) { showAlertModal('Tidak Bisa', 'Minimal harus ada satu periode.', 'info'); return; }
    if (!confirm(`Hapus periode "${p.name}"? Semua data kandidat, siswa, guru, dan suara di periode ini akan DIHAPUS PERMANEN.`)) return;
    if (isSupabaseActive && supabaseClient) {
        try {
            await supabaseClient.from('periods').delete().eq('id', id);
            periods = periods.filter(p => p.id !== id);
            closePeriodSettingsModal();
            if (currentPeriodId === id) {
                const fallback = periods.find(p => p.is_active) || periods[0];
                await switchToPeriod(fallback.id);
            } else {
                renderPeriodTabBar();
            }
            showAlertModal('Terhapus', `Periode "${p.name}" dihapus.`, 'info');
        } catch(e) { showAlertModal('Gagal', 'Gagal menghapus periode.', 'info'); }
    }
}

// ── Render tab bar periode ────────────────────────────────────────────────────
function renderPeriodTabBar() {
    const bar = getEl('periodTabBar');
    if (!bar) return;
    bar.innerHTML = '';

    periods.forEach(p => {
        const isCurrentTab = p.id === currentPeriodId;
        const isActiveVoting = p.is_active;

        const btn = document.createElement('button');
        btn.onclick = () => switchToPeriod(p.id);
        btn.className = [
            'relative px-4 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5',
            isCurrentTab
                ? 'bg-white text-blue-700 border-blue-300 shadow-sm'
                : 'bg-slate-100 text-slate-500 border-transparent hover:bg-white hover:text-slate-700'
        ].join(' ');
        btn.innerHTML = `
            ${isActiveVoting ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>' : ''}
            <span>${p.name}</span>
            <button onclick="event.stopPropagation(); openPeriodSettingsModal('${p.id}')"
                    class="ml-1 text-slate-400 hover:text-slate-600 transition">
                <i class="fa-solid fa-ellipsis text-[10px]"></i>
            </button>`;
        bar.appendChild(btn);
    });

    // Tombol tambah periode
    const addBtn = document.createElement('button');
    addBtn.onclick = openAddPeriodModal;
    addBtn.className = 'px-3 py-2 text-xs font-semibold rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition flex items-center gap-1';
    addBtn.innerHTML = '<i class="fa-solid fa-plus text-[10px]"></i> Periode Baru';
    bar.appendChild(addBtn);
}

// ── Modal tambah periode ──────────────────────────────────────────────────────
function openAddPeriodModal() {
    const inp = getEl('newPeriodNameInput');
    if (inp) inp.value = '';
    const modal = getEl('addPeriodModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); setTimeout(() => inp?.focus(), 100); }
}
function closeAddPeriodModal() {
    const modal = getEl('addPeriodModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ── Modal pengaturan periode ──────────────────────────────────────────────────
let _editingPeriodId = null;
function openPeriodSettingsModal(id) {
    _editingPeriodId = id;
    const p = periods.find(p => p.id === id);
    if (!p) return;

    const nameEl   = getEl('editPeriodNameInput');
    const titleEl  = getEl('periodSettingsTitle');
    const activeEl = getEl('periodIsActiveInfo');
    if (nameEl)   nameEl.value     = p.name;
    if (titleEl)  titleEl.textContent = p.name;
    if (activeEl) {
        activeEl.textContent = p.is_active ? 'Aktif untuk voting' : 'Tidak aktif';
        activeEl.className   = p.is_active
            ? 'text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full'
            : 'text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full';
    }

    // Sembunyikan tombol "Jadikan Aktif" kalau sudah aktif
    const setActiveBtn = getEl('setPeriodActiveBtn');
    if (setActiveBtn) setActiveBtn.style.display = p.is_active ? 'none' : '';

    const modal = getEl('periodSettingsModal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}
function closePeriodSettingsModal() {
    const modal = getEl('periodSettingsModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    _editingPeriodId = null;
}
function savePeriodRename() {
    const inp = getEl('editPeriodNameInput');
    if (_editingPeriodId && inp) renamePeriod(_editingPeriodId, inp.value);
}
function confirmSetActivePeriod() {
    if (_editingPeriodId) setActivePeriod(_editingPeriodId);
}
function confirmDeletePeriod() {
    if (_editingPeriodId) deletePeriod(_editingPeriodId);
}
