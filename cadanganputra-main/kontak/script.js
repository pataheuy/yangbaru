// Kontak - Contact Page Utilities

// Contact form handling
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim...';
        
        try {
            // Simulate sending or use actual API
            await sendContactMessage(data);
            
            showMessage('success', 'Pesan berhasil dikirim!');
            form.reset();
            
        } catch (error) {
            console.error('Error sending message:', error);
            showMessage('error', 'Gagal mengirim pesan. Silakan coba lagi.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

async function sendContactMessage(data) {
    // If Supabase is available
    if (window.supabaseClient) {
        const { error } = await window.supabaseClient
            .from('contact_messages')
            .insert([data]);
        
        if (error) throw error;
    }
    
    // WhatsApp fallback
    const phone = '628123456789'; // Replace with actual number
    const message = `Pesan Kontak Baru:\n\nNama: ${data.name}\nEmail: ${data.email}\nSubjek: ${data.subject || '-'}\n\nPesan:\n${data.message}`;
    
    // Store in localStorage as backup
    saveMessageLocally(data);
    
    return Promise.resolve();
}

function saveMessageLocally(data) {
    const messages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
    messages.push({
        ...data,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('contact_messages', JSON.stringify(messages));
}

// Form validation
function setupFormValidation() {
    const inputs = document.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('invalid')) {
                validateField(input);
            }
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (field.required && !value) {
        isValid = false;
        errorMessage = 'Field ini wajib diisi';
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Email tidak valid';
        }
    }
    
    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(value)) {
            isValid = false;
            errorMessage = 'Nomor telepon tidak valid';
        }
    }
    
    // Min length validation
    if (field.minLength && value.length < field.minLength) {
        isValid = false;
        errorMessage = `Minimal ${field.minLength} karakter`;
    }
    
    // Update UI
    field.classList.toggle('invalid', !isValid);
    field.classList.toggle('valid', isValid && value);
    
    let errorEl = field.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('error-message')) {
        errorEl = document.createElement('span');
        errorEl.className = 'error-message';
        field.parentNode.insertBefore(errorEl, field.nextSibling);
    }
    
    errorEl.textContent = errorMessage;
    
    return isValid;
}

// Map integration
function setupMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    const lat = parseFloat(mapContainer.dataset.lat || '-7.7956');
    const lng = parseFloat(mapContainer.dataset.lng || '110.3695');
    
    // If Google Maps or Leaflet is available, initialize map
    // Otherwise, show static map image
    if (typeof google === 'undefined') {
        // Fallback to static map
        mapContainer.innerHTML = `
            <img src="https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&markers=${lat},${lng}" 
                 alt="Map" style="width: 100%; height: 100%; object-fit: cover;">
        `;
    }
}

// Social media links
function setupSocialLinks() {
    const shareButtons = document.querySelectorAll('.social-share');
    
    shareButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            const url = window.location.href;
            const text = document.title;
            
            let shareUrl = '';
            
            switch (platform) {
                case 'whatsapp':
                    shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' - ' + url)}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                    break;
                case 'linkedin':
                    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                    break;
                case 'email':
                    shareUrl = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;
                    break;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
}

// FAQ accordion
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all
            faqItems.forEach(i => i.classList.remove('active'));
            
            // Open clicked if wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// Smooth scroll
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

// Show message utility
function showMessage(type, message) {
    const messageEl = document.createElement('div');
    messageEl.className = `toast toast-${type}`;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => messageEl.classList.add('show'), 10);
    setTimeout(() => {
        messageEl.classList.remove('show');
        setTimeout(() => messageEl.remove(), 300);
    }, 3000);
}

// Initialize all features
function init() {
    setupContactForm();
    setupFormValidation();
    setupMap();
    setupSocialLinks();
    setupFAQ();
    setupSmoothScroll();
    
    document.body.classList.add('loaded');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
