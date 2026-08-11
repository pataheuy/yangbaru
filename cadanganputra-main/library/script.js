// Library - Digital Library Management

class Library {
    constructor() {
        this.books = [];
        this.currentFilter = 'all';
        this.currentSort = 'title';
        this.init();
    }

    init() {
        this.loadBooks();
        this.setupUI();
        this.setupSearch();
        this.setupFilters();
    }

    loadBooks() {
        const bookElements = document.querySelectorAll('.book-item');
        bookElements.forEach(el => {
            this.books.push({
                id: el.dataset.id,
                title: el.dataset.title,
                author: el.dataset.author,
                category: el.dataset.category,
                year: el.dataset.year,
                isbn: el.dataset.isbn,
                available: el.dataset.available === 'true'
            });
        });
    }

    setupUI() {
        document.querySelectorAll('.book-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showBookDetails(item.dataset.id);
            });
        });
        
        const borrowButtons = document.querySelectorAll('.borrow-btn');
        borrowButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.borrowBook(btn.dataset.id);
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('bookSearch');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            this.searchBooks(e.target.value);
        });
    }

    setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.filterBooks();
            });
        });
        
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortBooks();
            });
        }
    }

    searchBooks(query) {
        const searchTerm = query.toLowerCase();
        document.querySelectorAll('.book-item').forEach(item => {
            const title = item.dataset.title?.toLowerCase() || '';
            const author = item.dataset.author?.toLowerCase() || '';
            
            if (title.includes(searchTerm) || author.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterBooks() {
        document.querySelectorAll('.book-item').forEach(item => {
            if (this.currentFilter === 'all' || item.dataset.category === this.currentFilter) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    sortBooks() {
        const container = document.querySelector('.books-grid, .books-list');
        if (!container) return;
        
        const items = Array.from(container.querySelectorAll('.book-item'));
        
        items.sort((a, b) => {
            let aValue = a.dataset[this.currentSort] || '';
            let bValue = b.dataset[this.currentSort] || '';
            
            return aValue.localeCompare(bValue);
        });
        
        items.forEach(item => container.appendChild(item));
    }

    showBookDetails(bookId) {
        const book = this.books.find(b => b.id === bookId);
        if (!book) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal book-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <h2>${book.title}</h2>
                <p><strong>Author:</strong> ${book.author}</p>
                <p><strong>Category:</strong> ${book.category}</p>
                <p><strong>Year:</strong> ${book.year}</p>
                <p><strong>ISBN:</strong> ${book.isbn}</p>
                <p><strong>Status:</strong> ${book.available ? 'Available' : 'Borrowed'}</p>
                ${book.available ? '<button class="btn-primary borrow-modal-btn">Borrow</button>' : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
        
        const borrowBtn = modal.querySelector('.borrow-modal-btn');
        if (borrowBtn) {
            borrowBtn.addEventListener('click', () => {
                this.borrowBook(bookId);
                modal.remove();
                document.body.style.overflow = '';
            });
        }
    }

    borrowBook(bookId) {
        const book = this.books.find(b => b.id === bookId);
        if (!book || !book.available) return;
        
        // Save borrow record
        const borrowRecords = JSON.parse(localStorage.getItem('library_borrows') || '[]');
        borrowRecords.push({
            bookId,
            borrowDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
        localStorage.setItem('library_borrows', JSON.stringify(borrowRecords));
        
        book.available = false;
        this.updateBookUI(bookId);
        
        this.showMessage('success', `Successfully borrowed: ${book.title}`);
    }

    updateBookUI(bookId) {
        const bookElement = document.querySelector(`[data-id="${bookId}"]`);
        if (bookElement) {
            bookElement.classList.add('borrowed');
            const borrowBtn = bookElement.querySelector('.borrow-btn');
            if (borrowBtn) {
                borrowBtn.disabled = true;
                borrowBtn.textContent = 'Borrowed';
            }
        }
    }

    showMessage(type, message) {
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
}

// Initialize
let library;

function init() {
    library = new Library();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.Library = Library;
