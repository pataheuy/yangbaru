// Vote - Voting/Polling System

class VotingSystem {
    constructor() {
        this.polls = [];
        this.userVotes = {};
        this.init();
    }

    init() {
        this.loadPolls();
        this.loadUserVotes();
        this.setupUI();
    }

    loadPolls() {
        const pollElements = document.querySelectorAll('.poll-item');
        pollElements.forEach(el => {
            this.polls.push({
                id: el.dataset.id,
                question: el.dataset.question,
                options: JSON.parse(el.dataset.options || '[]'),
                votes: JSON.parse(el.dataset.votes || '[]')
            });
        });
    }

    setupUI() {
        document.querySelectorAll('.poll-item').forEach(pollEl => {
            const pollId = pollEl.dataset.id;
            const options = pollEl.querySelectorAll('.poll-option');
            
            options.forEach(option => {
                option.addEventListener('click', () => {
                    if (!this.hasVoted(pollId)) {
                        this.vote(pollId, option.dataset.optionId);
                    }
                });
            });
            
            this.renderPoll(pollId);
        });
        
        const createPollBtn = document.getElementById('createPollBtn');
        if (createPollBtn) {
            createPollBtn.addEventListener('click', () => this.showCreatePollForm());
        }
    }

    vote(pollId, optionId) {
        const poll = this.polls.find(p => p.id === pollId);
        if (!poll) return;
        
        if (!poll.votes[optionId]) {
            poll.votes[optionId] = 0;
        }
        poll.votes[optionId]++;
        
        this.userVotes[pollId] = optionId;
        this.saveData();
        this.renderPoll(pollId);
    }

    hasVoted(pollId) {
        return this.userVotes.hasOwnProperty(pollId);
    }

    renderPoll(pollId) {
        const poll = this.polls.find(p => p.id === pollId);
        const pollEl = document.querySelector(`[data-id="${pollId}"]`);
        if (!poll || !pollEl) return;
        
        const totalVotes = Object.values(poll.votes).reduce((sum, v) => sum + v, 0);
        const hasVoted = this.hasVoted(pollId);
        
        const optionsContainer = pollEl.querySelector('.poll-options');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = poll.options.map((option, index) => {
            const votes = poll.votes[index] || 0;
            const percent = totalVotes > 0 ? (votes / totalVotes * 100).toFixed(1) : 0;
            const isSelected = this.userVotes[pollId] == index;
            
            return `
                <div class="poll-option ${hasVoted ? 'voted' : ''} ${isSelected ? 'selected' : ''}" 
                     data-option-id="${index}">
                    <div class="option-content">
                        <span class="option-text">${option}</span>
                        ${hasVoted ? `<span class="option-percent">${percent}%</span>` : ''}
                    </div>
                    ${hasVoted ? `
                        <div class="option-bar">
                            <div class="option-bar-fill" style="width: ${percent}%"></div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Add total votes display
        const totalEl = pollEl.querySelector('.total-votes');
        if (totalEl) {
            totalEl.textContent = `${totalVotes} votes`;
        }
    }

    showCreatePollForm() {
        const modal = document.createElement('div');
        modal.className = 'modal poll-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Create Poll</h2>
                <form id="pollForm">
                    <input type="text" placeholder="Poll question" required>
                    <div id="pollOptions">
                        <input type="text" placeholder="Option 1" required>
                        <input type="text" placeholder="Option 2" required>
                    </div>
                    <button type="button" id="addOptionBtn">Add Option</button>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Create</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('#addOptionBtn').addEventListener('click', () => {
            const optionsDiv = modal.querySelector('#pollOptions');
            const optionCount = optionsDiv.querySelectorAll('input').length + 1;
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Option ${optionCount}`;
            optionsDiv.appendChild(input);
        });
        
        modal.querySelector('#pollForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const question = modal.querySelector('input[type="text"]').value;
            const options = Array.from(modal.querySelectorAll('#pollOptions input')).map(i => i.value);
            this.createPoll(question, options);
            modal.remove();
        });
    }

    createPoll(question, options) {
        const poll = {
            id: Date.now().toString(),
            question,
            options,
            votes: {}
        };
        
        this.polls.push(poll);
        this.saveData();
        
        // Render new poll
        // (Would need to create HTML element and append to page)
        console.log('Poll created:', poll);
    }

    saveData() {
        localStorage.setItem('polls', JSON.stringify(this.polls));
        localStorage.setItem('user_votes', JSON.stringify(this.userVotes));
    }

    loadUserVotes() {
        const saved = localStorage.getItem('user_votes');
        if (saved) {
            this.userVotes = JSON.parse(saved);
        }
    }
}

let votingSystem;

function init() {
    votingSystem = new VotingSystem();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.VotingSystem = VotingSystem;
