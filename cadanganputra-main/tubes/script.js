// Tubes - Video Streaming/YouTube-like Platform

// Similar to tube but with more features
function setupVideoPlayer() {
    const players = document.querySelectorAll('.video-player');
    
    players.forEach(player => {
        const video = player.querySelector('video');
        if (!video) return;
        
        // Theater mode
        const theaterBtn = player.querySelector('.theater-btn');
        if (theaterBtn) {
            theaterBtn.addEventListener('click', () => {
                player.classList.toggle('theater-mode');
            });
        }
        
        // Quality selector
        const qualityBtn = player.querySelector('.quality-btn');
        if (qualityBtn) {
            qualityBtn.addEventListener('click', () => {
                showQualityMenu(player);
            });
        }
        
        // Playback speed
        const speedBtn = player.querySelector('.speed-btn');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
                const currentIndex = speeds.indexOf(video.playbackRate);
                const nextIndex = (currentIndex + 1) % speeds.length;
                video.playbackRate = speeds[nextIndex];
                speedBtn.textContent = `${speeds[nextIndex]}x`;
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    video.paused ? video.play() : video.pause();
                    break;
                case 'ArrowLeft':
                    video.currentTime -= 5;
                    break;
                case 'ArrowRight':
                    video.currentTime += 5;
                    break;
                case 'f':
                    if (player.requestFullscreen) player.requestFullscreen();
                    break;
                case 'm':
                    video.muted = !video.muted;
                    break;
            }
        });
    });
}

function showQualityMenu(player) {
    const qualities = ['Auto', '1080p', '720p', '480p', '360p'];
    const menu = document.createElement('div');
    menu.className = 'quality-menu';
    menu.innerHTML = qualities.map(q => `<div class="quality-option">${q}</div>`).join('');
    
    player.appendChild(menu);
    
    menu.querySelectorAll('.quality-option').forEach(option => {
        option.addEventListener('click', () => {
            console.log('Quality changed to:', option.textContent);
            menu.remove();
        });
    });
    
    setTimeout(() => menu.addEventListener('click', (e) => {
        if (e.target === menu) menu.remove();
    }), 100);
}

// Subscription functionality
function setupSubscription() {
    document.querySelectorAll('.subscribe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subscribed = this.classList.toggle('subscribed');
            this.textContent = subscribed ? 'Subscribed' : 'Subscribe';
        });
    });
}

// Autoplay next video
function setupAutoplay() {
    const mainVideo = document.getElementById('mainVideo');
    const autoplayToggle = document.getElementById('autoplayToggle');
    
    if (!mainVideo || !autoplayToggle) return;
    
    let autoplayEnabled = localStorage.getItem('autoplay') === 'true';
    autoplayToggle.checked = autoplayEnabled;
    
    autoplayToggle.addEventListener('change', () => {
        autoplayEnabled = autoplayToggle.checked;
        localStorage.setItem('autoplay', autoplayEnabled);
    });
    
    mainVideo.addEventListener('ended', () => {
        if (autoplayEnabled) {
            const current = document.querySelector('.video-item.active');
            const next = current?.nextElementSibling;
            if (next) next.click();
        }
    });
}

// Save watch history
function saveWatchHistory(videoId, title) {
    const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    history.unshift({
        videoId,
        title,
        timestamp: Date.now()
    });
    
    // Keep last 50
    if (history.length > 50) history.pop();
    
    localStorage.setItem('watch_history', JSON.stringify(history));
}

// Initialize
function init() {
    setupVideoPlayer();
    setupSubscription();
    setupAutoplay();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.saveWatchHistory = saveWatchHistory;
