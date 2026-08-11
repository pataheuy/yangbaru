// Spin - Spinning Wheel / Lucky Spin

class SpinWheel {
    constructor() {
        this.canvas = document.getElementById('wheel');
        this.ctx = this.canvas?.getContext('2d');
        this.spinning = false;
        this.rotation = 0;
        this.prizes = ['Prize 1', 'Prize 2', 'Prize 3', 'Prize 4', 'Prize 5', 'Prize 6'];
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
        this.init();
    }

    init() {
        if (!this.canvas) return;
        
        this.canvas.width = 400;
        this.canvas.height = 400;
        
        this.draw();
        this.setupButton();
    }

    draw() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 180;
        const sliceAngle = (2 * Math.PI) / this.prizes.length;
        
        this.prizes.forEach((prize, i) => {
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(this.rotation + i * sliceAngle);
            
            this.ctx.fillStyle = this.colors[i % this.colors.length];
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, radius, 0, sliceAngle);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.rotate(sliceAngle / 2);
            this.ctx.fillText(prize, radius * 0.7, 0);
            
            this.ctx.restore();
        });
        
        // Draw center circle
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    setupButton() {
        const spinBtn = document.getElementById('spinBtn');
        if (!spinBtn) return;
        
        spinBtn.addEventListener('click', () => {
            if (!this.spinning) {
                this.spin();
            }
        });
    }

    spin() {
        this.spinning = true;
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) spinBtn.disabled = true;
        
        const totalRotation = (Math.random() * 5 + 10) * Math.PI;
        const duration = 3000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            this.rotation = totalRotation * easeOut;
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.draw();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.spinning = false;
                if (spinBtn) spinBtn.disabled = false;
                this.showResult();
            }
        };
        
        animate();
    }

    showResult() {
        const sliceAngle = (2 * Math.PI) / this.prizes.length;
        const normalizedRotation = this.rotation % (2 * Math.PI);
        const winningIndex = Math.floor((2 * Math.PI - normalizedRotation) / sliceAngle) % this.prizes.length;
        const prize = this.prizes[winningIndex];
        
        const resultEl = document.getElementById('result');
        if (resultEl) {
            resultEl.textContent = `You won: ${prize}!`;
            resultEl.style.display = 'block';
        }
        
        this.saveResult(prize);
    }

    saveResult(prize) {
        const results = JSON.parse(localStorage.getItem('spin_results') || '[]');
        results.push({
            prize,
            timestamp: Date.now()
        });
        localStorage.setItem('spin_results', JSON.stringify(results));
    }
}

let wheel;

function init() {
    wheel = new SpinWheel();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.SpinWheel = SpinWheel;
