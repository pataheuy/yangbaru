// Shop - E-commerce Shopping Cart

class Shop {
    constructor() {
        this.cart = [];
        this.products = [];
        this.init();
    }

    init() {
        this.loadProducts();
        this.loadCart();
        this.setupUI();
        this.updateCart();
    }

    loadProducts() {
        document.querySelectorAll('.product-item').forEach(el => {
            this.products.push({
                id: el.dataset.id,
                name: el.dataset.name,
                price: parseFloat(el.dataset.price),
                image: el.dataset.image,
                stock: parseInt(el.dataset.stock || 999)
            });
        });
    }

    setupUI() {
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addToCart(btn.dataset.productId);
            });
        });
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterProducts(btn.dataset.category);
            });
        });
        
        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            cartToggle.addEventListener('click', () => this.toggleCart());
        }
        
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.updateCart();
        this.showToast('Added to cart!');
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCart();
    }

    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(1, quantity);
            this.saveCart();
            this.updateCart();
        }
    }

    updateCart() {
        const cartContainer = document.getElementById('cartItems');
        const cartCount = document.getElementById('cartCount');
        const cartTotal = document.getElementById('cartTotal');
        
        const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCount) cartCount.textContent = count;
        if (cartTotal) cartTotal.textContent = `Rp ${this.formatPrice(total)}`;
        
        if (cartContainer) {
            if (this.cart.length === 0) {
                cartContainer.innerHTML = '<p class="empty-cart">Cart is empty</p>';
            } else {
                cartContainer.innerHTML = this.cart.map(item => `
                    <div class="cart-item">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="item-details">
                            <h4>${item.name}</h4>
                            <p>Rp ${this.formatPrice(item.price)}</p>
                        </div>
                        <div class="item-controls">
                            <button class="qty-btn" onclick="shop.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" onclick="shop.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                        <button class="remove-btn" onclick="shop.removeFromCart('${item.id}')">×</button>
                    </div>
                `).join('');
            }
        }
    }

    filterProducts(category) {
        document.querySelectorAll('.product-item').forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    toggleCart() {
        const cartPanel = document.getElementById('cartPanel');
        if (cartPanel) {
            cartPanel.classList.toggle('open');
        }
    }

    checkout() {
        if (this.cart.length === 0) {
            this.showToast('Cart is empty');
            return;
        }
        
        // Navigate to checkout page
        window.location.href = 'checkout.html';
    }

    saveCart() {
        localStorage.setItem('shop_cart', JSON.stringify(this.cart));
    }

    loadCart() {
        const saved = localStorage.getItem('shop_cart');
        if (saved) {
            this.cart = JSON.parse(saved);
        }
    }

    formatPrice(price) {
        return price.toLocaleString('id-ID');
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

let shop;

function init() {
    shop = new Shop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.shop = shop;
