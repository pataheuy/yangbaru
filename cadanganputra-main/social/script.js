// Social - Social Media Platform Utilities

// Post creation
function setupPostCreation() {
    const postForm = document.getElementById('postForm');
    if (!postForm) return;
    
    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const content = postForm.querySelector('textarea').value;
        if (!content.trim()) return;
        
        createPost(content);
        postForm.reset();
    });
}

function createPost(content) {
    const postsContainer = document.getElementById('posts');
    if (!postsContainer) return;
    
    const post = document.createElement('div');
    post.className = 'post';
    post.innerHTML = `
        <div class="post-header">
            <img src="avatar.png" alt="User" class="avatar">
            <div class="post-info">
                <strong>You</strong>
                <span class="time">Just now</span>
            </div>
        </div>
        <div class="post-content">${content}</div>
        <div class="post-actions">
            <button class="like-btn"><i class="fas fa-heart"></i> Like</button>
            <button class="comment-btn"><i class="fas fa-comment"></i> Comment</button>
            <button class="share-btn"><i class="fas fa-share"></i> Share</button>
        </div>
    `;
    
    postsContainer.prepend(post);
    setupPostActions(post);
    
    savePost({ content, timestamp: Date.now() });
}

// Like functionality
function setupLikes() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('liked');
            const icon = this.querySelector('i');
            if (this.classList.contains('liked')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        });
    });
}

// Comment functionality
function setupComments() {
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const post = this.closest('.post');
            showCommentBox(post);
        });
    });
}

function showCommentBox(post) {
    let commentBox = post.querySelector('.comment-box');
    
    if (!commentBox) {
        commentBox = document.createElement('div');
        commentBox.className = 'comment-box';
        commentBox.innerHTML = `
            <textarea placeholder="Write a comment..."></textarea>
            <button class="submit-comment-btn">Post</button>
        `;
        post.appendChild(commentBox);
        
        commentBox.querySelector('.submit-comment-btn').addEventListener('click', () => {
            const comment = commentBox.querySelector('textarea').value;
            if (comment.trim()) {
                addComment(post, comment);
                commentBox.querySelector('textarea').value = '';
            }
        });
    }
    
    commentBox.style.display = commentBox.style.display === 'none' ? 'block' : 'none';
}

function addComment(post, comment) {
    let commentsContainer = post.querySelector('.comments');
    
    if (!commentsContainer) {
        commentsContainer = document.createElement('div');
        commentsContainer.className = 'comments';
        post.appendChild(commentsContainer);
    }
    
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.innerHTML = `
        <img src="avatar.png" alt="User" class="avatar-small">
        <div>
            <strong>You</strong>
            <p>${comment}</p>
        </div>
    `;
    
    commentsContainer.appendChild(commentEl);
}

// Follow functionality
function setupFollow() {
    document.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const following = this.classList.toggle('following');
            this.textContent = following ? 'Following' : 'Follow';
        });
    });
}

// Image upload
function setupImageUpload() {
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (imagePreview) {
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Search users/posts
function setupSearch() {
    const searchInput = document.getElementById('search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.post, .user-card').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? '' : 'none';
        });
    });
}

// Setup post actions
function setupPostActions(post) {
    const likeBtn = post.querySelector('.like-btn');
    const commentBtn = post.querySelector('.comment-btn');
    
    if (likeBtn) {
        likeBtn.addEventListener('click', function() {
            this.classList.toggle('liked');
        });
    }
    
    if (commentBtn) {
        commentBtn.addEventListener('click', () => {
            showCommentBox(post);
        });
    }
}

// Save/load posts
function savePost(post) {
    const posts = JSON.parse(localStorage.getItem('social_posts') || '[]');
    posts.unshift(post);
    localStorage.setItem('social_posts', JSON.stringify(posts));
}

function loadPosts() {
    const posts = JSON.parse(localStorage.getItem('social_posts') || '[]');
    posts.forEach(post => {
        createPost(post.content);
    });
}

// Initialize
function init() {
    setupPostCreation();
    setupLikes();
    setupComments();
    setupFollow();
    setupImageUpload();
    setupSearch();
    
    document.body.classList.add('loaded');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
