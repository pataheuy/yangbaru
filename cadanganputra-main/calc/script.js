// Calculator - Complete Calculator Logic

class Calculator {
    constructor() {
        this.displayValue = '0';
        this.previousValue = null;
        this.operation = null;
        this.waitingForOperand = false;
        this.init();
    }

    init() {
        this.display = document.getElementById('display') || document.querySelector('.display');
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        // Number buttons
        document.querySelectorAll('.number, .btn-number').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.inputDigit(e.target.textContent);
            });
        });

        // Operator buttons
        document.querySelectorAll('.operator, .btn-operator').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.inputOperator(e.target.textContent);
            });
        });

        // Equals button
        document.querySelectorAll('.equals, .btn-equals').forEach(btn => {
            btn.addEventListener('click', () => {
                this.calculate();
            });
        });

        // Clear button
        document.querySelectorAll('.clear, .btn-clear').forEach(btn => {
            btn.addEventListener('click', () => {
                this.clear();
            });
        });

        // Decimal button
        document.querySelectorAll('.decimal, .btn-decimal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.inputDecimal();
            });
        });

        // Backspace button
        document.querySelectorAll('.backspace, .btn-backspace').forEach(btn => {
            btn.addEventListener('click', () => {
                this.backspace();
            });
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    inputDigit(digit) {
        if (this.waitingForOperand) {
            this.displayValue = String(digit);
            this.waitingForOperand = false;
        } else {
            this.displayValue = this.displayValue === '0' ? String(digit) : this.displayValue + digit;
        }
        this.updateDisplay();
    }

    inputDecimal() {
        if (this.waitingForOperand) {
            this.displayValue = '0.';
            this.waitingForOperand = false;
        } else if (this.displayValue.indexOf('.') === -1) {
            this.displayValue += '.';
        }
        this.updateDisplay();
    }

    inputOperator(nextOperator) {
        const inputValue = parseFloat(this.displayValue);

        if (this.previousValue === null) {
            this.previousValue = inputValue;
        } else if (this.operation) {
            const result = this.performOperation(this.previousValue, inputValue, this.operation);
            this.displayValue = String(result);
            this.previousValue = result;
        }

        this.waitingForOperand = true;
        this.operation = nextOperator;
        this.updateDisplay();
    }

    calculate() {
        const inputValue = parseFloat(this.displayValue);

        if (this.previousValue !== null && this.operation) {
            const result = this.performOperation(this.previousValue, inputValue, this.operation);
            this.displayValue = String(result);
            this.previousValue = null;
            this.operation = null;
            this.waitingForOperand = true;
            this.updateDisplay();
        }
    }

    performOperation(firstOperand, secondOperand, operation) {
        switch (operation) {
            case '+':
                return firstOperand + secondOperand;
            case '-':
                return firstOperand - secondOperand;
            case '×':
            case '*':
                return firstOperand * secondOperand;
            case '÷':
            case '/':
                return secondOperand !== 0 ? firstOperand / secondOperand : 'Error';
            case '%':
                return firstOperand % secondOperand;
            default:
                return secondOperand;
        }
    }

    clear() {
        this.displayValue = '0';
        this.previousValue = null;
        this.operation = null;
        this.waitingForOperand = false;
        this.updateDisplay();
    }

    backspace() {
        if (this.displayValue.length > 1) {
            this.displayValue = this.displayValue.slice(0, -1);
        } else {
            this.displayValue = '0';
        }
        this.updateDisplay();
    }

    handleKeyboard(event) {
        const { key } = event;
        
        if (key >= '0' && key <= '9') {
            event.preventDefault();
            this.inputDigit(key);
        } else if (key === '.') {
            event.preventDefault();
            this.inputDecimal();
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            event.preventDefault();
            this.inputOperator(key);
        } else if (key === 'Enter' || key === '=') {
            event.preventDefault();
            this.calculate();
        } else if (key === 'Escape') {
            event.preventDefault();
            this.clear();
        } else if (key === 'Backspace') {
            event.preventDefault();
            this.backspace();
        }
    }

    updateDisplay() {
        if (this.display) {
            // Format large numbers
            let displayText = this.displayValue;
            if (displayText !== 'Error' && !isNaN(displayText)) {
                const num = parseFloat(displayText);
                if (Math.abs(num) > 999999999) {
                    displayText = num.toExponential(6);
                } else if (displayText.length > 12) {
                    displayText = parseFloat(displayText).toPrecision(12);
                }
            }
            this.display.textContent = displayText;
        }
    }
}

// Initialize calculator
let calculator;

function init() {
    calculator = new Calculator();
    
    // Add button click effects
    document.querySelectorAll('button, .btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.add('active');
            setTimeout(() => {
                this.classList.remove('active');
            }, 100);
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
