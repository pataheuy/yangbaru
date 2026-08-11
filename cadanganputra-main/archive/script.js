// Archive Portal - Reveal on Scroll & Parallax Effects

// Reveal on Scroll Animation
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    
    reveals.forEach(element => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    });
}

// Hero Parallax Effect
function heroParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const scrolled = window.pageYOffset;
    const parallaxSpeed = 0.5;
    
    hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
}

// Smooth Scroll for Navigation Links
function smoothScrollLinks() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
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

// Initialize all functions
function init() {
    // Add scroll event listeners
    window.addEventListener('scroll', () => {
        revealOnScroll();
        heroParallax();
    });
    
    // Initial call
    revealOnScroll();
    smoothScrollLinks();
    
    // Add CSS class for JavaScript-enabled features
    document.documentElement.classList.add('js-enabled');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
