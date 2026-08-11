// Lagu - Music/Song Lyrics Utilities

// Lyrics display and sync
function setupLyricsSync() {
    const audio = document.querySelector('audio');
    const lyricsContainer = document.getElementById('lyrics');
    
    if (!audio || !lyricsContainer) return;
    
    const lyricsLines = lyricsContainer.querySelectorAll('.lyric-line');
    
    audio.addEventListener('timeupdate', () => {
        const currentTime = audio.currentTime;
        
        lyricsLines.forEach(line => {
            const time = parseFloat(line.dataset.time || 0);
            const nextLine = line.nextElementSibling;
            const nextTime = nextLine ? parseFloat(nextLine.dataset.time || Infinity) : Infinity;
            
            if (currentTime >= time && currentTime < nextTime) {
                line.classList.add('active');
                line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                line.classList.remove('active');
            }
        });
    });
}

// Song player controls
function setupPlayer() {
    const audio = document.querySelector('audio');
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const volumeSlider = document.getElementById('volumeSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    
    if (!audio) return;
    
    // Play/Pause
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                audio.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    }
    
    // Progress bar
    if (progressBar) {
        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            const fill = progressBar.querySelector('.progress-fill');
            if (fill) fill.style.width = `${percent}%`;
            
            if (currentTimeEl) {
                currentTimeEl.textContent = formatTime(audio.currentTime);
            }
        });
        
        progressBar.addEventListener('click', (e) => {
            const percent = e.offsetX / progressBar.offsetWidth;
            audio.currentTime = percent * audio.duration;
        });
    }
    
    // Duration
    audio.addEventListener('loadedmetadata', () => {
        if (durationEl) {
            durationEl.textContent = formatTime(audio.duration);
        }
    });
    
    // Volume
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value / 100;
        });
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            playBtn?.click();
        }
    });
}

// Playlist management
function setupPlaylist() {
    const playlistItems = document.querySelectorAll('.playlist-item');
    let currentIndex = 0;
    
    playlistItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            loadSong(index);
        });
    });
    
    // Auto-play next
    const audio = document.querySelector('audio');
    if (audio) {
        audio.addEventListener('ended', () => {
            currentIndex = (currentIndex + 1) % playlistItems.length;
            loadSong(currentIndex);
        });
    }
    
    function loadSong(index) {
        currentIndex = index;
        const item = playlistItems[index];
        if (!item) return;
        
        const songSrc = item.dataset.src;
        const songTitle = item.dataset.title;
        const songArtist = item.dataset.artist;
        
        if (audio) {
            audio.src = songSrc;
            audio.play();
        }
        
        // Update UI
        playlistItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const titleEl = document.getElementById('songTitle');
        const artistEl = document.getElementById('songArtist');
        if (titleEl) titleEl.textContent = songTitle;
        if (artistEl) artistEl.textContent = songArtist;
    }
}

// Search songs
function setupSearch() {
    const searchInput = document.getElementById('songSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const songs = document.querySelectorAll('.song-item, .playlist-item');
        
        songs.forEach(song => {
            const title = song.dataset.title?.toLowerCase() || '';
            const artist = song.dataset.artist?.toLowerCase() || '';
            
            if (title.includes(query) || artist.includes(query)) {
                song.style.display = '';
            } else {
                song.style.display = 'none';
            }
        });
    });
}

// Favorites
function setupFavorites() {
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    
    favoriteButtons.forEach(btn => {
        const songId = btn.dataset.songId;
        
        // Load saved state
        if (isFavorite(songId)) {
            btn.classList.add('favorited');
        }
        
        btn.addEventListener('click', () => {
            toggleFavorite(songId);
            btn.classList.toggle('favorited');
        });
    });
}

function isFavorite(songId) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.includes(songId);
}

function toggleFavorite(songId) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    if (favorites.includes(songId)) {
        favorites = favorites.filter(id => id !== songId);
    } else {
        favorites.push(songId);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Format time utility
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Visualizer (simple)
function setupVisualizer() {
    const visualizer = document.getElementById('visualizer');
    const audio = document.querySelector('audio');
    
    if (!visualizer || !audio || !window.AudioContext) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audio);
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const canvas = visualizer;
        const ctx = canvas.getContext('2d');
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        
        function draw() {
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            
            const barWidth = (WIDTH / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
                ctx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    } catch (error) {
        console.log('Visualizer not available:', error);
    }
}

// Initialize
function init() {
    setupLyricsSync();
    setupPlayer();
    setupPlaylist();
    setupSearch();
    setupFavorites();
    setupVisualizer();
    
    document.body.classList.add('loaded');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
