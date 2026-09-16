// Contacts Page
let allContacts = [], contactPage = 1, contactLimit = 50;

async function loadContacts() {
    const res = await API.contacts.list(`page=${contactPage}&limit=${contactLimit}`);
    if (!res?.success) return;
    allContacts = res.data || [];
    renderContactsTable(allContacts);
    renderContactsPagination(res.total, res.page);
    loadContactGroupFilter();
}

async function loadContactGroupFilter() {
    const res = await API.groups.list();
    if (!res?.success) return;
    const sel = document.getElementById('contactGroupFilter');
    sel.innerHTML = '<option value="">All Groups</option>' +
        res.data.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

function renderContactsTable(contacts) {
    const tbody = document.getElementById('contactsTable');
    if (!contacts.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">
            <div style="font-size:32px;margin-bottom:10px">👥</div>
            No contacts found. <a href="#" onclick="openModal('addContactModal')" style="color:var(--accent)">Add your first contact →</a>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = contacts.map(c => {
        const groups = c.group_names ? c.group_names.split(',').map(g => `<span class="badge badge-info" style="margin:1px">${g}</span>`).join('') : '<span class="text-muted" style="font-size:11px">No group</span>';
        const statusColor = c.status === 'ACTIVE' ? 'success' : 'danger';
        return `<tr>
            <td><input type="checkbox" class="contact-cb" value="${c.id}"></td>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    ${makeAvatar(c.name, 30)}
                    <div>
                        <div style="font-weight:600;font-size:13px">${c.name}</div>
                        <div style="font-size:11px;color:var(--text-muted)">${c.email || ''}</div>
                    </div>
                </div>
            </td>
            <td style="font-family:monospace;font-size:12px">${c.phone}</td>
            <td>${groups}</td>
            <td><span class="badge badge-${statusColor}">${c.status}</span></td>
            <td><span class="badge badge-info">${c.source || 'manual'}</span></td>
            <td style="font-size:11px;color:var(--text-muted)">${c.last_contact ? formatDate(c.last_contact) : 'Never'}</td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-sm btn-danger" onclick="deleteContact('${c.uuid}')">🗑</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderContactsPagination(total, page) {
    const totalPages = Math.ceil(total / contactLimit);
    document.getElementById('contactsPagination').textContent = `Showing ${allContacts.length} of ${total} contacts`;

    const pagesDiv = document.getElementById('contactsPages');
    if (totalPages <= 1) { pagesDiv.innerHTML = ''; return; }

    let pages = '';
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        pages += `<button class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-secondary'}" onclick="goContactPage(${i})">${i}</button>`;
    }
    pagesDiv.innerHTML = pages;
}

function goContactPage(p) {
    contactPage = p;
    loadContacts();
}

function filterContacts(q) {
    if (!q) { loadContacts(); return; }
    const filtered = allContacts.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.phone.includes(q) ||
        (c.email || '').toLowerCase().includes(q.toLowerCase())
    );
    renderContactsTable(filtered);
}

function toggleSelectAll(cb) {
    document.querySelectorAll('.contact-cb').forEach(c => c.checked = cb.checked);
}

async function addContact() {
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const email = document.getElementById('contactEmail').value.trim();

    if (!name) return showToast('Name is required', 'error');
    if (!phone) return showToast('Phone number is required', 'error');

    const res = await API.contacts.create({ name, phone, email });
    if (res?.success) {
        showToast(`Contact "${name}" added successfully!`, 'success');
        closeModal('addContactModal');
        document.getElementById('contactName').value = '';
        document.getElementById('contactPhone').value = '';
        document.getElementById('contactEmail').value = '';
        await loadContacts();
    } else {
        showToast(res?.error || 'Failed to add contact', 'error');
    }
}

async function deleteContact(uuid) {
    if (!confirm('Delete this contact?')) return;
    const res = await API.contacts.delete(uuid);
    if (res?.success) { showToast('Contact deleted', 'info'); await loadContacts(); }
    else showToast(res?.error || 'Failed to delete', 'error');
}

async function exportContacts() {
    const res = await API.contacts.export();
    if (!res?.success) return showToast('Export failed', 'error');
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `matrixtechx_contacts_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Contacts exported!', 'success');
}

async function importContacts() {
    const raw = document.getElementById('importJsonData').value.trim();
    if (!raw) return showToast('Paste JSON data first', 'error');
    let contacts;
    try { contacts = JSON.parse(raw); } catch(e) { return showToast('Invalid JSON format', 'error'); }
    if (!Array.isArray(contacts)) return showToast('JSON must be an array', 'error');

    const res = await API.contacts.import({ contacts });
    if (res?.success) {
        showToast(`Imported ${res.imported} contacts! (${res.skipped} skipped)`, 'success');
        closeModal('importContactsModal');
        document.getElementById('importJsonData').value = '';
        await loadContacts();
    } else {
        showToast(res?.error || 'Import failed', 'error');
    }
}

function downloadSampleExcel() {
    const sample = [
        { name: 'John Doe', phone: '+919876543210', email: 'john@example.com' },
        { name: 'Jane Smith', phone: '+919876543211', email: 'jane@example.com' }
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'sample_contacts.json'; a.click();
    URL.revokeObjectURL(url);
}
