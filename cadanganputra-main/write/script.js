// Write - Text Editor / Writing Application

class TextEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.documents = [];
        this.currentDoc = null;
        this.init();
    }

    init() {
        if (!this.editor) return;
        
        this.loadDocuments();
        this.setupToolbar();
        this.setupAutoSave();
        this.setupKeyboardShortcuts();
    }

    setupToolbar() {
        // Bold
        document.getElementById('boldBtn')?.addEventListener('click', () => {
            document.execCommand('bold');
        });
        
        // Italic
        document.getElementById('italicBtn')?.addEventListener('click', () => {
            document.execCommand('italic');
        });
        
        // Underline
        document.getElementById('underlineBtn')?.addEventListener('click', () => {
            document.execCommand('underline');
        });
        
        // Align
        document.querySelectorAll('[data-align]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.execCommand('justify' + btn.dataset.align);
            });
        });
        
        // Font size
        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                document.execCommand('fontSize', false, e.target.value);
            });
        }
        
        // Font color
        const colorPicker = document.getElementById('fontColor');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                document.execCommand('foreColor', false, e.target.value);
            });
        }
        
        // Insert link
        document.getElementById('linkBtn')?.addEventListener('click', () => {
            const url = prompt('Enter URL:');
            if (url) {
                document.execCommand('createLink', false, url);
            }
        });
        
        // Insert image
        document.getElementById('imageBtn')?.addEventListener('click', () => {
            const url = prompt('Enter image URL:');
            if (url) {
                document.execCommand('insertImage', false, url);
            }
        });
        
        // Lists
        document.getElementById('ulBtn')?.addEventListener('click', () => {
            document.execCommand('insertUnorderedList');
        });
        
        document.getElementById('olBtn')?.addEventListener('click', () => {
            document.execCommand('insertOrderedList');
        });
        
        // Save
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            this.saveDocument();
        });
        
        // Export
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportDocument();
        });
        
        // New document
        document.getElementById('newDocBtn')?.addEventListener('click', () => {
            this.newDocument();
        });
        
        // Word count
        this.editor.addEventListener('input', () => {
            this.updateWordCount();
        });
    }

    setupAutoSave() {
        setInterval(() => {
            if (this.currentDoc) {
                this.autoSave();
            }
        }, 30000); // Auto-save every 30 seconds
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.saveDocument();
                        break;
                    case 'b':
                        e.preventDefault();
                        document.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        document.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        document.execCommand('underline');
                        break;
                }
            }
        });
    }

    newDocument() {
        const title = prompt('Document title:') || 'Untitled';
        this.currentDoc = {
            id: Date.now().toString(),
            title,
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.editor.innerHTML = '';
        this.updateTitle(title);
    }

    saveDocument() {
        if (!this.currentDoc) {
            this.newDocument();
        }
        
        this.currentDoc.content = this.editor.innerHTML;
        this.currentDoc.updatedAt = Date.now();
        
        const index = this.documents.findIndex(d => d.id === this.currentDoc.id);
        if (index >= 0) {
            this.documents[index] = this.currentDoc;
        } else {
            this.documents.push(this.currentDoc);
        }
        
        localStorage.setItem('documents', JSON.stringify(this.documents));
        this.showToast('Document saved!');
    }

    autoSave() {
        if (!this.currentDoc) return;
        
        this.currentDoc.content = this.editor.innerHTML;
        this.currentDoc.updatedAt = Date.now();
        
        const index = this.documents.findIndex(d => d.id === this.currentDoc.id);
        if (index >= 0) {
            this.documents[index] = this.currentDoc;
            localStorage.setItem('documents', JSON.stringify(this.documents));
        }
    }

    exportDocument() {
        if (!this.currentDoc) return;
        
        const content = this.editor.innerHTML;
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentDoc.title}.html`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    loadDocuments() {
        const saved = localStorage.getItem('documents');
        if (saved) {
            this.documents = JSON.parse(saved);
        }
    }

    updateWordCount() {
        const text = this.editor.textContent || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;
        
        const wordCountEl = document.getElementById('wordCount');
        if (wordCountEl) {
            wordCountEl.textContent = `Words: ${words} | Characters: ${chars}`;
        }
    }

    updateTitle(title) {
        const titleEl = document.getElementById('docTitle');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

let textEditor;

function init() {
    textEditor = new TextEditor();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.TextEditor = TextEditor;
