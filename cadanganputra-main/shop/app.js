// â”€â”€â”€ SUPABASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// â”€â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let products = [], cart = [], favs = [], categories = [], slides = [];
let curCat = 'all', curSort = 'default', curPrice = 5000000, query = '';
let activeP = null, selVars = {}, formRating = 5, pendingFiles = [], varGroupN = 0;
let lastOrderId = null, lastOrderNum = null;
let currentUser = null;    // Supabase auth user object
let slideIdx = 0, slideTimer = null;

const DEFAULT_CATS = [
    {name:'Pakaian', icon:'fa-shirt',      color:'bg-purple-500'},
    {name:'Sepatu',  icon:'fa-shoe-prints', color:'bg-blue-500'},
    {name:'Aksesori',icon:'fa-glasses',     color:'bg-yellow-500'},
    {name:'Gadget',  icon:'fa-microchip',   color:'bg-green-500'},
];

// â”€â”€â”€ UTILS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idr = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const fp  = p => p.price - p.price * p.discount / 100;

function stars(r) {
    let h=''; const f=Math.floor(r), half=r%1>=.5;
    for(let i=0;i<f;i++) h+='<i class="fa-solid fa-star"></i>';
    if(half) h+='<i class="fa-solid fa-star-half-stroke"></i>';
    for(let i=0;i<5-f-(half?1:0);i++) h+='<i class="fa-regular fa-star"></i>';
    return h;
}
function toast(msg, icon='fa-check') {
    const w=document.getElementById('toastWrap');
    const t=document.createElement('div'); t.className='toast';
    t.innerHTML=`<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    w.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); }, 2800);
}
function toSlug(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
}
function generateOrderNumber() {
    const d=new Date();
    const date=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    return `PFT-${date}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

// â”€â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openAuth() {
    switchAuth('login');
    document.getElementById('modalAuth').classList.remove('hidden');
}
function closeAuthAndContinue() {
    document.getElementById('modalAuth').classList.add('hidden');
}
function switchAuth(tab) {
    document.getElementById('authLogin').classList.toggle('hidden', tab !== 'login');
    document.getElementById('authReg').classList.toggle('hidden', tab !== 'register');
    document.getElementById('tabLogin').className = `flex-1 py-4 text-sm font-black border-b-2 transition-colors ${tab==='login'?'border-black':'border-transparent text-gray-400 hover:text-black'}`;
    document.getElementById('tabReg').className   = `flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${tab==='register'?'border-black font-black':'border-transparent text-gray-400 hover:text-black'}`;
    document.getElementById('loginErr').classList.add('hidden');
    document.getElementById('regErr').classList.add('hidden');
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPass').value;
    const btn   = document.getElementById('btnLogin');
    const errEl = document.getElementById('loginErr');
    if (!email || !pass) { errEl.innerText='Isi email dan password'; errEl.classList.remove('hidden'); return; }
    btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin text-xs"></i> Masuk...';
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
    if (error) {
        errEl.innerText = error.message.includes('Invalid') ? 'Email atau password salah' : error.message;
        errEl.classList.remove('hidden');
    } else {
        currentUser = data.user;
        updateAuthUI();
        document.getElementById('modalAuth').classList.add('hidden');
        toast('Selamat datang kembali!', 'fa-circle-check');
    }
    btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-arrow-right-to-bracket text-xs"></i> Masuk';
}

async function doRegister() {
    const name  = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass  = document.getElementById('regPass').value;
    const btn   = document.getElementById('btnReg');
    const errEl = document.getElementById('regErr');
    if (!name||!email||!pass) { errEl.innerText='Isi semua field'; errEl.classList.remove('hidden'); return; }
    if (pass.length < 6) { errEl.innerText='Password minimal 6 karakter'; errEl.classList.remove('hidden'); return; }
    btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin text-xs"></i> Mendaftar...';
    const { data, error } = await db.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
    if (error) {
        errEl.innerText = error.message;
        errEl.classList.remove('hidden');
    } else {
        currentUser = data.user;
        updateAuthUI();
        document.getElementById('modalAuth').classList.add('hidden');
        toast('Akun berhasil dibuat! Selamat berbelanja ðŸŽ‰', 'fa-party-horn');
    }
    btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-user-plus text-xs"></i> Daftar Sekarang';
}

async function doLogout() {
    await db.auth.signOut();
    currentUser = null;
    updateAuthUI();
    document.getElementById('userDropdown').classList.add('hidden');
    toast('Berhasil keluar', 'fa-right-from-bracket');
}

function updateAuthUI() {
    const avatar  = document.getElementById('userAvatar');
    const btnShow = document.getElementById('btnShowAuth');
    if (currentUser) {
        const name = currentUser.user_metadata?.full_name || currentUser.email;
        const initial = (name[0] || '?').toUpperCase();
        avatar.innerText = initial;
        avatar.classList.remove('hidden');
        btnShow.classList.add('hidden');
        document.getElementById('udName').innerText = name;
    } else {
        avatar.classList.add('hidden');
        btnShow.classList.remove('hidden');
    }
}

function toggleUserDropdown() {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatar');
    const rect = av.getBoundingClientRect();
    dd.style.top  = (rect.bottom + 8) + 'px';
    dd.style.right = (window.innerWidth - rect.right) + 'px';
    dd.classList.toggle('hidden');
}
document.addEventListener('click', e => {
    const dd = document.getElementById('userDropdown');
    if (!dd.classList.contains('hidden') &&
        !document.getElementById('userAvatar').contains(e.target) &&
        !dd.contains(e.target)) {
        dd.classList.add('hidden');
    }
});

// â”€â”€â”€ BANNER SLIDESHOW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadSlides() {
    const { data, error } = await db.from('banner_slides')
        .select('*').eq('active', true).order('sort_order', { ascending: true });
    slides = (!error && data?.length) ? data : [{
        image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop',
        title: 'Style Tanpa Kompromi.', subtitle: 'Koleksi Eksklusif 2024', link_cat: 'all'
    }];
    renderSlider();
}

function renderSlider() {
    const container = document.getElementById('heroSlides');
    const dots      = document.getElementById('heroDots');
    container.innerHTML = slides.map((s, i) => `
        <div class="slide ${i===0?'active':''}" data-idx="${i}" style="position:${i===0?'relative':'absolute'};inset:0;opacity:${i===0?1:0};transition:opacity .7s">
            <img src="${s.image_url}" alt="${s.title}" class="w-full h-full object-cover"
                onerror="this.style.display='none'">
        </div>`).join('');
    dots.innerHTML = slides.map((_, i) => `
        <button class="slide-dot ${i===0?'act':''}" onclick="goSlide(${i})"></button>`).join('');
    updateSlideContent(0);
    startSlideTimer();
}

function updateSlideContent(idx) {
    const s = slides[idx];
    if (!s) return;
    document.getElementById('heroTitle').innerText    = s.title    || '';
    document.getElementById('heroSubtitle').innerText = s.subtitle || '';
    const btn = document.getElementById('heroBtnMain');
    btn.onclick = () => setCat(s.link_cat || 'all');
    btn.innerText = s.link_cat === 'promo' ? 'Lihat Promo' : s.link_cat === 'all' ? 'Semua Produk' : `Lihat ${s.link_cat}`;
}

function goSlide(idx) {
    const allSlides = document.querySelectorAll('#heroSlides .slide');
    const allDots   = document.querySelectorAll('#heroDots .slide-dot');
    allSlides.forEach((el, i) => {
        el.style.opacity   = i === idx ? '1' : '0';
        el.style.position  = i === idx ? 'relative' : 'absolute';
    });
    allDots.forEach((d, i) => { d.classList.toggle('act', i === idx); });
    slideIdx = idx;
    updateSlideContent(idx);
}
function slideNext() { goSlide((slideIdx + 1) % slides.length); resetSlideTimer(); }
function slidePrev() { goSlide((slideIdx - 1 + slides.length) % slides.length); resetSlideTimer(); }
function startSlideTimer() {
    if (slideTimer) clearInterval(slideTimer);
    if (slides.length > 1) slideTimer = setInterval(() => slideNext(), 4000);
}
function resetSlideTimer() { startSlideTimer(); }

// â”€â”€â”€ CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadCats() {
    const s = localStorage.getItem('pufutara_categories');
    categories = s ? JSON.parse(s) : DEFAULT_CATS;
    buildTabs(); fillSelects();
}
function buildTabs() {
    const wrap = document.getElementById('catTabs');
    const promo = document.getElementById('tab-promo');
    [...wrap.querySelectorAll('.ctab:not(#tab-all):not(#tab-promo)')].forEach(b=>b.remove());
    categories.forEach(c => {
        const b = document.createElement('button');
        b.id = `tab-${c.name}`;
        b.className = 'ctab flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-xl text-gray-600 hover:bg-gray-100 transition-all';
        b.textContent = c.name;
        b.onclick = () => setCat(c.name);
        wrap.insertBefore(b, promo);
    });
}
function fillSelects() {
    const el = document.getElementById('pCategory');
    if (el) el.innerHTML = categories.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
}

// â”€â”€â”€ ROUTING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getBase() { return window.location.pathname.replace(/\/(product|category)(\/.*)?$/,'').replace(/\/$/,''); }
function goHome()  { history.pushState({view:'home'},'',getBase()||'./'); closePDP(); curCat='all'; renderGrid(); }
function pushProd(p) {
    history.pushState({view:'product',slug:toSlug(p.name)},`${p.name} | Pufutarashop`,`${getBase()}/product/${toSlug(p.name)}`);
    document.title = `${p.name} | Pufutarashop`;
}
function pushCat(cat) {
    const url = cat==='all' ? getBase()||'./' : `${getBase()}/category/${cat}`;
    history.pushState({view:'category',category:cat},`${cat} | Pufutarashop`,url);
    document.title = cat !== 'all' ? `${cat} | Pufutarashop` : 'Pufutarashop';
}
window.addEventListener('popstate', async e => {
    const s=e.state; if(!s) return;
    if (s.view==='product') {
        if (!products.length) await loadProducts();
        const p = products.find(x=>toSlug(x.name)===s.slug);
        if (p) openPDP(p.id, false);
    } else { closePDP(false); curCat=s.category||'all'; renderGrid(); }
});

// â”€â”€â”€ LOAD PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadProducts() {
    const {data,error} = await db.from('products').select('*').order('created_at',{ascending:false});
    if (error) { toast('Gagal memuat produk','fa-triangle-exclamation'); return; }
    products = data.map(norm);
    renderGrid();
}
function norm(r) {
    const imgs = Array.isArray(r.images) ? r.images : JSON.parse(r.images||'[]');
    return {
        id:r.id, name:r.name,
        price:parseFloat(r.price)||0, discount:parseFloat(r.discount)||0,
        category:r.category, desc:r.description||'',
        images:imgs, image:imgs[0]||'',
        location:r.location||'', shippedFrom:r.shipped_from||'', estimatedTime:r.estimated_time||'',
        likes:r.likes||0, rating:parseFloat(r.rating)||0, stock:r.stock||0,
        variants: r.variants ? (Array.isArray(r.variants)?r.variants:JSON.parse(r.variants)) : [],
    };
}

// â”€â”€â”€ RENDER GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setCat(cat)   { curCat=cat; pushCat(cat); renderGrid(); document.querySelector('main')?.scrollIntoView({behavior:'smooth'}); }
function setSort(v)    { curSort=v; renderGrid(); }
function setPriceLimit(v) { curPrice=parseInt(v); document.getElementById('priceLabel').innerText=idr(curPrice); renderGrid(); }

function renderGrid() {
    document.querySelectorAll('.ctab').forEach(b => {
        b.classList.remove('bg-black','text-white','bg-red-500','text-red-500'); b.classList.add('text-gray-600');
    });
    const atab = document.getElementById('tab-'+curCat);
    if (atab) {
        atab.classList.remove('text-gray-600');
        if (curCat==='promo') atab.classList.add('bg-red-500','text-white');
        else atab.classList.add('bg-black','text-white');
    }
    let list = [...products];
    if (curCat==='promo')   list=list.filter(p=>p.discount>0);
    else if(curCat!=='all') list=list.filter(p=>p.category===curCat);
    if (query) list=list.filter(p=>p.name.toLowerCase().includes(query.toLowerCase()));
    list=list.filter(p=>fp(p)<=curPrice);
    if (curSort==='price-asc')  list.sort((a,b)=>fp(a)-fp(b));
    if (curSort==='price-desc') list.sort((a,b)=>fp(b)-fp(a));
    if (curSort==='rating')     list.sort((a,b)=>b.rating-a.rating);
    document.getElementById('prodCount').innerText = `${list.length} produk ditemukan`;
    const grid = document.getElementById('productGrid');
    if (!list.length) { grid.innerHTML=`<div class="col-span-5 text-center py-20 text-gray-400"><i class="fa-solid fa-box-open text-4xl mb-3 block"></i><p class="font-bold">Tidak ada produk</p></div>`; return; }
    grid.innerHTML = list.map(p => {
        const price=fp(p), img=p.images[0]||p.image, isFav=favs.includes(p.id);
        return `
        <div class="pcard" onclick="openPDP('${p.id}')">
          <div class="thumb">
            ${p.discount>0?`<span class="absolute top-2 left-2 z-10 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">-${p.discount}%</span>`:''}
            ${p.stock===0?`<span class="absolute top-2 right-2 z-10 bg-gray-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">Habis</span>`:p.stock<=3?`<span class="absolute top-2 right-2 z-10 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">Menipis</span>`:''}
            <img src="${img}" alt="${p.name}" loading="lazy">
            <button class="favcorner ${isFav?'on':''} w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
              onclick="event.stopPropagation();toggleFav('${p.id}')">
              <i class="${isFav?'fa-solid text-red-500':'fa-regular text-gray-400'} fa-heart text-sm"></i>
            </button>
            <div class="hactions">
              <button onclick="event.stopPropagation();quickCart('${p.id}')"
                class="flex-1 bg-black text-white rounded-xl py-2 text-xs font-black flex items-center justify-center gap-1 hover:bg-zinc-800 transition-colors shadow-lg">
                <i class="fa-solid fa-plus text-[10px]"></i> Keranjang
              </button>
            </div>
          </div>
          <div class="p-3">
            <p class="text-[10px] text-gray-400 font-semibold mb-0.5">${p.category}</p>
            <p class="text-xs font-bold text-gray-800 truncate">${p.name}</p>
            <div class="flex items-center gap-1 text-yellow-400 text-[9px] my-1">${stars(p.rating)}<span class="text-gray-400 ml-1">(${p.rating})</span></div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-sm font-black">${idr(price)}</span>
              ${p.discount>0?`<span class="text-[10px] text-gray-400 line-through">${idr(p.price)}</span>`:''}
            </div>
            <p class="text-[10px] text-gray-400 mt-0.5 truncate">${p.location}</p>
          </div>
        </div>`;
    }).join('');
}

// â”€â”€â”€ PDP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function openPDP(id, pushUrl=true) {
    const p=products.find(x=>x.id===id); if(!p) return;
    activeP=p; selVars={};
    if (pushUrl) pushProd(p);
    const price=fp(p), img=p.images[0]||p.image;
    document.getElementById('pdpImg').src=img;
    document.getElementById('pdpCrumb').innerText=`${p.category} / ${p.name}`;
    document.getElementById('pdpCatBadge').innerText=p.category;
    document.getElementById('pdpName').innerText=p.name;
    document.getElementById('pdpStars').innerHTML=stars(p.rating);
    document.getElementById('pdpRating').innerText=p.rating>0?`${p.rating}/5`:'';
    document.getElementById('pdpPrice').innerText=idr(price);
    document.getElementById('pdpOldPrice').innerText=p.discount>0?idr(p.price):'';
    document.getElementById('pdpDesc').innerText=p.desc;
    document.getElementById('pdpLoc').innerText=`Lokasi: ${p.location}`;
    document.getElementById('pdpFrom').innerText=`Dikirim dari: ${p.shippedFrom}`;
    document.getElementById('pdpEst').innerText=`Estimasi: ${p.estimatedTime}`;
    const sb=document.getElementById('pdpStockBadge');
    if (p.stock===0)    {sb.innerText='Stok Habis';        sb.className='text-[10px] font-bold bg-gray-200 text-gray-600 px-3 py-1 rounded-full';}
    else if(p.stock<=3) {sb.innerText=`Sisa ${p.stock}!`;  sb.className='text-[10px] font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full';}
    else                {sb.innerText=`Stok: ${p.stock}`;  sb.className='text-[10px] font-bold bg-green-100 text-green-600 px-3 py-1 rounded-full';}
    const db2=document.getElementById('pdpDiscBadge');
    if (p.discount>0){db2.innerText=`-${p.discount}%`;db2.classList.remove('hidden');}else db2.classList.add('hidden');
    const sv=document.getElementById('pdpSave');
    if (p.discount>0){sv.innerText=`Hemat ${idr(p.price-price)} (${p.discount}% off)`;sv.classList.remove('hidden');}else sv.classList.add('hidden');
    const th=document.getElementById('pdpThumbs');
    th.innerHTML=p.images.length>1?p.images.map((s,i)=>`
        <img src="${s}" loading="lazy"
          onclick="document.getElementById('pdpImg').src='${s}';[...document.querySelectorAll('#pdpThumbs img')].forEach(x=>x.classList.remove('ring-2','ring-black'));this.classList.add('ring-2','ring-black')"
          class="w-16 h-16 object-cover rounded-xl cursor-pointer border border-gray-200 flex-shrink-0 ${i===0?'ring-2 ring-black':'hover:border-black'} transition-all">`).join(''):'';
    updatePDPFav();
    [document.getElementById('pdpBtnCart'),document.getElementById('pdpBtnBuy')].forEach(b=>{
        b.disabled=p.stock===0; b.classList.toggle('opacity-40',p.stock===0); b.classList.toggle('cursor-not-allowed',p.stock===0);
    });
    renderVariants(p); renderRelated(p);
    setRating(5); document.getElementById('cmtInput').value='';
    document.getElementById('pdpComments').innerHTML='<p class="text-xs text-gray-400 italic">Memuat ulasan...</p>';
    document.getElementById('pdpCmtCnt').innerText='';
    document.getElementById('pdp').classList.add('open');
    document.getElementById('pdp').scrollTop=0;
    document.body.style.overflow='hidden';
    const cmts=await loadCmts(p.id); renderCmts(cmts,p);
}
function closePDP(updateUrl=true) {
    document.getElementById('pdp').classList.remove('open');
    document.body.style.overflow='';
    if(updateUrl){pushCat(curCat);document.title='Pufutarashop';}
    activeP=null;
}
function updatePDPFav() {
    if(!activeP) return;
    const i=document.getElementById('pdpFavBtn').querySelector('i');
    const on=favs.includes(activeP.id);
    i.className=on?'fa-solid fa-heart text-sm text-red-500':'fa-regular fa-heart text-sm';
}
function pdpToggleFav(){if(activeP)toggleFav(activeP.id);updatePDPFav();}
function pdpAddCart() {if(!chkVars())return;addToCart(activeP.id,selVars);}
function pdpBuyNow()  {if(!chkVars())return;addToCart(activeP.id,selVars);closePDP();checkout();}

function renderVariants(p) {
    const sec=document.getElementById('pdpVarSection');
    const con=document.getElementById('pdpVarContainer');
    if(!p.variants||!p.variants.length){sec.classList.add('hidden');return;}
    sec.classList.remove('hidden');
    con.innerHTML=p.variants.map(g=>`
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">${g.name}</p>
          <div class="flex flex-wrap gap-2">
            ${g.options.map(o=>`
              <button class="vchip ${o.stock===0?'out':''}"
                id="vc-${toSlug(g.name)}-${toSlug(String(o.value))}"
                onclick="selVar('${g.name}','${o.value}')"
                ${o.stock===0?'disabled':''}
              >${o.value}${o.stock===0?' (Habis)':''}</button>`).join('')}
          </div>
        </div>`).join('');
}
function selVar(group,val) {
    selVars[group]=val;
    document.querySelectorAll(`[id^="vc-${toSlug(group)}-"]`).forEach(b=>b.classList.remove('sel'));
    document.getElementById(`vc-${toSlug(group)}-${toSlug(String(val))}`)?.classList.add('sel');
}
function chkVars() {
    if(!activeP?.variants?.length)return true;
    for(const g of activeP.variants){if(!selVars[g.name]){toast(`Pilih ${g.name} terlebih dahulu`,'fa-circle-exclamation');return false;}}
    return true;
}

function renderRelated(p) {
    const rel=products.filter(x=>x.id!==p.id&&x.category===p.category).slice(0,5);
    document.getElementById('pdpRelated').innerHTML=rel.map(r=>{
        const img=r.images[0]||r.image, isFav=favs.includes(r.id);
        return `
        <div class="pcard" onclick="openPDP('${r.id}')">
          <div class="thumb">
            ${r.discount>0?`<span class="absolute top-2 left-2 z-10 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">-${r.discount}%</span>`:''}
            <img src="${r.images[0]||r.image}" alt="${r.name}" loading="lazy">
            <button class="favcorner ${isFav?'on':''} w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center"
              onclick="event.stopPropagation();toggleFav('${r.id}')">
              <i class="${isFav?'fa-solid text-red-500':'fa-regular text-gray-400'} fa-heart text-sm"></i>
            </button>
            <div class="hactions">
              <button onclick="event.stopPropagation();quickCart('${r.id}')"
                class="flex-1 bg-black text-white rounded-xl py-2 text-xs font-black flex items-center justify-center gap-1 hover:bg-zinc-800 shadow-lg">
                <i class="fa-solid fa-plus text-[10px]"></i> Keranjang
              </button>
            </div>
          </div>
          <div class="p-3">
            <p class="text-xs font-bold text-gray-800 truncate">${r.name}</p>
            <span class="text-sm font-black">${idr(fp(r))}</span>
          </div>
        </div>`;
    }).join('');
}

async function loadCmts(pid) {
    const {data,error}=await db.from('comments').select('*').eq('product_id',pid).order('created_at',{ascending:false});
    return error?[]:data;
}
function renderCmts(cmts,p) {
    document.getElementById('pdpCmtCnt').innerText=`${cmts.length} ulasan`;
    if(p.rating>0)document.getElementById('pdpAvgRating').innerHTML=`<span class="text-yellow-500">${stars(p.rating)}</span> <span class="font-black">${p.rating}</span>`;
    const el=document.getElementById('pdpComments');
    if(!cmts.length){el.innerHTML='<p class="text-xs text-gray-400 italic">Belum ada ulasan.</p>';return;}
    el.innerHTML=cmts.map(c=>`
        <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-black">P</div>
              <span class="text-xs font-bold">Pembeli</span>
            </div>
            <div class="text-yellow-400 text-xs">${'<i class="fa-solid fa-star"></i>'.repeat(c.rating)}${'<i class="fa-regular fa-star text-gray-300"></i>'.repeat(5-c.rating)}</div>
          </div>
          <p class="text-xs text-gray-600 leading-relaxed">${c.text}</p>
          <p class="text-[10px] text-gray-400 mt-2">${new Date(c.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</p>
        </div>`).join('');
}
function setRating(r) {
    formRating=r;
    document.querySelectorAll('.star-btn').forEach((s,i)=>{
        s.className=`star-btn ${i<r?'fa-solid text-yellow-400':'fa-regular text-gray-300'} fa-star text-lg cursor-pointer hover:text-yellow-400 transition-colors`;
    });
}
async function submitCmt() {
    const text=document.getElementById('cmtInput').value.trim();
    if(!text){toast('Komentar tidak boleh kosong','fa-circle-exclamation');return;}
    if(!activeP)return;
    const btn=document.getElementById('cmtBtn');
    btn.disabled=true;btn.innerText='...';
    try {
        await db.from('comments').insert([{product_id:activeP.id,text,rating:formRating}]);
        const {data:all}=await db.from('comments').select('rating').eq('product_id',activeP.id);
        const avg=all.length?parseFloat((all.reduce((s,c)=>s+c.rating,0)/all.length).toFixed(1)):formRating;
        await db.from('products').update({rating:avg}).eq('id',activeP.id);
        const idx=products.findIndex(x=>x.id===activeP.id);
        if(idx>=0)products[idx].rating=avg; activeP.rating=avg;
        document.getElementById('cmtInput').value='';setRating(5);
        const cmts=await loadCmts(activeP.id);renderCmts(cmts,activeP);
        document.getElementById('pdpStars').innerHTML=stars(avg);
        document.getElementById('pdpRating').innerText=`${avg}/5`;
        toast('Ulasan dikirim!','fa-check');
    } catch(e){toast('Gagal: '+e.message,'fa-triangle-exclamation');}
    finally{btn.disabled=false;btn.innerText='Kirim';}
}

// â”€â”€â”€ CART â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function saveCart(){localStorage.setItem('pufutara_cart',JSON.stringify(cart));}
function saveFavs(){localStorage.setItem('pufutara_fav',JSON.stringify(favs));}
function quickCart(id){addToCart(id,{});}

function addToCart(id,vars={}) {
    const p=products.find(x=>x.id===id);if(!p)return;
    const key=id+JSON.stringify(vars);
    const ex=cart.find(i=>i.key===key);
    if(ex)ex.qty++;
    else cart.push({...p,qty:1,key,chosenVars:vars});
    updateCartUI();saveCart();
    toast(`${p.name} ditambahkan`,'fa-bag-shopping');
}
function changeQty(key,d) {
    const item=cart.find(i=>i.key===key);if(!item)return;
    item.qty+=d;
    if(item.qty<=0)cart=cart.filter(i=>i.key!==key);
    updateCartUI();saveCart();
}
function updateCartUI() {
    const cnt=cart.reduce((a,b)=>a+b.qty,0);
    document.getElementById('cartCount').innerText=cnt;
    document.getElementById('pdpCartCount').innerText=cnt;
    const list=document.getElementById('cartItems');
    const tot=document.getElementById('cartTotal');
    if(!cart.length){list.innerHTML='<div class="flex flex-col items-center justify-center h-full py-12 text-gray-400"><i class="fa-solid fa-bag-shopping text-4xl mb-3 opacity-30"></i><p class="text-sm font-bold">Keranjang kosong</p><p class="text-xs mt-1">Yuk, mulai belanja!</p></div>';tot.innerText='Rp 0';return;}
    let total=0;
    list.innerHTML=cart.map(item=>{
        const price=fp(item);total+=price*item.qty;
        const img=item.images?.[0]||item.image;
        const vl=Object.entries(item.chosenVars||{}).map(([k,v])=>`${k}: ${v}`).join(', ');
        return `
        <div class="flex gap-3 items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
          <img src="${img}" class="w-16 h-16 object-cover rounded-xl flex-shrink-0 border border-gray-100" loading="lazy">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold truncate">${item.name}</p>
            ${vl?`<p class="text-[10px] text-gray-400 mb-1">${vl}</p>`:''}
            <p class="text-xs font-black text-orange-600">${idr(price)}</p>
            <div class="flex items-center gap-1.5 bg-gray-100 w-fit rounded-xl px-1 py-1 mt-2">
              <button onclick="changeQty('${item.key}',-1)" class="w-6 h-6 hover:bg-white rounded-lg text-sm font-black flex items-center justify-center transition-colors">âˆ’</button>
              <span class="text-xs font-black w-5 text-center">${item.qty}</span>
              <button onclick="changeQty('${item.key}',1)" class="w-6 h-6 hover:bg-white rounded-lg text-sm font-black flex items-center justify-center transition-colors">+</button>
            </div>
          </div>
          <button onclick="changeQty('${item.key}',-999)" class="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>`;
    }).join('');
    tot.innerText=idr(total);
}

// â”€â”€â”€ FAVORITES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toggleFav(id) {
    const p=products.find(x=>x.id===id);if(!p)return;
    if(favs.includes(id)){favs=favs.filter(x=>x!==id);toast(`${p.name} dihapus dari favorit`,'fa-heart-crack');}
    else{favs.push(id);toast(`${p.name} difavoritkan`,'fa-heart');}
    document.getElementById('favCount').innerText=favs.length;
    document.getElementById('favBadge').innerText=`(${favs.length})`;
    saveFavs();updateFavUI();renderGrid();
    if(activeP?.id===id)updatePDPFav();
}
function updateFavUI() {
    const list=document.getElementById('favItems');
    if(!favs.length){list.innerHTML='<div class="flex flex-col items-center justify-center h-full py-12 text-gray-400"><i class="fa-regular fa-heart text-4xl mb-3 opacity-30"></i><p class="text-sm font-bold">Belum ada favorit</p><p class="text-xs mt-1">Tap â™¡ di produk untuk simpan</p></div>';return;}
    list.innerHTML=favs.map(fid=>{
        const p=products.find(x=>x.id===fid);if(!p)return'';
        const img=p.images?.[0]||p.image;
        return `
        <div class="flex gap-3 items-center cursor-pointer pb-4 border-b border-gray-100 last:border-0 last:pb-0"
          onclick="closeSidebar('favSidebar');openPDP('${p.id}')">
          <img src="${img}" class="w-14 h-14 object-cover rounded-xl border border-gray-100 flex-shrink-0" loading="lazy">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold truncate">${p.name}</p>
            <p class="text-[10px] text-gray-400">${p.category}</p>
            <p class="text-xs font-black mt-0.5 text-orange-600">${idr(fp(p))}</p>
          </div>
          <button onclick="event.stopPropagation();toggleFav('${p.id}')" class="text-red-400 hover:text-red-600 transition-colors p-1 flex-shrink-0">
            <i class="fa-solid fa-heart text-sm"></i>
          </button>
        </div>`;
    }).join('');
}

// â”€â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openSidebar(id) {
    // tutup sidebar lain dulu
    ['favSidebar','cartSidebar','orderSidebar'].forEach(s=>{
        if(s!==id) document.getElementById(s).classList.remove('open');
    });
    document.getElementById(id).classList.add('open');
    document.getElementById('sbOverlay').classList.remove('hidden');
}
function closeSidebar(id) {
    document.getElementById(id).classList.remove('open');
    const anyOpen=['favSidebar','cartSidebar','orderSidebar'].some(s=>document.getElementById(s).classList.contains('open'));
    if(!anyOpen) document.getElementById('sbOverlay').classList.add('hidden');
}
function closeAllSidebars() {
    ['favSidebar','cartSidebar','orderSidebar'].forEach(s=>document.getElementById(s).classList.remove('open'));
    document.getElementById('sbOverlay').classList.add('hidden');
}

// â”€â”€â”€ PESANAN SAYA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openMyOrders() {
    openSidebar('orderSidebar');
    if (!currentUser) {
        document.getElementById('orderItems').innerHTML=`
        <div class="flex flex-col items-center justify-center h-full py-12 text-gray-400 text-center">
          <i class="fa-solid fa-receipt text-4xl mb-3 opacity-30"></i>
          <p class="text-sm font-bold">Belum masuk akun</p>
          <p class="text-xs mt-1 mb-4">Login untuk melihat pesananmu</p>
          <button onclick="openAuth();closeSidebar('orderSidebar')" class="bg-black text-white text-xs font-black px-5 py-2.5 rounded-xl">Masuk Sekarang</button>
        </div>`;
        return;
    }
    loadMyOrders();
}

async function loadMyOrders() {
    document.getElementById('orderItems').innerHTML='<p class="text-xs text-gray-400 italic text-center py-8">Memuat pesanan...</p>';
    const { data, error } = await db.from('orders')
        .select('*, order_items(*)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    if (error || !data?.length) {
        document.getElementById('orderItems').innerHTML=`
        <div class="flex flex-col items-center justify-center h-full py-12 text-gray-400 text-center">
          <i class="fa-solid fa-box-open text-4xl mb-3 opacity-30"></i>
          <p class="text-sm font-bold">Belum ada pesanan</p>
        </div>`;
        return;
    }
    const STATUS_LABEL = {
        menunggu_pembayaran:'Menunggu Bayar', pembayaran_diterima:'Bayar Diterima',
        diproses:'Diproses', dikemas:'Dikemas', dikirim:'Dikirim',
        sampai:'Sampai', selesai:'Selesai', dibatalkan:'Dibatalkan'
    };
    const STATUS_COLOR = {
        menunggu_pembayaran:'bg-gray-100 text-gray-600', pembayaran_diterima:'bg-blue-100 text-blue-700',
        diproses:'bg-yellow-100 text-yellow-700', dikemas:'bg-orange-100 text-orange-600',
        dikirim:'bg-purple-100 text-purple-600', sampai:'bg-teal-100 text-teal-600',
        selesai:'bg-green-100 text-green-700', dibatalkan:'bg-red-100 text-red-600'
    };
    document.getElementById('orderItems').innerHTML = data.map(o => {
        const items = o.order_items || [];
        const firstImg = items[0]?.product_image || '';
        return `
        <div class="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-[10px] font-mono font-bold text-gray-500">${o.order_number}</p>
              <p class="text-[10px] text-gray-400">${new Date(o.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</p>
            </div>
            <span class="text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLOR[o.status]||'bg-gray-100 text-gray-500'}">
              ${STATUS_LABEL[o.status]||o.status}
            </span>
          </div>
          <div class="flex gap-2 overflow-x-auto pb-1">
            ${items.slice(0,3).map(item=>`
              <div class="flex-shrink-0 flex items-center gap-2 bg-white rounded-xl p-2 border border-gray-100 min-w-0">
                <img src="${item.product_image||''}" class="w-10 h-10 object-cover rounded-lg flex-shrink-0">
                <div class="min-w-0">
                  <p class="text-[10px] font-bold truncate max-w-[100px]">${item.product_name}</p>
                  <p class="text-[9px] text-gray-400">${item.quantity}Ã—${idr(item.unit_price)}</p>
                </div>
              </div>`).join('')}
            ${items.length>3?`<div class="flex-shrink-0 flex items-center justify-center bg-white rounded-xl p-2 border border-gray-100 w-14 text-[10px] text-gray-400 font-bold">+${items.length-3}</div>`:''}
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-gray-100">
            <span class="text-xs font-black">${idr(o.total_price)}</span>
            ${o.tracking_number?`<span class="text-[10px] font-bold text-gray-500">Resi: <span class="font-black text-black font-mono">${o.tracking_number}</span></span>`:''}
          </div>
        </div>`;
    }).join('');
}

function openFavFromMenu() {
    document.getElementById('userDropdown').classList.add('hidden');
    openSidebar('favSidebar');
}

// â”€â”€â”€ CHECKOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function checkout() {
    if(!cart.length){toast('Keranjang masih kosong!','fa-circle-exclamation');return;}
    // Jika belum login, arahkan ke auth dulu
    if(!currentUser){
        toast('Login dulu untuk checkout ya','fa-circle-user');
        openAuth();
        return;
    }
    closeSidebar('cartSidebar');
    let total=0;
    document.getElementById('coItems').innerHTML=cart.map(item=>{
        const price=fp(item);total+=price*item.qty;
        const img=item.images?.[0]||item.image;
        const vl=Object.entries(item.chosenVars||{}).map(([k,v])=>`${k}: ${v}`).join(', ');
        return `
        <div class="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
          <div class="flex gap-3 items-center">
            <img src="${img}" class="w-12 h-12 object-cover rounded-xl">
            <div><p class="text-xs font-bold">${item.name}</p>${vl?`<p class="text-[10px] text-gray-400">${vl}</p>`:''}<p class="text-[10px] text-gray-400">${item.qty} Ã— ${idr(price)}</p></div>
          </div>
          <span class="text-xs font-black">${idr(price*item.qty)}</span>
        </div>`;
    }).join('');
    document.getElementById('coTotal').innerText=idr(total);
    // Tampilkan info user
    const coInfo = document.getElementById('coUserInfo');
    const coEmail= document.getElementById('coUserEmail');
    coInfo.classList.remove('hidden');
    coEmail.innerText = currentUser.user_metadata?.full_name || currentUser.email;
    // Pre-fill nama jika ada
    const name = currentUser.user_metadata?.full_name || '';
    document.getElementById('coName').value = name;
    document.getElementById('coPhone').value='';
    document.getElementById('coAddr').value='';
    const btn=document.getElementById('btnCheckout');
    btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-lock text-xs"></i> Konfirmasi & Bayar';
    toggleModal('modalCheckout');
}

document.getElementById('formCheckout').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!currentUser){openAuth();return;}
    const btn=document.getElementById('btnCheckout');
    btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin text-xs"></i> Memproses...';
    const name=document.getElementById('coName').value.trim();
    const phone=document.getElementById('coPhone').value.trim();
    const addr=document.getElementById('coAddr').value.trim();
    const total=cart.reduce((s,i)=>s+fp(i)*i.qty,0);
    const orderNum=generateOrderNumber();
    try {
        const {data:order,error:oErr}=await db.from('orders').insert([{
            order_number:orderNum, buyer_name:name, buyer_phone:phone,
            buyer_address:addr, total_price:total, status:'menunggu_pembayaran',
            user_id: currentUser.id
        }]).select().single();
        if(oErr)throw oErr;
        lastOrderId=order.id; lastOrderNum=orderNum;
        const items=cart.map(item=>({
            order_id:order.id, product_id:item.id, product_name:item.name,
            product_image:item.images?.[0]||item.image||'',
            unit_price:fp(item), quantity:item.qty,
            chosen_variants:item.chosenVars||{}, subtotal:fp(item)*item.qty
        }));
        const {error:iErr}=await db.from('order_items').insert(items);
        if(iErr)throw iErr;
        toggleModal('modalCheckout');
        this.reset();
        startPaymentCountdown(order.id,orderNum);
    } catch(err) {
        toast('Gagal membuat pesanan: '+err.message,'fa-triangle-exclamation');
        btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-lock text-xs"></i> Konfirmasi & Bayar';
    }
});

// â”€â”€â”€ PAYMENT COUNTDOWN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startPaymentCountdown(orderId,orderNum) {
    document.getElementById('modalPaying').classList.remove('hidden');
    const circle=document.getElementById('payCircle');
    const countEl=document.getElementById('payCountdown');
    const circumference=213.6, totalSecs=5;
    let remaining=totalSecs;
    circle.style.strokeDashoffset='0';
    const tick=setInterval(async()=>{
        remaining--;
        countEl.textContent=remaining;
        circle.style.strokeDashoffset=circumference*((totalSecs-remaining)/totalSecs);
        if(remaining<=0){
            clearInterval(tick);
            try{await db.from('orders').update({status:'pembayaran_diterima'}).eq('id',orderId);}catch(e){}
            document.getElementById('modalPaying').classList.add('hidden');
            cart=[];updateCartUI();saveCart();
            document.getElementById('successOrderNum').textContent=orderNum;
            document.getElementById('modalSuccess').classList.remove('hidden');
        }
    },1000);
}
function closeSuccess(){document.getElementById('modalSuccess').classList.add('hidden');}

// â”€â”€â”€ FORM JUAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function addVarGroup() {
    varGroupN++;
    const id=`vg${varGroupN}`;
    const div=document.createElement('div');
    div.id=id;div.className='bg-white rounded-xl p-3 border border-gray-200 space-y-2';
    div.innerHTML=`
      <div class="flex gap-2 items-center">
        <input type="text" placeholder="Nama tipe (ex: Ukuran, Warna)" class="finput flex-1 text-xs vgname">
        <button type="button" onclick="document.getElementById('${id}').remove()" class="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 flex-shrink-0"><i class="fa-solid fa-xmark text-xs"></i></button>
      </div>
      <input type="text" placeholder="Pilihan dipisah koma (ex: 38,39,40)" class="finput text-xs vgopts">`;
    document.getElementById('varGroups').appendChild(div);
}
function buildVarsFromForm() {
    const groups=[];
    document.querySelectorAll('#varGroups>div').forEach(div=>{
        const name=div.querySelector('.vgname')?.value.trim();
        const opts=div.querySelector('.vgopts')?.value.trim();
        if(!name||!opts)return;
        groups.push({name,options:opts.split(',').map(o=>({value:o.trim(),stock:10})).filter(o=>o.value)});
    });
    return groups;
}
document.getElementById('pImgFile').addEventListener('change',function(e){
    pendingFiles=Array.from(e.target.files).slice(0,3);
    const prev=document.getElementById('imgPrev');prev.innerHTML='';
    pendingFiles.forEach(f=>{
        const r=new FileReader();r.onload=ev=>{prev.innerHTML+=`<img src="${ev.target.result}" class="w-12 h-12 object-cover rounded-lg border border-gray-200">`;};r.readAsDataURL(f);
    });
});
document.getElementById('formJual').addEventListener('submit',async function(e){
    e.preventDefault();
    const btn=document.getElementById('btnJual');
    btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Mengupload...';
    try {
        let imgs=[];
        if(pendingFiles.length){
            for(const f of pendingFiles){
                const fn=`${Date.now()}-${f.name.replace(/\s/g,'_')}`;
                const {data,error}=await db.storage.from('product-images').upload(fn,f,{cacheControl:'3600',upsert:false});
                if(error){const b=await f2b64(f);imgs.push(b);}
                else{const {data:u}=db.storage.from('product-images').getPublicUrl(data.path);imgs.push(u.publicUrl);}
            }
        } else {
            const url=document.getElementById('pImgUrl').value.trim();
            imgs=url?[url]:['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'];
        }
        const payload={
            name:document.getElementById('pName').value.trim(),
            description:document.getElementById('pDesc').value.trim(),
            price:parseFloat(document.getElementById('pPrice').value)||0,
            discount:parseFloat(document.getElementById('pDiscount').value)||0,
            category:document.getElementById('pCategory').value,
            images:imgs,
            location:document.getElementById('pLoc').value.trim(),
            shipped_from:document.getElementById('pFrom').value.trim(),
            estimated_time:document.getElementById('pEst').value.trim(),
            variants:buildVarsFromForm(),
            likes:0,rating:0,stock:10,
        };
        const {data:saved,error}=await db.from('products').insert([payload]).select().single();
        if(error)throw error;
        products.unshift(norm(saved));
        renderGrid();updateFavUI();
        toggleModal('modalJual');
        toast('Produk berhasil diposting!','fa-check-circle');
        this.reset();document.getElementById('imgPrev').innerHTML='';document.getElementById('varGroups').innerHTML='';
        pendingFiles=[];varGroupN=0;
    } catch(err){toast('Gagal: '+err.message,'fa-triangle-exclamation');}
    finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-upload text-xs"></i> Post Barang';}
});
function f2b64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});}

// â”€â”€â”€ MODAL HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toggleModal(id){document.getElementById(id)?.classList.toggle('hidden');}
['modalJual','modalCheckout','modalSuccess','modalAuth'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',function(e){
        if(e.target===this){
            if(id==='modalSuccess')closeSuccess();
            else this.classList.add('hidden');
        }
    });
});
document.getElementById('searchInput').addEventListener('input',e=>{query=e.target.value;renderGrid();});

// â”€â”€â”€ LOCAL DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadLocal(){
    const c=localStorage.getItem('pufutara_cart');
    const f=localStorage.getItem('pufutara_fav');
    if(c)cart=JSON.parse(c);
    if(f)favs=JSON.parse(f);
    document.getElementById('favCount').innerText=favs.length;
    document.getElementById('favBadge').innerText=`(${favs.length})`;
    updateCartUI();updateFavUI();
}

// â”€â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.addEventListener('DOMContentLoaded', async () => {
    loadCats();
    loadLocal();

    // Cek session user yang sudah login
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        updateAuthUI();
    }

    // Listen perubahan auth state
    db.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null;
        updateAuthUI();
    });

    await Promise.all([loadProducts(), loadSlides()]);

    // deep link
    const parts=window.location.pathname.split('/').filter(Boolean);
    const len=parts.length;
    if(len>=2&&parts[len-2]==='product'){
        const p=products.find(x=>toSlug(x.name)===parts[len-1]);
        if(p){openPDP(p.id,false);return;}
    } else if(len>=2&&parts[len-2]==='category'){
        curCat=parts[len-1];renderGrid();return;
    }
});
