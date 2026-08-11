// Quiz - Quiz/Exam Application

class QuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestion = 0;
        this.score = 0;
        this.answers = [];
        this.init();
    }

    init() {
        this.loadQuestions();
        this.setupUI();
    }

    loadQuestions() {
        const questionElements = document.querySelectorAll('.question-item');
        questionElements.forEach(el => {
            this.questions.push({
                id: el.dataset.id,
                question: el.dataset.question,
                options: JSON.parse(el.dataset.options || '[]'),
                correct: parseInt(el.dataset.correct || '0')
            });
        });
    }

    setupUI() {
        const startBtn = document.getElementById('startQuizBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startQuiz());
        }
    }

    startQuiz() {
        this.currentQuestion = 0;
        this.score = 0;
        this.answers = [];
        
        document.getElementById('quizStart')?.classList.add('hidden');
        document.getElementById('quizContainer')?.classList.remove('hidden');
        
        this.showQuestion();
    }

    showQuestion() {
        if (this.currentQuestion >= this.questions.length) {
            this.showResults();
            return;
        }
        
        const question = this.questions[this.currentQuestion];
        const container = document.getElementById('questionContainer');
        
        if (!container) return;
        
        container.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${this.currentQuestion + 1}/${this.questions.length}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(this.currentQuestion / this.questions.length) * 100}%"></div>
                </div>
            </div>
            <h3 class="question-text">${question.question}</h3>
            <div class="options">
                ${question.options.map((option, index) => `
                    <button class="option-btn" data-index="${index}">
                        ${String.fromCharCode(65 + index)}. ${option}
                    </button>
                `).join('')}
            </div>
        `;
        
        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectAnswer(parseInt(btn.dataset.index)));
        });
    }

    selectAnswer(answerIndex) {
        const question = this.questions[this.currentQuestion];
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            this.score++;
        }
        
        this.answers.push({
            questionId: question.id,
            selected: answerIndex,
            correct: question.correct,
            isCorrect
        });
        
        // Show feedback
        document.querySelectorAll('.option-btn').forEach((btn, index) => {
            btn.disabled = true;
            if (index === question.correct) {
                btn.classList.add('correct');
            } else if (index === answerIndex && !isCorrect) {
                btn.classList.add('wrong');
            }
        });
        
        setTimeout(() => {
            this.currentQuestion++;
            this.showQuestion();
        }, 1500);
    }

    showResults() {
        const container = document.getElementById('quizContainer');
        if (!container) return;
        
        const percentage = (this.score / this.questions.length) * 100;
        const passed = percentage >= 70;
        
        container.innerHTML = `
            <div class="quiz-results">
                <h2>Quiz Complete!</h2>
                <div class="score-circle">
                    <span class="score-text">${this.score}/${this.questions.length}</span>
                    <span class="score-percent">${percentage.toFixed(1)}%</span>
                </div>
                <p class="result-message ${passed ? 'pass' : 'fail'}">
                    ${passed ? 'Congratulations! You passed!' : 'Keep trying! You can do better!'}
                </p>
                <div class="result-actions">
                    <button id="reviewBtn" class="btn-secondary">Review Answers</button>
                    <button id="retakeBtn" class="btn-primary">Retake Quiz</button>
                </div>
            </div>
        `;
        
        document.getElementById('reviewBtn')?.addEventListener('click', () => this.showReview());
        document.getElementById('retakeBtn')?.addEventListener('click', () => this.startQuiz());
        
        this.saveScore(this.score, percentage);
    }

    showReview() {
        const container = document.getElementById('quizContainer');
        if (!container) return;
        
        container.innerHTML = `
            <h2>Review Answers</h2>
            <div class="review-list">
                ${this.questions.map((q, index) => {
                    const answer = this.answers[index];
                    return `
                        <div class="review-item ${answer.isCorrect ? 'correct' : 'wrong'}">
                            <h4>Question ${index + 1}</h4>
                            <p>${q.question}</p>
                            <p><strong>Your answer:</strong> ${q.options[answer.selected]}</p>
                            ${!answer.isCorrect ? `<p><strong>Correct answer:</strong> ${q.options[q.correct]}</p>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <button id="backBtn" class="btn-primary">Back to Results</button>
        `;
        
        document.getElementById('backBtn')?.addEventListener('click', () => this.showResults());
    }

    saveScore(score, percentage) {
        const scores = JSON.parse(localStorage.getItem('quiz_scores') || '[]');
        scores.push({
            score,
            total: this.questions.length,
            percentage,
            timestamp: Date.now()
        });
        localStorage.setItem('quiz_scores', JSON.stringify(scores));
    }
}

let quizApp;

function init() {
    quizApp = new QuizApp();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.QuizApp = QuizApp;
