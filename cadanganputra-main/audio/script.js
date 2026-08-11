// Audio Player - Music Player with Playlist Management

class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.playlist = [];
        this.init();
    }

    init() {
        this.setupPlaylist();
        this.setupEventListeners();
        this.updateUI();
    }

    setupPlaylist() {
        // Initialize playlist from data attributes or default list
        const playlistElement = document.querySelector('.playlist');
        if (playlistElement) {
            const tracks = playlistElement.querySelectorAll('.track-item');
            tracks.forEach((track, index) => {
                this.playlist.push({
                    title: track.dataset.title || `Track ${index + 1}`,
                    artist: track.dataset.artist || 'Unknown Artist',
                    src: track.dataset.src || '',
                    duration: track.dataset.duration || '0:00'
                });
            });
        }
    }

    setupEventListeners() {
        // Play/Pause button
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }

        // Next/Previous buttons
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        
        if (nextBtn) nextBtn.addEventListener('click', () => this.next());
        if (prevBtn) prevBtn.addEventListener('click', () => this.previous());

        // Progress bar
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.addEventListener('click', (e) => this.seek(e));
        }

        // Volume control
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.audio.volume = e.target.value / 100;
            });
        }

        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());

        // Playlist items
        document.querySelectorAll('.track-item').forEach((item, index) => {
            item.addEventListener('click', () => this.playTrack(index));
        });
    }

    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        this.audio.src = track.src;
        this.updateUI();
        
        // Highlight current track in playlist
        document.querySelectorAll('.track-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.audio.play();
        this.isPlaying = true;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    next() {
        this.loadTrack((this.currentTrackIndex + 1) % this.playlist.length);
        if (this.isPlaying) this.play();
    }

    previous() {
        this.loadTrack((this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length);
        if (this.isPlaying) this.play();
    }

    playTrack(index) {
        this.loadTrack(index);
        this.play();
    }

    seek(event) {
        const progressBar = event.currentTarget;
        const percent = event.offsetX / progressBar.offsetWidth;
        this.audio.currentTime = percent * this.audio.duration;
    }

    updateProgress() {
        const progressBar = document.getElementById('progressBar');
        const currentTimeEl = document.getElementById('currentTime');
        
        if (progressBar && this.audio.duration) {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            const progress = progressBar.querySelector('.progress');
            if (progress) progress.style.width = `${percent}%`;
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        }
    }

    updateDuration() {
        const durationEl = document.getElementById('duration');
        if (durationEl) {
            durationEl.textContent = this.formatTime(this.audio.duration);
        }
    }

    updateUI() {
        const track = this.playlist[this.currentTrackIndex];
        if (!track) return;
        
        const titleEl = document.getElementById('trackTitle');
        const artistEl = document.getElementById('trackArtist');
        
        if (titleEl) titleEl.textContent = track.title;
        if (artistEl) artistEl.textContent = track.artist;
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize player when DOM is ready
let player;

function init() {
    player = new MusicPlayer();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            player.togglePlay();
        } else if (e.code === 'ArrowRight') {
            player.next();
        } else if (e.code === 'ArrowLeft') {
            player.previous();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
