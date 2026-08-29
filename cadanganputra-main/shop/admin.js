// INIT SUPABASE
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// AUTH (hardcoded)
const CRED = { u: 'admin', p: 'admin123' };

function doLogin() {
    const u = document.getElementById('lu').value.trim();
    const p = document.getElementById('lp').value;
    if (u === CRED.u && p === CRED.p) {
        sessionStorage.setItem('pa', '1');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appWrap').classList.remove('hidden');
        loadAll();
    } else {
        document.getElementById('lerr').classList.remove('hidden');
    }
}
function doLogout() { sessionStorage.removeItem('pa'); location.reload(); }

// STATE
let prods = [], cmts = [], orders = [], slides = [];

// NAV
const SECS = ['dashboard','products','comments','orders','promo','category','banner'];
const TITLES = {
    dashboard: ['Dashboard', 'Ringkasan toko hari ini'],
    products:  ['Manajemen Produk', 'Edit, tambah, atau hapus produk'],
    comments:  ['Moderasi Komentar', 'Pantau dan hapus ulasan pembeli'],
    orders:    ['Manajemen Pesanan', 'Lihat dan update status pesanan pembeli'],
    promo:     ['Promo & Diskon', 'Kelola harga dan diskon produk'],
    category:  ['Distribusi Kategori', 'Jumlah produk per kategori'],
    banner:    ['Banner Toko', 'Kelola slideshow di halaman utama toko'],
};

function nav(name) {
    SECS.forEach(s => {
        document.getElementById('s-'+s).classList.add('hidden');
        const b = document.getElementById('nb-'+s);
        if (b) { b.classList.remove('active'); b.classList.add('text-gray-600'); }
    });
    document.getElementById('s-'+name).classList.remove('hidden');
    const ab = document.getElementById('nb-'+name);
    if (ab) { ab.classList.add('active'); ab.classList.remove('text-gray-600'); }
    document.getElementById('pgTitle').innerText    = TITLES[name][0];
    document.getElementById('pgSubtitle').innerText = TITLES[name][1];
    if (name === 'promo')    renderPromo();
    if (name === 'category') { populateCatDropdowns(); renderCatCards(); }
    if (name === 'orders')   renderOrderTable();
    if (name === 'banner')   loadSlides();
}

// LOAD ALL
async function loadAll() {
    setSyncStatus('loading');
    try {
        await Promise.all([loadProds(), loadCmts(), loadOrders()]);
        renderDash(); renderProdTable(); renderCmtTable();
        setSyncStatus('ok');
    } catch(e) { setSyncStatus('err'); toast('Gagal memuat: ' + e.message, 'fa-triangle-exclamation'); }
}

function setSyncStatus(s) {
    const el = document.getElementById('syncDot');
    if (s==='loading') el.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-yellow-400 text-[8px]"></i> Sync...';
    else if (s==='ok') el.innerHTML = '<i class="fa-solid fa-circle text-green-400 text-[8px]"></i> Terhubung';
    else               el.innerHTML = '<i class="fa-solid fa-circle text-red-400 text-[8px]"></i> Error';
}

async function loadProds() {
    const { data, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    prods = data.map(p => ({
        ...p,
        images:   Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'),
        price:    parseFloat(p.price)    || 0,
        discount: parseFloat(p.discount) || 0,
        rating:   parseFloat(p.rating)   || 0,
        stock:    parseInt(p.stock)      || 0,
        variants: p.variants ? (Array.isArray(p.variants) ? p.variants : JSON.parse(p.variants)) : [],
    }));
    document.getElementById('badge-prod').innerText = prods.length;
}

async function loadCmts() {
    const { data, error } = await db.from('comments').select('*, products(name)').order('created_at', { ascending: false });
    if (error) throw error;
    cmts = data;
    document.getElementById('badge-cmt').innerText = cmts.length;
}

async function loadOrders() {
    const { data, error } = await db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (error) throw error;
    orders = data;
    const newCount = orders.filter(o => ['menunggu_pembayaran','pembayaran_diterima','diproses'].includes(o.status)).length;
    document.getElementById('badge-orders').innerText = newCount || 'â€”';
}

// DASHBOARD
function renderDash() {
    document.getElementById('st-prod').innerText   = prods.length;
    document.getElementById('st-cmt').innerText    = cmts.length;
    document.getElementById('st-promo').innerText  = prods.filter(p => p.discount > 0).length;
    document.getElementById('st-low').innerText    = prods.filter(p => p.stock <= 3).length;
    document.getElementById('st-orders').innerText = orders.filter(o => ['menunggu_pembayaran','pembayaran_diterima','diproses'].includes(o.status)).length;

    // recent orders
    const dOrders = document.getElementById('dash-orders');
    if (dOrders) {
        const recent = orders.slice(0,5);
        if (!recent.length) {
            dOrders.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400 text-xs italic px-6">Belum ada pesanan</td></tr>';
        } else {
            dOrders.innerHTML = recent.map(o => `
            <tr>
                <td class="font-mono text-xs font-bold">${esc(o.order_number)}</td>
                <td class="text-xs font-semibold">${esc(o.buyer_name)}</td>
                <td class="text-xs font-black">${idr(o.total_price)}</td>
                <td class="text-[11px] text-gray-400 whitespace-nowrap">${fmtDate(o.created_at)}</td>
                <td>${statusBadge(o.status)}</td>
            </tr>`).join('');
        }
    }

    // recent products
    document.getElementById('dash-recent').innerHTML = prods.slice(0,5).map(p => `
        <tr>
            <td><div class="flex items-center gap-3">
                <img src="${p.images[0]||''}" class="img-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2242%22 height=%2242%22><rect fill=%22%23e5e7eb%22 width=%2242%22 height=%2242%22/></svg>'">
                <span class="font-semibold text-xs truncate max-w-[160px]">${esc(p.name)}</span>
            </div></td>
            <td><span class="badge bg-gray-100 text-gray-600">${p.category}</span></td>
            <td class="text-xs font-bold">${idr(p.price)}</td>
            <td><span class="badge ${p.stock<=3?'bg-orange-100 text-orange-600':'bg-green-100 text-green-600'}">${p.stock}</span></td>
            <td class="text-xs font-bold text-yellow-500">${p.rating>0?'â˜… '+p.rating:'â€”'}</td>
        </tr>`).join('');

    // category bars dynamic
    const cats  = loadCats();
    const total = prods.length || 1;
    document.getElementById('dash-catbars').innerHTML = cats.map(c => {
        const n = prods.filter(p => p.category === c.name).length;
        const pct = Math.round(n/total*100);
        return `<div>
            <div class="flex justify-between mb-1"><span class="text-xs font-bold">${c.name}</span><span class="text-xs text-gray-400 font-bold">${n} (${pct}%)</span></div>
            <div class="w-full bg-gray-100 rounded-full h-2"><div class="h-2 rounded-full transition-all duration-700 ${c.color}" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
}

// PRODUCT TABLE
function renderProdTable(list = prods) {
    const tbody = document.getElementById('prodBody');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-14 text-gray-400 text-sm">Tidak ada produk</td></tr>'; return; }
    tbody.innerHTML = list.map(p => {
        const fp = p.price - p.price * p.discount / 100;
        return `<tr>
            <td><div class="flex items-center gap-3">
                <img src="${p.images[0]||''}" class="img-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2242%22 height=%2242%22><rect fill=%22%23e5e7eb%22 width=%2242%22 height=%2242%22/></svg>'">
                <div><p class="font-bold text-xs truncate max-w-[150px]">${esc(p.name)}</p><p class="text-[10px] text-gray-400">${p.id.slice(0,8)}â€¦</p></div>
            </div></td>
            <td><span class="badge bg-gray-100 text-gray-600">${p.category}</span></td>
            <td><p class="text-xs font-bold">${idr(fp)}</p>${p.discount>0?`<p class="text-[10px] text-gray-400 line-through">${idr(p.price)}</p>`:''}</td>
            <td>${p.discount>0?`<span class="badge bg-red-100 text-red-600">-${p.discount}%</span>`:`<span class="text-xs text-gray-400">â€”</span>`}</td>
            <td><span class="badge ${p.stock===0?'bg-gray-200 text-gray-500':p.stock<=3?'bg-orange-100 text-orange-600':'bg-green-100 text-green-600'}">${p.stock}</span></td>
            <td class="text-xs font-bold ${p.rating>=4?'text-yellow-500':'text-gray-400'}">${p.rating>0?'â˜… '+p.rating:'â€”'}</td>
            <td><div class="flex gap-1.5">
                <button onclick="openEditProd('${p.id}')"  class="btn-icon"       title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button onclick="openQP('${p.id}')"        class="btn-icon blue"  title="Edit Harga"><i class="fa-solid fa-tag"></i></button>
                <button onclick="askDel('product','${p.id}','${esc(p.name)}')" class="btn-icon danger" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}
function filterProd() {
    const q = document.getElementById('pSearch').value.toLowerCase();
    const cat = document.getElementById('pCatF').value;
    renderProdTable(prods.filter(p => (!q||p.name.toLowerCase().includes(q)) && (!cat||p.category===cat)));
}

// COMMENT TABLE
function renderCmtTable(list = cmts) {
    const tbody = document.getElementById('cmtBody');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-14 text-gray-400 text-sm">Tidak ada komentar</td></tr>'; return; }
    tbody.innerHTML = list.map(c => `<tr>
        <td class="font-bold text-xs">${esc(c.products?.name||'â€”')}</td>
        <td><p class="text-xs text-gray-700 max-w-[280px] truncate" title="${esc(c.text)}">${esc(c.text)}</p></td>
        <td class="text-yellow-500 font-bold text-sm">${'â˜…'.repeat(c.rating)}${'<span class="text-gray-200">â˜…</span>'.repeat(5-c.rating)}</td>
        <td class="text-[11px] text-gray-400 font-medium whitespace-nowrap">${fmtDate(c.created_at)}</td>
        <td><button onclick="askDel('comment','${c.id}','')" class="btn-icon danger" title="Hapus"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('');
}
function filterCmt() {
    const q = document.getElementById('cSearch').value.toLowerCase();
    const rat = document.getElementById('cRatF').value;
    renderCmtTable(cmts.filter(c => (!q||c.text.toLowerCase().includes(q)||(c.products?.name||'').toLowerCase().includes(q)) && (!rat||String(c.rating)===rat)));
}

// STATUS BADGE
function statusBadge(status) {
    const map = {
        menunggu_pembayaran: ['bg-gray-100 text-gray-600', 'Menunggu Bayar'],
        pembayaran_diterima: ['bg-blue-100 text-blue-700', 'Bayar Diterima'],
        diproses:            ['bg-yellow-100 text-yellow-700', 'Diproses'],
        dikemas:             ['bg-orange-100 text-orange-600', 'Dikemas'],
        dikirim:             ['bg-purple-100 text-purple-600', 'Dikirim'],
        sampai:              ['bg-teal-100 text-teal-600', 'Sampai'],
        selesai:             ['bg-green-100 text-green-700', 'Selesai'],
        dibatalkan:          ['bg-red-100 text-red-600', 'Dibatalkan'],
    };
    const [cls, label] = map[status] || ['bg-gray-100 text-gray-500', status];
    return `<span class="badge ${cls}">${label}</span>`;
}

// ORDER TABLE
function renderOrderTable(list = orders) {
    const tbody = document.getElementById('orderBody');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-14 text-gray-400 text-sm">Tidak ada pesanan</td></tr>'; return; }
    tbody.innerHTML = list.map(o => `<tr>
        <td class="font-mono text-xs font-bold">${esc(o.order_number)}</td>
        <td><p class="text-xs font-bold">${esc(o.buyer_name)}</p><p class="text-[10px] text-gray-400">${esc(o.buyer_phone)}</p></td>
        <td class="text-xs font-black">${idr(o.total_price)}</td>
        <td class="text-[11px] text-gray-400 font-medium whitespace-nowrap">${fmtDate(o.created_at)}</td>
        <td>${statusBadge(o.status)}</td>
        <td><button onclick="openOrderDetail('${o.id}')" class="btn-icon blue" title="Detail"><i class="fa-solid fa-pen-to-square"></i></button></td>
    </tr>`).join('');
}
function filterOrders() {
    const q = document.getElementById('oSearch').value.toLowerCase();
    const st = document.getElementById('oStatusF').value;
    renderOrderTable(orders.filter(o => (!q||o.order_number.toLowerCase().includes(q)||o.buyer_name.toLowerCase().includes(q)) && (!st||o.status===st)));
}
function openOrderDetail(id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    document.getElementById('mOrderId').value        = o.id;
    document.getElementById('mOrderNum').innerText   = o.order_number;
    document.getElementById('mOrderName').innerText  = o.buyer_name;
    document.getElementById('mOrderPhone').innerText = o.buyer_phone;
    document.getElementById('mOrderAddr').innerText  = o.buyer_address;
    document.getElementById('mOrderTotal').innerText = idr(o.total_price);
    document.getElementById('mOrderStatus').value    = o.status;
    document.getElementById('mOrderNote').value      = o.status_note || '';
    document.getElementById('mOrderResi').value      = o.tracking_number || '';
    const items = o.order_items || [];
    document.getElementById('mOrderItems').innerHTML = items.length
        ? items.map(item => {
            const vl = Object.entries(item.chosen_variants||{}).map(([k,v])=>`${k}: ${v}`).join(', ');
            return `<div class="flex gap-3 items-center bg-gray-50 p-3 rounded-xl">
                <img src="${item.product_image||''}" class="img-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2242%22 height=%2242%22><rect fill=%22%23e5e7eb%22 width=%2242%22 height=%2242%22/></svg>'">
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold truncate">${esc(item.product_name)}</p>
                    ${vl?`<p class="text-[10px] text-gray-400">${esc(vl)}</p>`:''}
                    <p class="text-[10px] text-gray-400">${item.quantity} Ã— ${idr(item.unit_price)}</p>
                </div>
                <span class="text-xs font-black">${idr(item.subtotal)}</span>
            </div>`;
          }).join('')
        : '<p class="text-xs text-gray-400 italic">Tidak ada item</p>';
    openM('mOrder');
}
async function saveOrderStatus() {
    const id     = document.getElementById('mOrderId').value;
    const status = document.getElementById('mOrderStatus').value;
    const note   = document.getElementById('mOrderNote').value.trim();
    const resi   = document.getElementById('mOrderResi').value.trim();
    const btn = document.getElementById('btnSaveOrder');
    btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    try {
        const { error } = await db.from('orders').update({ status, status_note: note, tracking_number: resi }).eq('id', id);
        if (error) throw error;
        toast('Status pesanan diperbarui!', 'fa-check');
        closeM('mOrder');
        await loadOrders(); renderOrderTable(); renderDash();
    } catch(err) { toast('Gagal: '+err.message,'fa-triangle-exclamation'); }
    finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan Status'; }
}

// DASHBOARD ORDERS TABLE helper
function renderDashOrders() {
    const tbody = document.getElementById('dash-orders');
    if (!tbody) return;
    const recent = orders.slice(0,5);
    if (!recent.length) { tbody.innerHTML='<tr><td colspan="5" class="px-6 py-6 text-center text-gray-400 text-xs italic">Belum ada pesanan</td></tr>'; return; }
    tbody.innerHTML = recent.map(o => `<tr>
        <td class="font-mono text-xs font-bold px-6">${esc(o.order_number)}</td>
        <td class="text-xs font-semibold">${esc(o.buyer_name)}</td>
        <td class="text-xs font-black">${idr(o.total_price)}</td>
        <td class="text-[11px] text-gray-400 whitespace-nowrap">${fmtDate(o.created_at)}</td>
        <td>${statusBadge(o.status)}</td>
    </tr>`).join('');
}

// PROMO TABLE
function renderPromo() {
    const sorted = [...prods].sort((a,b)=>b.discount-a.discount);
    document.getElementById('promoBody').innerHTML = sorted.map(p => {
        const fp = p.price - p.price*p.discount/100;
        return `<tr>
            <td><div class="flex items-center gap-3">
                <img src="${p.images[0]||''}" class="img-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2242%22 height=%2242%22><rect fill=%22%23e5e7eb%22 width=%2242%22 height=%2242%22/></svg>'">
                <span class="font-bold text-xs truncate max-w-[180px]">${esc(p.name)}</span>
            </div></td>
            <td class="text-xs font-bold">${idr(p.price)}</td>
            <td>${p.discount>0?`<span class="badge bg-red-100 text-red-600">-${p.discount}%</span>`:`<span class="badge bg-gray-100 text-gray-500">â€”</span>`}</td>
            <td class="text-xs font-black ${p.discount>0?'text-red-500':''}">${idr(fp)}</td>
            <td><button onclick="openQP('${p.id}')" class="btn-icon" title="Edit Harga/Diskon"><i class="fa-solid fa-pen"></i></button></td>
        </tr>`;
    }).join('');
}

// CATEGORY CRUD
const DEFAULT_CATS = [
    {name:'Pakaian',  icon:'fa-shirt',       color:'bg-purple-500'},
    {name:'Sepatu',   icon:'fa-shoe-prints',  color:'bg-blue-500'},
    {name:'Aksesori', icon:'fa-glasses',      color:'bg-yellow-500'},
    {name:'Gadget',   icon:'fa-microchip',    color:'bg-green-500'},
];
function loadCats() {
    const saved = localStorage.getItem('pufutara_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATS;
}
function saveCats(list) { localStorage.setItem('pufutara_categories', JSON.stringify(list)); }
function populateCatDropdowns() {
    const cats = loadCats();
    ['pCatF','bk-cat','fp-cat'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const cur = el.value;
        if (id==='bk-cat') el.innerHTML = `<option value="all">Semua Produk</option>` + cats.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
        else if (id==='pCatF') el.innerHTML = `<option value="">Semua Kategori</option>` + cats.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
        else el.innerHTML = cats.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
        if (cur) el.value = cur;
    });
}
function renderCatCards() {
    const cats = loadCats();
    const grid = document.getElementById('catCards');
    grid.innerHTML = cats.map(c => {
        const items = prods.filter(p=>p.category===c.name);
        const avg   = items.length ? (items.reduce((s,p)=>s+p.rating,0)/items.length).toFixed(1) : 'â€”';
        const minP  = items.length ? idr(Math.min(...items.map(p=>p.price-p.price*p.discount/100))) : 'â€”';
        return `<div class="card p-6 hover:-translate-y-0.5 transition-transform">
            <div class="flex justify-between items-start mb-4">
                <div class="w-11 h-11 ${c.color} rounded-[14px] flex items-center justify-center"><i class="fa-solid ${c.icon} text-white"></i></div>
                <div class="flex gap-1.5">
                    <button onclick="openEditCat('${esc(c.name)}')" class="btn-icon"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <button onclick="askDelCat('${esc(c.name)}')"   class="btn-icon danger"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
            <p class="font-black mb-1">${c.name}</p>
            <p class="text-[11px] text-gray-400">${items.length} produk</p>
            <p class="text-[11px] text-gray-400">Avg: <span class="text-yellow-500 font-bold">â˜… ${avg}</span></p>
            <p class="text-[11px] text-gray-400">Mulai: <span class="font-bold text-black">${minP}</span></p>
            <button onclick="document.getElementById('pCatF').value='${c.name}';nav('products');filterProd();" class="mt-3 text-xs font-bold text-gray-400 hover:text-black transition-colors">Lihat Produk â†’</button>
        </div>`;
    }).join('') + `<div class="card p-6 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-transform text-gray-400 hover:text-black hover:border-black" onclick="openAddCat()">
        <div class="w-11 h-11 rounded-[14px] bg-gray-100 flex items-center justify-center"><i class="fa-solid fa-plus text-lg"></i></div>
        <p class="text-xs font-bold">Tambah Kategori</p>
    </div>`;

    const total = prods.length || 1;
    document.getElementById('catProdStats').innerHTML = cats.map(c => {
        const n = prods.filter(p=>p.category===c.name).length;
        const pct = Math.round(n/total*100);
        return `<div>
            <div class="flex justify-between mb-1"><span class="text-xs font-bold">${c.name}</span><span class="text-xs text-gray-400 font-bold">${n} (${pct}%)</span></div>
            <div class="w-full bg-gray-100 rounded-full h-2"><div class="h-2 rounded-full transition-all duration-700 ${c.color}" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
}

let selectedCatColor = 'bg-purple-500';
function openAddCat() {
    document.getElementById('mCatTitle').innerText = 'Tambah Kategori';
    document.getElementById('cat-old-name').value = '';
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-icon').value = 'fa-tag';
    selectedCatColor = 'bg-purple-500';
    document.getElementById('cat-color').value = selectedCatColor;
    highlightColor(selectedCatColor); updateCatPreview(); openM('mCat');
}
function openEditCat(name) {
    const cats = loadCats();
    const c = cats.find(x=>x.name===name); if (!c) return;
    document.getElementById('mCatTitle').innerText = 'Edit Kategori';
    document.getElementById('cat-old-name').value = c.name;
    document.getElementById('cat-name').value = c.name;
    document.getElementById('cat-icon').value = c.icon;
    selectedCatColor = c.color;
    document.getElementById('cat-color').value = c.color;
    highlightColor(c.color); updateCatPreview(); openM('mCat');
}
function selectColor(cls) {
    selectedCatColor = cls;
    document.getElementById('cat-color').value = cls;
    highlightColor(cls); updateCatPreview();
}
function highlightColor(cls) {
    document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('ring-2','ring-offset-2','ring-gray-600','scale-110'));
    document.querySelectorAll('.color-opt').forEach(b => { if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(cls)) b.classList.add('ring-2','ring-offset-2','ring-gray-600','scale-110'); });
}
function updateCatPreview() {
    const name = document.getElementById('cat-name').value.trim() || 'Nama Kategori';
    const icon = document.getElementById('cat-icon').value.trim() || 'fa-tag';
    document.getElementById('catPreviewName').innerText = name;
    const iconEl = document.getElementById('catPreviewIcon');
    iconEl.className = `w-11 h-11 ${selectedCatColor} rounded-[14px] flex items-center justify-center`;
    iconEl.innerHTML = `<i class="fa-solid ${icon} text-white"></i>`;
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cat-name')?.addEventListener('input', updateCatPreview);
    document.getElementById('cat-icon')?.addEventListener('input', updateCatPreview);
});
function saveCat() {
    const oldName = document.getElementById('cat-old-name').value;
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value.trim() || 'fa-tag';
    const color = selectedCatColor;
    if (!name) { toast('Nama kategori wajib diisi','fa-circle-exclamation'); return; }
    let cats = loadCats();
    if (oldName) { const idx = cats.findIndex(c=>c.name===oldName); if (idx>=0) cats[idx]={name,icon,color}; }
    else {
        if (cats.find(c=>c.name.toLowerCase()===name.toLowerCase())) { toast('Kategori sudah ada','fa-circle-exclamation'); return; }
        cats.push({name,icon,color});
    }
    saveCats(cats); populateCatDropdowns(); renderCatCards(); renderDash(); closeM('mCat');
    toast(oldName?'Kategori diperbarui!':'Kategori ditambahkan!','fa-check');
}
function askDelCat(name) {
    const cats = loadCats();
    if (cats.length<=1) { toast('Minimal harus ada 1 kategori','fa-circle-exclamation'); return; }
    const count = prods.filter(p=>p.category===name).length;
    document.getElementById('delMsg').innerHTML = `Hapus kategori <strong>"${esc(name)}"</strong>?${count>0?`<br><span class="text-orange-500 font-bold">${count} produk</span> tidak ikut terhapus.`:''}`;
    document.getElementById('btnDel').onclick = () => {
        let cats = loadCats(); cats = cats.filter(c=>c.name!==name); saveCats(cats);
        populateCatDropdowns(); renderCatCards(); renderDash(); closeM('mDel'); toast('Kategori dihapus','fa-trash');
    };
    openM('mDel');
}

// BANNER SLIDES
async function loadSlides() {
    const { data, error } = await db.from('banner_slides').select('*').order('sort_order', { ascending: true });
    if (error) { toast('Gagal memuat banner: '+error.message,'fa-triangle-exclamation'); return; }
    slides = data || [];
    renderSlideTable(); renderBannerPreview(); populateSlideCategories();
}
function populateSlideCategories() {
    const cats = loadCats();
    const sel = document.getElementById('sl-cat');
    if (!sel) return;
    sel.innerHTML = `<option value="all">Semua Produk</option><option value="promo">Promo</option>` + cats.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
}
function renderSlideTable() {
    const tbody = document.getElementById('slideBody');
    if (!slides.length) { tbody.innerHTML='<tr><td colspan="7" class="text-center py-12 text-gray-400 text-sm">Belum ada slide banner</td></tr>'; return; }
    tbody.innerHTML = slides.map(s => `<tr>
        <td><div class="w-24 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200"><img src="${s.image_url}" class="w-full h-full object-cover" onerror="this.style.display='none'"></div></td>
        <td class="font-bold text-xs max-w-[140px]"><p class="truncate">${esc(s.title||'â€”')}</p></td>
        <td class="text-xs text-gray-500 max-w-[160px]"><p class="truncate">${esc(s.subtitle||'â€”')}</p></td>
        <td><span class="badge bg-gray-100 text-gray-600">${s.link_cat||'all'}</span></td>
        <td class="text-xs font-bold text-center">${s.sort_order}</td>
        <td><button onclick="toggleSlideActive('${s.id}', ${!s.active})" class="badge ${s.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'} cursor-pointer hover:opacity-80">${s.active?'Aktif':'Nonaktif'}</button></td>
        <td><div class="flex gap-1.5">
            <button onclick="openEditSlide('${s.id}')" class="btn-icon" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button onclick="askDelSlide('${s.id}')"   class="btn-icon danger" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div></td>
    </tr>`).join('');
}
function renderBannerPreview() {
    const activeSlides = slides.filter(s=>s.active);
    const container = document.getElementById('bannerPreview');
    if (!activeSlides.length) { container.innerHTML='<p class="text-xs text-gray-400 text-center pt-16">Belum ada slide aktif</p>'; return; }
    let idx=0;
    container.innerHTML=`<div style="position:relative;height:100%;overflow:hidden">
        <img id="pvImg" src="${activeSlides[0].image_url}" class="w-full h-full object-cover">
        <div class="absolute inset-0 flex flex-col justify-end p-4" style="background:linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 70%)">
            <p id="pvTitle" class="text-white font-black text-sm italic">${esc(activeSlides[0].title||'')}</p>
            <p id="pvSub"   class="text-gray-300 text-[10px] mt-0.5">${esc(activeSlides[0].subtitle||'')}</p>
        </div>
        <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-1">${activeSlides.map((_,i)=>`<div class="w-1.5 h-1.5 rounded-full ${i===0?'bg-white':'bg-white/40'}"></div>`).join('')}</div>
    </div>`;
    if (activeSlides.length>1) {
        setInterval(()=>{
            idx=(idx+1)%activeSlides.length;
            const s=activeSlides[idx];
            const img=document.getElementById('pvImg'); if(img)img.src=s.image_url;
            const tit=document.getElementById('pvTitle'); if(tit)tit.textContent=s.title||'';
            const sub=document.getElementById('pvSub'); if(sub)sub.textContent=s.subtitle||'';
        },2500);
    }
}
function openAddSlide() {
    document.getElementById('mSlideTitle').innerText='Tambah Slide';
    document.getElementById('sl-id').value='';
    document.getElementById('sl-img').value='';
    document.getElementById('sl-title').value='';
    document.getElementById('sl-sub').value='';
    document.getElementById('sl-order').value=slides.length+1;
    document.getElementById('sl-active').checked=true;
    document.getElementById('slImgPreview').classList.add('hidden');
    populateSlideCategories(); openM('mSlide');
}
function openEditSlide(id) {
    const s=slides.find(x=>x.id===id); if(!s)return;
    document.getElementById('mSlideTitle').innerText='Edit Slide';
    document.getElementById('sl-id').value=s.id;
    document.getElementById('sl-img').value=s.image_url;
    document.getElementById('sl-title').value=s.title||'';
    document.getElementById('sl-sub').value=s.subtitle||'';
    document.getElementById('sl-order').value=s.sort_order;
    document.getElementById('sl-active').checked=s.active;
    populateSlideCategories();
    document.getElementById('sl-cat').value=s.link_cat||'all';
    previewSlideImg(); openM('mSlide');
}
function previewSlideImg() {
    const url=document.getElementById('sl-img').value.trim();
    const wrap=document.getElementById('slImgPreview');
    const img=document.getElementById('slPreviewImg');
    if(url){img.src=url;wrap.classList.remove('hidden');}else wrap.classList.add('hidden');
}
async function saveSlide() {
    const id=document.getElementById('sl-id').value;
    const imgUrl=document.getElementById('sl-img').value.trim();
    if(!imgUrl){toast('URL gambar wajib diisi','fa-circle-exclamation');return;}
    const payload={
        image_url:imgUrl,
        title:document.getElementById('sl-title').value.trim(),
        subtitle:document.getElementById('sl-sub').value.trim(),
        link_cat:document.getElementById('sl-cat').value,
        sort_order:parseInt(document.getElementById('sl-order').value)||1,
        active:document.getElementById('sl-active').checked,
    };
    const btn=document.getElementById('btnSaveSlide');
    btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    try {
        if(id){const{error}=await db.from('banner_slides').update(payload).eq('id',id);if(error)throw error;toast('Slide diperbarui!','fa-check');}
        else  {const{error}=await db.from('banner_slides').insert([payload]);if(error)throw error;toast('Slide ditambahkan!','fa-check');}
        closeM('mSlide'); await loadSlides();
    }catch(err){toast('Gagal: '+err.message,'fa-triangle-exclamation');}
    finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan';}
}
async function toggleSlideActive(id,newActive) {
    const{error}=await db.from('banner_slides').update({active:newActive}).eq('id',id);
    if(error){toast('Gagal: '+error.message,'fa-triangle-exclamation');return;}
    toast(newActive?'Slide diaktifkan':'Slide dinonaktifkan','fa-check'); await loadSlides();
}
function askDelSlide(id) {
    document.getElementById('delMsg').innerHTML='Yakin hapus slide ini? Tindakan tidak bisa dibatalkan.';
    document.getElementById('btnDel').onclick=async()=>{
        const{error}=await db.from('banner_slides').delete().eq('id',id);
        if(error){toast('Gagal: '+error.message,'fa-triangle-exclamation');return;}
        toast('Slide dihapus','fa-trash'); closeM('mDel'); await loadSlides();
    };
    openM('mDel');
}

// ADMIN VARIANTS
let adminVarN = 0;
function adminAddVarGroup(name='', opts='') {
    adminVarN++;
    const id=`avg${adminVarN}`;
    const div=document.createElement('div');
    div.id=id; div.className='bg-white rounded-xl p-3 border border-gray-200 space-y-2';
    div.innerHTML=`
        <div class="flex gap-2 items-center">
            <input type="text" placeholder="Nama tipe (ex: Ukuran)" value="${esc(name)}" class="field-input flex-1 text-xs avg-name">
            <button type="button" onclick="document.getElementById('${id}').remove()" class="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 flex-shrink-0"><i class="fa-solid fa-xmark text-xs"></i></button>
        </div>
        <input type="text" placeholder="Pilihan dipisah koma (ex: 38,39,40)" value="${esc(opts)}" class="field-input text-xs avg-opts">`;
    document.getElementById('fp-vgroups').appendChild(div);
}
function buildAdminVariants() {
    const groups=[];
    document.querySelectorAll('#fp-vgroups>div').forEach(div=>{
        const name=div.querySelector('.avg-name')?.value.trim();
        const opts=div.querySelector('.avg-opts')?.value.trim();
        if(!name||!opts)return;
        groups.push({name,options:opts.split(',').map(o=>({value:o.trim(),stock:10})).filter(o=>o.value)});
    });
    return groups;
}

// PRODUCT FORM
function openAddProd() {
    document.getElementById('mProdTitle').innerText='Tambah Produk';
    document.getElementById('fp-id').value='';
    document.getElementById('formProd').reset();
    adminVarN=0; document.getElementById('fp-vgroups').innerHTML='';
    populateCatDropdowns();
    openM('mProd');
}
function openEditProd(id) {
    const p=prods.find(x=>x.id===id); if(!p)return;
    document.getElementById('mProdTitle').innerText='Edit Produk';
    document.getElementById('fp-id').value=p.id;
    populateCatDropdowns();
    document.getElementById('fp-name').value=p.name;
    document.getElementById('fp-cat').value=p.category;
    document.getElementById('fp-stock').value=p.stock;
    document.getElementById('fp-price').value=p.price;
    document.getElementById('fp-disc').value=p.discount;
    document.getElementById('fp-desc').value=p.description||'';
    document.getElementById('fp-imgs').value=(p.images||[]).join('\n');
    document.getElementById('fp-loc').value=p.location||'';
    document.getElementById('fp-from').value=p.shipped_from||'';
    document.getElementById('fp-est').value=p.estimated_time||'';
    document.getElementById('fp-rating').value=p.rating||0;
    document.getElementById('fp-likes').value=p.likes||0;
    adminVarN=0; document.getElementById('fp-vgroups').innerHTML='';
    const variants=p.variants;
    if(variants?.length) variants.forEach(g=>adminAddVarGroup(g.name, g.options.map(o=>o.value).join(',')));
    openM('mProd');
}
document.getElementById('formProd').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn=document.getElementById('btnSaveProd');
    btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    const id=document.getElementById('fp-id').value;
    const imgs=document.getElementById('fp-imgs').value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,3);
    const payload={
        name:document.getElementById('fp-name').value.trim(),
        category:document.getElementById('fp-cat').value,
        stock:parseInt(document.getElementById('fp-stock').value)||0,
        price:parseFloat(document.getElementById('fp-price').value)||0,
        discount:parseFloat(document.getElementById('fp-disc').value)||0,
        description:document.getElementById('fp-desc').value.trim(),
        images:imgs.length?imgs:['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'],
        location:document.getElementById('fp-loc').value.trim(),
        shipped_from:document.getElementById('fp-from').value.trim(),
        estimated_time:document.getElementById('fp-est').value.trim(),
        rating:parseFloat(document.getElementById('fp-rating').value)||0,
        likes:parseInt(document.getElementById('fp-likes').value)||0,
        variants:buildAdminVariants(),
    };
    try {
        if(id){const{error}=await db.from('products').update(payload).eq('id',id);if(error)throw error;toast('Produk diperbarui!','fa-check');}
        else  {const{error}=await db.from('products').insert([payload]);if(error)throw error;toast('Produk ditambahkan!','fa-check');}
        closeM('mProd'); await loadProds(); renderProdTable(); renderDash();
        if(!document.getElementById('s-promo').classList.contains('hidden'))renderPromo();
    }catch(err){toast('Gagal: '+err.message,'fa-triangle-exclamation');}
    finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan';}
});

// QUICK PRICE
function openQP(id) {
    const p=prods.find(x=>x.id===id); if(!p)return;
    document.getElementById('qp-id').value=p.id;
    document.getElementById('qp-price').value=p.price;
    document.getElementById('qp-disc').value=p.discount;
    document.getElementById('qp-stock').value=p.stock;
    document.getElementById('qpName').innerText=p.name;
    openM('mPrice');
}
async function saveQP() {
    const id=document.getElementById('qp-id').value;
    const data={
        price:parseFloat(document.getElementById('qp-price').value)||0,
        discount:parseFloat(document.getElementById('qp-disc').value)||0,
        stock:parseInt(document.getElementById('qp-stock').value)||0
    };
    try{
        const{error}=await db.from('products').update(data).eq('id',id);
        if(error)throw error;
        toast('Harga & stok diperbarui!','fa-tag');
        closeM('mPrice');
        await loadProds(); renderProdTable(); renderDash();
        if(!document.getElementById('s-promo').classList.contains('hidden'))renderPromo();
    }catch(err){toast('Gagal: '+err.message,'fa-triangle-exclamation');}
}

// BULK DISCOUNT
function openBulk(){ populateCatDropdowns(); openM('mBulk'); }
async function applyBulk() {
    const cat=document.getElementById('bk-cat').value;
    const disc=parseFloat(document.getElementById('bk-disc').value)||0;
    const targets=cat==='all'?prods:prods.filter(p=>p.category===cat);
    if(!targets.length){toast('Tidak ada produk','fa-circle-exclamation');return;}
    try{
        const{error}=await db.from('products').update({discount:disc}).in('id',targets.map(p=>p.id));
        if(error)throw error;
        toast(`Diskon ${disc}% â†’ ${targets.length} produk`,'fa-check');
        closeM('mBulk');
        await loadProds(); renderProdTable(); renderDash(); renderPromo();
    }catch(err){toast('Gagal: '+err.message,'fa-triangle-exclamation');}
}

// DELETE
function askDel(type, id, name) {
    document.getElementById('delMsg').innerHTML = type==='product'
        ? `Yakin hapus produk <strong>"${esc(name)}"</strong>? Semua ulasan terkait ikut terhapus.`
        : `Yakin hapus komentar ini? Tindakan tidak bisa dibatalkan.`;
    document.getElementById('btnDel').onclick = async()=>{
        const{error}=await db.from(type==='product'?'products':'comments').delete().eq('id',id);
        if(error){toast('Gagal: '+error.message,'fa-triangle-exclamation');return;}
        toast(type==='product'?'Produk dihapus':'Komentar dihapus','fa-trash');
        closeM('mDel'); await loadAll();
    };
    openM('mDel');
}

// MODAL HELPERS
function openM(id){ document.getElementById(id).classList.remove('hidden'); }
function closeM(id){ document.getElementById(id).classList.add('hidden'); }
['mProd','mPrice','mBulk','mDel','mCat','mOrder','mSlide'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',function(e){ if(e.target===this) closeM(id); });
});

// UTILS
const idr = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : 'â€”';
function toast(msg, icon='fa-check') {
    const w=document.getElementById('toast-wrap');
    const t=document.createElement('div'); t.className='toast';
    t.innerHTML=`<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    w.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); },3000);
}

// INIT
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lu').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('lp').focus(); });
    populateCatDropdowns();
    if (sessionStorage.getItem('pa') === '1') {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appWrap').classList.remove('hidden');
        loadAll();
    }
});
