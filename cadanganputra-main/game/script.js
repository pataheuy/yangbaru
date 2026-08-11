// ============================================================
// PUFUTARA PLAY GAMES - Main Script
// ============================================================

// Smooth scroll untuk internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if(target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Tambahkan efek hover sound (opsional)
const gameCards = document.querySelectorAll('.game-card');
gameCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-12px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Add ripple effect on click
gameCards.forEach(card => {
    card.addEventListener('click', function(e) {
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(0,0,0,0.1)';
        ripple.style.width = ripple.style.height = '100px';
        ripple.style.left = e.clientX - this.offsetLeft - 50 + 'px';
        ripple.style.top = e.clientY - this.offsetTop - 50 + 'px';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.pointerEvents = 'none';
        
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add CSS animation for ripple
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        from { transform: scale(0); opacity: 1; }
        to { transform: scale(4); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Console easter egg
console.log('%c🎮 PUFUTARA PLAY GAMES 🎮', 'font-size:20px; font-weight:bold; color:#000;');
console.log('%cSelamat bermain! Semua game dibuat dengan ❤️ by Putra', 'font-size:12px; color:#666;');

// Loading animation complete
window.addEventListener('load', () => {
    console.log('%c✓ All games loaded successfully!', 'color:green; font-weight:bold;');
});
