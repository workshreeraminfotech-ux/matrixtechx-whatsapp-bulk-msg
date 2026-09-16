// MatrixTechX - Main App Controller

// Auth guard
(function() {
    if (!localStorage.getItem('mtx_token')) window.location.href = '/';
})();

// ===== TOAST =====
function showToast(msg, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// ===== MODAL =====
function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); });
});
// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
});

// ===== NAVIGATION =====
let currentPage = 'dashboard';

function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.remove('hidden');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    currentPage = page;
    // Load page data
    loadPageData(page);

    // Update page title
    document.title = `MatrixTechX - ${page.charAt(0).toUpperCase() + page.slice(1)}`;
}

async function loadPageData(page) {
    switch(page) {
        case 'dashboard': await loadDashboard(); break;
        case 'campaigns': await loadCampaigns(); break;
        case 'templates': await loadTemplates(); break;
        case 'contacts': await loadContacts(); break;
        case 'groups': await loadGroups(); break;
        case 'inbox': await loadInbox(); break;
        case 'analytics': await loadAnalytics(); break;
        case 'settings': await loadSettings(); break;
        case 'widget': await loadWidget(); break;
        case 'api-docs': renderApiDocs(); break;
    }
}

// Nav click handlers
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
});

// ===== INIT APP =====
async function initApp() {
    const data = await API.auth.me();
    if (!data?.success) { window.location.href = '/'; return; }

    const user = data.data;
    // Set user info in sidebar
    document.getElementById('sidebarUserName').textContent = user.name || 'User';
    document.getElementById('sidebarUserRole').textContent = user.role === 'admin' ? 'Admin' : 'User';
    const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('sidebarAvatar').textContent = initials;
    document.getElementById('topbarAvatar').textContent = initials;

    // Load dashboard
    navigateTo('dashboard');
}

// ===== AVATAR COLORS =====
const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16'];
function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function makeAvatar(name, size = 36, cls = '') {
    const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const color = getAvatarColor(name || '?');
    return `<div class="avatar ${cls}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.35)}px;background:${color};flex-shrink:0">${initials}</div>`;
}

// ===== HELPERS =====
function formatDate(d) {
    if (!d) return 'Never';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatNumber(n) {
    if (!n && n !== 0) return '-';
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return n.toString();
}

function truncate(str, len = 80) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
}

// Chart defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#1a2d4a';
Chart.defaults.font.family = 'Inter';

// AI Toggle
document.getElementById('aiToggle').addEventListener('change', function() {
    document.getElementById('aiStatus').textContent = this.checked ? '● Active' : '● Inactive';
    document.getElementById('aiStatus').style.color = this.checked ? '#10b981' : '';
    showToast(this.checked ? 'AI Assistant activated' : 'AI Assistant deactivated', 'info');
});

// Topbar avatar → settings
document.getElementById('topbarAvatar').addEventListener('click', () => navigateTo('settings'));

// Init
initApp();
