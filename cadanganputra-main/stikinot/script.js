// Stikinot - Sticky Notes Application

class StickyNotes {
    constructor() {
        this.notes = [];
        this.init();
    }

    init() {
        this.loadNotes();
        this.setupUI();
        this.renderNotes();
    }

    setupUI() {
        const addBtn = document.getElementById('addNoteBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.createNote());
        }
    }

    createNote(content = '', color = '#FFE66D') {
        const note = {
            id: Date.now().toString(),
            content,
            color,
            x: Math.random() * (window.innerWidth - 250),
            y: Math.random() * (window.innerHeight - 250),
            timestamp: Date.now()
        };
        
        this.notes.push(note);
        this.saveNotes();
        this.renderNote(note);
    }

    renderNote(note) {
        const container = document.getElementById('notesContainer');
        if (!container) return;
        
        const noteEl = document.createElement('div');
        noteEl.className = 'sticky-note';
        noteEl.style.backgroundColor = note.color;
        noteEl.style.left = `${note.x}px`;
        noteEl.style.top = `${note.y}px`;
        noteEl.dataset.id = note.id;
        noteEl.innerHTML = `
            <textarea>${note.content}</textarea>
            <div class="note-controls">
                <button class="color-btn" data-color="#FFE66D">🟡</button>
                <button class="color-btn" data-color="#FF6B6B">🔴</button>
                <button class="color-btn" data-color="#4ECDC4">🔵</button>
                <button class="color-btn" data-color="#95E1D3">🟢</button>
                <button class="delete-btn">🗑️</button>
            </div>
        `;
        
        container.appendChild(noteEl);
        this.setupNoteEvents(noteEl, note);
    }

    setupNoteEvents(noteEl, note) {
        const textarea = noteEl.querySelector('textarea');
        textarea.addEventListener('input', () => {
            note.content = textarea.value;
            this.saveNotes();
        });
        
        noteEl.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                noteEl.style.backgroundColor = color;
                note.color = color;
                this.saveNotes();
            });
        });
        
        const deleteBtn = noteEl.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            this.deleteNote(note.id);
            noteEl.remove();
        });
        
        this.makeDraggable(noteEl, note);
    }

    makeDraggable(noteEl, note) {
        let isDragging = false;
        let currentX, currentY, initialX, initialY;
        
        noteEl.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'TEXTAREA') return;
            
            isDragging = true;
            initialX = e.clientX - note.x;
            initialY = e.clientY - note.y;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            noteEl.style.left = `${currentX}px`;
            noteEl.style.top = `${currentY}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                note.x = currentX;
                note.y = currentY;
                this.saveNotes();
            }
            isDragging = false;
        });
    }

    deleteNote(id) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.saveNotes();
    }

    renderNotes() {
        this.notes.forEach(note => this.renderNote(note));
    }

    saveNotes() {
        localStorage.setItem('sticky_notes', JSON.stringify(this.notes));
    }

    loadNotes() {
        const saved = localStorage.getItem('sticky_notes');
        if (saved) {
            this.notes = JSON.parse(saved);
        }
    }
}

let stickyNotes;

function init() {
    stickyNotes = new StickyNotes();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.StickyNotes = StickyNotes;
