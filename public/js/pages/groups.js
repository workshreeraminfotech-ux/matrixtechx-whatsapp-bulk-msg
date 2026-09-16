// Groups Page
async function loadGroups() {
    const res = await API.groups.list();
    if (!res?.success) return;
    renderGroupsGrid(res.data || []);
}

function renderGroupsGrid(groups) {
    const grid = document.getElementById('groupsGrid');
    if (!groups.length) {
        grid.innerHTML = `<div style="grid-column:1/-1" class="empty-state">
            <div class="empty-icon">👥</div>
            <h3 class="empty-title">No Groups Yet</h3>
            <p class="empty-desc">Create groups to organize your contacts for targeted campaigns</p>
            <button class="btn btn-primary" style="margin-top:16px" onclick="openModal('createGroupModal')">+ Create Group</button>
        </div>`;
        return;
    }

    const groupIcons = ['👥', '🏢', '⭐', '🎯', '💼', '🔥', '💎', '🌟'];
    grid.innerHTML = groups.map((g, i) => `
        <div class="group-card">
            <div class="group-card-icon">${groupIcons[i % groupIcons.length]}</div>
            <div class="group-card-name">${g.name}</div>
            <div class="group-card-desc">${g.description || 'No description'}</div>
            <div class="group-card-count">👤 ${g.contact_count || 0} contacts</div>
            <div class="group-card-actions">
                <button class="btn btn-sm btn-secondary w-full" onclick="showGroupContacts('${g.uuid}','${g.name}')">View Contacts</button>
                <button class="btn btn-sm btn-danger" onclick="deleteGroup('${g.uuid}')">🗑</button>
            </div>
        </div>
    `).join('');
}

async function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const desc = document.getElementById('groupDesc').value.trim();
    if (!name) return showToast('Group name is required', 'error');

    const res = await API.groups.create({ name, description: desc });
    if (res?.success) {
        showToast(`Group "${name}" created!`, 'success');
        closeModal('createGroupModal');
        document.getElementById('groupName').value = '';
        document.getElementById('groupDesc').value = '';
        await loadGroups();
    } else {
        showToast(res?.error || 'Failed to create group', 'error');
    }
}

async function deleteGroup(uuid) {
    if (!confirm('Delete this group? Contacts will not be deleted.')) return;
    const res = await API.groups.delete(uuid);
    if (res?.success) { showToast('Group deleted', 'info'); await loadGroups(); }
    else showToast(res?.error || 'Failed to delete', 'error');
}

async function showGroupContacts(uuid, name) {
    showToast(`Loading contacts for ${name}...`, 'info');
    // Navigate to contacts with group filter
    navigateTo('contacts');
}
