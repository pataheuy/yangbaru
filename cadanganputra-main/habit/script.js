// Habit - Habit Tracker with XP/Level/Shop System

class HabitTracker {
    constructor() {
        this.habits = [];
        this.xp = 0;
        this.level = 1;
        this.coins = 0;
        this.inventory = [];
        this.init();
    }

    init() {
        this.loadData();
        this.setupUI();
        this.renderHabits();
        this.updateStats();
    }

    setupUI() {
        const addHabitBtn = document.getElementById('addHabitBtn');
        if (addHabitBtn) {
            addHabitBtn.addEventListener('click', () => this.showAddHabitForm());
        }
        
        const shopBtn = document.getElementById('shopBtn');
        if (shopBtn) {
            shopBtn.addEventListener('click', () => this.showShop());
        }
    }

    showAddHabitForm() {
        const modal = document.createElement('div');
        modal.className = 'modal habit-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Add Habit</h2>
                <form id="habitForm">
                    <input type="text" name="name" placeholder="Habit name" required>
                    <select name="frequency">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                    <input type="number" name="xpReward" placeholder="XP Reward" value="10" min="1">
                    <input type="number" name="coinReward" placeholder="Coin Reward" value="5" min="1">
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Add</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('#habitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.addHabit(Object.fromEntries(formData));
            modal.remove();
        });
    }

    addHabit(habitData) {
        const habit = {
            id: Date.now().toString(),
            name: habitData.name,
            frequency: habitData.frequency,
            xpReward: parseInt(habitData.xpReward),
            coinReward: parseInt(habitData.coinReward),
            streak: 0,
            completions: [],
            createdAt: Date.now()
        };
        
        this.habits.push(habit);
        this.saveData();
        this.renderHabit(habit);
    }

    renderHabits() {
        const container = document.getElementById('habitList');
        if (!container) return;
        
        container.innerHTML = '';
        this.habits.forEach(habit => this.renderHabit(habit));
    }

    renderHabit(habit) {
        const container = document.getElementById('habitList');
        if (!container) return;
        
        const today = new Date().toDateString();
        const completedToday = habit.completions.some(c => new Date(c).toDateString() === today);
        
        const habitEl = document.createElement('div');
        habitEl.className = `habit-item ${completedToday ? 'completed' : ''}`;
        habitEl.dataset.id = habit.id;
        habitEl.innerHTML = `
            <div class="habit-info">
                <h4>${habit.name}</h4>
                <div class="habit-meta">
                    <span class="streak">🔥 ${habit.streak} day streak</span>
                    <span class="rewards">⭐ ${habit.xpReward} XP | 🪙 ${habit.coinReward} coins</span>
                </div>
            </div>
            <button class="complete-btn ${completedToday ? 'disabled' : ''}" ${completedToday ? 'disabled' : ''}>
                ${completedToday ? '✓ Done' : 'Complete'}
            </button>
        `;
        
        container.appendChild(habitEl);
        
        if (!completedToday) {
            habitEl.querySelector('.complete-btn').addEventListener('click', () => {
                this.completeHabit(habit.id);
            });
        }
    }

    completeHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
        
        habit.completions.push(Date.now());
        habit.streak++;
        
        this.addXP(habit.xpReward);
        this.addCoins(habit.coinReward);
        
        this.saveData();
        this.renderHabits();
        this.showConfetti();
        this.showToast(`+${habit.xpReward} XP, +${habit.coinReward} coins!`, 'success');
    }

    addXP(amount) {
        this.xp += amount;
        
        const xpForNextLevel = this.level * 100;
        if (this.xp >= xpForNextLevel) {
            this.levelUp();
        }
        
        this.updateStats();
    }

    levelUp() {
        this.level++;
        this.xp = 0;
        this.showToast(`Level Up! You're now level ${this.level}!`, 'success');
        this.showConfetti();
    }

    addCoins(amount) {
        this.coins += amount;
        this.updateStats();
    }

    updateStats() {
        const levelEl = document.getElementById('level');
        const xpEl = document.getElementById('xp');
        const coinsEl = document.getElementById('coins');
        const xpBar = document.getElementById('xpBar');
        
        if (levelEl) levelEl.textContent = this.level;
        if (coinsEl) coinsEl.textContent = this.coins;
        
        const xpForNextLevel = this.level * 100;
        const xpProgress = (this.xp / xpForNextLevel) * 100;
        
        if (xpEl) xpEl.textContent = `${this.xp} / ${xpForNextLevel}`;
        if (xpBar) xpBar.style.width = `${xpProgress}%`;
    }

    showShop() {
        const modal = document.createElement('div');
        modal.className = 'modal shop-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Shop</h2>
                <div class="shop-items">
                    <div class="shop-item">
                        <h4>Streak Shield</h4>
                        <p>Protect your streak for 1 day</p>
                        <button class="buy-btn" data-price="50">Buy (50 coins)</button>
                    </div>
                    <div class="shop-item">
                        <h4>XP Boost</h4>
                        <p>2x XP for 1 day</p>
                        <button class="buy-btn" data-price="100">Buy (100 coins)</button>
                    </div>
                    <div class="shop-item">
                        <h4>Coin Multiplier</h4>
                        <p>2x coins for 1 day</p>
                        <button class="buy-btn" data-price="100">Buy (100 coins)</button>
                    </div>
                </div>
                <button class="btn-secondary close-btn">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        
        modal.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const price = parseInt(btn.dataset.price);
                if (this.coins >= price) {
                    this.coins -= price;
                    this.updateStats();
                    this.saveData();
                    this.showToast('Item purchased!', 'success');
                } else {
                    this.showToast('Not enough coins!', 'error');
                }
            });
        });
    }

    showConfetti() {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    showToast(message, type) {
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

    saveData() {
        localStorage.setItem('habit_data', JSON.stringify({
            habits: this.habits,
            xp: this.xp,
            level: this.level,
            coins: this.coins,
            inventory: this.inventory
        }));
    }

    loadData() {
        const saved = localStorage.getItem('habit_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.habits = data.habits || [];
            this.xp = data.xp || 0;
            this.level = data.level || 1;
            this.coins = data.coins || 0;
            this.inventory = data.inventory || [];
        }
    }
}

let habitTracker;

function init() {
    habitTracker = new HabitTracker();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.HabitTracker = HabitTracker;
