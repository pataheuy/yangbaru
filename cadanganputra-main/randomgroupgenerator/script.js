// ============================================================
// PUFUTARA RANDOM GROUP GENERATOR
// Script untuk membagi anggota ke dalam kelompok secara acak
// ============================================================

let currentGroups = [];

// Update stats saat input berubah
document.getElementById('memberInput').addEventListener('input', updateStats);
document.getElementById('groupCount').addEventListener('input', updateStats);

// Initialize
updateStats();

// ===== UPDATE STATISTICS =====
function updateStats() {
    const memberInput = document.getElementById('memberInput').value.trim();
    const members = memberInput ? memberInput.split('\n').filter(m => m.trim() !== '') : [];
    const groupCount = parseInt(document.getElementById('groupCount').value) || 0;
    
    document.getElementById('totalMembers').textContent = members.length;
    document.getElementById('targetGroups').textContent = groupCount;
    
    if (members.length > 0 && groupCount > 0) {
        const avg = Math.ceil(members.length / groupCount);
        document.getElementById('avgPerGroup').textContent = avg;
    } else {
        document.getElementById('avgPerGroup').textContent = '0';
    }
}

// ===== GENERATE GROUPS =====
function generateGroups() {
    const memberInput = document.getElementById('memberInput').value.trim();
    const groupCount = parseInt(document.getElementById('groupCount').value);
    
    // Validasi input
    if (!memberInput) {
        showToast('❌ Masukkan daftar anggota terlebih dahulu!');
        return;
    }
    
    const members = memberInput.split('\n').filter(m => m.trim() !== '').map(m => m.trim());
    
    if (members.length === 0) {
        showToast('❌ Tidak ada anggota yang valid!');
        return;
    }
    
    if (!groupCount || groupCount < 1) {
        showToast('❌ Jumlah kelompok harus minimal 1!');
        return;
    }
    
    if (groupCount > members.length) {
        showToast('❌ Jumlah kelompok tidak boleh lebih dari jumlah anggota!');
        return;
    }
    
    // Shuffle array (Fisher-Yates algorithm)
    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Distribute members to groups
    const groups = Array.from({ length: groupCount }, () => []);
    shuffled.forEach((member, index) => {
        groups[index % groupCount].push(member);
    });
    
    currentGroups = groups;
    displayResults(groups);
    showToast('✅ Kelompok berhasil dibuat!');
}

// ===== DISPLAY RESULTS =====
function displayResults(groups) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCard = document.getElementById('resultsCard');
    
    resultsCard.style.display = 'block';
    resultsContainer.innerHTML = '';
    
    groups.forEach((group, index) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        groupCard.style.animationDelay = `${index * 0.05}s`;
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        
        const groupNumber = document.createElement('div');
        groupNumber.className = 'group-number';
        groupNumber.textContent = index + 1;
        
        const groupTitle = document.createElement('div');
        groupTitle.className = 'group-title';
        groupTitle.textContent = `Kelompok ${index + 1}`;
        
        groupHeader.appendChild(groupNumber);
        groupHeader.appendChild(groupTitle);
        
        const groupMembers = document.createElement('div');
        groupMembers.className = 'group-members';
        
        group.forEach(member => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'group-member';
            
            const avatar = document.createElement('div');
            avatar.className = 'member-avatar';
            avatar.textContent = member.charAt(0).toUpperCase();
            
            const memberName = document.createElement('div');
            memberName.className = 'member-name-text';
            memberName.textContent = member;
            
            memberDiv.appendChild(avatar);
            memberDiv.appendChild(memberName);
            groupMembers.appendChild(memberDiv);
        });
        
        groupCard.appendChild(groupHeader);
        groupCard.appendChild(groupMembers);
        resultsContainer.appendChild(groupCard);
    });
    
    // Smooth scroll ke hasil
    setTimeout(() => {
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// ===== ADD SAMPLE MEMBERS =====
function addSampleMembers() {
    const sampleMembers = [
        'Putra Azzam Elfathin',
        'Ahmad Ridho Maulana',
        'Siti Nurhaliza',
        'Budi Santoso',
        'Rina Kusuma',
        'Dimas Prasetyo',
        'Dewi Lestari',
        'Eko Wahyudi',
        'Fitri Handayani',
        'Gilang Ramadhan',
        'Hana Safitri',
        'Indra Gunawan'
    ];
    
    document.getElementById('memberInput').value = sampleMembers.join('\n');
    updateStats();
    showToast('✅ Data contoh ditambahkan!');
}

// ===== CLEAR ALL =====
function clearAll() {
    if (document.getElementById('memberInput').value.trim() === '' && 
        document.getElementById('resultsCard').style.display === 'none') {
        showToast('ℹ️ Tidak ada data untuk dihapus');
        return;
    }
    
    document.getElementById('memberInput').value = '';
    document.getElementById('groupCount').value = '4';
    document.getElementById('resultsCard').style.display = 'none';
    document.getElementById('resultsContainer').innerHTML = '';
    currentGroups = [];
    updateStats();
    showToast('🗑️ Semua data telah dihapus');
}

// ===== SHOW TOAST =====
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter untuk generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateGroups();
    }
    
    // Ctrl/Cmd + Delete untuk clear all
    if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
        e.preventDefault();
        clearAll();
    }
});

// ===== EXPORT FUNCTIONS (Optional - bisa ditambahkan nanti) =====
function exportToText() {
    if (currentGroups.length === 0) {
        showToast('❌ Belum ada kelompok yang dibuat!');
        return;
    }
    
    let textContent = '=== HASIL PEMBAGIAN KELOMPOK ===\n';
    textContent += `Generated by Pufutara Random Group Generator\n`;
    textContent += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    
    currentGroups.forEach((group, index) => {
        textContent += `KELOMPOK ${index + 1}\n`;
        textContent += `${'-'.repeat(30)}\n`;
        group.forEach((member, idx) => {
            textContent += `${idx + 1}. ${member}\n`;
        });
        textContent += `\n`;
    });
    
    // Create download link
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kelompok_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ File berhasil diunduh!');
}

// ===== COPY TO CLIPBOARD =====
function copyResults() {
    if (currentGroups.length === 0) {
        showToast('❌ Belum ada kelompok yang dibuat!');
        return;
    }
    
    let textContent = '=== HASIL PEMBAGIAN KELOMPOK ===\n\n';
    
    currentGroups.forEach((group, index) => {
        textContent += `KELOMPOK ${index + 1}\n`;
        group.forEach((member, idx) => {
            textContent += `${idx + 1}. ${member}\n`;
        });
        textContent += `\n`;
    });
    
    navigator.clipboard.writeText(textContent).then(() => {
        showToast('✅ Hasil disalin ke clipboard!');
    }).catch(() => {
        showToast('❌ Gagal menyalin ke clipboard');
    });
}

// ===== AUTO-SAVE TO LOCAL STORAGE (Optional) =====
function saveToLocalStorage() {
    const data = {
        members: document.getElementById('memberInput').value,
        groupCount: document.getElementById('groupCount').value,
        lastSaved: new Date().toISOString()
    };
    localStorage.setItem('pufutara_group_generator', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('pufutara_group_generator');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            document.getElementById('memberInput').value = data.members || '';
            document.getElementById('groupCount').value = data.groupCount || '4';
            updateStats();
        } catch (e) {
            console.error('Failed to load saved data:', e);
        }
    }
}

// Auto-save on input change (debounced)
let saveTimeout;
document.getElementById('memberInput').addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToLocalStorage, 1000);
});

document.getElementById('groupCount').addEventListener('input', saveToLocalStorage);

// Load saved data on page load
loadFromLocalStorage();

// ===== SMOOTH ANIMATIONS ON SCROLL =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all animated elements
document.querySelectorAll('.card').forEach(el => observer.observe(el));

console.log('🎲 Pufutara Random Group Generator loaded successfully!');
console.log('💡 Tips: Gunakan Ctrl/Cmd + Enter untuk generate kelompok');
