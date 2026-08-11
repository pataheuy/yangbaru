// Suara - Voice Recorder / Audio Recording

class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordings = [];
        this.isRecording = false;
        this.init();
    }

    async init() {
        this.loadRecordings();
        this.setupUI();
        this.renderRecordings();
        await this.checkPermissions();
    }

    async checkPermissions() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.showStatus('Microphone access granted', 'success');
        } catch (error) {
            this.showStatus('Microphone access denied', 'error');
        }
    }

    setupUI() {
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopRecording());
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.saveRecording(audioBlob);
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateUI('recording');
            this.showStatus('Recording...', 'info');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showStatus('Failed to start recording', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.updateUI('idle');
            this.showStatus('Recording stopped', 'success');
        }
    }

    saveRecording(blob) {
        const recording = {
            id: Date.now().toString(),
            blob,
            url: URL.createObjectURL(blob),
            timestamp: Date.now(),
            duration: 0
        };
        
        this.recordings.push(recording);
        this.persistRecording(recording);
        this.renderRecording(recording);
    }

    persistRecording(recording) {
        const reader = new FileReader();
        reader.readAsDataURL(recording.blob);
        reader.onloadend = () => {
            const recordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
            recordings.push({
                id: recording.id,
                data: reader.result,
                timestamp: recording.timestamp
            });
            localStorage.setItem('voice_recordings', JSON.stringify(recordings));
        };
    }

    loadRecordings() {
        const saved = localStorage.getItem('voice_recordings');
        if (saved) {
            const recordings = JSON.parse(saved);
            recordings.forEach(rec => {
                const blob = this.dataURLtoBlob(rec.data);
                this.recordings.push({
                    id: rec.id,
                    blob,
                    url: URL.createObjectURL(blob),
                    timestamp: rec.timestamp
                });
            });
        }
    }

    renderRecordings() {
        this.recordings.forEach(rec => this.renderRecording(rec));
    }

    renderRecording(recording) {
        const container = document.getElementById('recordingsList');
        if (!container) return;
        
        const recEl = document.createElement('div');
        recEl.className = 'recording-item';
        recEl.innerHTML = `
            <div class="recording-info">
                <span class="recording-date">${new Date(recording.timestamp).toLocaleString()}</span>
            </div>
            <audio controls src="${recording.url}"></audio>
            <div class="recording-actions">
                <button class="download-btn" data-id="${recording.id}">Download</button>
                <button class="delete-btn" data-id="${recording.id}">Delete</button>
            </div>
        `;
        
        container.appendChild(recEl);
        
        recEl.querySelector('.download-btn').addEventListener('click', () => {
            this.downloadRecording(recording);
        });
        
        recEl.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteRecording(recording.id);
            recEl.remove();
        });
    }

    downloadRecording(recording) {
        const a = document.createElement('a');
        a.href = recording.url;
        a.download = `recording_${recording.id}.wav`;
        a.click();
    }

    deleteRecording(id) {
        this.recordings = this.recordings.filter(r => r.id !== id);
        
        const recordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
        const updated = recordings.filter(r => r.id !== id);
        localStorage.setItem('voice_recordings', JSON.stringify(updated));
    }

    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    updateUI(state) {
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (state === 'recording') {
            if (recordBtn) recordBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
        } else {
            if (recordBtn) recordBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status status-${type}`;
        }
    }
}

let recorder;

function init() {
    recorder = new VoiceRecorder();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.VoiceRecorder = VoiceRecorder;
