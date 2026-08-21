// ============================================================
// PUFUTARA KEEP - Smart Notes Application
// Mirip Google Keep dengan Supabase Backend
// ============================================================

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://qpnupajbbdfndvupjqfi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbnVwYWpiYmRmbmR2dXBqcWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzU0MDMsImV4cCI6MjA1MDAxMTQwM30.vX9jKEMdHxRyGo7EEQkfNBh79QLVF4V6N0GrIyLEsBo';

let supabase;
let currentUser = null;
let currentNoteId = null;
let selectedColor = 'white';
let selectedEditColor = 'white';
let currentFilter = 'all';

// --- INITIALIZE SUPABASE ---
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected');
} catch (error) {
    console.error('❌ Supabase connection failed:', error);
    showToast('❌ Gagal terhubung ke database');
}

// --- AUTH FUNCTIONS ---
async function handleAuth() {
    const email = document.getElementById('emailIn').value.trim();
    const password = document.getElementById('passIn').value;
    const errEl = document.getElementById('authErr');
    const btn = document.querySelector('.btn-black');

    // Reset error
    errEl.textContent = '';

    // Validation
    if (!email || !password) {
        errEl.textContent = 'Email dan password harus diisi!';
        return;
    }

    if (password.length < 6) {
        errEl.textContent = 'Password minimal 6 karakter!';
        return;
    }

    // Disable button
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Loading...';

    try {
        console.log('🔐 Attempting login...');
        
        // Try to sign in
        let { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.log('❌ Login failed:', error.message);
            
            // If sign in fails, try to sign up
            if (error.message.includes('Invalid login credentials') || 
                error.message.includes('Invalid') ||
                error.message.includes('not found')) {
                
                console.log('📝 Attempting signup...');
                
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        emailRedirectTo: window.location.href
                    }
                });

                if (signUpError) {
                    console.error('❌ Signup failed:', signUpError);
                    throw signUpError;
                }

                console.log('✅ Signup response:', signUpData);

                // Check if email confirmation is required
                if (signUpData.user && !signUpData.session) {
                    errEl.innerHTML = '✅ Akun dibuat! Silakan cek email untuk konfirmasi.<br>Atau tunggu beberapa detik...';
                    
                    // Wait and try to get session
                    setTimeout(async () => {
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (sessionData.session) {
                            currentUser = sessionData.session.user;
                            hideAuthScreen();
                            initApp();
                            showToast('✅ Login berhasil!');
                        }
                    }, 2000);
                    
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">login</span> Sign In';
                    return;
                }

                data = signUpData;
                showToast('✅ Akun berhasil dibuat!');
            } else {
                throw error;
            }
        }

        console.log('✅ Auth success:', data);

        if (data.user && data.session) {
            currentUser = data.user;
            localStorage.setItem('pufutara_keep_user', JSON.stringify(data.user));
            hideAuthScreen();
            initApp();
            showToast('✅ Login berhasil!');
        } else if (data.user) {
            errEl.textContent = '⚠️ Akun dibuat. Cek email untuk konfirmasi atau tunggu beberapa saat.';
        }
    } catch (error) {
        console.error('❌ Auth error:', error);
        errEl.textContent = error.message || 'Login gagal! Coba lagi.';
    } finally {
        // Enable button
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">login</span> Sign In';
    }
}

async function handleLogout() {
    if (!confirm('Yakin ingin keluar?')) return;

    try {
        await supabase.auth.signOut();
        localStorage.removeItem('pufutara_keep_user');
        currentUser = null;
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('❌ Logout gagal');
    }
}

function hideAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    authScreen.classList.add('hiding');
    setTimeout(() => {
        authScreen.style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    }, 500);
}

// --- INITIALIZE APP ---
async function initApp() {
    if (!currentUser) return;

    // Set user avatar
    const email = currentUser.email || 'User';
    const initial = email.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = initial;

    // Load notes
    await loadNotes();
}

// --- NOTE FUNCTIONS ---
async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!title && !content) {
        showToast('⚠️ Judul atau isi catatan harus diisi!');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('pufutara_notes')
            .insert([
                {
                    user_id: currentUser.id,
                    title: title || 'Tanpa Judul',
                    content: content,
                    color: selectedColor,
                    archived: false,
                    deleted: false
                }
            ])
            .select();

        if (error) throw error;

        // Clear form
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        selectedColor = 'white';
        updateColorSelection();

        showToast('✅ Catatan berhasil disimpan!');
        await loadNotes();
    } catch (error) {
        console.error('Save note error:', error);
        showToast('❌ Gagal menyimpan catatan');
    }
}

async function loadNotes() {
    if (!currentUser) return;

    try {
        let query = supabase
            .from('pufutara_notes')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        // Apply filter
        if (currentFilter === 'all') {
            query = query.eq('archived', false).eq('deleted', false);
        } else if (currentFilter === 'archived') {
            query = query.eq('archived', true).eq('deleted', false);
        } else if (currentFilter === 'trash') {
            query = query.eq('deleted', true);
        }

        const { data, error } = await query;

        if (error) throw error;

        displayNotes(data || []);
    } catch (error) {
        console.error('Load notes error:', error);
        showToast('❌ Gagal memuat catatan');
    }
}

function displayNotes(notes) {
    const container = document.getElementById('notesContainer');

    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">lightbulb</span>
                <h3>Belum ada catatan</h3>
                <p>Mulai menulis catatan pertama Anda!</p>
            </div>
        `;
        return;
    }

    let html = '<div class="notes-grid">';
    
    notes.forEach((note, index) => {
        const date = new Date(note.created_at);
        const formattedDate = formatDate(date);
        
        html += `
            <div class="note-card" data-color="${note.color}" style="animation-delay: ${index * 0.05}s" onclick="openEditModal('${note.id}')">
                ${note.title ? `<div class="note-title">${escapeHtml(note.title)}</div>` : ''}
                ${note.content ? `<div class="note-content">${escapeHtml(note.content)}</div>` : ''}
                <div class="note-footer">
                    <div class="note-timestamp">${formattedDate}</div>
                    <div class="note-actions" onclick="event.stopPropagation()">
                        ${!note.archived && !note.deleted ? `
                            <button class="note-action-btn" onclick="archiveNote('${note.id}')" title="Arsipkan">
                                <span class="material-symbols-outlined">archive</span>
                            </button>
                        ` : ''}
                        ${note.archived && !note.deleted ? `
                            <button class="note-action-btn" onclick="unarchiveNote('${note.id}')" title="Kembalikan">
                                <span class="material-symbols-outlined">unarchive</span>
                            </button>
                        ` : ''}
                        ${!note.deleted ? `
                            <button class="note-action-btn" onclick="moveToTrash('${note.id}')" title="Hapus">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        ` : ''}
                        ${note.deleted ? `
                            <button class="note-action-btn" onclick="restoreNote('${note.id}')" title="Pulihkan">
                                <span class="material-symbols-outlined">restore_from_trash</span>
                            </button>
                            <button class="note-action-btn" onclick="deleteNotePermanently('${note.id}')" title="Hapus Permanen">
                                <span class="material-symbols-outlined">delete_forever</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

async function openEditModal(noteId) {
    currentNoteId = noteId;

    try {
        const { data, error } = await supabase
            .from('pufutara_notes')
            .select('*')
            .eq('id', noteId)
            .single();

        if (error) throw error;

        document.getElementById('editTitle').value = data.title || '';
        document.getElementById('editContent').value = data.content || '';
        selectedEditColor = data.color || 'white';
        updateEditColorSelection();

        document.getElementById('editModal').classList.add('open');
    } catch (error) {
        console.error('Load note error:', error);
        showToast('❌ Gagal memuat catatan');
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('open');
    currentNoteId = null;
}

async function updateNote() {
    if (!currentNoteId) return;

    const title = document.getElementById('editTitle').value.trim();
    const content = document.getElementById('editContent').value.trim();

    if (!title && !content) {
        showToast('⚠️ Judul atau isi catatan harus diisi!');
        return;
    }

    try {
        const { error } = await supabase
            .from('pufutara_notes')
            .update({
                title: title || 'Tanpa Judul',
                content: content,
                color: selectedEditColor,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentNoteId);

        if (error) throw error;

        showToast('✅ Catatan berhasil diperbarui!');
        closeEditModal();
        await loadNotes();
    } catch (error) {
        console.error('Update note error:', error);
        showToast('❌ Gagal memperbarui catatan');
    }
}

async function deleteNote() {
    if (!currentNoteId) return;
    
    if (!confirm('Pindahkan catatan ke sampah?')) return;

    try {
        const { error } = await supabase
            .from('pufutara_notes')
            .update({ deleted: true })
            .eq('id', currentNoteId);

        if (error) throw error;

        showToast('✅ Catatan dipindahkan ke sampah');
        closeEditModal();
        await loadNotes();
    } catch (error) {
        console.error('Delete note error:', error);
        showToast('❌ Gagal menghapus catatan');
    }
}

async function archiveNote(noteId) {
    try {
        const { error } = await supabase
            .from('pufutara_notes')
            .update({ archived: true })
            .eq('id', noteId);

        if (error) throw error;

        showToast('✅ Catatan diarsipkan');
        await loadNotes();
    } catch (error) {
        console.error('Archive note error:', error);
        showToast('❌ Gagal mengarsipkan');
    }
}

async function unarchiveNote(noteId) {
    try {
        const { error } = await supabase
            .from('pufutara_notes')
            .update({ archived: false })
            .eq('id', noteId);

        if (error) throw error;

        showToast('✅ Catatan dikembalikan');
        await loadNotes();
    } catch (error) {
        console.error('Unarchive note error:', error);
        showToast('❌ Gagal mengembalikan');
    }
}

async function moveToTrash(noteId) {
    if (!confirm('Pindahkan ke sampah?')) return;

    try {
        const { error } = await supabase
            .from('pufutara_notes')
            .update({ deleted: true })
            .eq('id', noteId);

        if (error) throw error;

        showToast('✅ Dipindahkan ke sampah');
        await loadNotes();
    } catch (error) {
        console.error('Move to trash error:', error);
        showToast('❌ Gagal memindahkan');
    }
}

async function restoreNote(noteId) {
    try {
        const { error } = await supabase
            .from('pufutara_notes')
            .update({ deleted: false, archived: false })
            .eq('id', noteId);

        if (error) throw error;

        showToast('✅ Catatan dipulihkan');
        await loadNotes();
    } catch (error) {
        console.error('Restore note error:', error);
        showToast('❌ Gagal memulihkan');
    }
}

async function deleteNotePermanently(noteId) {
    if (!confirm('Hapus permanen? Tindakan ini tidak dapat dibatalkan!')) return;

    try {
        const { error } = await supabase
            .from('pufutara_notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;

        showToast('✅ Catatan dihapus permanen');
        await loadNotes();
    } catch (error) {
        console.error('Delete permanently error:', error);
        showToast('❌ Gagal menghapus');
    }
}

// --- COLOR FUNCTIONS ---
function selectColor(color) {
    selectedColor = color;
    updateColorSelection();
}

function updateColorSelection() {
    document.querySelectorAll('.note-input-actions .color-btn').forEach(btn => {
        if (btn.dataset.color === selectedColor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function selectEditColor(color) {
    selectedEditColor = color;
    updateEditColorSelection();
}

function updateEditColorSelection() {
    document.querySelectorAll('.modal-body .color-btn').forEach(btn => {
        if (btn.dataset.color === selectedEditColor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- FILTER FUNCTIONS ---
function filterNotes(filter) {
    currentFilter = filter;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    loadNotes();
    closeSidebar();
}

// --- SEARCH FUNCTION ---
let searchTimeout;
function searchNotes(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        if (!query.trim()) {
            await loadNotes();
            return;
        }

        try {
            let supabaseQuery = supabase
                .from('pufutara_notes')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            // Apply filter
            if (currentFilter === 'all') {
                supabaseQuery = supabaseQuery.eq('archived', false).eq('deleted', false);
            } else if (currentFilter === 'archived') {
                supabaseQuery = supabaseQuery.eq('archived', true).eq('deleted', false);
            } else if (currentFilter === 'trash') {
                supabaseQuery = supabaseQuery.eq('deleted', true);
            }

            const { data, error } = await supabaseQuery;

            if (error) throw error;

            // Client-side filtering
            const filtered = data.filter(note => {
                const searchLower = query.toLowerCase();
                return (note.title && note.title.toLowerCase().includes(searchLower)) ||
                       (note.content && note.content.toLowerCase().includes(searchLower));
            });

            displayNotes(filtered);
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 300);
}

// --- UI FUNCTIONS ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
}

function closeSidebar() {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('open');
    }
}

async function refreshNotes() {
    showToast('🔄 Memuat ulang...');
    await loadNotes();
}

// --- UTILITY FUNCTIONS ---
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K untuk focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }

    // Escape untuk close modal
    if (e.key === 'Escape') {
        closeEditModal();
    }
});

// --- CLOSE MODAL ON OVERLAY CLICK ---
document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target.id === 'editModal') {
        closeEditModal();
    }
});

// --- CHECK SESSION ON LOAD ---
(async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            currentUser = session.user;
            hideAuthScreen();
            initApp();
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
})();

// --- ENTER KEY FOR AUTH ---
document.getElementById('passIn').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleAuth();
    }
});

console.log('📝 Pufutara Keep loaded successfully!');
console.log('💡 Keyboard shortcuts: Ctrl/Cmd + K (Search), Escape (Close Modal)');
