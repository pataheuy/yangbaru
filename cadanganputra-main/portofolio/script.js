// Portofolio - Portfolio Website Utilities

// Smooth scroll for navigation
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

// Portfolio filter
function setupPortfolioFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item, .project-card');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.style.display = '';
                    setTimeout(() => item.classList.add('show'), 10);
                } else {
                    item.classList.remove('show');
                    setTimeout(() => item.style.display = 'none', 300);
                }
            });
        });
    });
}

// Project modal/lightbox
function setupProjectModal() {
    const projectItems = document.querySelectorAll('.portfolio-item, .project-card');
    
    projectItems.forEach(item => {
        item.addEventListener('click', () => {
            const projectId = item.dataset.id;
            showProjectModal(projectId);
        });
    });
}

function showProjectModal(projectId) {
    const item = document.querySelector(`[data-id="${projectId}"]`);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal project-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <div class="modal-body">
                <img src="${item.dataset.image || ''}" alt="${item.dataset.title || ''}">
                <h2>${item.dataset.title || ''}</h2>
                <p>${item.dataset.description || ''}</p>
                <div class="project-tags">
                    ${(item.dataset.tags || '').split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                </div>
                ${item.dataset.link ? `<a href="${item.dataset.link}" class="btn-primary" target="_blank">View Project</a>` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => modal.classList.add('show'), 10);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-close')) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    });
}

// Contact form
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        try {
            // Simulate sending
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            showToast('success', 'Message sent successfully!');
            form.reset();
        } catch (error) {
            showToast('error', 'Failed to send message');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Animate on scroll
function setupScrollAnimation() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1
    });
    
    elements.forEach(el => observer.observe(el));
}

// Skills progress animation
function animateSkills() {
    const skillBars = document.querySelectorAll('.skill-progress');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const percent = bar.dataset.percent || 0;
                bar.style.width = `${percent}%`;
                observer.unobserve(bar);
            }
        });
    });
    
    skillBars.forEach(bar => observer.observe(bar));
}

// Typing effect for hero text
function setupTypingEffect() {
    const element = document.querySelector('.typing-text');
    if (!element) return;
    
    const texts = element.dataset.texts?.split('|') || ['Developer', 'Designer', 'Creator'];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
        const currentText = texts[textIndex];
        
        if (isDeleting) {
            element.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
        } else {
            element.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
        }
        
        let speed = isDeleting ? 50 : 100;
        
        if (!isDeleting && charIndex === currentText.length) {
            speed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
        }
        
        setTimeout(type, speed);
    }
    
    type();
}

// Utility functions
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize
function init() {
    setupSmoothScroll();
    setupNavbar();
    setupPortfolioFilter();
    setupProjectModal();
    setupContactForm();
    setupScrollAnimation();
    animateSkills();
    setupTypingEffect();
    
    document.body.classList.add('loaded');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
