// News - News Portal Utilities

// Article search and filter
function setupSearch() {
    const searchInput = document.getElementById('newsSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.news-item, .article-card').forEach(item => {
            const title = item.querySelector('.title, h3')?.textContent.toLowerCase() || '';
            const content = item.querySelector('.excerpt, .content')?.textContent.toLowerCase() || '';
            
            if (title.includes(query) || content.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Category filter
function setupCategoryFilter() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            document.querySelectorAll('.news-item, .article-card').forEach(item => {
                if (category === 'all' || item.dataset.category === category) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// Read more functionality
function setupReadMore() {
    document.querySelectorAll('.read-more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const articleId = this.dataset.articleId;
            loadArticle(articleId);
        });
    });
}

function loadArticle(articleId) {
    // Navigate to article page or load in modal
    window.location.href = `article.html?id=${articleId}`;
}

// Share functionality
function setupShare() {
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const url = this.dataset.url || window.location.href;
            const title = this.dataset.title || document.title;
            
            if (navigator.share) {
                navigator.share({ title, url })
                    .catch(err => console.log('Share failed:', err));
            } else {
                copyToClipboard(url);
                showToast('Link copied to clipboard!');
            }
        });
    });
}

// Bookmark articles
function setupBookmarks() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        const articleId = btn.dataset.articleId;
        
        if (isBookmarked(articleId)) {
            btn.classList.add('bookmarked');
        }
        
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleBookmark(articleId);
            this.classList.toggle('bookmarked');
        });
    });
}

function isBookmarked(articleId) {
    const bookmarks = JSON.parse(localStorage.getItem('news_bookmarks') || '[]');
    return bookmarks.includes(articleId);
}

function toggleBookmark(articleId) {
    let bookmarks = JSON.parse(localStorage.getItem('news_bookmarks') || '[]');
    
    if (bookmarks.includes(articleId)) {
        bookmarks = bookmarks.filter(id => id !== articleId);
    } else {
        bookmarks.push(articleId);
    }
    
    localStorage.setItem('news_bookmarks', JSON.stringify(bookmarks));
}

// Lazy load images
function setupLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Infinite scroll
function setupInfiniteScroll() {
    let page = 1;
    let loading = false;
    
    window.addEventListener('scroll', () => {
        if (loading) return;
        
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        if (scrollTop + clientHeight >= scrollHeight - 500) {
            loadMoreArticles();
        }
    });
    
    async function loadMoreArticles() {
        loading = true;
        page++;
        
        // Simulate loading
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'block';
        
        setTimeout(() => {
            // Load articles here
            loading = false;
            if (loader) loader.style.display = 'none';
        }, 1000);
    }
}

// Utilities
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize
function init() {
    setupSearch();
    setupCategoryFilter();
    setupReadMore();
    setupShare();
    setupBookmarks();
    setupLazyLoad();
    setupInfiniteScroll();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
