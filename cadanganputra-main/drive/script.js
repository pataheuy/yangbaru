// Drive - Cloud Storage with Supabase Auth & Storage

// Supabase Authentication Manager
class AuthManager {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkSession();
        this.setupAuthUI();
    }

    async checkSession() {
        if (!this.client) return;
        
        try {
            const { data: { session } } = await this.client.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                this.onAuthStateChange('signed_in');
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    setupAuthUI() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.email.value;
        const password = form.password.value;
        
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            this.currentUser = data.user;
            this.onAuthStateChange('signed_in');
            this.showMessage('success', 'Login berhasil!');
            
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('error', error.message);
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.email.value;
        const password = form.password.value;
        
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password
            });
            
            if (error) throw error;
            
            this.showMessage('success', 'Akun berhasil dibuat! Silakan cek email untuk verifikasi.');
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage('error', error.message);
        }
    }

    async handleLogout() {
        try {
            const { error } = await this.client.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.onAuthStateChange('signed_out');
            this.showMessage('success', 'Logout berhasil!');
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('error', error.message);
        }
    }

    onAuthStateChange(state) {
        const authContainer = document.getElementById('authContainer');
        const driveContainer = document.getElementById('driveContainer');
        const userInfo = document.getElementById('userInfo');
        
        if (state === 'signed_in') {
            if (authContainer) authContainer.style.display = 'none';
            if (driveContainer) driveContainer.style.display = 'block';
            if (userInfo && this.currentUser) {
                userInfo.textContent = this.currentUser.email;
            }
        } else {
            if (authContainer) authContainer.style.display = 'block';
            if (driveContainer) driveContainer.style.display = 'none';
        }
    }

    showMessage(type, message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => messageEl.classList.add('show'), 10);
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Storage Manager
class StorageManager {
    constructor(supabaseClient, authManager) {
        this.client = supabaseClient;
        this.authManager = authManager;
        this.bucket = 'files';
        this.files = [];
        this.init();
    }

    init() {
        this.setupUI();
        this.loadFiles();
    }

    setupUI() {
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        const refreshBtn = document.getElementById('refreshBtn');
        
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleUpload(e));
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadFiles());
        }
    }

    async handleUpload(event) {
        const files = event.target.files;
        if (!files.length) return;
        
        const user = this.authManager.getCurrentUser();
        if (!user) {
            this.showMessage('error', 'Please login first');
            return;
        }
        
        for (const file of files) {
            await this.uploadFile(file, user.id);
        }
        
        // Clear input
        event.target.value = '';
    }

    async uploadFile(file, userId) {
        const fileName = `${userId}/${Date.now()}_${file.name}`;
        
        try {
            this.showProgress(`Uploading ${file.name}...`);
            
            const { data, error } = await this.client.storage
                .from(this.bucket)
                .upload(fileName, file);
            
            if (error) throw error;
            
            this.showMessage('success', `${file.name} uploaded successfully!`);
            this.loadFiles();
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('error', `Failed to upload ${file.name}`);
        } finally {
            this.hideProgress();
        }
    }

    async loadFiles() {
        const user = this.authManager.getCurrentUser();
        if (!user) return;
        
        try {
            const { data, error } = await this.client.storage
                .from(this.bucket)
                .list(user.id);
            
            if (error) throw error;
            
            this.files = data || [];
            this.renderFiles();
            
        } catch (error) {
            console.error('Load files error:', error);
        }
    }

    renderFiles() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;
        
        if (!this.files.length) {
            fileList.innerHTML = '<p class="empty-state">No files yet. Upload your first file!</p>';
            return;
        }
        
        fileList.innerHTML = this.files.map(file => `
            <div class="file-item" data-name="${file.name}">
                <div class="file-icon">
                    <i class="fas fa-file"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatSize(file.metadata?.size || 0)}</div>
                </div>
                <div class="file-actions">
                    <button class="btn-icon download-btn" data-file="${file.name}">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon delete-btn" data-file="${file.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Setup file actions
        fileList.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', () => this.downloadFile(btn.dataset.file));
        });
        
        fileList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteFile(btn.dataset.file));
        });
    }

    async downloadFile(fileName) {
        const user = this.authManager.getCurrentUser();
        if (!user) return;
        
        try {
            const { data, error } = await this.client.storage
                .from(this.bucket)
                .download(`${user.id}/${fileName}`);
            
            if (error) throw error;
            
            // Create download link
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Download error:', error);
            this.showMessage('error', 'Failed to download file');
        }
    }

    async deleteFile(fileName) {
        if (!confirm(`Delete ${fileName}?`)) return;
        
        const user = this.authManager.getCurrentUser();
        if (!user) return;
        
        try {
            const { error } = await this.client.storage
                .from(this.bucket)
                .remove([`${user.id}/${fileName}`]);
            
            if (error) throw error;
            
            this.showMessage('success', 'File deleted');
            this.loadFiles();
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showMessage('error', 'Failed to delete file');
        }
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    showProgress(message) {
        const progress = document.getElementById('uploadProgress');
        if (progress) {
            progress.textContent = message;
            progress.style.display = 'block';
        }
    }

    hideProgress() {
        const progress = document.getElementById('uploadProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }

    showMessage(type, message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => messageEl.classList.add('show'), 10);
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }
}

// Initialize application
let authManager;
let storageManager;

function init() {
    // Check if Supabase client is available
    if (typeof window.supabaseClient !== 'undefined') {
        authManager = new AuthManager(window.supabaseClient);
        storageManager = new StorageManager(window.supabaseClient, authManager);
    } else {
        console.error('Supabase client not initialized');
    }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for external use
window.AuthManager = AuthManager;
window.StorageManager = StorageManager;
