/* ACE Bank V2 — Godly Edition */
'use strict';

/* ═══════════════════ AUTH FLOW ═══════════════════ */
var signupPendingData = null;
var otpExpectedFor = null;

function buildUserState(account) {
    var fn = account.firstName || '', ln = account.lastName || '';
    return {
        name: account.fullName || (fn + ' ' + ln), firstName: fn, lastName: ln,
        initials: (fn[0] || 'U') + (ln[0] || ''),
        customerId: account.accountNumber || '', email: account.email || '', mobile: account.mobile || '',
        accountNo: String(account.accountNumber || ''), accountFull: String(account.accountNumber || ''),
        accountType: account.accountType || 'Savings', ifsc: account.ifsc || 'ACE0001234', branch: account.branch || 'Main Branch',
        status: account.status || 'active', createdAt: account.createdAt || '', dob: account.dob || '',
        balance: account.balance || 0, currency: account.currency || 'INR',
        cardNumber: account.cardNumber || '', cardExpiry: account.cardExpiry || '',
        cardType: account.cardType || 'Visa Classic', cardFrozen: account.cardFrozen || false,
        cardLimits: account.cardLimits || {}, features: account.features || {},
        transactions: account.transactions || [], goals: account.goals || [],
        creditScore: account.creditScore || 700, creditHistory: account.creditHistory || [700],
        assets: account.assets || [], liabilities: account.liabilities || [],
        tier: account.tier || 'Silver', netWorth: account.balance || 0,
        creditScoreHistory: account.creditHistory || [account.creditScore || 700]
    };
}

function showAuthPage(page) {
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    document.querySelectorAll('.auth-page').forEach(function (p) { p.style.display = 'none'; });
    var el = document.getElementById('auth-' + page);
    if (el) el.style.display = 'block';
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
}

async function handleLogin() {
    var email = document.getElementById('login-id').value.trim();
    var password = document.getElementById('login-pass').value;
    var errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    if (!email || !password) { errEl.textContent = 'Please fill all fields.'; errEl.style.display = 'block'; return; }
    var result = await DB.login(email, password);
    if (result.success) {
        AppState.user = buildUserState(result.account);
        dummyTransactions = [];
        showApp(); buildSidebar();
        loadLiveData().then(function () { navigate('dashboard'); });
        showToast('Welcome back, ' + result.account.firstName + '!', 'success');
    } else {
        errEl.textContent = result.error; errEl.style.display = 'block';
    }
}

async function handleSignup() {
    var fn = document.getElementById('su-fname').value.trim();
    var ln = document.getElementById('su-lname').value.trim();
    var email = document.getElementById('su-email').value.trim();
    var mobile = document.getElementById('su-mobile').value.trim();
    var dob = document.getElementById('su-dob').value;
    var pass = document.getElementById('su-pass').value;
    var cpass = document.getElementById('su-cpass').value;
    var errEl = document.getElementById('signup-error');
    errEl.style.display = 'none';
    if (!fn || !ln || !email || !pass) { errEl.textContent = 'Please fill all required fields (name, email, password).'; errEl.style.display = 'block'; return; }
    if (pass.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; errEl.style.display = 'block'; return; }
    if (pass !== cpass) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; return; }
    // Get selected account type
    var accType = 'Regular Savings';
    var selected = document.querySelector('#su-acctype .radio-pill.selected');
    if (selected) accType = selected.textContent.replace('★ ', '').trim();
    var formData = { firstName: fn, lastName: ln, email: email, mobile: mobile || '', dob: dob, password: pass, accountType: accType };
    // Call API directly (no OTP needed — backend handles everything)
    var result = await DB.createAccount(formData);
    if (result.success) {
        AppState.user = buildUserState(result.account);
        dummyTransactions = [];
        showSuccessScreen(result);
    } else {
        errEl.textContent = result.error; errEl.style.display = 'block';
    }
}

function showSuccessScreen(result) {
    var account = result.account;
    document.getElementById('auth-container').style.display = 'flex';
    document.querySelectorAll('.auth-page').forEach(function (p) { p.style.display = 'none'; });
    document.getElementById('auth-success').style.display = 'block';
    document.getElementById('success-name').textContent = account.firstName;
    document.getElementById('success-custid').textContent = String(account.accountNumber);
    document.getElementById('success-accno').textContent = String(account.accountNumber);
    document.getElementById('success-acctype').textContent = account.accountType || 'Savings';
    document.getElementById('success-appid').textContent = account.id || '';
}

function goToDashboard() {
    showApp(); buildSidebar(); navigate('dashboard');
    showToast('Welcome to ACE Bank!', 'success');
}

function handleLogout() {
    DB.logout();
    AppState.user = null;
    dummyTransactions = [];
    showAuthPage('login');
    showToast('Logged out successfully.', 'info');
}

function selectAuthPill(el) {
    el.parentElement.querySelectorAll('.radio-pill').forEach(function (p) { p.classList.remove('selected'); });
    el.classList.add('selected');
}

/* ═══════════════════ STATE ═══════════════════ */
var AppState = {
    route: 'dashboard', user: null,
    formStep: 1, formData: {}, cardFrozen: false,
    cardLimits: { international: true, contactless: true, online: true, atm: true, pos: true, recurring: true, dailyLimit: 50000, onlineLimit: 25000, intlLimit: 5000 },
    goals: [
        { id: 1, name: 'Europe Vacation', emoji: '✈️', target: 150000, saved: 42000, deadline: '2025-12-01', color: '#1f1fff', monthlyNeeded: 12000 },
        { id: 2, name: 'Emergency Fund', emoji: '🛡️', target: 100000, saved: 95000, deadline: '2025-06-01', color: '#10b981', monthlyNeeded: 2500 },
        { id: 3, name: 'MacBook Pro', emoji: '💻', target: 200000, saved: 0, deadline: '2025-09-01', color: '#8b5cf6', monthlyNeeded: 25000 },
        { id: 4, name: 'Down Payment', emoji: '🏠', target: 500000, saved: 80000, deadline: '2026-06-01', color: '#f59e0b', monthlyNeeded: 18000 }
    ],
    disputes: [], sessions: [
        { device: 'Chrome on MacOS', location: 'Mumbai, Maharashtra', ip: '103.xx.xx.xx', lastActive: '2 mins ago', current: true },
        { device: 'ACE Bank App (iOS)', location: 'Mumbai, Maharashtra', ip: '157.xx.xx.xx', lastActive: '1 hour ago', current: false },
        { device: 'Firefox on Windows', location: 'Pune, Maharashtra', ip: '49.xx.xx.xx', lastActive: '3 days ago', current: false }
    ]
};

var dummyTransactions = [
    { id: 'TXN001', merchant: 'HDFC Bank EMI', category: 'loan', type: 'debit', amount: 12500, date: '23 Feb 2025', icon: 'account_balance', color: '#6366f1' },
    { id: 'TXN002', merchant: 'Salary - Infosys Ltd', category: 'income', type: 'credit', amount: 95000, date: '22 Feb 2025', icon: 'work', color: '#10b981' },
    { id: 'TXN003', merchant: 'SBI Mutual Fund SIP', category: 'investment', type: 'debit', amount: 5000, date: '20 Feb 2025', icon: 'trending_up', color: '#8b5cf6' },
    { id: 'TXN004', merchant: 'ACE Bank FD Interest', category: 'interest', type: 'credit', amount: 1250, date: '18 Feb 2025', icon: 'savings', color: '#f59e0b' },
    { id: 'TXN005', merchant: 'ATM Withdrawal', category: 'cash', type: 'debit', amount: 10000, date: '17 Feb 2025', icon: 'local_atm', color: '#64748b' },
    { id: 'TXN006', merchant: 'NEFT - Rahul Sharma', category: 'transfer', type: 'debit', amount: 8000, date: '15 Feb 2025', icon: 'send', color: '#ef4444' },
    { id: 'TXN007', merchant: 'NACH - LIC Premium', category: 'insurance', type: 'debit', amount: 3200, date: '14 Feb 2025', icon: 'security', color: '#06b6d4' },
    { id: 'TXN008', merchant: 'Cheque Deposit', category: 'income', type: 'credit', amount: 25000, date: '10 Feb 2025', icon: 'receipt', color: '#10b981' },
    { id: 'TXN009', merchant: 'IMPS - Priya Verma', category: 'transfer', type: 'debit', amount: 5500, date: '8 Feb 2025', icon: 'send', color: '#ef4444' },
    { id: 'TXN010', merchant: 'Dividend Credit', category: 'income', type: 'credit', amount: 3800, date: '5 Feb 2025', icon: 'trending_up', color: '#10b981' }
];

var scoreFactors = [
    { name: 'Payment History', impact: 'High', score: 92, status: 'Excellent', icon: 'check_circle', color: '#10b981', tip: 'All payments on time. Keep it up!' },
    { name: 'Credit Utilization', impact: 'High', score: 34, status: 'Good', icon: 'donut_large', color: '#10b981', tip: 'Reduce utilization below 30% for +15 pts.' },
    { name: 'Credit Age', impact: 'Medium', score: 58, status: 'Fair', icon: 'schedule', color: '#f59e0b', tip: 'Avg age 3.2 years. Avoid closing old accounts.' },
    { name: 'Credit Mix', impact: 'Medium', score: 71, status: 'Good', icon: 'category', color: '#10b981', tip: 'Good mix of secured and unsecured credit.' },
    { name: 'New Inquiries', impact: 'Low', score: 88, status: 'Excellent', icon: 'search', color: '#10b981', tip: 'Only 1 inquiry in last 6 months.' },
    { name: 'Total Accounts', impact: 'Low', score: 65, status: 'Good', icon: 'account_balance', color: '#10b981', tip: '4 active accounts — healthy range.' }
];

var loanProducts = [
    { type: 'Home Loan', icon: 'home', color: '#1f1fff', rate: '8.40%', maxAmount: '₹5 Crore', tenure: 'Up to 30 years', fee: '0.5%', features: ['No prepayment penalty', 'Balance transfer available', 'Tax benefit u/s 80C & 24B', 'Doorstep service'] },
    { type: 'Personal Loan', icon: 'person', color: '#8b5cf6', rate: '10.99%', maxAmount: '₹25 Lakh', tenure: 'Up to 5 years', fee: '1%', features: ['Instant disbursal', 'No collateral', 'Flexible EMI', 'Pre-approved offers'] },
    { type: 'Car Loan', icon: 'directions_car', color: '#06b6d4', rate: '8.75%', maxAmount: '₹1 Crore', tenure: 'Up to 7 years', fee: '0.5%', features: ['100% on-road funding', 'New & used cars', 'Quick approval', '24-hr disbursal'] },
    { type: 'Education Loan', icon: 'school', color: '#f59e0b', rate: '9.50%', maxAmount: '₹1.5 Crore', tenure: 'Up to 15 years', fee: '0%', features: ['Covers all expenses', 'Moratorium period', 'Tax benefit u/s 80E', 'Global coverage'] }
];

var assets = [
    { category: 'Bank Balance', amount: 124530, icon: 'account_balance', color: '#10b981' },
    { category: 'Fixed Deposits', amount: 250000, icon: 'savings', color: '#10b981' },
    { category: 'Mutual Funds', amount: 380000, icon: 'trending_up', color: '#8b5cf6' },
    { category: 'Provident Fund', amount: 220000, icon: 'security', color: '#06b6d4' },
    { category: 'Gold', amount: 85000, icon: 'diamond', color: '#f59e0b' },
    { category: 'Vehicle', amount: 180000, icon: 'directions_car', color: '#64748b' }
];
var liabilities = [
    { category: 'Home Loan', amount: 220000, icon: 'home', color: '#ef4444' },
    { category: 'Car Loan', amount: 80000, icon: 'directions_car', color: '#ef4444' },
    { category: 'Credit Card Due', amount: 47130, icon: 'credit_card', color: '#ef4444' }
];

var controls = [
    { id: 'international', label: 'International Transactions', icon: 'public', desc: 'Online & POS outside India', default: true },
    { id: 'contactless', label: 'Contactless / NFC', icon: 'contactless', desc: 'Tap-to-pay at terminals', default: true },
    { id: 'online', label: 'Online Transactions', icon: 'shopping_cart', desc: 'E-commerce & subscriptions', default: true },
    { id: 'atm', label: 'ATM Withdrawals', icon: 'local_atm', desc: 'Cash withdrawals from ATMs', default: true },
    { id: 'pos', label: 'POS / Swipe', icon: 'point_of_sale', desc: 'Physical store card swipes', default: true },
    { id: 'recurring', label: 'Recurring Payments', icon: 'autorenew', desc: 'Standing instructions', default: true }
];

var navItems = [
    { route: 'dashboard', icon: 'dashboard', label: 'Dashboard', section: 'BANKING' },
    { route: 'card-control', icon: 'credit_card', label: 'Card Control', badge: 'NEW', section: null },
    { route: 'credit-score', icon: 'trending_up', label: 'Credit Score', badge: 'NEW', section: null },
    { route: 'transactions', icon: 'receipt_long', label: 'Transactions', section: null },
    { route: 'analytics', icon: 'analytics', label: 'Analytics', section: null },
    { route: 'goals', icon: 'savings', label: 'Goal Savings', badge: 'NEW', section: 'WEALTH' },
    { route: 'loans', icon: 'account_balance', label: 'Loan Center', badge: 'NEW', section: null },
    { route: 'net-worth', icon: 'donut_large', label: 'Net Worth', badge: 'NEW', section: null },
    { route: 'account', icon: 'person_add', label: 'Open Account', section: 'ACCOUNT' },
    { route: 'security', icon: 'lock', label: 'Security', section: null },
    { route: 'profile', icon: 'manage_accounts', label: 'Profile', section: null }
];

/* ═══════════════════ UTILITIES ═══════════════════ */
function formatINR(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function formatINR2(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function animateCounter(el, from, to, dur, pre, suf, dec) {
    pre = pre || ''; suf = suf || ''; dec = dec || 0; dur = dur || 1500;
    var start = performance.now();
    function tick(now) {
        var p = Math.min((now - start) / dur, 1); p = 1 - Math.pow(1 - p, 3);
        var v = from + p * (to - from);
        el.textContent = pre + v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function showToast(msg, type, dur) {
    type = type || 'success'; dur = dur || 3500;
    var icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    var c = document.getElementById('toastContainer');
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = '<span class="material-symbols-outlined">' + icons[type] + '</span><span>' + msg + '</span><button class="toast-close" onclick="this.parentElement.remove()"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>';
    c.appendChild(t);
    setTimeout(function () { t.classList.add('show') }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove() }, 400) }, dur);
    if (c.children.length > 4) c.firstElementChild.remove();
}

function openModal(opt) {
    var o = document.getElementById('modalOverlay'), m = document.getElementById('modal');
    m.className = 'modal modal-' + (opt.size || 'md');
    var h = '';
    if (opt.title) h += '<div class="modal-header"><h3 class="modal-title">' + opt.title + '</h3><button class="modal-close" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button></div>';
    h += '<div class="modal-body">' + opt.body + '</div>';
    if (opt.actions && opt.actions.length) { h += '<div class="modal-footer">'; opt.actions.forEach(function (a, i) { h += '<button class="btn btn-' + (a.type || 'ghost') + '" onclick="(' + a.onClick + ')()">' + a.label + '</button>' }); h += '</div>' }
    m.innerHTML = h; o.classList.add('active');
    if (opt.onOpen) setTimeout(opt.onOpen, 50);
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('active') }

function openDrawer(opt) {
    var o = document.getElementById('drawerOverlay'), d = document.getElementById('drawer');
    d.innerHTML = '<div class="drawer-header"><h3 style="font-size:18px;font-weight:700">' + (opt.title || '') + '</h3><button class="modal-close" onclick="closeDrawer()"><span class="material-symbols-outlined">close</span></button></div><div style="padding:24px;flex:1;overflow-y:auto">' + opt.body + '</div>';
    o.classList.add('active');
}
function closeDrawer() { document.getElementById('drawerOverlay').classList.remove('active') }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open') }

function calculateEMI(p, r, y) { var ri = r / 12 / 100, n = y * 12, e = p * ri * Math.pow(1 + ri, n) / (Math.pow(1 + ri, n) - 1); return { emi: Math.round(e), total: Math.round(e * n), interest: Math.round(e * n - p) } }

function drawSparkline(canvas, data, color) {
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var mn = Math.min.apply(null, data), mx = Math.max.apply(null, data), rng = mx - mn || 1;
    ctx.beginPath();
    data.forEach(function (v, i) { var x = i / (data.length - 1) * w, y = h - (v - mn) / rng * (h - 4) + 2; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, color + '40'); g.addColorStop(1, color + '00');
    ctx.fillStyle = g; ctx.fill();
}

function drawDonutChart(canvas, segments, cx, cy, r, lw) {
    var ctx = canvas.getContext('2d'), total = segments.reduce(function (s, sg) { return s + sg.value }, 0);
    var start = -Math.PI / 2;
    segments.forEach(function (sg, i) {
        var angle = sg.value / total * 2 * Math.PI;
        setTimeout(function () {
            ctx.beginPath(); ctx.arc(cx, cy, r, start, start + angle); ctx.strokeStyle = sg.color; ctx.lineWidth = lw || 30; ctx.lineCap = 'round'; ctx.stroke();
            start += angle;
        }, i * 200);
    });
}

function drawLineChart(canvas, data, labels, color) {
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, pad = 40;
    ctx.clearRect(0, 0, w, h);
    var mn = Math.min.apply(null, data) - 50, mx = Math.max.apply(null, data) + 50, rng = mx - mn;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) { var y = pad + i * (h - 2 * pad) / 4; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - 10, y); ctx.stroke(); ctx.fillStyle = '#94a3b8'; ctx.font = '11px DM Sans'; ctx.textAlign = 'right'; ctx.fillText(Math.round(mx - i * rng / 4), pad - 8, y + 4) }
    if (labels) labels.forEach(function (l, i) { var x = pad + i * (w - pad - 10) / (labels.length - 1); ctx.fillStyle = '#94a3b8'; ctx.font = '11px DM Sans'; ctx.textAlign = 'center'; ctx.fillText(l, x, h - 5) });
    ctx.beginPath();
    data.forEach(function (v, i) { var x = pad + i * (w - pad - 10) / (data.length - 1), y = pad + (mx - v) / rng * (h - 2 * pad); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) });
    ctx.strokeStyle = color || '#1f1fff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    var last = data.length - 1, lx = pad + last * (w - pad - 10) / last, ly = pad + (mx - data[last]) / rng * (h - 2 * pad);
    ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fillStyle = color || '#1f1fff'; ctx.fill();
    ctx.lineTo(w - 10, h - pad); ctx.lineTo(pad, h - pad); ctx.closePath();
    var g = ctx.createLinearGradient(0, pad, 0, h - pad); g.addColorStop(0, (color || '#1f1fff') + '30'); g.addColorStop(1, (color || '#1f1fff') + '00'); ctx.fillStyle = g; ctx.fill();
}

function launchConfetti(dur) {
    dur = dur || 3500; var cv = document.getElementById('confetti-canvas');
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    var ctx = cv.getContext('2d'), colors = ['#1f1fff', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#ffffff'];
    var particles = []; for (var i = 0; i < 150; i++)particles.push({ x: cv.width / 2, y: cv.height / 2, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4, r: Math.random() * 6 + 3, c: colors[Math.floor(Math.random() * colors.length)], rot: Math.random() * 360, rv: (Math.random() - 0.5) * 10, life: 1 });
    var start = Date.now();
    function frame() {
        var elapsed = Date.now() - start; if (elapsed > dur) { ctx.clearRect(0, 0, cv.width, cv.height); return }
        ctx.clearRect(0, 0, cv.width, cv.height);
        particles.forEach(function (p) {
            p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.vx *= 0.99; p.rot += p.rv; p.life = Math.max(0, 1 - elapsed / dur);
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180); ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); ctx.restore()
        });
        requestAnimationFrame(frame);
    }
    frame();
}

/* ═══════════════════ ROUTER ═══════════════════ */
var routes = { 'dashboard': renderDashboard, 'account': renderAccountOpening, 'credit-score': renderCreditScore, 'card-control': renderCardControl, 'loans': renderLoanCenter, 'goals': renderGoalSavings, 'net-worth': renderNetWorth, 'transactions': renderTransactions, 'analytics': renderAnalyticsPage, 'profile': renderProfile, 'security': renderSecurity };

function navigate(route) {
    AppState.route = route;
    document.querySelectorAll('.nav-item').forEach(function (el) { el.classList.toggle('active', el.dataset.route === route) });
    var c = document.getElementById('content');
    c.style.opacity = '0'; c.style.transform = 'translateY(8px)';
    setTimeout(function () { c.innerHTML = ''; if (routes[route]) routes[route](); c.style.transition = 'opacity 0.25s ease, transform 0.25s ease'; c.style.opacity = '1'; c.style.transform = 'translateY(0)' }, 150);
    document.getElementById('sidebar').classList.remove('open');
}

/* ═══════════════════ SIDEBAR BUILD ═══════════════════ */
function buildSidebar() {
    var h = '', lastSec = '';
    navItems.forEach(function (n) {
        if (n.section && n.section !== lastSec) { h += '<div class="nav-section">' + n.section + '</div>'; lastSec = n.section }
        h += '<div class="nav-item' + (AppState.route === n.route ? ' active' : '') + '" data-route="' + n.route + '" onclick="navigate(\'' + n.route + '\')">';
        h += '<span class="material-symbols-outlined">' + n.icon + '</span>' + n.label;
        if (n.badge) h += '<span class="nav-badge">' + n.badge + '</span>';
        h += '</div>';
    });
    document.getElementById('sidebarNav').innerHTML = h;
}

function openQuickActions() {
    openModal({
        title: 'Quick Actions', body: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<button class="btn btn-ghost btn-lg" onclick="closeModal();navigate(\'transactions\')" style="flex-direction:column;padding:24px;height:auto"><span class="material-symbols-outlined" style="font-size:32px;color:#1f1fff">send</span>Transfer</button>' +
            '<button class="btn btn-ghost btn-lg" onclick="closeModal();navigate(\'goals\')" style="flex-direction:column;padding:24px;height:auto"><span class="material-symbols-outlined" style="font-size:32px;color:#10b981">savings</span>New Goal</button>' +
            '<button class="btn btn-ghost btn-lg" onclick="closeModal();navigate(\'loans\')" style="flex-direction:column;padding:24px;height:auto"><span class="material-symbols-outlined" style="font-size:32px;color:#8b5cf6">account_balance</span>FD Book</button>' +
            '<button class="btn btn-ghost btn-lg" onclick="closeModal();navigate(\'card-control\')" style="flex-direction:column;padding:24px;height:auto"><span class="material-symbols-outlined" style="font-size:32px;color:#ef4444">report</span>Dispute</button>' +
            '</div>', size: 'sm'
    });
}

/* ═══════════════════ LIVE DATA ═══════════════════ */
var liveAnalytics = null;

async function loadLiveData() {
    var u = AppState.user;
    if (!u || !u.accountNo) return;
    var accNo = u.accountNo;
    try {
        var [txRes, anRes] = await Promise.allSettled([
            fetch('/LaceBank/api/transactions?accountNo=' + accNo),
            fetch('/LaceBank/api/analytics?accountNo=' + accNo)
        ]);
        // Process transactions
        if (txRes.status === 'fulfilled') {
            var txData = await txRes.value.json();
            if (txData.success && txData.transactions) {
                dummyTransactions = txData.transactions.map(function (t) {
                    var isOut = t.direction === 'outgoing';
                    var icon = 'receipt';
                    var color = '#64748b';
                    var category = (t.txType || '').toLowerCase();
                    if (t.txType === 'TRANSFER') { icon = 'send'; color = isOut ? '#ef4444' : '#10b981'; category = 'transfer'; }
                    else if (t.txType === 'DEPOSIT') { icon = 'add_circle'; color = '#10b981'; category = 'income'; }
                    else if (t.txType === 'WITHDRAWAL') { icon = 'payments'; color = '#ef4444'; category = 'payment'; }
                    return {
                        id: 'TXN' + t.id,
                        merchant: t.remark || t.txType,
                        category: category,
                        type: isOut ? 'debit' : 'credit',
                        amount: parseFloat(t.amount) || 0,
                        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
                        icon: icon,
                        color: color
                    };
                });
            }
        }
        // Process analytics
        if (anRes.status === 'fulfilled') {
            var anData = await anRes.value.json();
            if (anData.success) {
                liveAnalytics = anData;
            }
        }
    } catch (e) {
        console.error('loadLiveData error:', e);
    }
}

/* ═══════════════════ DASHBOARD ═══════════════════ */
function renderDashboard() {
    var c = document.getElementById('content'), u = AppState.user;
    if (!u) { showAuthPage('login'); return; }
    // Compute stats from live analytics or transactions
    var monthSpent = 0, monthEarned = 0;
    if (liveAnalytics) {
        monthSpent = parseFloat(liveAnalytics.expenses) || 0;
        monthEarned = parseFloat(liveAnalytics.income) || 0;
    } else {
        var now = new Date();
        dummyTransactions.forEach(function (t) {
            if (t.type === 'debit') monthSpent += t.amount;
            if (t.type === 'credit') monthEarned += t.amount;
        });
    }
    var hasTxns = dummyTransactions.length > 0;
    var txnHTML = hasTxns ? buildTransactionList(dummyTransactions.slice(0, 6)) :
        '<div style="text-align:center;padding:40px 20px;color:var(--text-faint)">' +
        '<span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:12px;color:var(--border)">receipt_long</span>' +
        '<div style="font:500 14px var(--font-display);color:var(--text-muted);margin-bottom:4px">No transactions yet</div>' +
        '<div style="font:400 13px var(--font-body)">Your account was just created. Transactions will appear here.</div></div>';
    // Spending breakdown from analytics
    var spendBreakdownHTML = '';
    var donutSegments = [];
    if (liveAnalytics && liveAnalytics.spendingByType && liveAnalytics.spendingByType.length > 0) {
        var spColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#64748b', '#ef4444', '#f59e0b', '#10b981'];
        var totalSp = liveAnalytics.spendingByType.reduce(function (s, c) { return s + (parseFloat(c.amount) || 0); }, 0);
        liveAnalytics.spendingByType.forEach(function (cat, i) {
            var pct = totalSp > 0 ? Math.round((parseFloat(cat.amount) / totalSp) * 100) : 0;
            var col = spColors[i % spColors.length];
            spendBreakdownHTML += '<div style="display:flex;align-items:center;gap:8px;font-size:12px"><div style="width:10px;height:10px;border-radius:50%;background:' + col + '"></div>' + cat.type + ' ' + pct + '%</div>';
            donutSegments.push({ value: parseFloat(cat.amount) || 1, color: col });
        });
    } else {
        spendBreakdownHTML = '<div style="text-align:center;color:var(--text-faint);font-size:13px;padding:20px">No spending data yet</div>';
    }
    var csLabel = u.creditScore >= 750 ? 'EXCELLENT' : u.creditScore >= 700 ? 'GOOD' : u.creditScore >= 650 ? 'FAIR' : 'POOR';
    var csBadge = u.creditScore >= 700 ? 'badge-green' : u.creditScore >= 650 ? 'badge-blue' : 'badge-red';
    c.innerHTML =
        '<div class="balance-hero" id="balanceHero">' +
        '<div class="balance-hero-top"><span class="balance-chip">' + u.accountType + '</span><span class="visa-logo">VISA</span></div>' +
        '<div class="balance-account">' + u.accountNo + '  ·  ' + u.cardType + '</div>' +
        '<div class="balance-label">Available Balance</div>' +
        '<div class="balance-amount" id="balAmt">₹ 0</div>' +
        '<div class="balance-updated">Last updated: Just now 🟢</div>' +
        '<div class="balance-actions">' +
        '<button class="balance-action" onclick="showToast(\'Transfer feature coming soon\',\'info\')"><span class="material-symbols-outlined" style="font-size:16px">send</span> Transfer</button>' +
        '<button class="balance-action" onclick="navigate(\'transactions\')"><span class="material-symbols-outlined" style="font-size:16px">receipt_long</span> Statement</button>' +
        '<button class="balance-action" onclick="navigate(\'analytics\')"><span class="material-symbols-outlined" style="font-size:16px">analytics</span> Analytics</button>' +
        '<button class="balance-action" onclick="openQuickActions()"><span class="material-symbols-outlined" style="font-size:16px">more_horiz</span> More</button>' +
        '</div></div>' +
        '<div class="stats-grid">' +
        buildStatCard('MONTHLY SPENT', monthSpent > 0 ? formatINR(monthSpent) : '₹0', hasTxns ? 'This month' : 'No spending yet', 'trend-down', [0, 0, 0, 0, 0, monthSpent / 1000], ['#ef4444']) +
        buildStatCard('MONTHLY EARNED', monthEarned > 0 ? formatINR(monthEarned) : '₹0', hasTxns ? 'This month' : 'No income yet', 'trend-up', [0, 0, 0, 0, 0, monthEarned / 1000], ['#10b981']) +
        buildStatCard('CREDIT SCORE', u.creditScore + ' / 900', csLabel, 'trend-up', u.creditScoreHistory.length > 1 ? u.creditScoreHistory : [u.creditScore, u.creditScore], ['#1f1fff']) +
        buildStatCard('NET WORTH', u.balance > 0 ? formatINR(u.balance) : '₹0', u.balance > 0 ? '↑ Growing' : 'Start saving!', 'trend-up', [0, 0, 0, 0, 0, u.balance / 1000], ['#8b5cf6']) +
        '</div>' +
        '<div class="dash-grid"><div>' +
        '<div class="card"><div class="card-header"><span class="card-title">📋 Recent Transactions</span><a href="#" onclick="navigate(\'transactions\');return false" style="font-size:13px;color:var(--ace-blue);font-weight:600;text-decoration:none">View All →</a></div><div class="card-body" style="padding:0 24px">' + txnHTML + '</div></div></div>' +
        '<div>' +
        '<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">📊 Spending Breakdown</span></div><div class="card-body" style="text-align:center"><canvas id="spendDonut" width="220" height="220"></canvas>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;text-align:left">' +
        spendBreakdownHTML +
        '</div></div></div>' +
        '<div class="card"><div class="card-header"><span class="card-title">📈 Credit Score</span></div><div class="card-body" style="text-align:center">' +
        '<div style="font-family:var(--font-display);font-size:40px;font-weight:800;color:var(--ace-blue)">' + u.creditScore + '</div>' +
        '<span class="badge ' + csBadge + '" style="margin:8px 0">' + csLabel + '</span>' +
        (u.creditScore < 750 ? '<p style="font-size:13px;color:var(--text-muted);margin-top:8px">Maintain good habits to improve your score</p>' : '<p style="font-size:13px;color:var(--text-muted);margin-top:8px">Excellent credit! Keep it up 🎉</p>') +
        '<button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="navigate(\'credit-score\')">View Full Report →</button>' +
        '</div></div></div></div>';
    if (u.balance > 0) animateCounter(document.getElementById('balAmt'), 0, u.balance, 1500, '₹ ');
    else { var be = document.getElementById('balAmt'); if (be) be.textContent = '₹ 0.00'; }
    // Update sidebar/topbar with real user data
    var avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) avatarEl.textContent = u.initials || 'U';
    var sideNameEl = document.getElementById('sidebar-uname');
    if (sideNameEl) sideNameEl.textContent = u.name;
    var sideAccEl = document.getElementById('sidebar-uacc');
    if (sideAccEl) sideAccEl.textContent = u.accountNo;
    setTimeout(function () {
        document.querySelectorAll('.sparkline').forEach(function (cv) {
            var d = cv.dataset.values.split(',').map(Number), col = cv.dataset.color;
            drawSparkline(cv, d, col);
        });
        var donut = document.getElementById('spendDonut');
        if (donut && donutSegments.length > 0) {
            drawDonutChart(donut, donutSegments, 110, 110, 80, 28);
        } else if (donut && hasTxns) {
            drawDonutChart(donut, [{ value: 35, color: '#6366f1' }, { value: 20, color: '#8b5cf6' }, { value: 12, color: '#06b6d4' }, { value: 18, color: '#64748b' }, { value: 15, color: '#ef4444' }], 110, 110, 80, 28);
        }
    }, 100);
    var hero = document.getElementById('balanceHero');
    if (hero) hero.addEventListener('mousemove', function (e) { var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; hero.style.transform = 'perspective(1000px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg)'; });
    if (hero) hero.addEventListener('mouseleave', function () { hero.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)' });
}

function buildStatCard(label, value, trend, trendClass, sparkData, sparkColor) {
    return '<div class="card stat-card"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div><div class="stat-trend ' + trendClass + '">' + trend + '</div><canvas class="sparkline" width="80" height="36" data-values="' + sparkData.join(',') + '" data-color="' + (sparkColor || '#1f1fff') + '"></canvas></div>';
}

function buildTransactionList(txns) {
    return txns.map(function (t) {
        return '<div class="txn-row" onclick="openTxnDetail(\'' + t.id + '\')">' +
            '<div class="txn-icon" style="background:' + t.color + '"><span class="material-symbols-outlined">' + t.icon + '</span></div>' +
            '<div class="txn-info"><div class="txn-merchant">' + t.merchant + '</div><div class="txn-meta"><span class="badge badge-' + (t.type === 'credit' ? 'green' : 'blue') + '" style="margin-right:6px">' + t.category + '</span>' + t.date + '</div></div>' +
            '<div class="txn-amount ' + (t.type === 'debit' ? 'txn-debit' : 'txn-credit') + '">' + (t.type === 'debit' ? '−' : '+') + '₹' + t.amount.toLocaleString('en-IN') + '</div>' +
            '</div>';
    }).join('');
}

function openTxnDetail(id) {
    var t = dummyTransactions.find(function (x) { return x.id === id });
    if (!t) return;
    openDrawer({
        title: 'Transaction Details', body:
            '<div style="text-align:center;padding:20px 0 30px"><div class="txn-icon" style="background:' + t.color + ';width:56px;height:56px;margin:0 auto 12px;border-radius:16px"><span class="material-symbols-outlined" style="font-size:28px">' + t.icon + '</span></div>' +
            '<div style="font-size:20px;font-weight:700">' + t.merchant + '</div>' +
            '<div style="font-family:var(--font-display);font-size:28px;font-weight:800;margin-top:8px;color:' + (t.type === 'debit' ? 'var(--ace-red)' : 'var(--ace-green)') + '">' + (t.type === 'debit' ? '−' : '+') + ' ₹' + t.amount.toLocaleString('en-IN') + '</div></div>' +
            '<div style="background:var(--bg-body);border-radius:12px;padding:16px">' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Reference</span><span style="font-family:var(--font-mono);font-size:13px">' + t.id + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Date</span><span style="font-size:13px">' + t.date + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Category</span><span class="badge badge-blue">' + t.category + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:var(--text-muted);font-size:13px">Status</span><span class="badge badge-green">Completed</span></div>' +
            '</div>' +
            '<button class="btn btn-ghost" style="width:100%;margin-top:16px" onclick="closeDrawer();showToast(\'Issue reported for ' + t.id + '\',\'info\')"><span class="material-symbols-outlined" style="font-size:16px">flag</span> Report Issue</button>'
    });
}

/* ═══════════════════ CREDIT SCORE ═══════════════════ */
function renderCreditScore() {
    var c = document.getElementById('content'), s = AppState.user.creditScore;
    c.innerHTML = '<h2 style="margin-bottom:24px">📈 Credit Score Hub</h2>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">' +
        '<div class="card gauge-wrap"><svg viewBox="0 0 300 180" width="280" height="170"><path d="M 30 160 A 120 120 0 0 1 270 160" fill="none" stroke="#e2e8f0" stroke-width="18" stroke-linecap="round"/>' +
        '<path d="M 30 160 A 120 120 0 0 1 270 160" fill="none" stroke="url(#scoreGrad)" stroke-width="18" stroke-linecap="round" stroke-dasharray="377" stroke-dashoffset="' + Math.round(377 * (1 - (s - 300) / 600)) + '" id="scoreArc" style="transition:stroke-dashoffset 1.5s ease-out"/>' +
        '<defs><linearGradient id="scoreGrad"><stop offset="0%" stop-color="#ef4444"/><stop offset="40%" stop-color="#f59e0b"/><stop offset="70%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs>' +
        '<text x="150" y="95" text-anchor="middle" font-size="11" fill="#94a3b8">300</text><text x="25" y="168" font-size="11" fill="#94a3b8">Poor</text><text x="275" y="168" text-anchor="end" font-size="11" fill="#94a3b8">Excellent</text></svg>' +
        '<div class="gauge-score" id="scoreNum">300</div><span class="badge badge-green" style="margin-top:8px">GOOD — Top 23%</span>' +
        '<p style="font-size:13px;color:var(--text-muted);margin-top:12px;text-align:center">Score updated 23 Feb 2025</p></div>' +
        '<div class="card"><div class="card-header"><span class="card-title">Score Factors</span></div>' +
        scoreFactors.map(function (f) { return '<div class="factor-card" onclick="this.classList.toggle(\'open\')"><div class="factor-header"><span class="material-symbols-outlined" style="font-size:20px;color:' + f.color + '">' + f.icon + '</span><span class="factor-name">' + f.name + '</span><span class="badge badge-' + (f.impact === 'High' ? 'red' : f.impact === 'Medium' ? 'gold' : 'green') + '">' + f.impact + ' Impact</span><span style="font-size:13px;font-weight:700;color:' + f.color + '">' + f.score + '%</span></div><div class="factor-bar"><div class="factor-fill" style="width:' + f.score + '%;background:' + f.color + '"></div></div><div class="factor-detail">💡 ' + f.tip + '</div></div>' }).join('') +
        '</div>' +
        '</div>' +
        '<div class="card" style="margin-top:24px"><div class="card-header"><span class="card-title">Score History (12 Months)</span></div><div class="card-body" style="text-align:center"><canvas id="scoreChart" width="700" height="220"></canvas></div></div>' +
        '<h3 style="margin:24px 0 16px">💡 Smart Recommendations</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">' +
        '<div class="card card-body"><span class="badge badge-red" style="margin-bottom:8px">High Impact</span><p style="font-size:14px;font-weight:600;margin-bottom:8px">Reduce credit utilization from 34% to under 30%</p><p style="font-size:12px;color:var(--text-muted)">Expected boost: +15 to +25 points</p><button class="btn btn-primary btn-sm" style="margin-top:12px">Take Action →</button></div>' +
        '<div class="card card-body"><span class="badge badge-gold" style="margin-bottom:8px">Medium Impact</span><p style="font-size:14px;font-weight:600;margin-bottom:8px">Reactivate your HDFC credit card</p><p style="font-size:12px;color:var(--text-muted)">Expected boost: +8 to +12 points</p><button class="btn btn-ghost btn-sm" style="margin-top:12px">Remind Me</button></div>' +
        '<div class="card card-body"><span class="badge badge-green" style="margin-bottom:8px">Low Impact</span><p style="font-size:14px;font-weight:600;margin-bottom:8px">Setup auto-pay for HDFC EMI</p><p style="font-size:12px;color:var(--text-muted)">Expected boost: +5 points</p><button class="btn btn-ghost btn-sm" style="margin-top:12px">Setup Auto-pay →</button></div>' +
        '</div>';
    animateCounter(document.getElementById('scoreNum'), 300, s, 1500);
    setTimeout(function () { var cv = document.getElementById('scoreChart'); if (cv) drawLineChart(cv, AppState.user.creditScoreHistory, ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'], '#1f1fff') }, 200);
}

/* ═══════════════════ CARD CONTROL ═══════════════════ */
function renderCardControl() {
    var c = document.getElementById('content'), f = AppState.cardFrozen;
    c.innerHTML = '<h2 style="margin-bottom:24px">💳 Card Control Center</h2>' +
        // Top row: Card + Card Status side by side
        '<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;margin-bottom:24px">' +
        '<div style="flex:0 0 auto">' +
        '<div class="card-3d-wrap" id="card3dWrap"><div class="card-3d" id="card3d" onclick="this.classList.toggle(\'flipped\')">' +
        '<div class="card-3d-face card-3d-front">' + (f ? '<div class="frozen-overlay"><div class="frozen-stamp">FROZEN</div></div>' : '') +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><span style="font-size:13px;font-weight:600;opacity:0.8">ACE BANK</span><span class="visa-logo">VISA</span></div>' +
        '<div class="card-chip"></div>' +
        '<div style="font-family:var(--font-mono);font-size:18px;letter-spacing:4px;margin-bottom:20px">****  ****  ****  4521</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:14px;font-weight:600">ARJUN MEHTA</div><div style="font-size:11px;opacity:0.6">PREMIUM SAVINGS</div></div><div style="text-align:right"><div style="font-size:11px;opacity:0.5">EXPIRES</div><div style="font-size:14px;font-family:var(--font-mono)">08/28</div></div></div>' +
        '</div>' +
        '<div class="card-3d-face card-3d-back"><div class="mag-stripe"></div><div class="sig-strip"><span style="font-style:italic;font-size:13px">Arjun Mehta</span><span style="font-family:var(--font-mono);font-weight:700;letter-spacing:2px">***</span></div><div style="margin-top:16px;text-align:right;font-size:11px;opacity:0.5">Customer Service: 1800-XXX-XXXX</div></div>' +
        '</div></div>' +
        '<p style="text-align:center;font-size:12px;color:var(--text-faint);margin-top:8px">Click card to flip</p></div>' +
        // Card status panel
        '<div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:16px">' +
        '<div class="card card-body"><div style="display:flex;align-items:center;justify-content:space-between"><div><h4>🔒 Card Status</h4><p style="font-size:13px;color:var(--text-muted);margin-top:4px">' + (f ? 'Your card is frozen. No transactions allowed.' : 'Your card is active and ready to use.') + '</p></div>' +
        '<button class="toggle' + (f ? '' : ' on') + '" id="freezeToggle" onclick="toggleFreeze()"></button></div></div>' +
        '<div class="card card-body" style="display:flex;align-items:center;gap:16px"><span class="material-symbols-outlined" style="font-size:28px;color:var(--ace-blue)">credit_card</span><div><div style="font-weight:700">ACE VISA Platinum</div><div style="font-size:12px;color:var(--text-muted)">Active since Aug 2020 · Expires 08/28</div></div></div>' +
        '<div class="card card-body" style="display:flex;align-items:center;gap:16px"><span class="material-symbols-outlined" style="font-size:28px;color:var(--ace-green)">verified_user</span><div><div style="font-weight:700">Security Features</div><div style="font-size:12px;color:var(--text-muted)">3D Secure · SMS alerts · Real-time monitoring</div></div></div>' +
        '</div></div>' +
        // Transaction Controls
        '<div class="card" style="margin-bottom:24px"><div class="card-header"><span class="card-title">Transaction Controls</span><span class="badge badge-' + (f ? 'red' : 'green') + '">' + (f ? 'Card Frozen' : 'All Active') + '</span></div><div class="card-body"><div class="controls-grid">' +
        controls.map(function (ct) { var on = AppState.cardLimits[ct.id]; return '<div class="control-item"><div class="control-icon" style="background:var(--ace-blue-light)"><span class="material-symbols-outlined" style="color:var(--ace-blue)">' + ct.icon + '</span></div><div class="control-text"><h4>' + ct.label + '</h4><p>' + ct.desc + '</p></div><button class="toggle' + (on ? ' on' : '') + '"' + (f ? ' disabled' : '') + ' onclick="toggleControl(\'' + ct.id + '\',this)"></button></div>' }).join('') +
        '</div></div></div>' +
        // Spending Limits
        '<div class="card"><div class="card-header"><span class="card-title">Spending Limits</span></div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px">' +
        '<div>' + buildLimitSlider('ATM Daily', 'atm', AppState.cardLimits.dailyLimit, 100000) + '</div>' +
        '<div>' + buildLimitSlider('Online Per Txn', 'online', AppState.cardLimits.onlineLimit, 100000) + '</div>' +
        '<div>' + buildLimitSlider('International', 'intl', AppState.cardLimits.intlLimit, 200000) + '</div>' +
        '</div><button class="btn btn-primary" style="margin-top:16px" onclick="showToast(\'Limits saved successfully\',\'success\')"><span class="material-symbols-outlined" style="font-size:16px">check</span> Save Limits</button>' +
        '</div></div>';
}
function toggleFreeze() { AppState.cardFrozen = !AppState.cardFrozen; showToast(AppState.cardFrozen ? '🔒 Card frozen' : '✅ Card activated', AppState.cardFrozen ? 'warning' : 'success'); renderCardControl() }
function toggleControl(id, btn) { if (AppState.cardFrozen) return; AppState.cardLimits[id] = !AppState.cardLimits[id]; btn.classList.toggle('on'); showToast(id + ' ' + (AppState.cardLimits[id] ? 'enabled' : 'disabled'), 'info') }
function buildLimitSlider(label, id, val, max) { return '<div style="margin-bottom:24px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:600;font-size:14px">' + label + ' Limit</span><span style="font-family:var(--font-mono);font-weight:600;color:var(--ace-blue)" id="lim_' + id + '">' + formatINR(val) + '</span></div><div class="range-wrap"><input type="range" min="0" max="' + max + '" value="' + val + '" step="1000" oninput="document.getElementById(\'lim_' + id + '\').textContent=formatINR(Number(this.value))"></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-faint)"><span>₹0</span><span>' + formatINR(max) + '</span></div></div>' }

/* ═══════════════════ LOAN CENTER ═══════════════════ */
function renderLoanCenter() {
    var c = document.getElementById('content');
    c.innerHTML = '<h2 style="margin-bottom:24px">🏦 Loan Center</h2>' +
        '<div class="loans-grid" style="margin-bottom:32px">' + loanProducts.map(function (l) { return '<div class="card loan-card"><div class="card-body"><div class="loan-icon-wrap" style="background:' + l.color + '15"><span class="material-symbols-outlined" style="color:' + l.color + ';font-size:28px">' + l.icon + '</span></div><h3 style="margin-bottom:4px">' + l.type + '</h3><div class="loan-rate" style="color:' + l.color + '">' + l.rate + ' <span style="font-size:13px;font-weight:400;color:var(--text-muted)">p.a.</span></div><div class="loan-max">Up to ' + l.maxAmount + ' &middot; ' + l.tenure + '</div><ul class="loan-features">' + l.features.map(function (f) { return '<li>' + f + '</li>' }).join('') + '</ul><div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="showToast(\'Application started for ' + l.type + '\',\'info\')">Apply Now</button><button class="btn btn-ghost btn-sm" onclick="showToast(\'Checking eligibility...\',\'info\')">Check Eligibility</button></div></div></div>' }).join('') + '</div>' +
        '<div class="card"><div class="card-header"><span class="card-title">📐 EMI Calculator</span></div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">' +
        '<div>' + buildLimitSlider('Loan Amount', 'emiAmt', 1000000, 5000000) + '<div style="margin-bottom:24px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:600;font-size:14px">Interest Rate</span><span style="font-family:var(--font-mono);font-weight:600;color:var(--ace-blue)" id="lim_emiRate">10.99%</span></div><div class="range-wrap"><input type="range" min="6" max="20" value="10.99" step="0.01" id="rateSlider" oninput="document.getElementById(\'lim_emiRate\').textContent=this.value+\'%\';updateEMI()"></div></div>' +
        '<div style="margin-bottom:24px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:600;font-size:14px">Tenure</span><span style="font-family:var(--font-mono);font-weight:600;color:var(--ace-blue)" id="lim_emiTen">5 years</span></div><div class="range-wrap"><input type="range" min="1" max="30" value="5" id="tenSlider" oninput="document.getElementById(\'lim_emiTen\').textContent=this.value+\' years\';updateEMI()"></div></div></div>' +
        '<div class="emi-result" id="emiResult"><div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">Monthly EMI</div><div class="emi-value" id="emiVal">₹21,742</div><div class="emi-detail"><div><div style="font-size:12px;color:var(--text-muted)">Total Interest</div><div style="font-family:var(--font-display);font-size:18px;font-weight:700" id="emiInt">₹3,04,533</div></div><div><div style="font-size:12px;color:var(--text-muted)">Total Payment</div><div style="font-family:var(--font-display);font-size:18px;font-weight:700" id="emiTotal">₹13,04,533</div></div></div></div>' +
        '</div></div></div>';
    updateEMI();
}
function updateEMI() {
    var a = document.querySelector('[oninput*="emiAmt"]'); if (!a) return;
    var p = Number(a.value), r = Number(document.getElementById('rateSlider').value), t = Number(document.getElementById('tenSlider').value);
    var res = calculateEMI(p, r, t);
    document.getElementById('emiVal').textContent = formatINR(res.emi);
    document.getElementById('emiInt').textContent = formatINR(res.interest);
    document.getElementById('emiTotal').textContent = formatINR(res.total);
}

/* ═══════════════════ GOAL SAVINGS ═══════════════════ */
function renderGoalSavings() {
    var c = document.getElementById('content'), g = AppState.goals, totalSaved = g.reduce(function (s, x) { return s + x.saved }, 0), totalTarget = g.reduce(function (s, x) { return s + x.target }, 0);
    c.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px"><h2>🎯 Goal Savings</h2><button class="btn btn-primary" onclick="openNewGoalModal()"><span class="material-symbols-outlined" style="font-size:16px">add</span> New Goal</button></div>' +
        '<div class="card" style="margin-bottom:24px"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span style="font-size:14px;color:var(--text-muted)">Total Saved: <strong style="color:var(--ace-green)">' + formatINR(totalSaved) + '</strong> of ' + formatINR(totalTarget) + '</span><span style="font-weight:700;color:var(--ace-blue)">' + Math.round(totalSaved / totalTarget * 100) + '%</span></div><div class="progress"><div class="progress-fill" style="width:' + Math.round(totalSaved / totalTarget * 100) + '%;background:var(--ace-blue)"></div></div></div></div>' +
        '<div class="goals-grid">' + g.map(function (gl, i) { var pct = Math.round(gl.saved / gl.target * 100); var status = pct >= 100 ? '🎉 Completed' : pct >= 50 ? '✓ On Track' : '⚠️ Behind'; return '<div class="card goal-card" style="animation:fadeUp 0.4s ease ' + (i * 80) + 'ms both"><div style="display:flex;justify-content:space-between"><span class="goal-emoji">' + gl.emoji + '</span><span class="badge badge-' + (pct >= 100 ? 'green' : pct >= 50 ? 'blue' : 'gold') + '">' + status + '</span></div><div class="goal-name">' + gl.name + '</div><div class="goal-amounts">' + formatINR(gl.saved) + ' saved of ' + formatINR(gl.target) + '</div><div class="goal-progress"><div class="progress" style="height:10px"><div class="progress-fill" style="width:' + pct + '%;background:' + gl.color + '"></div></div></div><div class="goal-meta"><span>Need ' + formatINR(gl.monthlyNeeded) + '/mo</span><span>' + gl.deadline + '</span></div><div class="goal-actions"><button class="btn btn-primary btn-sm" onclick="addMoneyToGoal(' + gl.id + ')"><span class="material-symbols-outlined" style="font-size:14px">add</span> Add Money</button><button class="btn btn-ghost btn-sm" onclick="showToast(\'Goal details for ' + gl.name + '\',\'info\')">Details</button></div></div>' }).join('') + '</div>';
}
function addMoneyToGoal(id) {
    openModal({
        title: 'Add Money to Goal', body: '<div class="form-group"><label class="form-label">Amount (₹)</label><input type="number" class="form-input" id="goalAmt" placeholder="Enter amount" value="5000"></div>', size: 'sm',
        actions: [{ label: 'Add Money', type: 'primary', onClick: function () { var amt = Number(document.getElementById('goalAmt').value); var g = AppState.goals.find(function (x) { return x.id === id }); if (g && amt > 0) { g.saved += amt; closeModal(); showToast('₹' + amt.toLocaleString('en-IN') + ' added to ' + g.name, 'success'); renderGoalSavings() } }.toString() }]
    });
}
function openNewGoalModal() {
    openModal({
        title: 'Create New Goal', body: '<div class="form-group"><label class="form-label">Goal Name</label><input type="text" class="form-input" id="newGoalName" placeholder="e.g. New Laptop"></div><div class="form-row"><div class="form-group"><label class="form-label">Target Amount</label><input type="number" class="form-input" id="newGoalAmt" placeholder="₹50,000"></div><div class="form-group"><label class="form-label">Target Date</label><input type="date" class="form-input" id="newGoalDate"></div></div>', size: 'md',
        actions: [{ label: 'Create Goal', type: 'primary', onClick: function () { var n = document.getElementById('newGoalName').value, a = Number(document.getElementById('newGoalAmt').value); if (n && a > 0) { AppState.goals.push({ id: Date.now(), name: n, emoji: '🎯', target: a, saved: 0, deadline: document.getElementById('newGoalDate').value || '2025-12-31', color: '#' + Math.floor(Math.random() * 16777215).toString(16), monthlyNeeded: Math.round(a / 6) }); closeModal(); showToast('Goal "' + n + '" created!', 'success'); launchConfetti(2000); renderGoalSavings() } }.toString() }]
    });
}

/* ═══════════════════ NET WORTH ═══════════════════ */
function renderNetWorth() {
    var c = document.getElementById('content'), ta = assets.reduce(function (s, a) { return s + a.amount }, 0), tl = liabilities.reduce(function (s, l) { return s + l.amount }, 0), nw = ta - tl;
    c.innerHTML = '<h2 style="margin-bottom:24px">📊 Net Worth Tracker</h2>' +
        '<div class="card nw-hero"><div class="nw-amount" id="nwAmt">₹0</div><p style="color:var(--ace-green);font-weight:600;margin-top:8px">↑ +3.2% this month (+₹27,800)</p><p style="font-size:12px;color:var(--text-faint);margin-top:4px">Last updated: 23 Feb 2025</p></div>' +
        '<div class="nw-split">' +
        '<div class="card nw-column"><div class="nw-column-header" style="background:var(--ace-green)">Assets — ' + formatINR(ta) + '</div>' + assets.map(function (a) { return '<div class="nw-row"><div class="nw-row-icon" style="background:' + a.color + '15"><span class="material-symbols-outlined" style="color:' + a.color + '">' + a.icon + '</span></div><span class="nw-row-name">' + a.category + '</span><span class="nw-row-amount" style="color:var(--ace-green)">' + formatINR(a.amount) + '</span></div>' }).join('') + '</div>' +
        '<div class="card nw-column"><div class="nw-column-header" style="background:var(--ace-red)">Liabilities — ' + formatINR(tl) + '</div>' + liabilities.map(function (l) { return '<div class="nw-row"><div class="nw-row-icon" style="background:' + l.color + '15"><span class="material-symbols-outlined" style="color:' + l.color + '">' + l.icon + '</span></div><span class="nw-row-name">' + l.category + '</span><span class="nw-row-amount" style="color:var(--ace-red)">' + formatINR(l.amount) + '</span></div>' }).join('') + '</div>' +
        '</div>' +
        '<div class="card" style="margin-top:24px"><div class="card-header"><span class="card-title">Net Worth Trend</span></div><div class="card-body" style="text-align:center"><canvas id="nwChart" width="700" height="220"></canvas></div></div>' +
        '<div class="card" style="margin-top:24px"><div class="card-header"><span class="card-title">💡 Insights</span></div><div class="card-body"><div style="display:flex;flex-direction:column;gap:12px">' +
        '<div style="padding:12px 16px;background:var(--ace-blue-light);border-radius:12px;font-size:13px;border-left:3px solid var(--ace-blue)">Your FD allocation (20%) is above recommended 15% — consider diversifying to equities.</div>' +
        '<div style="padding:12px 16px;background:var(--ace-green-light);border-radius:12px;font-size:13px;border-left:3px solid var(--ace-green)">Emergency fund covers 5.2 months of expenses — above target of 6 months. Great job!</div>' +
        '<div style="padding:12px 16px;background:#fef3c7;border-radius:12px;font-size:13px;border-left:3px solid var(--ace-gold)">Debt-to-Asset ratio: 28% — Healthy ✓</div>' +
        '</div></div></div>';
    animateCounter(document.getElementById('nwAmt'), 0, nw, 1500, '₹');
    setTimeout(function () { var cv = document.getElementById('nwChart'); if (cv) drawLineChart(cv, [750000, 780000, 810000, 830000, 845000, 855000, 860000, 870000, 878000, 885000, 892000, 892400], ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'], '#10b981') }, 200);
}

/* ═══════════════════ TRANSACTIONS ═══════════════════ */
function renderTransactions() {
    var c = document.getElementById('content');
    // Compute summary from dummyTransactions (now filled with real data)
    var totalCredits = 0, totalDebits = 0;
    dummyTransactions.forEach(function (t) {
        if (t.type === 'credit') totalCredits += t.amount;
        else totalDebits += t.amount;
    });
    var balance = AppState.user ? AppState.user.balance : 0;
    c.innerHTML = '<h2 style="margin-bottom:24px">📋 Transactions</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px">' +
        '<div class="card card-body" style="text-align:center"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Current Balance</div><div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-top:4px">' + formatINR(balance) + '</div></div>' +
        '<div class="card card-body" style="text-align:center"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Total Credits</div><div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--ace-green);margin-top:4px">+' + formatINR(totalCredits) + '</div></div>' +
        '<div class="card card-body" style="text-align:center"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Total Debits</div><div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--ace-red);margin-top:4px">-' + formatINR(totalDebits) + '</div></div>' +
        '<div class="card card-body" style="text-align:center"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Total Transactions</div><div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-top:4px">' + dummyTransactions.length + '</div></div>' +
        '</div>' +
        '<div class="filter-bar"><span class="material-symbols-outlined" style="color:var(--text-faint)">filter_list</span>' +
        ['All', 'Credit', 'Debit', 'Transfer', 'Income', 'Payment'].map(function (f) { return '<button class="filter-chip' + (f === 'All' ? ' active' : '') + '" onclick="filterTxns(\'' + f.toLowerCase() + '\',this)">' + f + '</button>' }).join('') +
        '</div>' +
        '<div class="card"><table class="txn-table"><thead><tr><th>Date</th><th>Description</th><th>Ref No</th><th>Category</th><th>Debit</th><th>Credit</th></tr></thead><tbody id="txnTableBody">' +
        dummyTransactions.map(function (t) { return '<tr onclick="openTxnDetail(\'' + t.id + '\')" style="cursor:pointer"><td>' + t.date + '</td><td style="font-weight:600">' + t.merchant + '</td><td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">' + t.id + '</td><td><span class="badge badge-blue">' + t.category + '</span></td><td style="color:var(--ace-red)">' + (t.type === 'debit' ? formatINR(t.amount) : '') + '</td><td style="color:var(--ace-green)">' + (t.type === 'credit' ? formatINR(t.amount) : '') + '</td></tr>' }).join('') +
        '</tbody></table></div>' +
        '<div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn-ghost btn-sm" onclick="showToast(\'PDF statement downloading...\',\'info\')"><span class="material-symbols-outlined" style="font-size:14px">picture_as_pdf</span> PDF</button><button class="btn btn-ghost btn-sm" onclick="exportCSV()"><span class="material-symbols-outlined" style="font-size:14px">table_view</span> CSV</button><button class="btn btn-ghost btn-sm" onclick="showToast(\'Statement emailed\',\'success\')"><span class="material-symbols-outlined" style="font-size:14px">email</span> Email</button></div>';
}
function filterTxns(cat, btn) {
    document.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active') }); btn.classList.add('active');
    var rows = document.querySelectorAll('#txnTableBody tr');
    rows.forEach(function (r) { r.style.display = (cat === 'all' || r.innerHTML.indexOf(cat) > -1) ? '' : 'none' });
}
function exportCSV() {
    var csv = 'Date,Description,Reference,Category,Debit,Credit\n';
    dummyTransactions.forEach(function (t) { csv += t.date + ',' + t.merchant + ',' + t.id + ',' + t.category + ',' + (t.type === 'debit' ? t.amount : '') + ',' + (t.type === 'credit' ? t.amount : '') + '\n' });
    var blob = new Blob([csv], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ace_bank_statement.csv'; a.click();
    showToast('CSV exported successfully', 'success');
}

/* ═══════════════════ ANALYTICS PAGE ═══════════════════ */
function renderAnalyticsPage() {
    var c = document.getElementById('content'), u = AppState.user;
    if (!u) { showAuthPage('login'); return; }
    // If no live data yet, fetch it
    if (!liveAnalytics) {
        c.innerHTML = '<h2 style="margin-bottom:24px">📊 Analytics</h2><div style="text-align:center;padding:60px"><div style="font-size:16px;color:var(--text-muted)">Loading analytics...</div></div>';
        loadLiveData().then(function () { renderAnalyticsPage(); });
        return;
    }
    var an = liveAnalytics;
    var income = parseFloat(an.income) || 0;
    var expenses = parseFloat(an.expenses) || 0;
    var savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    var maxVal = Math.max(income, expenses, 1);
    // Monthly spending chart data
    var monthlyData = an.monthlySpending || [];
    var barHTML = '';
    if (monthlyData.length > 0) {
        var maxBar = Math.max.apply(null, monthlyData.map(function (m) { return parseFloat(m.amount) || 0; }));
        monthlyData.forEach(function (m) {
            var amt = parseFloat(m.amount) || 0;
            var pct = maxBar > 0 ? Math.round((amt / maxBar) * 100) : 0;
            var formatted = amt >= 1000 ? '₹' + (amt / 1000).toFixed(1) + 'k' : '₹' + amt;
            barHTML += '<div style="display:flex;flex-direction:column;align-items:center;flex:1">' +
                '<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px">' + formatted + '</div>' +
                '<div style="width:100%;max-width:40px;height:140px;background:var(--bg-body);border-radius:8px 8px 0 0;position:relative;overflow:hidden;display:flex;align-items:flex-end">' +
                '<div style="width:100%;height:' + Math.max(pct, 3) + '%;background:linear-gradient(180deg,var(--ace-blue),#6366f1);border-radius:8px 8px 0 0;transition:height 0.6s ease"></div></div>' +
                '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;font-weight:500">' + m.label + '</div></div>';
        });
    } else {
        barHTML = '<div style="text-align:center;padding:40px;color:var(--text-faint)">No spending data available</div>';
    }
    // Spending by type
    var spendByType = an.spendingByType || [];
    var totalSpend = spendByType.reduce(function (s, c) { return s + (parseFloat(c.amount) || 0); }, 0);
    var spColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#64748b', '#10b981'];
    var catHTML = '';
    if (spendByType.length > 0) {
        spendByType.forEach(function (cat, i) {
            var amt = parseFloat(cat.amount) || 0;
            var pct = totalSpend > 0 ? Math.round((amt / totalSpend) * 100) : 0;
            var col = spColors[i % spColors.length];
            catHTML += '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">' +
                '<div style="width:12px;height:12px;border-radius:50%;background:' + col + ';flex-shrink:0"></div>' +
                '<div style="flex:1;font-weight:600;font-size:14px">' + cat.type + '</div>' +
                '<div style="font-family:var(--font-display);font-weight:700;font-size:14px">' + formatINR(amt) + '</div>' +
                '<div style="font-size:12px;color:var(--text-muted);min-width:40px;text-align:right">' + pct + '%</div></div>';
        });
    } else {
        catHTML = '<div style="text-align:center;padding:30px;color:var(--text-faint)"><span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px">analytics</span>No spending data yet this month</div>';
    }
    c.innerHTML = '<h2 style="margin-bottom:24px">📊 Analytics</h2>' +
        '<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px">' +
        // Monthly Spending Chart
        '<div class="card"><div class="card-header"><span class="card-title">Monthly Spending</span><span class="badge badge-blue">' + (an.currentYear || new Date().getFullYear()) + '</span></div>' +
        '<div class="card-body" style="display:flex;align-items:flex-end;gap:8px;padding:16px 24px 24px">' + barHTML + '</div></div>' +
        // Income vs Expenses
        '<div class="card"><div class="card-header"><span class="card-title">Income vs Expenses</span></div><div class="card-body">' +
        '<div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:600">Income</span><span style="font-family:var(--font-display);font-weight:700;color:var(--ace-green)">' + formatINR(income) + '</span></div>' +
        '<div style="height:8px;background:var(--bg-body);border-radius:99px;overflow:hidden"><div style="height:100%;width:' + Math.round((income / maxVal) * 100) + '%;background:var(--ace-green);border-radius:99px;transition:width 0.6s ease"></div></div></div>' +
        '<div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:600">Expenses</span><span style="font-family:var(--font-display);font-weight:700;color:var(--ace-red)">' + formatINR(expenses) + '</span></div>' +
        '<div style="height:8px;background:var(--bg-body);border-radius:99px;overflow:hidden"><div style="height:100%;width:' + Math.round((expenses / maxVal) * 100) + '%;background:var(--ace-red);border-radius:99px;transition:width 0.6s ease"></div></div></div>' +
        '<div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border)"><span style="font-weight:600">Savings Rate</span><span style="font-family:var(--font-display);font-weight:700;color:' + (savingsRate >= 0 ? 'var(--ace-green)' : 'var(--ace-red)') + '">' + savingsRate + '%</span></div>' +
        '</div></div></div>' +
        // Spending Breakdown
        '<div class="card"><div class="card-header"><span class="card-title">Spending Breakdown</span></div><div class="card-body">' + catHTML + '</div></div>';
}

/* ═══════════════════ ACCOUNT OPENING ═══════════════════ */
function renderAccountOpening() {
    var c = document.getElementById('content'), step = AppState.formStep;
    var stepNames = ['Personal Details', 'Contact Info', 'KYC Details', 'Address', 'Financial Info', 'Nominee', 'Preferences', 'Review & Confirm'];
    c.innerHTML = '<h2 style="margin-bottom:24px">📋 Open New Account</h2>' +
        '<div class="step-dots">' + stepNames.map(function (s, i) {
            var cls = i + 1 < step ? 'completed' : i + 1 === step ? 'current' : 'pending'; return (i > 0 ? '<div class="step-line' + (i < step ? ' completed' : '') + '"></div>' : '') +
                '<div class="step-dot ' + cls + '">' + (i + 1 < step ? '✓' : (i + 1)) + '</div>'
        }).join('') + '</div>' +
        '<div class="step-info">Step ' + step + ' of ' + stepNames.length + ' — ' + stepNames[step - 1] + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 2.5fr;gap:24px">' +
        '<div><div class="card card-body" style="position:sticky;top:96px"><h4 style="margin-bottom:12px">Why ACE Bank?</h4><ul style="list-style:none;font-size:13px;color:var(--text-body);line-height:2">' +
        '<li>✅ Zero minimum balance</li><li>✅ Instant account opening</li><li>✅ 5X reward points</li><li>✅ Free NEFT/RTGS/IMPS</li><li>✅ Dedicated RM (Premium)</li></ul>' +
        '<div style="margin-top:16px;padding:12px;border-radius:8px;background:var(--ace-blue-light);font-size:12px;text-align:center"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">lock</span> 256-bit SSL Encrypted</div></div></div>' +
        '<div class="card card-body" id="stepContent">' + renderStep(step) + '</div>' +
        '</div>';
}

function renderStep(step) {
    if (step === 1) return '<div class="form-row-3"><div class="form-group"><label class="form-label">First Name *</label><input type="text" class="form-input" placeholder="Arjun"></div><div class="form-group"><label class="form-label">Middle Name</label><input type="text" class="form-input"></div><div class="form-group"><label class="form-label">Last Name *</label><input type="text" class="form-input" placeholder="Mehta"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">Date of Birth *</label><input type="date" class="form-input"></div><div class="form-group"><label class="form-label">Marital Status *</label><select class="form-input"><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></div></div>' +
        '<div class="form-group"><label class="form-label">Gender *</label><div class="radio-pills"><button class="radio-pill selected" onclick="selectPill(this)">Male</button><button class="radio-pill" onclick="selectPill(this)">Female</button><button class="radio-pill" onclick="selectPill(this)">Non-Binary</button><button class="radio-pill" onclick="selectPill(this)">Prefer not to say</button></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">Father\'s Name *</label><input type="text" class="form-input"></div><div class="form-group"><label class="form-label">Mother\'s Name *</label><input type="text" class="form-input"></div></div>' + stepNav();
    if (step === 2) return '<div class="form-group"><label class="form-label">Mobile Number *</label><div style="display:flex;gap:8px"><div style="padding:12px 16px;border:1.5px solid var(--border);border-radius:12px;background:var(--bg-body);font-size:14px;white-space:nowrap">🇮🇳 +91</div><input type="tel" class="form-input" placeholder="9876543210" maxlength="10" style="flex:1"></div></div>' +
        '<div class="form-group"><label class="form-label">Email Address *</label><input type="email" class="form-input" placeholder="arjun@example.com"></div>' + stepNav();
    if (step === 3) return '<div class="form-row"><div class="form-group"><label class="form-label">PAN Number *</label><input type="text" class="form-input" placeholder="ABCDE1234F" style="text-transform:uppercase" maxlength="10"></div><div class="form-group"><label class="form-label">Aadhaar Number *</label><input type="text" class="form-input" placeholder="XXXX-XXXX-1234" maxlength="14"></div></div>' + stepNav();
    if (step === 4) return '<div class="form-group"><label class="form-label">Address Line 1 *</label><input type="text" class="form-input" placeholder="House/Flat No, Building Name"></div><div class="form-row-3"><div class="form-group"><label class="form-label">City *</label><input type="text" class="form-input" placeholder="Mumbai"></div><div class="form-group"><label class="form-label">State *</label><select class="form-input"><option value="">Select State</option><option>Maharashtra</option><option>Karnataka</option><option>Delhi</option><option>Tamil Nadu</option></select></div><div class="form-group"><label class="form-label">PIN Code *</label><input type="text" class="form-input" placeholder="400001" maxlength="6"></div></div>' + stepNav();
    if (step === 5) return '<div class="form-group"><label class="form-label">Occupation Type *</label><div class="radio-pills"><button class="radio-pill selected" onclick="selectPill(this)">Salaried</button><button class="radio-pill" onclick="selectPill(this)">Self-Employed</button><button class="radio-pill" onclick="selectPill(this)">Business</button><button class="radio-pill" onclick="selectPill(this)">Student</button></div></div>' +
        '<div class="form-group"><label class="form-label">Annual Income *</label><div class="radio-pills"><button class="radio-pill" onclick="selectPill(this)">&lt; ₹2L</button><button class="radio-pill" onclick="selectPill(this)">₹2-5L</button><button class="radio-pill selected" onclick="selectPill(this)">₹5-10L</button><button class="radio-pill" onclick="selectPill(this)">₹10-25L</button><button class="radio-pill" onclick="selectPill(this)">₹25-50L</button><button class="radio-pill" onclick="selectPill(this)">₹50L+</button></div></div>' + stepNav();
    if (step === 6) return '<div class="form-row"><div class="form-group"><label class="form-label">Nominee Name *</label><input type="text" class="form-input" placeholder="Full Name"></div><div class="form-group"><label class="form-label">Relationship *</label><select class="form-input"><option>Spouse</option><option>Father</option><option>Mother</option><option>Son</option><option>Daughter</option></select></div></div><div class="form-group"><label class="form-label">Nominee DOB *</label><input type="date" class="form-input"></div>' + stepNav();
    if (step === 7) return '<div class="form-group"><label class="form-label">Account Type *</label></div><div class="account-type-cards">' +
        '<div class="account-type-card" onclick="selectAccountType(this)"><h4>Regular Savings</h4><p style="font-size:13px;color:var(--text-muted)">₹0 min balance</p><p style="font-size:12px;margin-top:8px">Basic debit card &middot; 1X rewards</p></div>' +
        '<div class="account-type-card recommended selected" onclick="selectAccountType(this)"><h4>★ Premium Savings</h4><p style="font-size:13px;color:var(--text-muted)">₹10,000 min balance</p><p style="font-size:12px;margin-top:8px">VISA Platinum &middot; 5X rewards &middot; Lounge access</p></div>' +
        '<div class="account-type-card" onclick="selectAccountType(this)"><h4>Current Account</h4><p style="font-size:13px;color:var(--text-muted)">₹5,000 min balance</p><p style="font-size:12px;margin-top:8px">Business cheques &middot; OD facility</p></div></div>' + stepNav();
    if (step === 8) return '<div style="text-align:center;padding:20px"><h3>📋 Application Summary</h3><p style="color:var(--text-muted);margin:8px 0 24px">Review your details before submitting</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:left">' +
        summaryItem('Account Type', 'Premium Savings') + summaryItem('Name', 'Arjun Mehta') + summaryItem('Mobile', '+91 98765XXXXX') + summaryItem('Email', 'arjun@example.com') + summaryItem('PAN', 'ABCDE1234F') + summaryItem('City', 'Mumbai, Maharashtra') + summaryItem('Occupation', 'Salaried') + summaryItem('Income', '₹5-10L p.a.') +
        '</div>' +
        '<div style="margin-top:24px;padding:16px;border-radius:12px;background:#fef3c7;font-size:13px">⏱ Account opens in 24–48 hours after verification</div>' +
        '<button class="btn btn-success btn-lg" style="width:100%;margin-top:24px" onclick="submitApplication()"><span class="material-symbols-outlined">check_circle</span> Confirm & Submit</button></div>';
    return '';
}
function summaryItem(k, v) { return '<div style="padding:12px;background:var(--bg-body);border-radius:8px"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">' + k + '</div><div style="font-weight:600">' + v + '</div></div>' }
function stepNav() { return '<div style="display:flex;justify-content:space-between;margin-top:24px">' + (AppState.formStep > 1 ? '<button class="btn btn-ghost" onclick="AppState.formStep--;renderAccountOpening()"><span class="material-symbols-outlined" style="font-size:16px">arrow_back</span> Previous</button>' : '<span></span>') + '<button class="btn btn-primary" onclick="AppState.formStep++;renderAccountOpening()">Next <span class="material-symbols-outlined" style="font-size:16px">arrow_forward</span></button></div>' }
function selectPill(el) { el.parentElement.querySelectorAll('.radio-pill').forEach(function (p) { p.classList.remove('selected') }); el.classList.add('selected') }
function selectAccountType(el) { el.parentElement.querySelectorAll('.account-type-card').forEach(function (c) { c.classList.remove('selected') }); el.classList.add('selected') }
function submitApplication() {
    openModal({ title: '', body: '<div style="text-align:center;padding:20px"><div style="font-size:48px;margin-bottom:16px">⏳</div><h3>Processing your application...</h3><p style="color:var(--text-muted);margin-top:8px">Please wait</p></div>', size: 'sm' });
    setTimeout(function () {
        closeModal();
        document.getElementById('content').innerHTML = '<div style="text-align:center;padding:60px 20px">' +
            '<div style="width:80px;height:80px;border-radius:50%;background:var(--ace-green-light);display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><span class="material-symbols-outlined" style="font-size:40px;color:var(--ace-green)">check_circle</span></div>' +
            '<h2>🎉 Application Submitted!</h2>' +
            '<p style="color:var(--text-muted);margin:12px 0">Ref: ACE-2025-' + Math.random().toString(36).substr(2, 8).toUpperCase() + '</p>' +
            '<p style="color:var(--text-body);max-width:480px;margin:0 auto 24px">Your account will be activated within 24-48 hours. Video KYC link sent to your mobile.</p>' +
            '<div style="display:flex;gap:12px;justify-content:center"><button class="btn btn-primary" onclick="AppState.formStep=1;navigate(\'dashboard\')">Go to Dashboard</button></div></div>';
        launchConfetti(3500);
    }, 2500);
}

/* ═══════════════════ PROFILE ═══════════════════ */
function renderProfile() {
    var c = document.getElementById('content'), u = AppState.user;
    if (!u) return;
    var created = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
    var maskedMobile = u.mobile ? '+91 ' + u.mobile.slice(0, 4) + ' XXXXXX' : 'N/A';
    c.innerHTML = '<div class="card profile-header"><div class="profile-avatar-lg">' + (u.initials || 'U') + '</div><div><h2>' + u.name + '</h2><p style="color:var(--text-muted)">' + u.accountType + ' · ' + u.tier + ' Tier 🏆</p><p style="color:var(--text-faint);font-size:13px;margin-top:4px">Customer ID: ' + u.customerId + '</p></div><button class="btn btn-ghost" onclick="showToast(\'Edit profile coming soon\',\'info\')"><span class="material-symbols-outlined" style="font-size:16px">edit</span> Edit</button></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">' +
        '<div class="card card-body"><h4 style="margin-bottom:16px">Personal Information</h4>' +
        profileRow('Full Name', u.name) + profileRow('Email', u.email || 'N/A') + profileRow('Phone', maskedMobile) + profileRow('DOB', u.dob || 'N/A') + '</div>' +
        '<div class="card card-body"><h4 style="margin-bottom:16px">Account Details</h4>' +
        profileRow('Account No', u.accountNo) + profileRow('Type', u.accountType) + profileRow('Branch', u.branch || 'Main Branch') + profileRow('IFSC', u.ifsc || 'ACE0001234') + profileRow('Opened', created) + profileRow('Status', '<span class="badge badge-green">' + (u.status || 'active') + '</span>') + '</div>' +
        '</div>' +
        '<div class="card card-body" style="margin-top:24px;text-align:center">' +
        '<button class="btn btn-danger" onclick="handleLogout()"><span class="material-symbols-outlined" style="font-size:16px">logout</span> Sign Out</button></div>';
}
function profileRow(k, v) { return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px"><span style="color:var(--text-muted)">' + k + '</span><span style="font-weight:500">' + v + '</span></div>' }

/* ═══════════════════ SECURITY ═══════════════════ */
function renderSecurity() {
    var c = document.getElementById('content');
    c.innerHTML = '<h2 style="margin-bottom:24px">🔒 Security Center</h2>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">' +
        '<div class="card card-body" style="text-align:center"><span class="material-symbols-outlined" style="font-size:40px;color:var(--ace-blue);margin-bottom:8px">password</span><h4>Change Password</h4><p style="font-size:13px;color:var(--text-muted);margin:8px 0">Last changed 45 days ago</p><button class="btn btn-ghost btn-sm" onclick="showToast(\'Password change dialog\',\'info\')">Update Password</button></div>' +
        '<div class="card card-body" style="text-align:center"><span class="material-symbols-outlined" style="font-size:40px;color:var(--ace-purple);margin-bottom:8px">pin</span><h4>Transaction PIN</h4><p style="font-size:13px;color:var(--text-muted);margin:8px 0">6-digit secure PIN</p><button class="btn btn-ghost btn-sm" onclick="showToast(\'PIN change dialog\',\'info\')">Change PIN</button></div>' +
        '</div>' +
        '<div class="card"><div class="card-header"><span class="card-title">Active Sessions</span><button class="btn btn-danger btn-sm" onclick="showToast(\'All other sessions logged out\',\'success\')">Logout All Others</button></div>' +
        AppState.sessions.map(function (s) { return '<div class="session-card"><div class="session-icon"><span class="material-symbols-outlined">' + (s.device.indexOf('App') > -1 ? 'phone_iphone' : 'computer') + '</span></div><div class="session-info"><div class="session-device">' + s.device + (s.current ? ' <span class="badge badge-green">Current</span>' : '') + '</div><div class="session-meta">' + s.location + ' &middot; ' + s.ip + ' &middot; ' + s.lastActive + '</div></div>' + (s.current ? '' : '<button class="btn btn-ghost btn-sm" onclick="showToast(\'Session terminated\',\'success\');this.closest(\'.session-card\').remove()">Logout</button>') + '</div>' }).join('') +
        '</div>';
}

/* ═══════════════════ INIT ═══════════════════ */
window.addEventListener('scroll', function () { var tb = document.getElementById('topbar'); if (tb) tb.classList.toggle('compact', window.scrollY > 20); });

function initApp() {
    if (DB.isLoggedIn()) {
        var account = DB.getLoggedInAccount();
        if (account) {
            AppState.user = buildUserState(account);
            dummyTransactions = [];
            if (account.goals && account.goals.length) AppState.goals = account.goals;
            showApp(); buildSidebar();
            loadLiveData().then(function () { navigate('dashboard'); });
            return;
        }
    }
    showAuthPage('login');
}

initApp();
