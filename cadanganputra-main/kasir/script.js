// Kasir - Point of Sale / Cashier System

class CashierSystem {
    constructor() {
        this.cart = [];
        this.products = [];
        this.total = 0;
        this.init();
    }

    init() {
        this.loadProducts();
        this.setupUI();
        this.loadCart();
    }

    loadProducts() {
        // Load products from data attributes or API
        const productElements = document.querySelectorAll('.product-item');
        
        productElements.forEach(el => {
            this.products.push({
                id: el.dataset.id,
                name: el.dataset.name,
                price: parseFloat(el.dataset.price),
                stock: parseInt(el.dataset.stock || 999),
                category: el.dataset.category || 'general'
            });
        });
    }

    setupUI() {
        // Product selection
        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', () => {
                const productId = item.dataset.id;
                this.addToCart(productId);
            });
        });
        
        // Category filter
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.filterByCategory(category);
            });
        });
        
        // Search
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchProducts(e.target.value);
            });
        }
        
        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }
        
        // Clear cart button
        const clearBtn = document.getElementById('clearCartBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCart());
        }
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++;
            } else {
                this.showMessage('warning', 'Stock tidak cukup');
                return;
            }
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }
        
        this.updateCart();
        this.saveCart();
    }

    removeFromCart(productId) {
        const index = this.cart.findIndex(item => item.id === productId);
        if (index > -1) {
            this.cart.splice(index, 1);
        }
        this.updateCart();
        this.saveCart();
    }

    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;
        
        const product = this.products.find(p => p.id === productId);
        
        if (quantity <= 0) {
            this.removeFromCart(productId);
        } else if (quantity <= product.stock) {
            item.quantity = quantity;
            this.updateCart();
            this.saveCart();
        } else {
            this.showMessage('warning', 'Stock tidak cukup');
        }
    }

    updateCart() {
        this.calculateTotal();
        this.renderCart();
    }

    calculateTotal() {
        this.total = this.cart.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
    }

    renderCart() {
        const cartContainer = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');
        const itemCountEl = document.getElementById('itemCount');
        
        if (!cartContainer) return;
        
        if (this.cart.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart">Keranjang kosong</p>';
        } else {
            cartContainer.innerHTML = this.cart.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">Rp ${this.formatPrice(item.price)}</div>
                    </div>
                    <div class="item-controls">
                        <button class="qty-btn minus" data-id="${item.id}">-</button>
                        <input type="number" class="qty-input" value="${item.quantity}" 
                               min="1" max="${item.stock}" data-id="${item.id}">
                        <button class="qty-btn plus" data-id="${item.id}">+</button>
                        <button class="remove-btn" data-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="item-subtotal">
                        Rp ${this.formatPrice(item.price * item.quantity)}
                    </div>
                </div>
            `).join('');
            
            // Setup cart item controls
            cartContainer.querySelectorAll('.minus').forEach(btn => {
                btn.addEventListener('click', () => {
                    const item = this.cart.find(i => i.id === btn.dataset.id);
                    this.updateQuantity(btn.dataset.id, item.quantity - 1);
                });
            });
            
            cartContainer.querySelectorAll('.plus').forEach(btn => {
                btn.addEventListener('click', () => {
                    const item = this.cart.find(i => i.id === btn.dataset.id);
                    this.updateQuantity(btn.dataset.id, item.quantity + 1);
                });
            });
            
            cartContainer.querySelectorAll('.qty-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    this.updateQuantity(input.dataset.id, parseInt(e.target.value));
                });
            });
            
            cartContainer.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.removeFromCart(btn.dataset.id);
                });
            });
        }
        
        if (totalEl) {
            totalEl.textContent = `Rp ${this.formatPrice(this.total)}`;
        }
        
        if (itemCountEl) {
            const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            itemCountEl.textContent = count;
        }
    }

    filterByCategory(category) {
        const products = document.querySelectorAll('.product-item');
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        products.forEach(product => {
            if (category === 'all' || product.dataset.category === category) {
                product.style.display = 'block';
            } else {
                product.style.display = 'none';
            }
        });
    }

    searchProducts(query) {
        const products = document.querySelectorAll('.product-item');
        const searchTerm = query.toLowerCase();
        
        products.forEach(product => {
            const name = product.dataset.name.toLowerCase();
            if (name.includes(searchTerm)) {
                product.style.display = 'block';
            } else {
                product.style.display = 'none';
            }
        });
    }

    checkout() {
        if (this.cart.length === 0) {
            this.showMessage('warning', 'Keranjang masih kosong');
            return;
        }
        
        // Show payment modal or process payment
        const modal = this.createCheckoutModal();
        document.body.appendChild(modal);
    }

    createCheckoutModal() {
        const modal = document.createElement('div');
        modal.className = 'modal checkout-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Checkout</h2>
                <div class="checkout-summary">
                    <p>Total Items: ${this.cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
                    <h3>Total: Rp ${this.formatPrice(this.total)}</h3>
                </div>
                <div class="payment-methods">
                    <button class="payment-btn" data-method="cash">Tunai</button>
                    <button class="payment-btn" data-method="card">Kartu</button>
                    <button class="payment-btn" data-method="qr">QRIS</button>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary close-modal">Batal</button>
                    <button class="btn-primary process-payment">Bayar</button>
                </div>
            </div>
        `;
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        modal.querySelector('.process-payment').addEventListener('click', () => {
            this.processPayment();
            modal.remove();
        });
        
        return modal;
    }

    processPayment() {
        // Process payment logic here
        this.printReceipt();
        this.clearCart();
        this.showMessage('success', 'Pembayaran berhasil!');
    }

    printReceipt() {
        const receipt = `
=================================
         STRUK PEMBAYARAN
=================================
${this.cart.map(item => `
${item.name}
${item.quantity} x Rp ${this.formatPrice(item.price)} = Rp ${this.formatPrice(item.price * item.quantity)}
`).join('')}
---------------------------------
Total: Rp ${this.formatPrice(this.total)}
=================================
        Terima Kasih!
=================================
        `;
        
        console.log(receipt);
        
        // Option to print or download receipt
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`<pre>${receipt}</pre>`);
            printWindow.document.close();
            printWindow.print();
        }
    }

    clearCart() {
        this.cart = [];
        this.total = 0;
        this.updateCart();
        this.saveCart();
    }

    saveCart() {
        localStorage.setItem('kasir_cart', JSON.stringify(this.cart));
    }

    loadCart() {
        const saved = localStorage.getItem('kasir_cart');
        if (saved) {
            this.cart = JSON.parse(saved);
            this.updateCart();
        }
    }

    formatPrice(price) {
        return price.toLocaleString('id-ID');
    }

    showMessage(type, message) {
        const messageEl = document.createElement('div');
        messageEl.className = `toast toast-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => messageEl.classList.add('show'), 10);
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }
}

// Initialize cashier system
let cashier;

function init() {
    cashier = new CashierSystem();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            cashier.checkout();
        } else if (e.ctrlKey && e.key === 'Delete') {
            if (confirm('Clear cart?')) {
                cashier.clearCart();
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.CashierSystem = CashierSystem;
