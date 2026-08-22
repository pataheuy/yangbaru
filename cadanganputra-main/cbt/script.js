        // ==========================================
        // 1. SUPABASE + IN-MEMORY DATABASE
        // ==========================================

        // --- KONFIGURASI SUPABASE ---
        // Ganti dua nilai di bawah ini dengan Project URL dan Anon Key kamu
        // Dashboard Supabase → Settings → API
        const SUPABASE_URL  = 'https://puywjdopumlzvmzbcudr.supabase.co';
        const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXdqZG9wdW1senZtemJjdWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE3MTksImV4cCI6MjA4NzkxNzcxOX0.vvThyjtK2SlA9oA9Mr_XOmt1R_tNZk-ib3PO9XpiiSc';
        const supa = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

        // Cache lokal agar UI tetap responsif saat offline
        let db = {
            students: [],
            packages: [],
            scores: []
        };

        const STORAGE_KEY     = 'pufutara_cbt_db_v3_updated_ragu';
        const EXAM_SESSION_KEY = 'pufutara_cbt_active_session_v3_updated_ragu';

        let authenticatedStudent = null;
        let currentAdmin = null; // { id, username, name, school, role } — null = super admin

        // Helper: ambil sekolah admin yang sedang login (null = super admin, lihat semua)
        function getAdminSchool() {
            return currentAdmin ? currentAdmin.school : null;
        }

        // Filter array berdasarkan sekolah admin aktif
        function filterBySchool(arr, key = 'school') {
            const school = getAdminSchool();
            if (!school) return arr; // super admin lihat semua
            return arr.filter(item => (item[key] || '').toLowerCase() === school.toLowerCase());
        }
        let currentExam = null; // State ujian aktif

        // ---- Muat semua data dari Supabase ke cache lokal ----
        async function loadDB() {
            // Hapus cache localStorage lama agar tidak ada seed data dummy yang ikut upsert
            localStorage.removeItem(STORAGE_KEY);
            try {
                const [studRes, pkgRes, scRes] = await Promise.all([
                    supa.from('cbt_students').select('*'),
                    supa.from('cbt_packages').select('*'),
                    supa.from('cbt_scores').select('*')
                ]);

                if (studRes.error) throw studRes.error;
                if (pkgRes.error)  throw pkgRes.error;
                if (scRes.error)   throw scRes.error;

                // Normalise kolom snake_case → camelCase agar kode lama tetap jalan
                db.students = studRes.data.map(s => ({
                    id: s.id, name: s.name, class: s.class,
                    nis: s.nis || '', nisn: s.nisn || '',
                    school: s.school || '',
                    code: s.code || '', password: s.password || ''
                }));

                db.packages = pkgRes.data.map(p => ({
                    id: p.id,
                    title: p.title,
                    duration: p.duration,
                    minDuration: p.min_duration,
                    token: p.token,
                    acakSoal: p.acak_soal,
                    acakOpsi: p.acak_opsi,
                    openAt:    p.open_at  || null,
                    closeAt:   p.close_at || null,
                    showScore:  p.show_score  !== false, // default true
                    showAnswer: p.show_answer || false,
                    questions: p.questions || []
                }));

                db.scores = scRes.data.map(sc => ({
                    id: sc.id,
                    studentName: sc.student_name,
                    studentClass: sc.student_class,
                    packageName: sc.package_name,
                    correctCount: sc.correct_count,
                    totalQuestions: sc.total_questions,
                    score: sc.score,
                    status: sc.status,
                    examData: sc.exam_data,
                    submittedAt: sc.submitted_at
                }));

                showToast("Terhubung", "Data berhasil dimuat dari Supabase.", "success");
            } catch(err) {
                console.error("Supabase loadDB error:", err);
                // Fallback ke localStorage jika Supabase gagal
                const local = localStorage.getItem(STORAGE_KEY);
                if (local) {
                    try {
                        const parsed = JSON.parse(local);
                        db.students = parsed.students || [];
                        db.packages = parsed.packages || [];
                        db.scores   = parsed.scores   || [];
                        showToast("Mode Offline", "Memuat data lokal (Supabase tidak terjangkau).", "warning");
                    } catch(e) { initSeedData(); }
                } else {
                    initSeedData();
                }
            }
            initTheme();
            renderAllAdminViews();
            updateDashboardStats();
        }

        // saveDB: sinkron ke Supabase DAN simpan cache lokal
        // Dipanggil setelah setiap operasi tulis
        async function saveDB() {
            // Cache lokal tetap disimpan sebagai backup offline
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
            updateDashboardStats();
        }

        // ---- Helper: upsert satu student ----
        async function dbUpsertStudent(student) {
            const { error } = await supa.from('cbt_students').upsert({
                id: student.id,
                name: student.name,
                class: student.class,
                nis: student.nis || null,
                nisn: student.nisn || null,
                school: student.school || null,
                code: student.code || null,
                password: student.password || null
            });
            if (error) { console.error('upsertStudent:', error); showToast("Error", error.message, "danger"); }
        }

        // ---- Helper: hapus satu student ----
        async function dbDeleteStudent(id) {
            const { error } = await supa.from('cbt_students').delete().eq('id', id);
            if (error) { console.error('deleteStudent:', error); showToast("Error", error.message, "danger"); }
        }

        // ---- Helper: upsert satu package (beserta soal-soalnya) ----
        async function dbUpsertPackage(pkg) {
            const { error } = await supa.from('cbt_packages').upsert({
                id:           pkg.id,
                title:        pkg.title,
                duration:     pkg.duration,
                min_duration: pkg.minDuration || 0,
                token:        pkg.token,
                acak_soal:    pkg.acakSoal    || false,
                acak_opsi:    pkg.acakOpsi    || false,
                open_at:      pkg.openAt      || null,
                close_at:     pkg.closeAt     || null,
                show_score:   pkg.showScore   !== false,
                show_answer:  pkg.showAnswer  || false,
                questions:    pkg.questions   || []
            });
            if (error) { console.error('upsertPackage:', error); showToast("Error", error.message, "danger"); }
        }

        // ---- Helper: hapus satu package ----
        async function dbDeletePackage(id) {
            const { error } = await supa.from('cbt_packages').delete().eq('id', id);
            if (error) { console.error('deletePackage:', error); showToast("Error", error.message, "danger"); }
        }

        // ---- Helper: insert satu score ----
        async function dbInsertScore(sc) {
            const { error } = await supa.from('cbt_scores').insert({
                id:               sc.id,
                student_name:     sc.studentName,
                student_class:    sc.studentClass,
                package_name:     sc.packageName,
                correct_count:    sc.correctCount,
                total_questions:  sc.totalQuestions,
                score:            sc.score,
                status:           sc.status,
                exam_data:        sc.examData || null
            });
            if (error) { console.error('insertScore:', error); showToast("Error", error.message, "danger"); }
        }

        // ---- Helper: hapus satu score ----
        async function dbDeleteScore(id) {
            const { error } = await supa.from('cbt_scores').delete().eq('id', id);
            if (error) { console.error('deleteScore:', error); showToast("Error", error.message, "danger"); }
        }

        // ---- Helper: reset semua tabel ----
        async function dbResetAll() {
            await Promise.all([
                supa.from('cbt_scores').delete().neq('id', ''),
                supa.from('cbt_packages').delete().neq('id', ''),
                supa.from('cbt_students').delete().neq('id', '')
            ]);
        }

        // Contoh Data Seed Pertama kali — hanya isi paket contoh, tanpa murid dummy
        function initSeedData() {
            db.students = [];
            db.packages = [

                {
                    id: "pkg_seed_1",
                    title: "Ujian Logika Dasar & Pemrograman",
                    duration: 15,
                    minDuration: 2, // Minimal 2 menit pengerjaan baru boleh dikumpul
                    token: "PUFU26",
                    acakSoal: true,
                    acakOpsi: true,
                    questions: [
                        {
                            id: "q1",
                            type: "pilihan-ganda",
                            text: "Manakah sintaks yang benar untuk mendeklarasikan variabel yang nilainya konstan di JavaScript ES6?",
                            options: ["var x = 10;", "let x = 10;", "const x = 10;", "define('x', 10);", "immutable x = 10;"],
                            correct: ["const x = 10;"]
                        },
                        {
                            id: "q2",
                            type: "pilihan-ganda-kompleks",
                            text: "Pilih platform yang merupakan bagian dari runtime atau framework JavaScript modern (Pilih semua yang benar):",
                            options: ["Node.js", "Django", "Bun", "Laravel", "Deno"],
                            correct: ["Node.js", "Bun", "Deno"]
                        },
                        {
                            id: "q3",
                            type: "benar-salah",
                            text: "Tentukan kebenaran dari pernyataan tentang media penyimpanan browser berikut:",
                            options: [
                                "Local Storage dapat menyimpan data secara permanen meskipun browser ditutup.",
                                "Session Storage menyimpan data selamanya tanpa batas waktu.",
                                "Cookie biasanya digunakan untuk mengamankan data pengguna di sisi server saja."
                            ],
                            correct: ["Benar", "Salah", "Salah"]
                        },
                        {
                            id: "q4",
                            type: "isian-singkat",
                            text: "Apakah singkatan resmi dari representasi elemen visual HTML dalam bentuk pohon objek JavaScript?",
                            options: [],
                            correct: ["dom"]
                        }
                    ]
                }
            ];
            db.scores = [];
            saveDB();
        }

        // Helper Fisher-Yates untuk mengacak array
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        // ==========================================
        // 1.5. SISTEM PREFERENSI TEMA (LIGHT/DARK)
        // ==========================================
        function initTheme() {
            // Mode default adalah LIGHT MODE sesuai instruksi: "buat mode ujian nya defaultnya light mode"
            const savedTheme = localStorage.getItem('theme') || 'light';
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
                document.getElementById('theme-toggle-icon').className = "fa-solid fa-moon text-md";
                const examIcon = document.getElementById('exam-theme-icon');
                if (examIcon) examIcon.className = "fa-solid fa-moon text-sm";
            } else {
                document.documentElement.classList.remove('dark');
                document.getElementById('theme-toggle-icon').className = "fa-solid fa-sun text-md";
                const examIcon = document.getElementById('exam-theme-icon');
                if (examIcon) examIcon.className = "fa-solid fa-sun text-sm";
            }
        }

        function toggleTheme() {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                document.getElementById('theme-toggle-icon').className = "fa-solid fa-sun text-md";
                // Sync ikon di ruang ujian
                const examIcon = document.getElementById('exam-theme-icon');
                if (examIcon) examIcon.className = "fa-solid fa-sun text-sm";
                showToast("Tema Diubah", "Berhasil beralih ke Mode Terang", "info");
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                document.getElementById('theme-toggle-icon').className = "fa-solid fa-moon text-md";
                // Sync ikon di ruang ujian
                const examIcon = document.getElementById('exam-theme-icon');
                if (examIcon) examIcon.className = "fa-solid fa-moon text-sm";
                showToast("Tema Diubah", "Berhasil beralih ke Mode Gelap", "info");
            }
        }

        // ==========================================
        // 2. SISTEM ROUTING SINGLE PAGE APPLICATION
        // ==========================================
        function switchView(viewId) {
            const views = [
                'view-login-student', 
                'view-login-admin', 
                'view-student-dashboard',
                'view-admin-dashboard',
                'view-admin-manage-questions',
                'view-student-room'
            ];

            views.forEach(id => {
                const el = document.getElementById(id);
                if (id === viewId) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });

            // Update URL with History API (path-based routing)
            const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
            history.pushState({ view: viewId }, '', `${basePath}/${viewId}`);

            // Visibilitas Navigasi Header
            const header = document.getElementById('main-header');
            const footer = document.getElementById('main-footer');
            const navGeneralActions = document.getElementById('nav-general-actions');
            const btnLogoutStudent = document.getElementById('btn-logout-student');
            const btnLogoutAdmin = document.getElementById('btn-logout-admin');
            const btnToStudent = document.getElementById('btn-to-student-portal');
            const btnToAdmin = document.getElementById('btn-to-admin-portal');

            if (viewId === 'view-student-room') {
                header.classList.add('hidden');
                footer.classList.add('hidden');
                document.body.classList.remove('login-view-active');
            } else {
                header.classList.remove('hidden');

                // Wallpaper fullscreen hanya di halaman login murid & guru
                if (viewId === 'view-login-student' || viewId === 'view-login-admin') {
                    document.body.classList.add('login-view-active');
                    footer.classList.add('hidden'); // sembunyikan footer di login
                } else {
                    document.body.classList.remove('login-view-active');
                    footer.classList.remove('hidden');
                }

                if (viewId === 'view-admin-dashboard' || viewId === 'view-admin-manage-questions') {
                    navGeneralActions.classList.add('hidden');
                    btnLogoutStudent.classList.add('hidden');
                    btnLogoutAdmin.classList.remove('hidden');
                } else if (viewId === 'view-student-dashboard') {
                    navGeneralActions.classList.add('hidden');
                    btnLogoutStudent.classList.remove('hidden');
                    btnLogoutAdmin.classList.add('hidden');
                } else if (viewId === 'view-login-admin') {
                    navGeneralActions.classList.remove('hidden');
                    btnToStudent.classList.remove('hidden');
                    btnToAdmin.classList.add('hidden');
                    btnLogoutStudent.classList.add('hidden');
                    btnLogoutAdmin.classList.add('hidden');
                } else { // view-login-student
                    navGeneralActions.classList.remove('hidden');
                    btnToStudent.classList.add('hidden');
                    btnToAdmin.classList.remove('hidden');
                    btnLogoutStudent.classList.add('hidden');
                    btnLogoutAdmin.classList.add('hidden');
                }
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function goToHome() {
            if (authenticatedStudent) {
                switchView('view-student-dashboard');
            } else {
                switchView('view-login-student');
            }
        }

        // Switch Tab Admin
        function switchAdminTab(tabId) {
            const tabs = ['tab-questions', 'tab-students', 'tab-results', 'tab-admins'];
            tabs.forEach(id => {
                const el = document.getElementById(id);
                const btn = document.getElementById('btn-' + id);
                if (id === tabId) {
                    el.classList.remove('hidden');
                    btn.className = "tab-btn border-b-2 border-brand-600 text-brand-600 dark:text-brand-400 font-bold px-3 py-3 text-sm flex items-center space-x-2";
                } else {
                    el.classList.add('hidden');
                    btn.className = "tab-btn border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium px-3 py-3 text-sm flex items-center space-x-2";
                }
            });
            // Render konten sesuai tab yang dibuka
            if (tabId === 'tab-admins') renderAdminsTable();
        }

        // Switch Tab Murid
        function switchStudentTab(tabId) {
            const tabs = ['subtab-active-exams', 'subtab-completed-exams'];
            tabs.forEach(id => {
                const el = document.getElementById(id);
                const btn = document.getElementById('btn-' + id);
                if (id === tabId) {
                    el.classList.remove('hidden');
                    btn.className = "student-tab-btn border-b-2 border-brand-600 text-brand-600 dark:text-brand-400 font-bold px-3 py-3 text-sm flex items-center space-x-2";
                } else {
                    el.classList.add('hidden');
                    btn.className = "student-tab-btn border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium px-3 py-3 text-sm flex items-center space-x-2";
                }
            });
        }


        // ==========================================
        // 3. AUTHENTIKASI & LOGOUT
        // ==========================================
        async function handleAdminLogin(event) {
            event.preventDefault();
            const user = document.getElementById('admin-username').value.trim();
            const pass = document.getElementById('admin-password').value.trim();

            // Super admin (hardcoded)
            if (user === 'admin' && pass === 'admin') {
                currentAdmin = null; // null = super admin, akses semua sekolah
                showToast("Berhasil Masuk", "Selamat datang, Super Admin!", "success");
                switchView('view-admin-dashboard');
                document.getElementById('form-login-admin').reset();
                renderAllAdminViews();
                return;
            }

            // Cek tabel cbt_admins
            const { data, error } = await supa
                .from('cbt_admins')
                .select('*')
                .eq('username', user)
                .maybeSingle();

            if (error || !data) {
                showToast("Gagal Masuk", "Username atau password salah.", "danger");
                return;
            }

            if (data.password !== pass) {
                showToast("Gagal Masuk", "Username atau password salah.", "danger");
                return;
            }

            currentAdmin = { id: data.id, username: data.username, name: data.name, school: data.school, role: data.role };
            showToast("Berhasil Masuk", `Selamat datang, ${data.name || data.username} (${data.school})!`, "success");
            switchView('view-admin-dashboard');
            document.getElementById('form-login-admin').reset();
            renderAllAdminViews();
        }

        function logoutAdmin() {
            showModalConfirm(
                "Keluar dari Dashboard",
                "Sesi dashboard admin akan dikunci kembali demi keamanan.",
                () => {
                    currentAdmin = null;
                    switchView('view-login-student');
                    showToast("Sesi Berakhir", "Berhasil keluar dari dashboard.", "info");
                }
            );
        }

        function handleStudentLogin(event) {
            event.preventDefault();
            const code = document.getElementById('student-code').value.trim().toUpperCase();
            const password = document.getElementById('student-password').value.trim();

            const match = db.students.find(s =>
                (s.code || '').toUpperCase() === code &&
                (s.password || '') === password
            );

            if (!match) {
                showToast("Login Gagal", "Kode murid atau password salah. Hubungi pengawas.", "danger");
                return;
            }

            authenticatedStudent = { name: match.name, class: match.class, nis: match.nis, nisn: match.nisn, code: match.code };
            showToast("Berhasil Masuk", `Selamat datang, ${match.name}!`, "success");
            enterStudentDashboard();
        }

        // Keluar Akun Murid
        function logoutStudent() {
            showModalConfirm(
                "Keluar Akun",
                "Apakah Anda yakin ingin keluar dari akun murid Anda?",
                () => {
                    authenticatedStudent = null;
                    document.getElementById('form-login-student').reset();
                    switchView('view-login-student');
                    showToast("Sesi Berakhir", "Berhasil keluar akun murid.", "info");
                }
            );
        }

        function enterStudentDashboard() {
            if (!authenticatedStudent) return;
            switchView('view-student-dashboard');

            document.getElementById('student-welcome-name').innerText = authenticatedStudent.name;
            document.getElementById('student-welcome-class').innerText = "Kelas: " + authenticatedStudent.class;

            renderStudentDashboardExams();
        }

        // Mulai ruang ujian dari currentExam yang sudah diset
        function startExamRoom() {
            if (!currentExam) return;

            switchView('view-student-room');
            requestFullScreen();
            initAntiCheatListeners();

            document.getElementById('exam-student-name').innerText = currentExam.student.name;
            document.getElementById('exam-student-class').innerText = currentExam.student.class;
            document.getElementById('exam-package-title').innerText = currentExam.package.title;

            initExamTimer();
            renderExamQuestion();
        }


        // ==========================================
        // 4. MANAGEMENT GURU - MANAGEMENT PAKET UJIAN
        // ==========================================
        function generateRandomToken() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let token = '';
            for (let i = 0; i < 6; i++) {
                token += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            document.getElementById('pkg-token').value = token;
        }

        function handleCreatePackage(event) {
            event.preventDefault();
            const title       = document.getElementById('pkg-title').value.trim();
            const duration    = parseInt(document.getElementById('pkg-duration').value);
            const minDuration = parseInt(document.getElementById('pkg-min-duration').value) || 0;
            const token       = document.getElementById('pkg-token').value.trim().toUpperCase();
            const acakSoal    = document.getElementById('pkg-random-soal').checked;
            const acakOpsi    = document.getElementById('pkg-random-opsi').checked;
            const openAt      = document.getElementById('pkg-open-at').value  || null;
            const closeAt     = document.getElementById('pkg-close-at').value || null;
            const showScore   = document.getElementById('pkg-show-score').checked;
            const showAnswer  = document.getElementById('pkg-show-answer').checked;

            if (token.length !== 6) {
                showToast("Token Salah", "Token wajib terdiri atas 6 karakter.", "danger");
                return;
            }
            if (minDuration > duration) {
                showToast("Aturan Selesai Salah", "Durasi minimal selesai tidak boleh melebihi durasi maksimal ujian.", "danger");
                return;
            }
            if (openAt && closeAt && new Date(openAt) >= new Date(closeAt)) {
                showToast("Jangka Waktu Salah", "Waktu tutup harus lebih lambat dari waktu buka.", "danger");
                return;
            }

            const isDuplicateToken = db.packages.some(p => p.token === token);
            if (isDuplicateToken) {
                showToast("Token Duplikat", "Token sudah digunakan paket lain.", "danger");
                return;
            }

            const newPkg = {
                id: 'pkg_' + Date.now(),
                title, duration, minDuration, token, acakSoal, acakOpsi,
                openAt, closeAt, showScore, showAnswer,
                questions: []
            };

            db.packages.push(newPkg);
            dbUpsertPackage(newPkg);
            saveDB();
            document.getElementById('form-create-package').reset();
            showToast("Sukses!", "Paket ujian baru berhasil disimpan.", "success");
            renderAllAdminViews();
        }

        function deletePackage(id) {
            const pkg = db.packages.find(p => p.id === id);
            if (!pkg) return;

            showModalConfirm(
                "Hapus Paket Ujian", 
                `Apakah Anda yakin ingin menghapus paket "${pkg.title}" beserta seluruh soal di dalamnya?`, 
                () => {
                    db.packages = db.packages.filter(p => p.id !== id);
                    dbDeletePackage(id);
                    saveDB();
                    showToast("Dihapus", "Paket ujian berhasil dihapus.", "info");
                    renderAllAdminViews();
                }
            );
        }

        // Edit metadata paket — isi form dengan data existing
        function openEditPackage(id) {
            const pkg = db.packages.find(p => p.id === id);
            if (!pkg) return;

            switchAdminTab('tab-questions');

            document.getElementById('pkg-title').value        = pkg.title        || '';
            document.getElementById('pkg-duration').value     = pkg.duration     || '';
            document.getElementById('pkg-min-duration').value = pkg.minDuration  || 0;
            document.getElementById('pkg-token').value        = pkg.token        || '';
            document.getElementById('pkg-random-soal').checked = pkg.acakSoal   || false;
            document.getElementById('pkg-random-opsi').checked = pkg.acakOpsi   || false;
            // datetime-local format: YYYY-MM-DDTHH:MM
            const toLocalDT = (iso) => iso ? iso.slice(0, 16) : '';
            document.getElementById('pkg-open-at').value  = toLocalDT(pkg.openAt);
            document.getElementById('pkg-close-at').value = toLocalDT(pkg.closeAt);

            const form   = document.getElementById('form-create-package');
            const btn    = document.getElementById('btn-pkg-submit');
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> Simpan Perubahan';
            btn.classList.replace('bg-brand-600', 'bg-amber-500');
            btn.classList.replace('hover:bg-brand-700', 'hover:bg-amber-600');

            form.onsubmit = function(e) {
                e.preventDefault();
                const newTitle       = document.getElementById('pkg-title').value.trim();
                const newDuration    = parseInt(document.getElementById('pkg-duration').value);
                const newMinDuration = parseInt(document.getElementById('pkg-min-duration').value) || 0;
                const newToken       = document.getElementById('pkg-token').value.trim().toUpperCase();
                const newAcakSoal    = document.getElementById('pkg-random-soal').checked;
                const newAcakOpsi    = document.getElementById('pkg-random-opsi').checked;
                const newOpenAt      = document.getElementById('pkg-open-at').value  || null;
                const newCloseAt     = document.getElementById('pkg-close-at').value || null;

                if (newToken.length !== 6) {
                    showToast("Token Salah", "Token wajib 6 karakter.", "danger"); return;
                }
                if (newMinDuration > newDuration) {
                    showToast("Durasi Salah", "Min pengerjaan tidak boleh > durasi maks.", "danger"); return;
                }
                // Cek duplikat token kecuali milik paket ini
                const dupToken = db.packages.some(p => p.id !== id && p.token === newToken);
                if (dupToken) {
                    showToast("Token Duplikat", "Token sudah dipakai paket lain.", "danger"); return;
                }

                const idx = db.packages.findIndex(p => p.id === id);
                if (idx !== -1) {
                    db.packages[idx] = {
                        ...db.packages[idx],
                        title: newTitle, duration: newDuration, minDuration: newMinDuration,
                        token: newToken, acakSoal: newAcakSoal, acakOpsi: newAcakOpsi,
                        openAt: newOpenAt, closeAt: newCloseAt
                    };
                    dbUpsertPackage(db.packages[idx]);
                    saveDB();
                    showToast("Paket Diperbarui", `"${newTitle}" berhasil disimpan.`, "success");
                    renderAllAdminViews();
                }

                // Reset form ke mode buat baru
                form.reset();
                form.onsubmit = handleCreatePackage;
                btn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Buat Paket Ujian';
                btn.classList.replace('bg-amber-500', 'bg-brand-600');
                btn.classList.replace('hover:bg-amber-600', 'hover:bg-brand-700');
            };

            document.getElementById('form-create-package').scrollIntoView({ behavior: 'smooth', block: 'center' });
            showToast("Mode Edit Paket", `Mengedit "${pkg.title}". Ubah field lalu klik Simpan Perubahan.`, "info");
        }


        // ==========================================
        // 5. DATABASE SOAL KHUSUS (DEDICATED VIEW)
        // ==========================================
        let currentManagePkgId = null;

        function openManageQuestions(pkgId) {
            currentManagePkgId = pkgId;
            const pkg = db.packages.find(p => p.id === pkgId);
            if (!pkg) return;

            document.getElementById('manage-pkg-title').innerText = pkg.title;
            document.getElementById('manage-pkg-id').innerText = pkg.id;

            resetQuestionForm();
            switchView('view-admin-manage-questions');
            renderManageQuestionsList();
        }

        function handleManageTypeChange() {
            const type = document.getElementById('mq-type').value;
            const container = document.getElementById('mq-dynamic-answers-container');
            container.innerHTML = '';

            if (type === 'pilihan-ganda') {
                container.innerHTML = `
                    <p class="text-xs font-bold text-slate-500 mb-2">Pilihan Ganda (Tulis opsi polos & pilih 1 kunci jawaban benar):</p>
                    <div class="space-y-2">
                        ${[0,1,2,3,4].map(idx => {
                            const label = String.fromCharCode(65 + idx);
                            return `
                                <div class="flex items-center space-x-2">
                                    <input type="radio" name="mq-correct-radio" value="${idx}" required class="w-4 h-4 text-brand-600">
                                    <span class="text-xs font-bold text-slate-500 w-5">${label}.</span>
                                    <input type="text" id="mq-opt-${idx}" required placeholder="Opsi jawaban ${label}" class="flex-grow text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-white rounded-lg">
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else if (type === 'pilihan-ganda-kompleks') {
                container.innerHTML = `
                    <p class="text-xs font-bold text-slate-500 mb-2">Pilihan Ganda Kompleks (Tulis opsi polos & centang kunci jawaban benar):</p>
                    <div class="space-y-2">
                        ${[0,1,2,3,4].map(idx => {
                            const label = String.fromCharCode(65 + idx);
                            return `
                                <div class="flex items-center space-x-2">
                                    <input type="checkbox" id="mq-correct-chk-${idx}" value="${idx}" class="w-4 h-4 text-brand-600 rounded">
                                    <span class="text-xs font-bold text-slate-500 w-5">${label}.</span>
                                    <input type="text" id="mq-opt-${idx}" required placeholder="Opsi jawaban ${label}" class="flex-grow text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-white rounded-lg">
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else if (type === 'benar-salah') {
                container.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <p class="text-xs font-bold text-slate-500">Daftar Pernyataan (Tabel Benar/Salah):</p>
                            <button type="button" onclick="addStatementRow()" class="text-[10px] font-bold bg-brand-50 hover:bg-brand-100 text-brand-600 px-2 py-1 rounded"><i class="fa-solid fa-plus mr-1"></i> Tambah Baris</button>
                        </div>
                        <div id="mq-statements-container" class="space-y-2">
                            <!-- Input baris pernyataan diisi via fungsi helper -->
                        </div>
                    </div>
                `;
                addStatementRow();
            } else if (type === 'isian-singkat') {
                container.innerHTML = `
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Kunci Jawaban Resmi (Isian Singkat)</label>
                        <input type="text" id="mq-kunci-isian" required placeholder="Contoh: DOM" class="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-white rounded-lg">
                        <p class="text-[10px] text-slate-400 mt-1">Non-kapital & menghilangkan spasi luar saat penilaian otomatis.</p>
                    </div>
                `;
            }
        }

        // Helper tambah baris tabel benar/salah
        function addStatementRow(text = '', selectVal = 'Benar') {
            const container = document.getElementById('mq-statements-container');
            if (!container) return;
            const rowCount = container.children.length;

            const div = document.createElement('div');
            div.className = "flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700";
            div.innerHTML = `
                <span class="text-[10px] text-slate-400 font-bold font-mono">#${rowCount + 1}</span>
                <input type="text" placeholder="Teks pernyataan..." value="${text}" required class="mq-stmt-input flex-grow text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-white rounded-md">
                <select class="mq-stmt-correct text-xs border border-slate-200 dark:border-slate-700 rounded-md py-1 px-1.5 bg-slate-50 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200">
                    <option value="Benar" ${selectVal === 'Benar' ? 'selected' : ''}>Benar</option>
                    <option value="Salah" ${selectVal === 'Salah' ? 'selected' : ''}>Salah</option>
                </select>
                <button type="button" onclick="this.parentElement.remove(); reorderStatements();" class="text-rose-500 hover:text-rose-700 p-1 text-xs"><i class="fa-solid fa-trash-can"></i></button>
            `;
            container.appendChild(div);
        }

        function reorderStatements() {
            const container = document.getElementById('mq-statements-container');
            Array.from(container.children).forEach((child, index) => {
                child.querySelector('span').innerText = `#${index + 1}`;
            });
        }

        // Simpan / Update Soal
        function handleManageSaveQuestion(event) {
            event.preventDefault();
            const pkg = db.packages.find(p => p.id === currentManagePkgId);
            if (!pkg) return;

            const qId = document.getElementById('edit-q-id').value;
            const type = document.getElementById('mq-type').value;
            const text = document.getElementById('mq-text').value.trim();

            let options = [];
            let correct = [];

            if (type === 'pilihan-ganda') {
                const selectedRadio = document.querySelector('input[name="mq-correct-radio"]:checked');
                if (!selectedRadio) {
                    showToast("Kunci Belum Ditentukan", "Silakan pilih salah satu opsi yang benar.", "danger");
                    return;
                }
                const correctIdx = parseInt(selectedRadio.value);
                
                for(let i=0; i<5; i++) {
                    const val = document.getElementById('mq-opt-' + i).value.trim();
                    options.push(val);
                    if (i === correctIdx) {
                        correct.push(val);
                    }
                }
            } else if (type === 'pilihan-ganda-kompleks') {
                const checkedBoxes = document.querySelectorAll('input[id^="mq-correct-chk-"]:checked');
                if (checkedBoxes.length === 0) {
                    showToast("Kunci Belum Ditentukan", "Silakan centang opsi-opsi yang benar.", "danger");
                    return;
                }

                for(let i=0; i<5; i++) {
                    const val = document.getElementById('mq-opt-' + i).value.trim();
                    options.push(val);
                }

                checkedBoxes.forEach(chk => {
                    const idx = parseInt(chk.value);
                    correct.push(options[idx]);
                });
            } else if (type === 'benar-salah') {
                const stmtInputs = document.querySelectorAll('.mq-stmt-input');
                const stmtCorrects = document.querySelectorAll('.mq-stmt-correct');
                if (stmtInputs.length === 0) {
                    showToast("Pernyataan Kosong", "Minimal isi 1 baris pernyataan untuk tabel Benar/Salah.", "danger");
                    return;
                }

                stmtInputs.forEach((inp, i) => {
                    options.push(inp.value.trim());
                    correct.push(stmtCorrects[i].value);
                });
            } else if (type === 'isian-singkat') {
                const isian = document.getElementById('mq-kunci-isian').value.trim();
                options = [];
                correct = [isian];
            }

            if (qId) {
                // Mode Edit
                const questionIndex = pkg.questions.findIndex(q => q.id === qId);
                if (questionIndex !== -1) {
                    pkg.questions[questionIndex] = { id: qId, type, text, options, correct };
                    showToast("Soal Diperbarui", "Soal berhasil diperbarui di database.", "success");
                }
            } else {
                // Mode Tambah Baru
                const newQuestion = {
                    id: 'q_' + Date.now(),
                    type, text, options, correct
                };
                pkg.questions.push(newQuestion);
                showToast("Soal Disimpan", "Soal baru berhasil ditambahkan.", "success");
            }

            // Simpan soal (beserta seluruh questions array) ke Supabase
            dbUpsertPackage(pkg);
            saveDB();
            resetQuestionForm();
            renderManageQuestionsList();
            renderAllAdminViews();
        }

        // Reset Formulir
        function resetQuestionForm() {
            document.getElementById('edit-q-id').value = '';
            document.getElementById('mq-text').value = '';
            document.getElementById('mq-type').value = 'pilihan-ganda';
            document.getElementById('form-question-title').querySelector('span').innerText = 'Tambah Soal Baru';
            document.getElementById('btn-cancel-edit').classList.add('hidden');
            handleManageTypeChange();
        }

        // Tampilkan List Soal dalam Halaman Kelola
        function renderManageQuestionsList() {
            const container = document.getElementById('mq-questions-list-container');
            container.innerHTML = '';

            const pkg = db.packages.find(p => p.id === currentManagePkgId);
            if (!pkg || pkg.questions.length === 0) {
                container.innerHTML = `
                    <div class="text-center p-8 text-slate-400">
                        <i class="fa-solid fa-folder-open text-3xl mb-2 block"></i> Belum ada butir soal. Silakan buat menggunakan formulir di kiri.
                    </div>
                `;
                return;
            }

            pkg.questions.forEach((q, idx) => {
                const card = document.createElement('div');
                card.className = "p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 rounded-xl space-y-3";
                
                let answersPreview = '';
                if (q.type === 'pilihan-ganda' || q.type === 'pilihan-ganda-kompleks') {
                    answersPreview = `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            ${q.options.map((opt, i) => {
                                const isCorrect = q.correct.includes(opt);
                                return `
                                    <div class="flex items-center space-x-1 ${isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}">
                                        <span class="font-bold">${String.fromCharCode(65 + i)}.</span>
                                        <span>${opt}</span>
                                        ${isCorrect ? '<i class="fa-solid fa-circle-check text-[10px] ml-1"></i>' : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                } else if (q.type === 'benar-salah') {
                    answersPreview = `
                        <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mt-1 max-w-md bg-white dark:bg-slate-800">
                            <table class="w-full text-[10px] text-left">
                                <tr class="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"><th class="p-1 px-2 font-bold">Pernyataan</th><th class="p-1 px-2 text-center font-bold">Kunci</th></tr>
                                ${q.options.map((opt, i) => `
                                    <tr class="border-t border-slate-200 dark:border-slate-700"><td class="p-1 px-2 text-slate-600 dark:text-slate-300">${opt}</td><td class="p-1 px-2 text-center text-indigo-600 dark:text-indigo-400 font-bold">${q.correct[i]}</td></tr>
                                `).join('')}
                            </table>
                        </div>
                    `;
                } else {
                    answersPreview = `
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 pt-1">Kunci Isian: <code class="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">${q.correct[0]}</code></p>
                    `;
                }

                card.innerHTML = `
                    <div class="flex justify-between items-start gap-2">
                        <div>
                            <span class="bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full uppercase">${idx+1}. ${q.type.replace('-', ' ')}</span>
                            <h4 class="font-bold text-slate-900 dark:text-white mt-1.5 leading-relaxed">${q.text}</h4>
                            ${answersPreview}
                        </div>
                        <div class="flex space-x-1.5 shrink-0">
                            <button onclick="editQuestion('${q.id}')" class="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded transition" title="Edit Soal"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deleteQuestion('${q.id}')" class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition" title="Hapus Soal"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // Pemicu Edit Soal
        function editQuestion(qId) {
            const pkg = db.packages.find(p => p.id === currentManagePkgId);
            if (!pkg) return;
            const q = pkg.questions.find(item => item.id === qId);
            if (!q) return;

            document.getElementById('edit-q-id').value = q.id;
            document.getElementById('mq-text').value = q.text;
            document.getElementById('mq-type').value = q.type;
            document.getElementById('form-question-title').querySelector('span').innerText = 'Edit Soal';
            document.getElementById('btn-cancel-edit').classList.remove('hidden');

            handleManageTypeChange();

            // Isi kembali nilai-nilai opsi/kunci
            if (q.type === 'pilihan-ganda') {
                q.options.forEach((opt, i) => {
                    document.getElementById('mq-opt-' + i).value = opt;
                    if (q.correct.includes(opt)) {
                        document.querySelector(`input[name="mq-correct-radio"][value="${i}"]`).checked = true;
                    }
                });
            } else if (q.type === 'pilihan-ganda-kompleks') {
                q.options.forEach((opt, i) => {
                    document.getElementById('mq-opt-' + i).value = opt;
                    if (q.correct.includes(opt)) {
                        document.getElementById('mq-correct-chk-' + i).checked = true;
                    }
                });
            } else if (q.type === 'benar-salah') {
                const container = document.getElementById('mq-statements-container');
                container.innerHTML = '';
                q.options.forEach((opt, i) => {
                    addStatementRow(opt, q.correct[i]);
                });
            } else if (q.type === 'isian-singkat') {
                document.getElementById('mq-kunci-isian').value = q.correct[0];
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }


        // ==========================================
        // 6. MANAGEMENT GURU - DATABASE SISWA & REKAP
        // ==========================================
        function handleAddStudent(event) {
            event.preventDefault();
            const name     = document.getElementById('std-name').value.trim();
            const stdClass = document.getElementById('std-class').value.trim().toUpperCase();
            const nis      = document.getElementById('std-nis').value.trim();
            const nisn     = document.getElementById('std-nisn').value.trim();
            const school   = document.getElementById('std-school').value.trim();
            const code     = document.getElementById('std-code').value.trim().toUpperCase();
            const password = document.getElementById('std-password').value.trim();

            if (!code || !password) {
                showToast("Data Kurang", "Kode Murid dan Password wajib diisi.", "danger");
                return;
            }

            const isDuplicateCode = db.students.some(s => (s.code || '').toUpperCase() === code);
            if (isDuplicateCode) {
                showToast("Kode Duplikat", `Kode "${code}" sudah dipakai murid lain.`, "danger");
                return;
            }

            const isDuplicate = db.students.some(s =>
                s.name.toLowerCase() === name.toLowerCase() && s.class === stdClass
            );
            if (isDuplicate) {
                showToast("Duplikasi Data", "Murid dengan nama dan kelas tersebut sudah terdaftar.", "danger");
                return;
            }

            const newStudent = {
                id: 'std_' + Date.now(),
                name, class: stdClass,
                nis: nis || '',
                nisn: nisn || '',
                school: school || '',
                code,
                password
            };
            db.students.push(newStudent);
            dbUpsertStudent(newStudent);
            saveDB();
            document.getElementById('form-add-student').reset();
            showToast("Berhasil Disimpan", "Murid baru berhasil ditambahkan.", "success");
            renderAllAdminViews();
        }

        function generateStudentCode() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
            document.getElementById('std-code').value = code;
        }

        function downloadStudentTemplate() {
            const templateData = [
                { "Nama": "Ahmad Dani",    "Kelas": "XII-IPA-1",  "Sekolah": "SMPIT Assyifa", "NIS": "2024001", "NISN": "0012345678", "Kode": "ADN001", "Password": "dani2024" },
                { "Nama": "Citra Lestari", "Kelas": "XII-IPS-3",  "Sekolah": "SMPIT Assyifa", "NIS": "2024002", "NISN": "0012345679", "Kode": "CLT002", "Password": "citra123" },
                { "Nama": "Zack Ryder",    "Kelas": "XII-RPL-2",  "Sekolah": "SMA Nusantara", "NIS": "2024003", "NISN": "0012345680", "Kode": "ZRD003", "Password": "zack456"  }
            ];
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            const workbook  = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template Murid");
            XLSX.writeFile(workbook, "Template_Import_Pufutara.xlsx");
            showToast("Template Diunduh", "Isi sesuai format lalu upload kembali.", "info");
        }

        function handleExcelImport(event) {
            const file = event.target.files[0];
            if (!file) return;

            document.getElementById('excel-file-name').innerText = file.name;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);

                    let importedCount = 0;
                    let skippedCount = 0;

                    json.forEach(row => {
                        const keys = Object.keys(row);
                        const nameKey     = keys.find(k => k.toLowerCase() === 'nama');
                        const classKey    = keys.find(k => k.toLowerCase() === 'kelas');
                        const nisKey      = keys.find(k => k.toLowerCase() === 'nis');
                        const nisnKey     = keys.find(k => k.toLowerCase() === 'nisn');
                        const codeKey     = keys.find(k => k.toLowerCase() === 'kode');
                        const passwordKey = keys.find(k => k.toLowerCase() === 'password');

                        if (nameKey && classKey && codeKey && passwordKey) {
                            const rawName     = String(row[nameKey]).trim();
                            const rawClass    = String(row[classKey]).trim().toUpperCase();
                            const rawNis      = nisKey      ? String(row[nisKey]).trim()      : '';
                            const rawNisn     = nisnKey     ? String(row[nisnKey]).trim()     : '';
                            const rawCode     = String(row[codeKey]).trim().toUpperCase();
                            const rawPassword = String(row[passwordKey]).trim();

                            if (rawName && rawClass && rawCode && rawPassword) {
                                const isDuplicateCode = db.students.some(s => (s.code || '').toUpperCase() === rawCode);
                                const isDuplicate = db.students.some(s =>
                                    s.name.toLowerCase() === rawName.toLowerCase() && s.class === rawClass
                                );
                                if (!isDuplicate && !isDuplicateCode) {
                                    const imp = {
                                        id: 'std_imp_' + Math.random().toString(36).substr(2, 9),
                                        name: rawName, class: rawClass,
                                        nis: rawNis, nisn: rawNisn,
                                        code: rawCode, password: rawPassword
                                    };
                                    db.students.push(imp);
                                    dbUpsertStudent(imp);
                                    importedCount++;
                                } else {
                                    skippedCount++;
                                }
                            }
                        }
                    });

                    if (importedCount > 0) {
                        saveDB();
                        showToast("Impor Berhasil", `Berhasil mengimpor ${importedCount} murid. (${skippedCount} diabaikan).`, "success");
                        renderAllAdminViews();
                    } else {
                        showToast("Impor Gagal", "Format kolom atau data murid sudah duplikat.", "danger");
                    }

                } catch (error) {
                    console.error(error);
                    showToast("Error Membaca File", "Sistem gagal mengolah isi spreadsheet.", "danger");
                }
                document.getElementById('excel-file-input').value = '';
            };
            reader.readAsArrayBuffer(file);
        }

        function deleteStudent(id) {
            const std = db.students.find(s => s.id === id);
            if (!std) return;

            showModalConfirm(
                "Hapus Murid", 
                `Hapus "${std.name}" (${std.class}) dari database secara permanen?`, 
                () => {
                    db.students = db.students.filter(s => s.id !== id);
                    dbDeleteStudent(id);
                    saveDB();
                    showToast("Terhapus", "Data murid berhasil dihapus.", "info");
                    renderAllAdminViews();
                }
            );
        }

        // Edit data murid — isi ulang form dengan data existing
        function openEditStudent(id) {
            const std = db.students.find(s => s.id === id);
            if (!std) return;

            // Pindah ke tab students jika belum di sana
            switchAdminTab('tab-students');

            // Isi form dengan data murid
            document.getElementById('std-name').value     = std.name     || '';
            document.getElementById('std-class').value    = std.class    || '';
            document.getElementById('std-nis').value      = std.nis      || '';
            document.getElementById('std-nisn').value     = std.nisn     || '';
            document.getElementById('std-code').value     = std.code     || '';
            document.getElementById('std-password').value = std.password || '';

            // Ganti tombol submit agar update, bukan tambah baru
            const form = document.getElementById('form-add-student');
            const btn  = form.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> Simpan Perubahan';
            btn.classList.replace('bg-brand-600', 'bg-amber-500');
            btn.classList.replace('hover:bg-brand-700', 'hover:bg-amber-600');

            // Override onsubmit untuk mode edit
            form.onsubmit = function(e) {
                e.preventDefault();
                const updatedName     = document.getElementById('std-name').value.trim();
                const updatedClass    = document.getElementById('std-class').value.trim().toUpperCase();
                const updatedNis      = document.getElementById('std-nis').value.trim();
                const updatedNisn     = document.getElementById('std-nisn').value.trim();
                const updatedCode     = document.getElementById('std-code').value.trim().toUpperCase();
                const updatedPassword = document.getElementById('std-password').value.trim();

                if (!updatedCode || !updatedPassword) {
                    showToast("Data Kurang", "Kode dan Password wajib diisi.", "danger");
                    return;
                }

                // Cek duplikat kode, kecuali milik murid ini sendiri
                const isDuplicateCode = db.students.some(s => s.id !== id && (s.code || '').toUpperCase() === updatedCode);
                if (isDuplicateCode) {
                    showToast("Kode Duplikat", `Kode "${updatedCode}" sudah dipakai murid lain.`, "danger");
                    return;
                }

                // Update data di cache lokal
                const idx = db.students.findIndex(s => s.id === id);
                if (idx !== -1) {
                    db.students[idx] = {
                        ...db.students[idx],
                        name: updatedName, class: updatedClass,
                        nis: updatedNis, nisn: updatedNisn,
                        code: updatedCode, password: updatedPassword
                    };
                    dbUpsertStudent(db.students[idx]);
                    saveDB();
                    showToast("Berhasil Diperbarui", `Data ${updatedName} berhasil disimpan.`, "success");
                    renderAllAdminViews();
                }

                // Kembalikan form ke mode tambah baru
                form.reset();
                form.onsubmit = handleAddStudent;
                btn.innerHTML = '<i class="fa-solid fa-user-check mr-1"></i> Simpan Murid';
                btn.classList.replace('bg-amber-500', 'bg-brand-600');
                btn.classList.replace('hover:bg-amber-600', 'hover:bg-brand-700');
            };

            // Scroll ke form
            document.getElementById('form-add-student').scrollIntoView({ behavior: 'smooth', block: 'center' });
            showToast("Mode Edit", `Mengedit data ${std.name}. Ubah kolom lalu klik Simpan Perubahan.`, "info");
        }

        function clearStudentsData() {
            showModalConfirm(
                "Kosongkan Database Murid", 
                "Tindakan ini akan menghapus seluruh data siswa terdaftar secara mutlak. Lanjutkan?", 
                () => {
                    db.students = [];
                    saveDB();
                    showToast("Selesai Clean", "Database murid kosong.", "info");
                    renderAllAdminViews();
                }
            );
        }


        // ==========================================
        // 7. RENDER ELEMENT DINAMIS (ADMIN AREA)
        // ==========================================
        function updateDashboardStats() {
            const students = filterBySchool(db.students);
            const packages = filterBySchool(db.packages);
            const scores   = filterBySchool(db.scores);

            document.getElementById('stat-total-students').innerText = students.length;
            const uniqueClasses = [...new Set(students.map(s => s.class))];
            document.getElementById('stat-total-classes').innerText = uniqueClasses.length;
            document.getElementById('stat-total-packages').innerText = packages.length;
            document.getElementById('stat-total-scores').innerText = scores.length;

            // Tampilkan info sekolah di header dashboard jika admin sekolah
            const schoolBadge = document.getElementById('admin-school-badge');
            if (schoolBadge) {
                if (currentAdmin) {
                    schoolBadge.textContent = currentAdmin.school;
                    schoolBadge.classList.remove('hidden');
                } else {
                    schoolBadge.classList.add('hidden');
                }
            }
        }

        function renderAllAdminViews() {
            updateDashboardStats();
            renderPackagesTable();
            renderStudentsTable();
            renderScoresTable();
            if (document.getElementById('tab-admins') && !document.getElementById('tab-admins').classList.contains('hidden')) {
                renderAdminsTable();
            }
        }

        function renderPackagesTable() {
            const tbody = document.getElementById('tbl-packages-body');
            tbody.innerHTML = '';

            const packages = filterBySchool(db.packages);

            if (packages.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 dark:text-slate-500">Belum ada paket ujian terdaftar.</td></tr>`;
                return;
            }

            packages.forEach(pkg => {
                const row = document.createElement('tr');
                row.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
                
                let acakBadge = '';
                if (pkg.acakSoal || pkg.acakOpsi) {
                    acakBadge = `
                        <div class="flex flex-col gap-0.5 justify-center items-center">
                            ${pkg.acakSoal ? '<span class="bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 text-[9px] font-semibold px-2 py-0.5 rounded border border-teal-200 dark:border-teal-900">Soal Acak</span>' : ''}
                            ${pkg.acakOpsi ? '<span class="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[9px] font-semibold px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">Opsi Acak</span>' : ''}
                        </div>
                    `;
                } else {
                    acakBadge = '<span class="text-slate-400">-</span>';
                }

                // Selesai Min fallback display
                const minFinishTimeDisplay = pkg.minDuration ? `${pkg.minDuration}m` : 'Bebas';

                // Jangka waktu buka ujian
                const fmt = (dt) => dt ? new Date(dt).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : null;
                const openStr  = fmt(pkg.openAt);
                const closeStr = fmt(pkg.closeAt);
                let jangkaHtml = '<span class="text-slate-400 text-[10px]">Selalu Terbuka</span>';
                if (openStr || closeStr) {
                    const now = new Date();
                    const isOpen = (!pkg.openAt || now >= new Date(pkg.openAt)) && (!pkg.closeAt || now <= new Date(pkg.closeAt));
                    const statusBadge = isOpen
                        ? '<span class="text-emerald-600 dark:text-emerald-400 font-bold text-[9px]">● BUKA</span>'
                        : '<span class="text-rose-500 dark:text-rose-400 font-bold text-[9px]">● TUTUP</span>';
                    jangkaHtml = `
                        <div class="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            ${statusBadge}
                            ${openStr  ? `<div>Buka: <span class="font-semibold">${openStr}</span></div>`  : ''}
                            ${closeStr ? `<div>Tutup: <span class="font-semibold">${closeStr}</span></div>` : ''}
                        </div>
                    `;
                }

                row.innerHTML = `
                    <td class="p-3">
                        <div class="font-bold text-slate-900 dark:text-white">${pkg.title}</div>
                        <span class="text-[10px] text-slate-400 dark:text-slate-500">ID: ${pkg.id}</span>
                    </td>
                    <td class="p-3"><code class="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-mono font-bold tracking-wider">${pkg.token}</code></td>
                    <td class="p-3 text-center text-slate-600 dark:text-slate-300">
                        <div class="font-semibold text-xs">Max: ${pkg.duration} Menit</div>
                        <div class="text-[10px] text-slate-400 dark:text-slate-500">Min Kumpul: ${minFinishTimeDisplay}</div>
                    </td>
                    <td class="p-3 text-center">${jangkaHtml}</td>
                    <td class="p-3 text-center">
                        <span class="bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-full text-xs font-bold">${pkg.questions.length} Soal</span>
                    </td>
                    <td class="p-3 text-center">${acakBadge}</td>
                    <td class="p-3 text-right flex justify-end space-x-2">
                        <button onclick="openEditPackage('${pkg.id}')" class="bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-400 text-xs px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900 transition" title="Edit paket"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="openManageQuestions('${pkg.id}')" class="bg-brand-50 dark:bg-brand-950 hover:bg-brand-100 dark:hover:bg-brand-900 text-brand-600 dark:text-brand-400 text-xs px-2.5 py-1.5 rounded-xl border border-brand-100 dark:border-brand-900 transition"><i class="fa-solid fa-folder-tree mr-1"></i> Kelola & Edit Soal</button>
                        <button onclick="deletePackage('${pkg.id}')" class="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 text-xs px-2.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900 transition"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function renderStudentsTable() {
            const tbody = document.getElementById('tbl-students-body');
            tbody.innerHTML = '';

            const students = filterBySchool(db.students);

            if (students.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400 dark:text-slate-500">Database murid kosong.</td></tr>`;
                return;
            }

            const reversedStudents = [...students].reverse();
            reversedStudents.forEach(std => {
                const row = document.createElement('tr');
                row.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
                row.innerHTML = `
                    <td class="p-3 font-semibold text-slate-900 dark:text-white">${std.name}</td>
                    <td class="p-3"><span class="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded text-[11px] font-bold">${std.class}</span></td>
                    <td class="p-3 text-slate-500 dark:text-slate-400 text-[11px]">${std.school || '<span class="text-slate-300 dark:text-slate-600">—</span>'}</td>
                    <td class="p-3 text-slate-500 dark:text-slate-400">${std.nis || '<span class="text-slate-300 dark:text-slate-600">—</span>'}</td>
                    <td class="p-3 text-slate-500 dark:text-slate-400">${std.nisn || '<span class="text-slate-300 dark:text-slate-600">—</span>'}</td>
                    <td class="p-3"><code class="bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded text-[11px] font-bold font-mono">${std.code || '—'}</code></td>
                    <td class="p-3"><span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">${std.password || '—'}</span></td>
                    <td class="p-3 text-right space-x-1">
                        <button onclick="openEditStudent('${std.id}')" class="text-indigo-500 hover:text-indigo-700 text-sm transition p-1" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteStudent('${std.id}')" class="text-rose-500 hover:text-rose-700 text-sm transition p-1" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function renderScoresTable() {
            const tbody = document.getElementById('tbl-scores-body');
            tbody.innerHTML = '';

            const scores = filterBySchool(db.scores);

            if (scores.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 dark:text-slate-500">Belum ada nilai terdaftar.</td></tr>`;
                return;
            }

            const sortedScores = [...scores].reverse();
            sortedScores.forEach(sc => {
                const isBlocked = sc.status && sc.status.includes("DIBLOKIR");
                const statusBadge = isBlocked 
                    ? `<span class="bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-ban"></i> DIBLOKIR (CURANG)</span>`
                    : `<span class="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-check"></i> NORMAL</span>`;

                const row = document.createElement('tr');
                row.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
                row.innerHTML = `
                    <td class="p-3 font-semibold text-slate-900 dark:text-white">${sc.studentName}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${sc.studentClass}</td>
                    <td class="p-3 text-slate-500 dark:text-slate-400 font-medium">${sc.packageName}</td>
                    <td class="p-3 text-center text-slate-500 dark:text-slate-400 font-mono">${sc.correctCount} / ${sc.totalQuestions}</td>
                    <td class="p-3 text-center">
                        <span class="text-sm font-black ${isBlocked ? 'text-rose-600 dark:text-rose-400' : 'text-brand-600 dark:text-brand-400'}">${sc.score}</span>
                    </td>
                    <td class="p-3 text-center">${statusBadge}</td>
                    <td class="p-3 text-right flex justify-end space-x-1.5">
                        <button onclick="viewScoreDetail('${sc.id}')" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-sm p-1.5 transition" title="Lihat Pekerjaan"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="deleteScore('${sc.id}')" class="text-rose-500 hover:text-rose-700 text-sm p-1.5 transition" title="Hapus Nilai"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }


        // ==========================================
        // 8. LOGIKA DASHBOARD & DETAIL HASIL MURID
        // ==========================================
        function renderStudentDashboardExams() {
            if (!authenticatedStudent) return;

            // 1. Tampilkan Ujian Aktif
            const container = document.getElementById('student-active-exams-list');
            container.innerHTML = '';

            const availablePackages = db.packages.filter(p => p.questions.length > 0);

            if (availablePackages.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500">
                        <i class="fa-solid fa-umbrella text-4xl mb-2 block text-slate-300"></i> Belum ada paket ujian aktif yang tersedia saat ini.
                    </div>
                `;
            } else {
                availablePackages.forEach(pkg => {
                    // Cari status apakah murid sudah menyelesaikan ujian ini
                    const isDone = db.scores.some(sc => 
                        sc.studentName.toLowerCase() === authenticatedStudent.name.toLowerCase() &&
                        sc.studentClass === authenticatedStudent.class &&
                        sc.packageName === pkg.title
                    );

                    const card = document.createElement('div');
                    card.className = "bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 p-5 rounded-2xl shadow-sm flex flex-col justify-between";
                    
                    let actionButton = '';
                    if (isDone) {
                        actionButton = `
                            <button disabled class="w-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-bold py-2 px-4 rounded-xl text-xs cursor-not-allowed">
                                <i class="fa-solid fa-circle-check mr-1 text-emerald-500 dark:text-emerald-400"></i> Sudah Selesai Dikerjakan
                            </button>
                        `;
                    } else {
                        actionButton = `
                            <button onclick="promptExamToken('${pkg.id}')" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition shadow-md shadow-brand-100 dark:shadow-none flex items-center justify-center space-x-1">
                                <i class="fa-solid fa-play text-[10px]"></i>
                                <span>Mulai Ujian</span>
                            </button>
                        `;
                    }

                    const minFinDisplay = pkg.minDuration ? `${pkg.minDuration} Menit` : 'Langsung Boleh Kumpul';

                    card.innerHTML = `
                        <div>
                            <div class="flex justify-between items-start gap-1">
                                <h4 class="font-bold text-slate-900 dark:text-white leading-snug">${pkg.title}</h4>
                            </div>
                            <div class="space-y-1.5 mt-3 border-t border-slate-100 dark:border-slate-700 pt-3 mb-4">
                                <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>Durasi Maksimal:</span>
                                    <strong class="text-slate-700 dark:text-slate-200">${pkg.duration} Menit</strong>
                                </div>
                                <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>Waktu Minimal Selesai:</span>
                                    <strong class="text-slate-700 dark:text-slate-200">${minFinDisplay}</strong>
                                </div>
                                <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>Jumlah Soal:</span>
                                    <strong class="text-slate-700 dark:text-slate-200">${pkg.questions.length} Butir</strong>
                                </div>
                            </div>
                        </div>
                        ${actionButton}
                    `;
                    container.appendChild(card);
                });
            }

            // 2. Tampilkan Riwayat Ujian Saya
            const tbody = document.getElementById('tbl-student-history-body');
            tbody.innerHTML = '';

            const myHistory = db.scores.filter(sc => 
                sc.studentName.toLowerCase() === authenticatedStudent.name.toLowerCase() &&
                sc.studentClass === authenticatedStudent.class
            );

            if (myHistory.length === 0) {
                tbody.innerHTML = `
                    <tr><td colspan="5" class="p-6 text-center text-slate-400 dark:text-slate-500">Belum ada riwayat ujian yang Anda selesaikan.</td></tr>
                `;
            } else {
                myHistory.forEach(sc => {
                    const isBlocked = sc.status && sc.status.includes("DIBLOKIR");
                    const statusBadge = isBlocked 
                        ? `<span class="bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded"><i class="fa-solid fa-ban"></i> DIBLOKIR</span>`
                        : `<span class="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded"><i class="fa-solid fa-circle-check"></i> SELESAI</span>`;

                    const row = document.createElement('tr');
                    row.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
                    row.innerHTML = `
                        <td class="p-3 font-semibold text-slate-900 dark:text-white">${sc.packageName}</td>
                        <td class="p-3 text-center text-slate-600 dark:text-slate-300 font-mono">${sc.correctCount} / ${sc.totalQuestions}</td>
                        <td class="p-3 text-center"><strong class="text-brand-600 dark:text-brand-400">${sc.score}</strong></td>
                        <td class="p-3 text-center">${statusBadge}</td>
                        <td class="p-3 text-right">
                            <button onclick="viewScoreDetail('${sc.id}')" class="bg-slate-900 dark:bg-slate-700 hover:bg-slate-950 dark:hover:bg-slate-600 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition">
                                <i class="fa-solid fa-eye mr-1"></i> Lihat Hasil
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }


        // ==========================================
        // 9. VERIFIKASI TOKEN & MEMULAI UJIAN
        // ==========================================
        let targetedExamPkgId = null;

        function promptExamToken(pkgId) {
            targetedExamPkgId = pkgId;
            document.getElementById('modal-token-input').value = '';
            document.getElementById('token-modal').classList.remove('hidden');
        }

        function closeTokenModal() {
            document.getElementById('token-modal').classList.add('hidden');
        }

        function submitTokenVerif() {
            const tokenInput = document.getElementById('modal-token-input').value.trim().toUpperCase();
            const pkg = db.packages.find(p => p.id === targetedExamPkgId);
            if (!pkg) return;

            if (pkg.token !== tokenInput) {
                showToast("Token Salah!", "Kode token ujian yang Anda masukkan tidak valid.", "danger");
                return;
            }

            closeTokenModal();

            // Set Up Sesi Baru Ujian
            let examQuestions = JSON.parse(JSON.stringify(pkg.questions));

            // Jika acak opsi aktif, acak opsi pilihan ganda dan kompleks
            if (pkg.acakOpsi) {
                examQuestions.forEach(q => {
                    if (q.type === 'pilihan-ganda' || q.type === 'pilihan-ganda-kompleks') {
                        q.options = shuffleArray([...q.options]);
                    }
                });
            }

            // Jika acak soal aktif, acak daftar soal
            if (pkg.acakSoal) {
                examQuestions = shuffleArray(examQuestions);
            }

            // Inisialisasi State Ujian Aktif
            currentExam = {
                student: { name: authenticatedStudent.name, class: authenticatedStudent.class },
                package: {
                    id: pkg.id,
                    title: pkg.title,
                    duration: pkg.duration,
                    minDuration: pkg.minDuration || 0, // Minutes
                    token: pkg.token,
                    questions: examQuestions
                },
                answers: {},
                doubtful: {}, // Menyimpan state ragu-ragu { questionId: boolean }
                timer: pkg.duration * 60,
                activeIdx: 0,
                isSubmitted: false
            };

            saveExamSession();
            startExamRoom();
        }


        // ==========================================
        // 10. ENGINE ANTI-CHEAT EKSTREM & TIMER (INSTAN BLOKIR)
        // ==========================================
        let timerInterval = null;
        let cheatListenersAttached = false;

        function requestFullScreen() {
            const docEl = document.documentElement;
            if (docEl.requestFullscreen) {
                docEl.requestFullscreen().catch(err => console.log(err));
            } else if (docEl.mozRequestFullScreen) {
                docEl.mozRequestFullScreen().catch(err => console.log(err));
            } else if (docEl.webkitRequestFullscreen) {
                docEl.webkitRequestFullscreen().catch(err => console.log(err));
            } else if (docEl.msRequestFullscreen) {
                docEl.msRequestFullscreen().catch(err => console.log(err));
            }
        }

        function initAntiCheatListeners() {
            if (cheatListenersAttached) return;

            document.addEventListener('contextmenu', function(e) {
                if (currentExam && !currentExam.isSubmitted && !document.getElementById('view-student-room').classList.contains('hidden')) {
                    e.preventDefault();
                    showToast("Sistem Proteksi", "Klik kanan dilarang keras demi kejujuran.", "warning");
                }
            });

            document.addEventListener('keydown', function(e) {
                if (currentExam && !currentExam.isSubmitted && !document.getElementById('view-student-room').classList.contains('hidden')) {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'a')) {
                        e.preventDefault();
                        showToast("Aksi Dilarang", "Shortcut menyalin/menempel dinonaktifkan.", "warning");
                    }
                }
            });

            // 1 KALI MELANGGAR = LANGSUNG BLOKIR INSTAN (Tanpa toleransi)
            document.addEventListener('visibilitychange', function() {
                if (currentExam && !currentExam.isSubmitted && !document.getElementById('view-student-room').classList.contains('hidden')) {
                    if (document.hidden) {
                        executeBanSubmit("Meninggalkan tab steril atau meminimalkan browser.");
                    }
                }
            });

            document.addEventListener('fullscreenchange', function() {
                if (currentExam && !currentExam.isSubmitted && !document.getElementById('view-student-room').classList.contains('hidden')) {
                    if (!document.fullscreenElement) {
                        executeBanSubmit("Mencoba keluar dari mode layar penuh steril.");
                    }
                }
            });

            // DETEKSI KURSOR MENINGGALKAN WEB (CURSOR OUT DETECT = BLOKIR INSTAN)
            document.addEventListener('mouseleave', function(e) {
                if (currentExam && !currentExam.isSubmitted && !document.getElementById('view-student-room').classList.contains('hidden')) {
                    executeBanSubmit("Kursor mouse meninggalkan area steril halaman ujian.");
                }
            });

            history.pushState(null, null, location.href);
            window.addEventListener('popstate', function() {
                if (currentExam && !currentExam.isSubmitted && !document.getElementById('view-student-room').classList.contains('hidden')) {
                    history.pushState(null, null, location.href);
                    showToast("Kembali Dilarang", "Selesaikan lembar ujian terlebih dahulu.", "warning");
                }
            });

            cheatListenersAttached = true;
        }

        function executeBanSubmit(reason) {
            clearInterval(timerInterval);

            // Simpan snapshot ujian saat diblokir (belum set isSubmitted = true dulu)
            const snapExam    = JSON.parse(JSON.stringify(currentExam));
            const snapStudent = JSON.parse(JSON.stringify(authenticatedStudent));

            currentExam.isSubmitted = true;

            const finalScore = {
                id: 'sc_' + Date.now(),
                studentName: currentExam.student.name,
                studentClass: currentExam.student.class,
                packageName: currentExam.package.title,
                correctCount: 0,
                totalQuestions: currentExam.package.questions.length,
                score: 0,
                status: "DIBLOKIR (KECURANGAN)",
                examData: JSON.parse(JSON.stringify(currentExam))
            };

            db.scores.push(finalScore);
            dbInsertScore(finalScore);
            saveDB();

            localStorage.removeItem(EXAM_SESSION_KEY);

            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(err => {});
            }

            enterStudentDashboard();

            // Tampilkan modal blokir dengan input kode lanjutan
            const modal   = document.getElementById('custom-modal');
            const content = document.getElementById('modal-content');

            document.getElementById('modal-title').innerText = '❌ UJIAN DIBLOKIR OTOMATIS';
            document.getElementById('modal-description').innerHTML = `
                <span class="block mb-3">Integrity Shield mendeteksi aktivitas mencurigakan: <strong>${reason}</strong>.</span>
                <span class="block mb-3 text-rose-600 dark:text-rose-400 font-semibold">Nilai 0 telah dicatat.</span>
                <span class="block text-xs text-slate-500 mb-2">Jika ini kesalahan sistem, pengawas dapat memasukkan kode lanjutan:</span>
                <input type="text" id="override-admin-code" placeholder="Kode lanjutan pengawas..." autocomplete="off"
                    class="w-full text-center py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase">
            `;

            const btnConfirm = document.getElementById('modal-btn-confirm');
            btnConfirm.innerText = 'Lanjutkan Ujian';
            btnConfirm.className = 'px-4 py-2 text-sm font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition';

            modal.classList.remove('hidden');
            setTimeout(() => content.classList.remove('scale-95', 'opacity-0'), 50);

            // Override tombol confirm untuk cek kode admin
            modalConfirmCallback = () => {
                const code = (document.getElementById('override-admin-code')?.value || '').trim().toLowerCase();
                if (code === 'admin') {
                    // Hapus nilai blokir yang baru saja disimpan
                    db.scores = db.scores.filter(s => s.id !== finalScore.id);
                    dbDeleteScore(finalScore.id);
                    saveDB();

                    // Pulihkan state ujian
                    authenticatedStudent = snapStudent;
                    currentExam = snapExam;
                    currentExam.isSubmitted = false;

                    // Simpan ulang sesi
                    saveExamSession();

                    // Masuk kembali ke ruang ujian
                    startExamRoom();
                    showToast("Ujian Dilanjutkan", "Pengawas memberi izin lanjut. Tetap jaga kejujuran!", "success");
                } else {
                    showToast("Kode Salah", "Kode lanjutan tidak valid.", "danger");
                }

                // Reset tombol confirm ke default
                btnConfirm.innerText = 'Lanjutkan';
                btnConfirm.className = 'px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-100 dark:shadow-none';
            };

            document.getElementById('modal-btn-cancel').onclick = function() {
                closeModalConfirm();
                // Kembalikan cancel ke default
                document.getElementById('modal-btn-cancel').onclick = closeModalConfirm;
                btnConfirm.innerText = 'Lanjutkan';
                btnConfirm.className = 'px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-100 dark:shadow-none';
            };
        }

        function initExamTimer() {
            if (timerInterval) clearInterval(timerInterval);
            updateTimerDisplay();
            updateSubmitButtonState();

            timerInterval = setInterval(() => {
                if (currentExam.timer <= 0) {
                    clearInterval(timerInterval);
                    triggerAutoSubmit(false);
                } else {
                    currentExam.timer--;
                    saveExamSession();
                    updateTimerDisplay();
                    updateSubmitButtonState();
                }
            }, 1000);
        }

        // Update visual tombol Selesai Ujian di header berdasarkan waktu minimal
        function updateSubmitButtonState() {
            const btn = document.getElementById('btn-finish-exam');
            if (!btn || !currentExam) return;
            const elapsed      = (currentExam.package.duration * 60) - currentExam.timer;
            const minRequired  = (currentExam.package.minDuration || 0) * 60;
            const canSubmit    = elapsed >= minRequired;

            if (canSubmit) {
                btn.className = "bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition";
                btn.innerHTML = '<i class="fa-solid fa-circle-check mr-1.5"></i> Selesai Ujian';
            } else {
                const sisa = minRequired - elapsed;
                const m = Math.floor(sisa / 60), s = sisa % 60;
                btn.className = "bg-slate-400 dark:bg-slate-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer";
                btn.innerHTML = `<i class="fa-solid fa-lock mr-1.5"></i> ${m > 0 ? m + 'm ' : ''}${s}d lagi`;
            }

            // Sinkronkan juga tombol "Selesai" di soal terakhir
            updateLastQuestionBtn(canSubmit, minRequired - elapsed);
        }

        // Update tombol next di soal terakhir agar sinkron dengan header
        function updateLastQuestionBtn(canSubmit, sisaDetik) {
            const btnNext = document.getElementById('btn-exam-next');
            if (!btnNext || !currentExam) return;

            const idx       = currentExam.activeIdx;
            const questions = currentExam.package.questions;
            // Hanya update kalau sedang di soal terakhir
            if (idx !== questions.length - 1) return;

            if (canSubmit) {
                btnNext.innerHTML = `<span>Selesai Ujian</span> <i class="fa-solid fa-square-check"></i>`;
                btnNext.className = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center space-x-2 transition shadow-lg";
                btnNext.onclick   = () => triggerAutoSubmit(true);
                btnNext.disabled  = false;
                btnNext.style.pointerEvents = '';
                btnNext.style.cursor = '';
            } else {
                const m = Math.floor(sisaDetik / 60), s = sisaDetik % 60;
                btnNext.innerHTML = `<i class="fa-solid fa-lock text-xs mr-1"></i><span>Selesai (${m > 0 ? m + 'm ' : ''}${s}d lagi)</span>`;
                btnNext.className = "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold py-3 px-6 rounded-xl flex items-center space-x-2 transition";
                btnNext.onclick   = () => triggerAutoSubmit(true); // tetap bisa klik untuk lihat pesan
                btnNext.disabled  = false;
                btnNext.style.pointerEvents = 'auto';
                btnNext.style.cursor = 'pointer';
            }
        }

        function updateTimerDisplay() {
            const hours = Math.floor(currentExam.timer / 3600);
            const minutes = Math.floor((currentExam.timer % 3600) / 60);
            const seconds = currentExam.timer % 60;

            const fHours = String(hours).padStart(2, '0');
            const fMinutes = String(minutes).padStart(2, '0');
            const fSeconds = String(seconds).padStart(2, '0');

            document.getElementById('exam-timer').innerText = `${fHours}:${fMinutes}:${fSeconds}`;
        }


        // ==========================================
        // 11. SISTEM PENILAIAN EXAM & AUTO SUBMIT (DENGAN BATAS MINIMAL)
        // ==========================================
        function triggerAutoSubmit(isManualRequest = false) {
            if (isManualRequest) {
                const elapsedSeconds     = (currentExam.package.duration * 60) - currentExam.timer;
                const minSecondsRequired = (currentExam.package.minDuration || 0) * 60;

                if (elapsedSeconds < minSecondsRequired) {
                    const sisaDetik = minSecondsRequired - elapsedSeconds;
                    const sisaMenit = Math.floor(sisaDetik / 60);
                    const sisaSek   = sisaDetik % 60;
                    const sisaStr   = sisaMenit > 0
                        ? `${sisaMenit} menit ${sisaSek} detik`
                        : `${sisaDetik} detik`;
                    showToast(
                        "Belum Boleh Mengumpulkan",
                        `Waktu minimal ${currentExam.package.minDuration} menit belum tercapai. Tunggu lagi ${sisaStr}.`,
                        "warning"
                    );
                    return;
                }

                // Cek soal yang ditandai ragu-ragu
                const doubtful   = currentExam.doubtful || {};
                const doubtCount = Object.values(doubtful).filter(Boolean).length;

                if (doubtCount > 0) {
                    // Cari nomor soal yang ragu
                    const ragNomor = currentExam.package.questions
                        .map((q, i) => doubtful[q.id] ? (i + 1) : null)
                        .filter(n => n !== null);

                    showModalConfirm(
                        `⚠️ Masih Ada ${doubtCount} Soal Ragu-Ragu`,
                        `Soal nomor ${ragNomor.join(', ')} masih ditandai ragu-ragu. Harap periksa kembali dan hapus tanda ragu sebelum mengumpulkan.`,
                        () => {
                            // Arahkan ke soal ragu pertama
                            const firstRagIdx = currentExam.package.questions
                                .findIndex(q => doubtful[q.id]);
                            if (firstRagIdx !== -1) {
                                currentExam.activeIdx = firstRagIdx;
                                saveExamSession();
                                renderExamQuestion();
                            }
                        },
                        "Cek Soal Ragu"
                    );
                    return;
                }

                // Tidak ada ragu — konfirmasi kumpulkan
                showModalConfirm(
                    "Akhiri & Kumpulkan Ujian",
                    `Yakin ingin mengumpulkan jawaban sekarang? Tindakan ini tidak bisa dibatalkan.`,
                    () => { executeNormalSubmit(); },
                    "Ya, Kumpulkan!"
                );
            } else {
                executeNormalSubmit(true);
            }
        }

        function executeNormalSubmit(isTimeOut = false) {
            clearInterval(timerInterval);
            currentExam.isSubmitted = true;

            const questions = currentExam.package.questions;
            let correctCount = 0;

            questions.forEach(q => {
                const userAnsArr = currentExam.answers[q.id] || []; // Jawaban murid
                const correctAnsArr = q.correct || [];              // Kunci

                if (q.type === 'pilihan-ganda') {
                    if (userAnsArr.length > 0 && correctAnsArr.length > 0) {
                        if (userAnsArr[0] === correctAnsArr[0]) {
                            correctCount++;
                        }
                    }
                } else if (q.type === 'pilihan-ganda-kompleks') {
                    if (userAnsArr.length === correctAnsArr.length) {
                        const allMatch = userAnsArr.every(val => correctAnsArr.includes(val));
                        if (allMatch) {
                            correctCount++;
                        }
                    }
                } else if (q.type === 'benar-salah') {
                    let isAllRowCorrect = true;
                    if (userAnsArr.length === correctAnsArr.length) {
                        for(let i=0; i<correctAnsArr.length; i++) {
                            if (userAnsArr[i] !== correctAnsArr[i]) {
                                isAllRowCorrect = false;
                                break;
                            }
                        }
                    } else {
                        isAllRowCorrect = false;
                    }

                    if (isAllRowCorrect) {
                        correctCount++;
                    }
                } else if (q.type === 'isian-singkat') {
                    if (userAnsArr.length > 0 && correctAnsArr.length > 0) {
                        const cleanUser = userAnsArr[0].trim().toLowerCase();
                        const cleanCorrect = correctAnsArr[0].trim().toLowerCase();
                        if (cleanUser === cleanCorrect) {
                            correctCount++;
                        }
                    }
                }
            });

            const totalQuestions = questions.length;
            const finalScoreVal = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

            const newScore = {
                id: 'sc_' + Date.now(),
                studentName: currentExam.student.name,
                studentClass: currentExam.student.class,
                packageName: currentExam.package.title,
                correctCount: correctCount,
                totalQuestions: totalQuestions,
                score: finalScoreVal,
                status: "SELESAI",
                examData: JSON.parse(JSON.stringify(currentExam))
            };

            db.scores.push(newScore);
            dbInsertScore(newScore);
            saveDB();

            localStorage.removeItem(EXAM_SESSION_KEY);

            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(err => {});
            }

            // Kembalikan ke Dashboard Murid
            enterStudentDashboard();

            // Cek apakah paket ini mengizinkan tampilkan nilai ke murid
            const pkg = db.packages.find(p => p.id === currentExam.package.id) || {};
            const showScore  = pkg.showScore  !== false; // default true
            const showAnswer = pkg.showAnswer || false;

            let infoMessage;
            if (isTimeOut) {
                infoMessage = showScore
                    ? `Waktu habis! Jawaban disimpan otomatis. Skor Akhir: ${finalScoreVal}`
                    : `Waktu habis! Jawaban Anda telah disimpan. Hasil akan diumumkan oleh guru.`;
            } else {
                infoMessage = showScore
                    ? `Ujian berhasil dikumpulkan. Skor Akhir Anda: ${finalScoreVal} (${correctCount}/${totalQuestions} benar).`
                    : `Ujian berhasil dikumpulkan. Hasil akan diumumkan oleh guru Anda.`;
            }

            // Tombol lihat jawaban hanya muncul jika showAnswer aktif
            showModalConfirm(
                "✅ Ujian Berhasil Dikirim",
                infoMessage,
                showAnswer ? () => {
                    // Buka tab riwayat dan auto-lihat detail
                    switchStudentTab('subtab-completed-exams');
                    renderStudentDashboardExams();
                } : () => {},
                showAnswer ? "Lihat Jawaban Saya" : "Tutup"
            );
        }


        // ==========================================
        // 12. RENDERING DAN KELOLA RAGU-RAGU (DOUBT STATE)
        // ==========================================
        function toggleDoubtMark() {
            const idx = currentExam.activeIdx;
            const q = currentExam.package.questions[idx];

            if (!currentExam.doubtful) currentExam.doubtful = {};

            // Toggle state ragu-ragu
            currentExam.doubtful[q.id] = !currentExam.doubtful[q.id];
            
            saveExamSession();
            renderExamQuestion();
        }

        function renderExamQuestion() {
            const idx = currentExam.activeIdx;
            const questions = currentExam.package.questions;
            const q = questions[idx];

            document.getElementById('exam-question-number').innerText = `${idx + 1} dari ${questions.length}`;
            
            let badgeText = "Pilihan Ganda";
            if (q.type === 'pilihan-ganda-kompleks') badgeText = "Pilihan Ganda Kompleks";
            else if (q.type === 'benar-salah') badgeText = "Benar / Salah Tabel";
            else if (q.type === 'isian-singkat') badgeText = "Isian Singkat";
            document.getElementById('exam-question-type-badge').innerText = badgeText;

            document.getElementById('exam-question-text').innerText = q.text;

            // Render Opsi Jawaban
            const answersContainer = document.getElementById('exam-answers-container');
            answersContainer.innerHTML = '';

            const savedAns = currentExam.answers[q.id] || [];

            if (q.type === 'pilihan-ganda') {
                q.options.forEach((opt, oIdx) => {
                    const char = String.fromCharCode(65 + oIdx);
                    const isChecked = savedAns.includes(opt);
                    const btn = document.createElement('div');
                    btn.className = `flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition ${
                        isChecked 
                        ? 'bg-brand-500/15 dark:bg-brand-950/40 border-brand-500 text-brand-900 dark:text-white font-semibold' 
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`;
                    btn.onclick = () => saveExamAnswer(q.id, opt, false);
                    btn.innerHTML = `
                        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-400 dark:border-slate-600'}">
                            ${isChecked ? '<span class="w-2 h-2 bg-white rounded-full"></span>' : ''}
                        </div>
                        <span class="text-sm select-none font-bold">${char}.</span>
                        <span class="text-sm select-none">${opt}</span>
                    `;
                    answersContainer.appendChild(btn);
                });
            } else if (q.type === 'pilihan-ganda-kompleks') {
                q.options.forEach((opt, oIdx) => {
                    const char = String.fromCharCode(65 + oIdx);
                    const isChecked = savedAns.includes(opt);
                    const btn = document.createElement('div');
                    btn.className = `flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition ${
                        isChecked 
                        ? 'bg-brand-500/15 dark:bg-brand-950/40 border-brand-500 text-brand-900 dark:text-white font-semibold' 
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`;
                    btn.onclick = () => saveExamAnswer(q.id, opt, true);
                    btn.innerHTML = `
                        <div class="w-5 h-5 rounded border-2 flex items-center justify-center ${isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-400 dark:border-slate-600'}">
                            ${isChecked ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
                        </div>
                        <span class="text-sm select-none font-bold">${char}.</span>
                        <span class="text-sm select-none">${opt}</span>
                    `;
                    answersContainer.appendChild(btn);
                });
            } else if (q.type === 'benar-salah') {
                const tableContainer = document.createElement('div');
                tableContainer.className = "border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 max-w-2xl";
                
                let tbodyRows = q.options.map((opt, sIdx) => {
                    const subAns = savedAns[sIdx] || '';
                    return `
                        <tr class="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/20">
                            <td class="p-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${opt}</td>
                            <td class="p-3 text-center">
                                <label class="flex items-center justify-center cursor-pointer space-x-1.5">
                                    <input type="radio" name="bs-exam-${q.id}-${sIdx}" value="Benar" ${subAns === 'Benar' ? 'checked' : ''} 
                                        onchange="saveExamTFTabelAnswer('${q.id}', ${sIdx}, 'Benar')" 
                                        class="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                    <span class="text-xs text-slate-500 dark:text-slate-400 font-bold">Benar</span>
                                </label>
                            </td>
                            <td class="p-3 text-center">
                                <label class="flex items-center justify-center cursor-pointer space-x-1.5">
                                    <input type="radio" name="bs-exam-${q.id}-${sIdx}" value="Salah" ${subAns === 'Salah' ? 'checked' : ''} 
                                        onchange="saveExamTFTabelAnswer('${q.id}', ${sIdx}, 'Salah')" 
                                        class="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                    <span class="text-xs text-slate-500 dark:text-slate-400 font-bold">Salah</span>
                                </label>
                            </td>
                        </tr>
                    `;
                }).join('');

                tableContainer.innerHTML = `
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                                <th class="p-3">Pernyataan Soal</th>
                                <th class="p-3 text-center w-28">BENAR</th>
                                <th class="p-3 text-center w-28">SALAH</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tbodyRows}
                        </tbody>
                    </table>
                `;
                answersContainer.appendChild(tableContainer);
            } else if (q.type === 'isian-singkat') {
                const inputVal = savedAns.length > 0 ? savedAns[0] : '';
                const div = document.createElement('div');
                div.className = "space-y-2";
                div.innerHTML = `
                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400">JAWABAN ANDA:</label>
                    <input type="text" id="exam-input-isian" value="${inputVal}" oninput="handleIsianInput(this, '${q.id}')" placeholder="Ketikkan jawaban singkat di sini..." 
                        class="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 focus:outline-none rounded-xl p-4 text-sm text-slate-900 dark:text-white font-mono tracking-wider">
                `;
                answersContainer.appendChild(div);
            }

            // Atur status tombol Ragu-Ragu
            const isDoubtful = currentExam.doubtful && currentExam.doubtful[q.id];
            const btnDoubt = document.getElementById('btn-exam-doubt');
            const iconDoubt = document.getElementById('doubt-icon');
            if (isDoubtful) {
                btnDoubt.className = "w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center space-x-2 transition shadow-md";
                iconDoubt.className = "fa-solid fa-square-check";
            } else {
                btnDoubt.className = "w-full sm:w-auto bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-8 rounded-xl flex items-center justify-center space-x-2 transition border border-slate-300 dark:border-slate-700";
                iconDoubt.className = "fa-regular fa-square";
            }

            const btnPrev = document.getElementById('btn-exam-prev');
            const btnNext = document.getElementById('btn-exam-next');

            if (idx === 0) {
                btnPrev.classList.add('invisible');
            } else {
                btnPrev.classList.remove('invisible');
            }

            if (idx === questions.length - 1) {
                // Cek apakah waktu minimal sudah tercapai
                const elapsed = (currentExam.package.duration * 60) - currentExam.timer;
                const minRequired = (currentExam.package.minDuration || 0) * 60;
                const canSubmit = elapsed >= minRequired;
                // Gunakan fungsi yang sama dengan header agar selalu sinkron
                updateLastQuestionBtn(canSubmit, minRequired - elapsed);
            } else {
                btnNext.innerHTML = `<span>Berikutnya</span> <i class="fa-solid fa-arrow-right"></i>`;
                btnNext.className = "bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl flex items-center space-x-2 transition shadow-lg";
                btnNext.onclick = () => examGoNext();
                btnNext.disabled = false;
            }

            renderExamGrid();
        }

        function saveExamAnswer(qId, val, isMultiple) {
            let currentAns = currentExam.answers[qId] || [];

            if (isMultiple) {
                if (currentAns.includes(val)) {
                    currentAns = currentAns.filter(v => v !== val);
                } else {
                    currentAns.push(val);
                }
            } else {
                currentAns = [val];
            }

            currentExam.answers[qId] = currentAns;
            saveExamSession();
            renderExamQuestion();
        }

        function saveExamTFTabelAnswer(qId, subIdx, value) {
            let currentAns = currentExam.answers[qId] || [];
            const q = currentExam.package.questions.find(item => item.id === qId);
            if (currentAns.length === 0 && q) {
                currentAns = Array(q.options.length).fill('');
            }

            currentAns[subIdx] = value;
            currentExam.answers[qId] = currentAns;
            saveExamSession();
            renderExamGrid();
        }

        function handleIsianInput(inputEl, qId) {
            const val = inputEl.value;
            if (val.trim() === '') {
                delete currentExam.answers[qId];
            } else {
                currentExam.answers[qId] = [val];
            }
            saveExamSession();
        }

        function examGoPrev() {
            if (currentExam.activeIdx > 0) {
                currentExam.activeIdx--;
                saveExamSession();
                renderExamQuestion();
            }
        }

        function examGoNext() {
            const questions = currentExam.package.questions;
            if (currentExam.activeIdx < questions.length - 1) {
                currentExam.activeIdx++;
                saveExamSession();
                renderExamQuestion();
            }
        }

        function jumpToQuestion(idx) {
            currentExam.activeIdx = idx;
            saveExamSession();
            renderExamQuestion();
        }

        // Render Panel Navigasi Grid Soal dengan Penanda Ragu-Ragu
        function renderExamGrid() {
            const container = document.getElementById('exam-grid-container');
            container.innerHTML = '';

            const questions = currentExam.package.questions;
            questions.forEach((q, idx) => {
                const savedAns = currentExam.answers[q.id] || [];
                const isDoubtful = currentExam.doubtful && currentExam.doubtful[q.id];
                
                let isAnswered = false;
                if (q.type === 'benar-salah') {
                    isAnswered = savedAns.length === q.options.length && savedAns.every(v => v !== '');
                } else {
                    isAnswered = savedAns.length > 0 && savedAns[0] !== '';
                }

                const isActive = idx === currentExam.activeIdx;

                let btnClass = "w-full aspect-square flex items-center justify-center font-bold text-sm rounded-xl transition border ";
                
                if (isActive) {
                    btnClass += "bg-brand-600 text-white border-brand-500 shadow-md";
                } else if (isDoubtful) {
                    // Warna kuning/amber jika ragu-ragu
                    btnClass += "bg-amber-500 text-white border-amber-400";
                } else if (isAnswered) {
                    btnClass += "bg-emerald-600 text-white border-emerald-500";
                } else {
                    btnClass += "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200";
                }

                const btn = document.createElement('button');
                btn.className = btnClass;
                btn.innerText = idx + 1;
                btn.onclick = () => jumpToQuestion(idx);
                container.appendChild(btn);
            });
        }


        // ==========================================
        // 13. CUSTOM DIALOGS & TOAST SYSTEM
        // ==========================================
        let modalConfirmCallback = null;
        let modalCancelCallback  = null;

        function showModalConfirm(title, desc, onConfirm, confirmBtnText = "Lanjutkan", onCancel = null) {
            const modal   = document.getElementById('custom-modal');
            const content = document.getElementById('modal-content');

            document.getElementById('modal-title').innerText       = title;
            document.getElementById('modal-description').innerText = desc;

            const btnConfirm = document.getElementById('modal-btn-confirm');
            btnConfirm.innerText = confirmBtnText;

            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                content.classList.remove('scale-95', 'opacity-0');
            });

            modalConfirmCallback = onConfirm;
            modalCancelCallback  = onCancel;
        }

        // Satu handler permanen — tidak pernah di-override
        document.getElementById('modal-btn-confirm').onclick = function() {
            const cb = modalConfirmCallback;
            closeModalConfirm();
            if (cb) cb();
        };

        document.getElementById('modal-btn-cancel').onclick = function() {
            const cb = modalCancelCallback;
            closeModalConfirm();
            if (cb) cb();
        };

        function closeModalConfirm() {
            const modal   = document.getElementById('custom-modal');
            const content = document.getElementById('modal-content');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => { modal.classList.add('hidden'); }, 150);
            // Bersihkan callback — tidak restore onclick, handler sudah permanen
            modalConfirmCallback = null;
            modalCancelCallback  = null;
        }

        function showToast(title, message, type = "success") {
            const toast = document.getElementById('custom-toast');
            const iconContainer = document.getElementById('toast-icon-container');
            
            document.getElementById('toast-title').innerText = title;
            document.getElementById('toast-message').innerText = message;

            toast.className = "fixed top-5 left-1/2 -translate-x-1/2 z-50 transform translate-y-[-100px] opacity-0 transition-all duration-300 pointer-events-none";
            iconContainer.className = "text-xl p-2 rounded-lg";

            if (type === "success") {
                iconContainer.classList.add('text-emerald-500', 'bg-emerald-50');
                iconContainer.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                toast.firstElementChild.className = "bg-white dark:bg-slate-800 border-l-4 border-emerald-500 shadow-2xl rounded-xl p-4 flex items-center space-x-3 max-w-md";
            } else if (type === "warning") {
                iconContainer.classList.add('text-amber-500', 'bg-amber-50');
                iconContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
                toast.firstElementChild.className = "bg-white dark:bg-slate-800 border-l-4 border-amber-500 shadow-2xl rounded-xl p-4 flex items-center space-x-3 max-w-md";
            } else if (type === "danger") {
                iconContainer.classList.add('text-rose-500', 'bg-rose-50');
                iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                toast.firstElementChild.className = "bg-white dark:bg-slate-800 border-l-4 border-rose-500 shadow-2xl rounded-xl p-4 flex items-center space-x-3 max-w-md";
            } else if (type === "info") {
                iconContainer.classList.add('text-brand-500', 'bg-brand-50');
                iconContainer.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
                toast.firstElementChild.className = "bg-white dark:bg-slate-800 border-l-4 border-brand-500 shadow-2xl rounded-xl p-4 flex items-center space-x-3 max-w-md";
            }

            toast.classList.remove('translate-y-[-100px]', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');

            setTimeout(() => {
                toast.classList.add('translate-y-[-100px]', 'opacity-0');
                toast.classList.remove('translate-y-0', 'opacity-100');
            }, 3500);
        }


        // ==========================================
        // 14. EVENT AWAL SAAT HALAMAN DI-LOAD
        // ==========================================

        // ===== SESSION MANAGEMENT =====
        // Simpan state ujian aktif ke localStorage agar bisa resume jika browser ditutup
        function saveExamSession() {
            if (!currentExam) return;
            try {
                localStorage.setItem(EXAM_SESSION_KEY, JSON.stringify({
                    student: authenticatedStudent,
                    exam: currentExam
                }));
            } catch(e) {
                console.warn('Gagal menyimpan sesi:', e);
            }
        }

        // Muat sesi ujian dari localStorage
        function loadExamSession() {
            try {
                const raw = localStorage.getItem(EXAM_SESSION_KEY);
                if (!raw) return null;
                return JSON.parse(raw);
            } catch(e) {
                localStorage.removeItem(EXAM_SESSION_KEY);
                return null;
            }
        }

        // Periksa apakah ada sesi ujian aktif saat halaman dimuat
        // Jika ada dan belum di-submit, tawari resume
        function checkActiveExamSession() {
            const saved = loadExamSession();
            if (!saved || !saved.exam || saved.exam.isSubmitted) {
                localStorage.removeItem(EXAM_SESSION_KEY);
                return;
            }

            // Pulihkan data murid
            authenticatedStudent = saved.student;
            currentExam = saved.exam;

            // Tawari resume via modal konfirmasi
            showModalConfirm(
                '⚠️ Sesi Ujian Ditemukan',
                `Ada sesi ujian "${currentExam.package.title}" yang belum selesai. Lanjutkan ujian sekarang? Pilih Batal untuk membatalkan sesi.`,
                () => {
                    // Lanjutkan ujian
                    document.getElementById('btn-logout-student').classList.remove('hidden');
                    document.getElementById('btn-logout-admin').classList.add('hidden');
                    document.getElementById('btn-to-admin-portal').classList.add('hidden');
                    if (document.getElementById('student-welcome-name')) {
                        document.getElementById('student-welcome-name').textContent = authenticatedStudent.name;
                        document.getElementById('student-welcome-class').textContent = 'Kelas: ' + authenticatedStudent.class;
                    }
                    startExamRoom();
                },
                'Lanjutkan Ujian'
            );

            // Override tombol batal agar hapus sesi
            document.getElementById('modal-btn-cancel').onclick = function() {
                closeModalConfirm();
                localStorage.removeItem(EXAM_SESSION_KEY);
                currentExam = null;
                authenticatedStudent = null;
                // Kembalikan handler cancel ke default setelah dipakai
                document.getElementById('modal-btn-cancel').onclick = closeModalConfirm;
            };
        }

        // ==========================================
        // FUNGSI YANG DIPANGGIL DARI HTML (SCORES, DELETE, EXPORT, RESET)
        // ==========================================

        function viewScoreDetail(scoreId) {
            const sc = db.scores.find(s => s.id === scoreId);
            if (!sc) { showToast("Tidak Ditemukan", "Data nilai tidak ditemukan.", "danger"); return; }

            const container = document.getElementById('detail-result-container');
            const examData = sc.examData;

            if (!examData || !examData.package || !examData.package.questions) {
                container.innerHTML = `<p class="text-slate-400 text-center p-4">Detail jawaban tidak tersedia untuk ujian ini.</p>`;
            } else {
                const questions = examData.package.questions;
                const answers   = examData.answers || {};

                container.innerHTML = questions.map((q, idx) => {
                    const userAns    = answers[q.id] || [];
                    const isCorrect  = JSON.stringify([...userAns].sort()) === JSON.stringify([...q.correct].sort());
                    const borderColor = isCorrect ? 'border-emerald-400' : 'border-rose-400';
                    const badgeColor  = isCorrect
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700';

                    return `
                        <div class="border ${borderColor} rounded-xl p-4 space-y-2">
                            <div class="flex justify-between items-start gap-2">
                                <span class="text-slate-500 font-bold text-[10px] uppercase tracking-wider">${idx + 1}. ${q.type}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}">${isCorrect ? '✓ Benar' : '✗ Salah'}</span>
                            </div>
                            <p class="font-semibold text-slate-900 dark:text-white leading-relaxed">${q.text}</p>
                            <div class="text-[11px] space-y-1">
                                <p class="text-slate-500">Jawaban murid: <span class="font-bold text-slate-700 dark:text-slate-200">${userAns.length ? userAns.join(', ') : '—'}</span></p>
                                <p class="text-slate-500">Kunci jawaban: <span class="font-bold text-emerald-600">${q.correct.join(', ')}</span></p>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            document.getElementById('detail-result-modal').classList.remove('hidden');
        }

        function closeDetailResultModal() {
            document.getElementById('detail-result-modal').classList.add('hidden');
        }

        function deleteScore(id) {
            showModalConfirm(
                "Hapus Nilai",
                "Hapus lembar nilai ini secara permanen?",
                () => {
                    db.scores = db.scores.filter(s => s.id !== id);
                    dbDeleteScore(id);
                    saveDB();
                    showToast("Terhapus", "Nilai berhasil dihapus.", "info");
                    renderAllAdminViews();
                }
            );
        }

        function deleteQuestion(qId) {
            const pkg = db.packages.find(p => p.id === currentManagePkgId);
            if (!pkg) return;

            showModalConfirm(
                "Hapus Soal",
                "Hapus butir soal ini secara permanen dari paket?",
                () => {
                    pkg.questions = pkg.questions.filter(q => q.id !== qId);
                    dbUpsertPackage(pkg);
                    saveDB();
                    showToast("Dihapus", "Butir soal berhasil dihapus.", "info");
                    renderManageQuestionsList();
                    renderAllAdminViews();
                }
            );
        }

        function clearScoresData() {
            showModalConfirm(
                "Kosongkan Seluruh Nilai",
                "Tindakan ini akan menghapus semua lembar nilai ujian. Tidak dapat dibatalkan.",
                async () => {
                    db.scores = [];
                    await supa.from('cbt_scores').delete().neq('id', '');
                    saveDB();
                    showToast("Selesai", "Semua data nilai telah dihapus.", "info");
                    renderAllAdminViews();
                }
            );
        }

        function confirmResetAllData() {
            showModalConfirm(
                "⚠️ Reset Semua Data",
                "Ini akan menghapus SELURUH data murid, paket ujian, dan nilai. Tindakan ini tidak bisa dibatalkan!",
                async () => {
                    await dbResetAll();
                    db.students = [];
                    db.packages = [];
                    db.scores   = [];
                    saveDB();
                    showToast("Reset Selesai", "Semua data telah direset.", "info");
                    renderAllAdminViews();
                },
                "Ya, Reset Semuanya"
            );
        }

        function exportScoresToExcel() {
            if (db.scores.length === 0) {
                showToast("Tidak Ada Data", "Belum ada nilai untuk diekspor.", "warning");
                return;
            }

            const exportData = db.scores.map(sc => ({
                "Nama Murid":    sc.studentName,
                "Kelas":         sc.studentClass,
                "Nama Ujian":    sc.packageName,
                "Jawaban Benar": sc.correctCount,
                "Total Soal":    sc.totalQuestions,
                "Skor Akhir":    sc.score,
                "Status":        sc.status,
                "Waktu Submit":  sc.submittedAt || '-'
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook  = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai");
            XLSX.writeFile(workbook, `Rekap_Nilai_CBT_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.xlsx`);
            showToast("Diekspor", "File Excel rekap nilai berhasil diunduh.", "success");
        }

        // ==========================================
        // MANAJEMEN AKUN ADMIN
        // ==========================================
        // Daftar admin disimpan di localStorage (sederhana) + Supabase tabel cbt_admins
        // Super admin = credentials default 'admin'/'admin'

        async function handleAddAdmin(event) {
            event.preventDefault();
            const username = document.getElementById('admin-new-username').value.trim();
            const password = document.getElementById('admin-new-password').value.trim();
            const school   = document.getElementById('admin-new-school').value.trim();
            const name     = document.getElementById('admin-new-name').value.trim();

            if (!username || !password || !school) {
                showToast("Data Kurang", "Username, password, dan sekolah wajib diisi.", "danger");
                return;
            }

            // Cek duplikat
            const { data: existing } = await supa.from('cbt_admins').select('id').eq('username', username).maybeSingle();
            if (existing) {
                showToast("Duplikat", `Username "${username}" sudah digunakan.`, "danger");
                return;
            }

            const newAdmin = {
                id: 'adm_' + Date.now(),
                username, password, school,
                name: name || username,
                role: 'admin'
            };

            const { error } = await supa.from('cbt_admins').insert(newAdmin);
            if (error) {
                showToast("Error", error.message, "danger");
                return;
            }

            showToast("Berhasil", `Admin "${username}" (${school}) berhasil ditambahkan.`, "success");
            document.getElementById('form-add-admin').reset();
            renderAdminsTable();
        }

        async function renderAdminsTable() {
            const tbody = document.getElementById('tbl-admins-body');
            if (!tbody) return;

            const { data, error } = await supa.from('cbt_admins').select('*').order('school');
            if (error) {
                tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-rose-500 text-xs">Gagal memuat: ${error.message}</td></tr>`;
                return;
            }

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">Belum ada akun admin tambahan.</td></tr>`;
                return;
            }

            tbody.innerHTML = '';
            data.forEach(adm => {
                const row = document.createElement('tr');
                row.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
                row.innerHTML = `
                    <td class="p-3 font-mono font-bold text-slate-800 dark:text-white">${adm.username}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${adm.name || '—'}</td>
                    <td class="p-3"><span class="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] font-semibold">${adm.school}</span></td>
                    <td class="p-3"><span class="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[11px] font-bold uppercase">${adm.role}</span></td>
                    <td class="p-3 text-right">
                        <button onclick="deleteAdmin('${adm.id}', '${adm.username}')" class="text-rose-500 hover:text-rose-700 text-sm p-1 transition" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function deleteAdmin(id, username) {
            showModalConfirm(
                "Hapus Akun Admin",
                `Hapus akun "${username}" secara permanen?`,
                async () => {
                    const { error } = await supa.from('cbt_admins').delete().eq('id', id);
                    if (error) { showToast("Error", error.message, "danger"); return; }
                    showToast("Terhapus", `Akun "${username}" berhasil dihapus.`, "info");
                    renderAdminsTable();
                }
            );
        }


        // ==========================================
        // AUTO-PARSE SOAL DARI COPY-PASTE
        // ==========================================
        // Format yang didukung:
        // "Teks soal...A. opsi A B. opsi B C. opsi C D. opsi D [E. opsi E]"
        // Kunci jawaban bisa ditambahkan di baris terpisah: "Jawaban: B" atau "Kunci: B"

        function parseQuestionFromText(raw) {
            if (!raw || !raw.trim()) return null;

            // Normalisasi: ganti newline ganda, trim
            let text = raw.trim().replace(/\r\n/g, '\n').replace(/\n{2,}/g, ' ');

            // Cek kunci jawaban dulu (sebelum diproses)
            const kunciMatch = text.match(/(?:jawaban|kunci|answer)\s*[:\-]\s*([A-E])/i);
            // Hapus kunci jawaban dari teks agar tidak ikut masuk ke soal/opsi
            text = text.replace(/(?:jawaban|kunci|answer)\s*[:\-]\s*[A-E]/gi, '').trim();

            // Cari posisi opsi pertama (A. / A) tanpa spasi sebelumnya tidak masalah)
            // Regex: karakter A-E diikuti titik atau kurung lalu spasi
            const optStartRe = /(?:^|\s)([A-E])[.)]\s/i;
            const firstMatch = optStartRe.exec(text);
            if (!firstMatch) return null;

            const firstOptIdx = firstMatch.index + (firstMatch[0].startsWith(' ') ? 1 : 0);
            const questionText = text.slice(0, firstOptIdx).trim();
            if (!questionText) return null;

            const optionsPart = text.slice(firstOptIdx);

            // Split opsi: pisahkan di setiap "A. " "B. " dst, termasuk di tengah kalimat
            // Gunakan lookahead agar pemisah tidak hilang
            const optParts = optionsPart
                .split(/(?=\b[A-E][.)]\s)/i)
                .map(s => s.trim())
                .filter(s => /^[A-E][.)]\s/i.test(s));

            const parsedOpts = optParts.map(part =>
                part.replace(/^[A-E][.)]\s*/i, '').trim()
            );

            if (parsedOpts.length < 2) return null;

            // Tentukan kunci
            let correct = [];
            if (kunciMatch) {
                const idx = kunciMatch[1].toUpperCase().charCodeAt(0) - 65;
                if (parsedOpts[idx]) correct = [parsedOpts[idx]];
            }

            return {
                id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                type: 'pilihan-ganda',
                text: questionText,
                options: parsedOpts,
                correct: correct
            };
        }

        function handleAutoParseQuestion() {
            const textarea = document.getElementById('mq-auto-paste');
            if (!textarea) return;
            const raw = textarea.value.trim();
            if (!raw) {
                showToast("Kosong", "Tempel teks soal terlebih dahulu.", "warning");
                return;
            }

            // Support multi-soal: pisahkan berdasarkan nomor 1. 2. 3. atau baris baru ganda
            const blocks = raw
                .split(/\n{2,}|\n(?=\d+[.)]\s)/)
                .map(b => b.replace(/^\d+[.)]\s*/, '').trim())
                .filter(b => b.length > 10);

            const pkg = db.packages.find(p => p.id === currentManagePkgId);
            if (!pkg) { showToast("Error", "Pilih paket ujian dulu.", "danger"); return; }

            let added = 0, failed = 0;
            blocks.forEach(block => {
                const parsed = parseQuestionFromText(block);
                if (parsed) {
                    pkg.questions.push(parsed);
                    added++;
                } else {
                    failed++;
                }
            });

            if (added > 0) {
                dbUpsertPackage(pkg);
                saveDB();
                renderManageQuestionsList();
                textarea.value = '';
                showToast("Berhasil", `${added} soal berhasil di-parse${failed > 0 ? `, ${failed} gagal` : ''}.`, "success");
                if (!pkg.questions.some(q => !q.correct || q.correct.length === 0)) return;
                showToast("Perhatian", "Beberapa soal belum memiliki kunci jawaban. Klik soal → Edit untuk menambahkan.", "warning");
            } else {
                showToast("Gagal Parse", "Format tidak dikenali. Pastikan ada opsi A. B. C. D.", "danger");
            }
        }

        window.onload = function() {
            loadDB();

            // Pintu Utama Pertama kali hanya diisi login murid
            switchView('view-login-student');

            renderAllAdminViews();
            
            // Periksa Sesi
            checkActiveExamSession();
            
            // Handle browser back/forward buttons
            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.view) {
                    switchView(event.state.view);
                } else {
                    // Parse URL path
                    const path = window.location.pathname;
                    const parts = path.split('/').filter(p => p);
                    
                    if (parts.length >= 1) {
                        const viewId = parts[parts.length - 1];
                        if (document.getElementById(viewId)) {
                            switchView(viewId);
                        }
                    }
                }
            });

            // Handle initial page load
            const path = window.location.pathname;
            const parts = path.split('/').filter(p => p);
            
            if (parts.length >= 1) {
                const viewId = parts[parts.length - 1];
                if (document.getElementById(viewId)) {
                    setTimeout(() => switchView(viewId), 100);
                }
            }
        };

