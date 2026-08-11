// Tube - Video Platform Utilities

// Video player enhancements
function setupVideoPlayer() {
    const videos = document.querySelectorAll('video');
    
    videos.forEach(video => {
        const container = video.parentElement;
        
        // Custom controls
        const controls = document.createElement('div');
        controls.className = 'video-controls';
        controls.innerHTML = `
            <button class="play-btn"><i class="fas fa-play"></i></button>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <span class="time">0:00 / 0:00</span>
            <button class="fullscreen-btn"><i class="fas fa-expand"></i></button>
        `;
        
        container.appendChild(controls);
        
        const playBtn = controls.querySelector('.play-btn');
        const progressBar = controls.querySelector('.progress-bar');
        const progressFill = controls.querySelector('.progress-fill');
        const timeDisplay = controls.querySelector('.time');
        const fullscreenBtn = controls.querySelector('.fullscreen-btn');
        
        // Play/Pause
        playBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                video.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
        
        // Progress
        video.addEventListener('timeupdate', () => {
            const percent = (video.currentTime / video.duration) * 100;
            progressFill.style.width = `${percent}%`;
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        });
        
        progressBar.addEventListener('click', (e) => {
            const percent = e.offsetX / progressBar.offsetWidth;
            video.currentTime = percent * video.duration;
        });
        
        // Fullscreen
        fullscreenBtn.addEventListener('click', () => {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            }
        });
    });
}

// Video playlist
function setupPlaylist() {
    const playlistItems = document.querySelectorAll('.playlist-item');
    const mainVideo = document.getElementById('mainVideo');
    
    if (!mainVideo) return;
    
    playlistItems.forEach(item => {
        item.addEventListener('click', () => {
            mainVideo.src = item.dataset.src;
            mainVideo.play();
            
            playlistItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Update info
            document.getElementById('videoTitle')?.textContent = item.dataset.title || '';
            document.getElementById('videoDescription')?.textContent = item.dataset.description || '';
        });
    });
    
    // Auto-play next
    mainVideo.addEventListener('ended', () => {
        const current = document.querySelector('.playlist-item.active');
        const next = current?.nextElementSibling;
        if (next) next.click();
    });
}

// Search videos
function setupSearch() {
    const searchInput = document.getElementById('videoSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.video-item').forEach(item => {
            const title = item.dataset.title?.toLowerCase() || '';
            item.style.display = title.includes(query) ? '' : 'none';
        });
    });
}

// Like/dislike functionality
function setupLikeDislike() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('liked');
            const count = parseInt(this.querySelector('.count')?.textContent || '0');
            this.querySelector('.count').textContent = this.classList.contains('liked') ? count + 1 : count - 1;
        });
    });
    
    document.querySelectorAll('.dislike-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('disliked');
        });
    });
}

// Comments
function setupComments() {
    const commentForm = document.getElementById('commentForm');
    if (!commentForm) return;
    
    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const input = commentForm.querySelector('textarea');
        const comment = input.value.trim();
        
        if (comment) {
            addComment(comment);
            input.value = '';
        }
    });
}

function addComment(text) {
    const commentsContainer = document.getElementById('comments');
    if (!commentsContainer) return;
    
    const comment = document.createElement('div');
    comment.className = 'comment';
    comment.innerHTML = `
        <div class="comment-header">
            <strong>You</strong>
            <span class="time">Just now</span>
        </div>
        <p>${text}</p>
    `;
    
    commentsContainer.prepend(comment);
}

// Format time
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Initialize
function init() {
    setupVideoPlayer();
    setupPlaylist();
    setupSearch();
    setupLikeDislike();
    setupComments();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
