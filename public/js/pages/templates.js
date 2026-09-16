// Templates Page
let allTemplates = [];

async function loadTemplates() {
    const res = await API.templates.list();
    if (!res?.success) return;
    allTemplates = res.data || [];
    renderTemplatesGrid(allTemplates);
}

function renderTemplatesGrid(templates) {
    const grid = document.getElementById('templatesGrid');
    if (!templates.length) {
        grid.innerHTML = `<div style="grid-column:1/-1" class="empty-state">
            <div class="empty-icon">📝</div>
            <h3 class="empty-title">No Templates Yet</h3>
            <p class="empty-desc">Create your first WhatsApp message template</p>
            <button class="btn btn-primary" style="margin-top:16px" onclick="openModal('createTemplateModal')">+ Create Template</button>
        </div>`;
        return;
    }

    const catColors = { MARKETING: 'purple', UTILITY: 'info', AUTHENTICATION: 'warning' };

    grid.innerHTML = templates.map(t => {
        const buttons = JSON.parse(t.buttons || '[]');
        return `<div class="template-card">
            <div class="template-card-header">
                <div class="template-card-name">${t.name}</div>
                <span class="status-badge status-${t.status}">${t.status}</span>
            </div>
            <div class="template-card-meta">
                <span class="badge badge-${catColors[t.category] || 'info'}">${t.category}</span>
                <span class="badge badge-info">🌐 ${t.language || 'en_US'}</span>
                ${t.header_type ? `<span class="badge badge-purple">📎 ${t.header_type}</span>` : ''}
            </div>
            <div class="template-card-body">${t.body || '(empty body)'}</div>
            <div class="template-card-footer">
                <span>${formatDate(t.created_at)}</span>
                <div style="display:flex;align-items:center;gap:8px">
                    ${buttons.length ? `<span>${buttons.length} button${buttons.length > 1 ? 's' : ''}</span>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.uuid}')">🗑</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function filterTemplates() {
    const q = document.getElementById('templateSearch')?.value?.toLowerCase() || '';
    const cat = document.getElementById('templateCategoryFilter')?.value || '';
    const filtered = allTemplates.filter(t =>
        (!q || t.name.toLowerCase().includes(q) || (t.body || '').toLowerCase().includes(q)) &&
        (!cat || t.category === cat)
    );
    renderTemplatesGrid(filtered);
}

function updateTemplatePreview() {
    const header = document.getElementById('tplHeaderContent')?.value || '';
    const body = document.getElementById('tplBody')?.value || '';
    const footer = document.getElementById('tplFooter')?.value || '';

    const prevHeader = document.getElementById('previewHeader');
    const prevBody = document.getElementById('previewBody');
    const prevFooter = document.getElementById('previewFooter');

    if (header) { prevHeader.textContent = header; prevHeader.style.display = 'block'; }
    else prevHeader.style.display = 'none';

    prevBody.textContent = body || 'Template body will appear here...';

    if (footer) { prevFooter.textContent = footer; prevFooter.style.display = 'block'; }
    else prevFooter.style.display = 'none';
}

async function createTemplate() {
    const name = document.getElementById('tplName').value.trim().toLowerCase().replace(/\s+/g, '_');
    const body = document.getElementById('tplBody').value.trim();
    if (!name) return showToast('Template name is required', 'error');
    if (!body) return showToast('Template body is required', 'error');
    if (!/^[a-z0-9_]+$/.test(name)) return showToast('Template name must be lowercase letters, numbers, and underscores only', 'error');

    const res = await API.templates.create({
        name, body,
        category: document.getElementById('tplCategory').value,
        language: document.getElementById('tplLanguage').value,
        header_type: document.getElementById('tplHeaderType').value || null,
        header_content: document.getElementById('tplHeaderContent').value || null,
        footer: document.getElementById('tplFooter').value || null,
        buttons: []
    });

    if (res?.success) {
        showToast(`Template "${name}" created! ${res.whatsapp?.success ? 'Submitted to WhatsApp for approval.' : 'Saved locally.'}`, 'success');
        closeModal('createTemplateModal');
        document.getElementById('tplName').value = '';
        document.getElementById('tplBody').value = '';
        document.getElementById('tplFooter').value = '';
        await loadTemplates();
    } else {
        showToast(res?.error || 'Failed to create template', 'error');
    }
}

async function deleteTemplate(uuid) {
    if (!confirm('Delete this template?')) return;
    const res = await API.templates.delete(uuid);
    if (res?.success) { showToast('Template deleted', 'info'); await loadTemplates(); }
    else showToast(res?.error || 'Failed to delete', 'error');
}

async function syncTemplates() {
    showToast('Syncing templates from WhatsApp...', 'info');
    const res = await API.templates.sync();
    if (res?.success) {
        showToast(`Synced ${res.synced} templates from WhatsApp`, 'success');
        await loadTemplates();
    } else {
        showToast(res?.error || 'Sync failed. Please check your WhatsApp API configuration.', 'error');
    }
}
