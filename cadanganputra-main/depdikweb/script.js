// Depdikweb - Departemen Pendidikan BEM Website

// Mading/Worksheet Slider
class Slider {
    constructor(selector) {
        this.container = document.querySelector(selector);
        if (!this.container) return;
        
        this.slides = this.container.querySelectorAll('.slide, .slider-item');
        this.currentIndex = 0;
        this.autoplayInterval = null;
        this.init();
    }

    init() {
        this.createControls();
        this.createIndicators();
        this.setupEventListeners();
        this.startAutoplay();
        this.showSlide(0);
    }

    createControls() {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'slider-control prev';
        prevBtn.innerHTML = '&#10094;';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'slider-control next';
        nextBtn.innerHTML = '&#10095;';
        
        this.container.appendChild(prevBtn);
        this.container.appendChild(nextBtn);
        
        prevBtn.addEventListener('click', () => this.prevSlide());
        nextBtn.addEventListener('click', () => this.nextSlide());
    }

    createIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'slider-indicators';
        
        for (let i = 0; i < this.slides.length; i++) {
            const dot = document.createElement('span');
            dot.className = 'indicator-dot';
            dot.addEventListener('click', () => this.showSlide(i));
            indicators.appendChild(dot);
        }
        
        this.container.appendChild(indicators);
    }

    setupEventListeners() {
        // Touch events for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        this.container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        });
        
        // Pause autoplay on hover
        this.container.addEventListener('mouseenter', () => this.stopAutoplay());
        this.container.addEventListener('mouseleave', () => this.startAutoplay());
    }

    handleSwipe(startX, endX) {
        const diff = startX - endX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
    }

    showSlide(index) {
        this.currentIndex = (index + this.slides.length) % this.slides.length;
        
        this.slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === this.currentIndex);
        });
        
        const indicators = this.container.querySelectorAll('.indicator-dot');
        indicators.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
        });
    }

    nextSlide() {
        this.showSlide(this.currentIndex + 1);
    }

    prevSlide() {
        this.showSlide(this.currentIndex - 1);
    }

    startAutoplay(interval = 5000) {
        this.stopAutoplay();
        this.autoplayInterval = setInterval(() => this.nextSlide(), interval);
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }
}

// Supabase Form Handler
class FormHandler {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.setupForms();
    }

    setupForms() {
        const forms = document.querySelectorAll('form[data-supabase]');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => this.handleSubmit(e, form));
        });
    }

    async handleSubmit(event, form) {
        event.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const table = form.dataset.table || 'submissions';
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim...';
        
        try {
            const { data: result, error } = await this.client
                .from(table)
                .insert([data]);
            
            if (error) throw error;
            
            this.showMessage('success', 'Data berhasil dikirim!');
            form.reset();
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showMessage('error', 'Gagal mengirim data. Silakan coba lagi.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    showMessage(type, message) {
        const messageEl = document.createElement('div');
        messageEl.className = `form-message form-message-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }
}

// AOS Animation Initialization
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }
}

// Smooth Scroll
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Navbar scroll effect
function setupNavbar() {
    const navbar = document.querySelector('.navbar, nav');
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Gallery lightbox for mading/worksheet images
function setupGallery() {
    const images = document.querySelectorAll('.mading-image, .worksheet-image, .gallery-item img');
    
    images.forEach(img => {
        img.addEventListener('click', function() {
            const lightbox = document.createElement('div');
            lightbox.className = 'lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <img src="${this.src}" alt="${this.alt || 'Image'}">
                    <button class="close-lightbox">&times;</button>
                </div>
            `;
            
            document.body.appendChild(lightbox);
            document.body.style.overflow = 'hidden';
            
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox || e.target.classList.contains('close-lightbox')) {
                    lightbox.remove();
                    document.body.style.overflow = '';
                }
            });
        });
    });
}

// Initialize all features
let slider;
let formHandler;

function init() {
    // Initialize slider
    slider = new Slider('.slider, .mading-slider, .worksheet-slider');
    
    // Initialize Supabase form handler if Supabase is available
    if (typeof supabase !== 'undefined' && window.supabaseClient) {
        formHandler = new FormHandler(window.supabaseClient);
    }
    
    // Initialize other features
    initAOS();
    setupSmoothScroll();
    setupNavbar();
    setupGallery();
    
    // Add loaded class
    document.body.classList.add('loaded');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for external use
window.Slider = Slider;
window.FormHandler = FormHandler;
