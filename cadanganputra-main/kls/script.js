// KLS - Classroom/Learning Management System Utilities

// Smooth scroll navigation
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

// Tab switcher for content sections
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.tab;
            
            // Remove active class from all
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            // Add active to selected
            btn.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// Accordion for course modules/materials
function setupAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all accordions
            document.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Open clicked accordion if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// Progress tracker
function updateProgress() {
    const progressBars = document.querySelectorAll('.progress-bar');
    
    progressBars.forEach(bar => {
        const progress = bar.dataset.progress || 0;
        const fill = bar.querySelector('.progress-fill');
        if (fill) {
            fill.style.width = `${progress}%`;
        }
    });
}

// Mark as complete functionality
function setupCompletionTracking() {
    const checkboxes = document.querySelectorAll('.lesson-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const lessonId = checkbox.dataset.lessonId;
            const completed = checkbox.checked;
            
            // Save to localStorage
            saveCompletion(lessonId, completed);
            updateProgress();
        });
    });
    
    // Load saved completions
    loadCompletions();
}

function saveCompletion(lessonId, completed) {
    const completions = JSON.parse(localStorage.getItem('kls_completions') || '{}');
    completions[lessonId] = completed;
    localStorage.setItem('kls_completions', JSON.stringify(completions));
}

function loadCompletions() {
    const completions = JSON.parse(localStorage.getItem('kls_completions') || '{}');
    
    Object.keys(completions).forEach(lessonId => {
        const checkbox = document.querySelector(`[data-lesson-id="${lessonId}"]`);
        if (checkbox) {
            checkbox.checked = completions[lessonId];
        }
    });
}

// Video player enhancements
function setupVideoPlayer() {
    const videos = document.querySelectorAll('video');
    
    videos.forEach(video => {
        // Track watch time
        video.addEventListener('timeupdate', () => {
            const videoId = video.dataset.id;
            const progress = (video.currentTime / video.duration) * 100;
            
            if (progress > 90) {
                // Mark as watched
                saveVideoProgress(videoId, true);
            }
        });
        
        // Custom controls
        const playBtn = video.nextElementSibling?.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    video.pause();
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            });
        }
    });
}

function saveVideoProgress(videoId, watched) {
    const progress = JSON.parse(localStorage.getItem('kls_video_progress') || '{}');
    progress[videoId] = watched;
    localStorage.setItem('kls_video_progress', JSON.stringify(progress));
}

// Notes functionality
function setupNotes() {
    const noteButtons = document.querySelectorAll('.add-note-btn');
    
    noteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lessonId = btn.dataset.lessonId;
            showNoteModal(lessonId);
        });
    });
}

function showNoteModal(lessonId) {
    const modal = document.createElement('div');
    modal.className = 'modal note-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Note</h3>
            <textarea id="noteText" rows="5" placeholder="Write your notes here..."></textarea>
            <div class="modal-actions">
                <button class="btn-secondary cancel-btn">Cancel</button>
                <button class="btn-primary save-note-btn">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.save-note-btn').addEventListener('click', () => {
        const noteText = modal.querySelector('#noteText').value;
        saveNote(lessonId, noteText);
        modal.remove();
    });
}

function saveNote(lessonId, note) {
    const notes = JSON.parse(localStorage.getItem('kls_notes') || '{}');
    if (!notes[lessonId]) notes[lessonId] = [];
    notes[lessonId].push({
        text: note,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('kls_notes', JSON.stringify(notes));
}

// Initialize all features
function init() {
    setupSmoothScroll();
    setupTabs();
    setupAccordion();
    updateProgress();
    setupCompletionTracking();
    setupVideoPlayer();
    setupNotes();
    
    document.body.classList.add('loaded');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
