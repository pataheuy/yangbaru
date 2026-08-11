// Gallery - Photo Gallery with Supabase Storage

class GalleryManager {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.bucket = 'gallery';
        this.photos = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        await this.loadPhotos();
        this.setupUI();
        this.setupLightbox();
    }

    setupUI() {
        const uploadBtn = document.getElementById('uploadBtn');
        const photoInput = document.getElementById('photoInput');
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        if (uploadBtn && photoInput) {
            uploadBtn.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', (e) => this.handleUpload(e));
        }
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderPhotos();
            });
        });
    }

    async handleUpload(event) {
        const files = event.target.files;
        if (!files.length) return;
        
        for (const file of files) {
            await this.uploadPhoto(file);
        }
        
        event.target.value = '';
    }

    async uploadPhoto(file) {
        const fileName = `${Date.now()}_${file.name}`;
        
        try {
            this.showMessage('info', `Uploading ${file.name}...`);
            
            const { data, error } = await this.client.storage
                .from(this.bucket)
                .upload(fileName, file);
            
            if (error) throw error;
            
            this.showMessage('success', 'Photo uploaded!');
            await this.loadPhotos();
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('error', 'Upload failed');
        }
    }

    async loadPhotos() {
        try {
            const { data, error } = await this.client.storage
                .from(this.bucket)
                .list();
            
            if (error) throw error;
            
            this.photos = data || [];
            this.renderPhotos();
            
        } catch (error) {
            console.error('Load photos error:', error);
        }
    }

    renderPhotos() {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;
        
        const filteredPhotos = this.currentFilter === 'all' 
            ? this.photos 
            : this.photos.filter(p => p.metadata?.category === this.currentFilter);
        
        if (!filteredPhotos.length) {
            gallery.innerHTML = '<p class="empty-state">No photos yet</p>';
            return;
        }
        
        gallery.innerHTML = filteredPhotos.map(photo => {
            const url = this.getPhotoUrl(photo.name);
            return `
                <div class="gallery-item" data-photo="${photo.name}">
                    <img src="${url}" alt="${photo.name}" loading="lazy">
                    <div class="photo-overlay">
                        <button class="btn-icon view-btn" data-url="${url}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-name="${photo.name}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Setup actions
        gallery.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openLightbox(btn.dataset.url));
        });
        
        gallery.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deletePhoto(btn.dataset.name));
        });
    }

    getPhotoUrl(fileName) {
        const { data } = this.client.storage
            .from(this.bucket)
            .getPublicUrl(fileName);
        
        return data.publicUrl;
    }

    async deletePhoto(fileName) {
        if (!confirm('Delete this photo?')) return;
        
        try {
            const { error } = await this.client.storage
                .from(this.bucket)
                .remove([fileName]);
            
            if (error) throw error;
            
            this.showMessage('success', 'Photo deleted');
            await this.loadPhotos();
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showMessage('error', 'Delete failed');
        }
    }

    setupLightbox() {
        // Lightbox will be created dynamically
    }

    openLightbox(imageUrl) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox active';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <img src="${imageUrl}" alt="Photo">
                <button class="lightbox-close">&times;</button>
                <button class="lightbox-nav prev">&#10094;</button>
                <button class="lightbox-nav next">&#10095;</button>
            </div>
        `;
        
        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
                lightbox.remove();
                document.body.style.overflow = '';
            }
        });
        
        // Keyboard navigation
        const handleKeyboard = (e) => {
            if (e.key === 'Escape') {
                lightbox.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleKeyboard);
            }
        };
        document.addEventListener('keydown', handleKeyboard);
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

// Image lazy loading utility
function setupLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('loading' in HTMLImageElement.prototype) {
        // Browser supports native lazy loading
        return;
    }
    
    // Fallback for browsers that don't support lazy loading
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Masonry layout
function setupMasonryLayout() {
    const gallery = document.getElementById('gallery');
    if (!gallery || !gallery.classList.contains('masonry')) return;
    
    const resizeGridItem = (item) => {
        const grid = gallery;
        const rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
        const rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-row-gap'));
        const rowSpan = Math.ceil((item.querySelector('img').getBoundingClientRect().height + rowGap) / (rowHeight + rowGap));
        item.style.gridRowEnd = `span ${rowSpan}`;
    };
    
    const resizeAllGridItems = () => {
        const items = gallery.querySelectorAll('.gallery-item');
        items.forEach(item => {
            const img = item.querySelector('img');
            if (img.complete) {
                resizeGridItem(item);
            } else {
                img.addEventListener('load', () => resizeGridItem(item));
            }
        });
    };
    
    window.addEventListener('resize', resizeAllGridItems);
    resizeAllGridItems();
}

// Initialize
let galleryManager;

function init() {
    if (typeof window.supabaseClient !== 'undefined') {
        galleryManager = new GalleryManager(window.supabaseClient);
    }
    
    setupLazyLoading();
    setupMasonryLayout();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.GalleryManager = GalleryManager;
