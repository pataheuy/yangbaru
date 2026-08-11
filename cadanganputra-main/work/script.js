// Work - Project/Task Management

class WorkManager {
    constructor() {
        this.tasks = [];
        this.projects = [];
        this.init();
    }

    init() {
        this.loadData();
        this.setupUI();
        this.renderTasks();
    }

    setupUI() {
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.showAddTaskForm());
        }
        
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterTasks(btn.dataset.filter);
            });
        });
    }

    showAddTaskForm() {
        const modal = document.createElement('div');
        modal.className = 'modal task-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Add Task</h2>
                <form id="taskForm">
                    <input type="text" name="title" placeholder="Task title" required>
                    <textarea name="description" placeholder="Description"></textarea>
                    <select name="priority">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <input type="date" name="dueDate">
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Add</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('#taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.addTask(Object.fromEntries(formData));
            modal.remove();
        });
    }

    addTask(taskData) {
        const task = {
            id: Date.now().toString(),
            ...taskData,
            completed: false,
            createdAt: Date.now()
        };
        
        this.tasks.push(task);
        this.saveData();
        this.renderTask(task);
    }

    renderTasks() {
        const container = document.getElementById('taskList');
        if (!container) return;
        
        container.innerHTML = '';
        this.tasks.forEach(task => this.renderTask(task));
    }

    renderTask(task) {
        const container = document.getElementById('taskList');
        if (!container) return;
        
        const taskEl = document.createElement('div');
        taskEl.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`;
        taskEl.dataset.id = task.id;
        taskEl.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} class="task-checkbox">
            <div class="task-content">
                <h4>${task.title}</h4>
                <p>${task.description || ''}</p>
                ${task.dueDate ? `<span class="due-date">Due: ${task.dueDate}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(taskEl);
        
        taskEl.querySelector('.task-checkbox').addEventListener('change', (e) => {
            task.completed = e.target.checked;
            taskEl.classList.toggle('completed', task.completed);
            this.saveData();
        });
        
        taskEl.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteTask(task.id);
            taskEl.remove();
        });
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveData();
    }

    filterTasks(filter) {
        document.querySelectorAll('.task-item').forEach(item => {
            const task = this.tasks.find(t => t.id === item.dataset.id);
            if (!task) return;
            
            let show = true;
            switch(filter) {
                case 'active':
                    show = !task.completed;
                    break;
                case 'completed':
                    show = task.completed;
                    break;
                case 'high':
                    show = task.priority === 'high';
                    break;
            }
            
            item.style.display = show ? '' : 'none';
        });
    }

    saveData() {
        localStorage.setItem('work_tasks', JSON.stringify(this.tasks));
    }

    loadData() {
        const saved = localStorage.getItem('work_tasks');
        if (saved) {
            this.tasks = JSON.parse(saved);
        }
    }
}

let workManager;

function init() {
    workManager = new WorkManager();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.WorkManager = WorkManager;
