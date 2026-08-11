// Audio Call Application - Supabase Integration

// Supabase configuration utilities
const SupabaseConfig = {
    client: null,
    
    init(supabaseUrl, supabaseKey) {
        if (typeof supabase !== 'undefined') {
            this.client = supabase.createClient(supabaseUrl, supabaseKey);
        }
        return this.client;
    },
    
    getClient() {
        return this.client;
    }
};

// Call Manager
class CallManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.roomId = null;
        this.userId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkMediaPermissions();
    }

    setupEventListeners() {
        const startCallBtn = document.getElementById('startCall');
        const endCallBtn = document.getElementById('endCall');
        const muteBtn = document.getElementById('muteBtn');
        const videoToggleBtn = document.getElementById('videoToggle');
        
        if (startCallBtn) {
            startCallBtn.addEventListener('click', () => this.startCall());
        }
        
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => this.endCall());
        }
        
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }
        
        if (videoToggleBtn) {
            videoToggleBtn.addEventListener('click', () => this.toggleVideo());
        }
    }

    async checkMediaPermissions() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            stream.getTracks().forEach(track => track.stop());
            this.updateStatus('Media permissions granted', 'success');
        } catch (error) {
            this.updateStatus('Media permissions denied', 'error');
            console.error('Media permission error:', error);
        }
    }

    async startCall() {
        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            
            // Set local audio
            const localAudio = document.getElementById('localAudio');
            if (localAudio) {
                localAudio.srcObject = this.localStream;
            }
            
            // Initialize peer connection
            this.initPeerConnection();
            
            // Generate or join room
            await this.setupRoom();
            
            this.updateStatus('Call started', 'success');
            this.updateUI('calling');
            
        } catch (error) {
            console.error('Error starting call:', error);
            this.updateStatus('Failed to start call', 'error');
        }
    }

    initPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream tracks
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });
        
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            const remoteAudio = document.getElementById('remoteAudio');
            if (remoteAudio) {
                remoteAudio.srcObject = event.streams[0];
            }
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendIceCandidate(event.candidate);
            }
        };
    }

    async setupRoom() {
        const roomIdInput = document.getElementById('roomId');
        
        if (roomIdInput && roomIdInput.value) {
            this.roomId = roomIdInput.value;
            await this.joinRoom(this.roomId);
        } else {
            this.roomId = this.generateRoomId();
            await this.createRoom(this.roomId);
        }
    }

    async createRoom(roomId) {
        const client = SupabaseConfig.getClient();
        if (!client) return;
        
        try {
            const { data, error } = await client
                .from('calls')
                .insert([
                    {
                        room_id: roomId,
                        status: 'active',
                        created_at: new Date()
                    }
                ]);
            
            if (error) throw error;
            
            // Display room ID
            this.displayRoomId(roomId);
            
        } catch (error) {
            console.error('Error creating room:', error);
        }
    }

    async joinRoom(roomId) {
        const client = SupabaseConfig.getClient();
        if (!client) return;
        
        try {
            const { data, error } = await client
                .from('calls')
                .select('*')
                .eq('room_id', roomId)
                .single();
            
            if (error) throw error;
            
            this.updateStatus(`Joined room: ${roomId}`, 'success');
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.updateStatus('Room not found', 'error');
        }
    }

    async sendIceCandidate(candidate) {
        const client = SupabaseConfig.getClient();
        if (!client || !this.roomId) return;
        
        try {
            await client
                .from('ice_candidates')
                .insert([
                    {
                        room_id: this.roomId,
                        candidate: JSON.stringify(candidate)
                    }
                ]);
        } catch (error) {
            console.error('Error sending ICE candidate:', error);
        }
    }

    endCall() {
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        // Clear streams
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        
        this.updateStatus('Call ended', 'info');
        this.updateUI('idle');
    }

    toggleMute() {
        if (!this.localStream) return;
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            
            const muteBtn = document.getElementById('muteBtn');
            if (muteBtn) {
                muteBtn.textContent = audioTrack.enabled ? 'Mute' : 'Unmute';
                muteBtn.classList.toggle('muted', !audioTrack.enabled);
            }
        }
    }

    toggleVideo() {
        if (!this.localStream) return;
        
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            
            const videoBtn = document.getElementById('videoToggle');
            if (videoBtn) {
                videoBtn.textContent = videoTrack.enabled ? 'Stop Video' : 'Start Video';
            }
        }
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 10);
    }

    displayRoomId(roomId) {
        const roomDisplay = document.getElementById('roomDisplay');
        if (roomDisplay) {
            roomDisplay.textContent = `Room ID: ${roomId}`;
            roomDisplay.style.display = 'block';
        }
    }

    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status status-${type}`;
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    updateUI(state) {
        const startCallBtn = document.getElementById('startCall');
        const endCallBtn = document.getElementById('endCall');
        const controls = document.getElementById('callControls');
        
        switch (state) {
            case 'calling':
                if (startCallBtn) startCallBtn.disabled = true;
                if (endCallBtn) endCallBtn.disabled = false;
                if (controls) controls.style.display = 'block';
                break;
            case 'idle':
                if (startCallBtn) startCallBtn.disabled = false;
                if (endCallBtn) endCallBtn.disabled = true;
                if (controls) controls.style.display = 'none';
                break;
        }
    }
}

// Initialize call manager
let callManager;

function init() {
    callManager = new CallManager();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for external use
window.CallManager = CallManager;
window.SupabaseConfig = SupabaseConfig;
