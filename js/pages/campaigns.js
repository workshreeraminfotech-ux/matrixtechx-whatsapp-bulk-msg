// Campaigns Page
let allCampaigns = [];

async function loadCampaigns() {
    const res = await API.campaigns.list();
    if (!res?.success) return;

    allCampaigns = res.data || [];
    const stats = res.stats || {};

    // Stats
    document.getElementById('cs-total').textContent = stats.total_campaigns || 0;
    document.getElementById('cs-recipients').textContent = formatNumber(stats.total_recipients || 0);
    const dr = stats.total_sent > 0 ? Math.round((stats.total_delivered / stats.total_sent) * 100) : 0;
    document.getElementById('cs-delivery').textContent = dr + '%';
    document.getElementById('cs-failed').textContent = stats.total_failed || 0;

    // Load templates for campaign modal
    const tplRes = await API.templates.list('status=APPROVED');
    const tplSelect = document.getElementById('campaignTemplate');
    if (tplRes?.success) {
        tplSelect.innerHTML = '<option value="">-- Select a template --</option>' +
            tplRes.data.map(t => `<option value="${t.id}">${t.name} (${t.category})</option>`).join('');
    }

    // Load groups for modal
    const grpRes = await API.groups.list();
    if (grpRes?.success) {
        const grpSelect = document.getElementById('campaignGroup');
        grpSelect.innerHTML = '<option value="">All Groups</option>' +
            grpRes.data.map(g => `<option value="${g.id}">${g.name} (${g.contact_count || 0})</option>`).join('');
    }

    renderCampaignsTable(allCampaigns);
}

function renderCampaignsTable(campaigns) {
    const tbody = document.getElementById('campaignsTable');
    if (!campaigns.length) {
        tbody.innerHTML = `<tr><td colspan="11" class="table-empty">
            <div style="font-size:32px;margin-bottom:10px">📣</div>
            No campaigns yet. <a href="#" onclick="openModal('createCampaignModal')" style="color:var(--accent)">Create your first campaign →</a>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = campaigns.map(c => {
        const dr = c.sent > 0 ? Math.round((c.delivered / c.sent) * 100) : 0;
        const statusClass = `status-${c.status}`;
        return `<tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.created_by_name || '-'}</td>
            <td><span class="status-badge ${statusClass}">${c.status}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${c.template_name || '-'}</td>
            <td>${formatNumber(c.total_recipients)}</td>
            <td>${formatNumber(c.sent)}<span style="color:var(--red);font-size:11px"> (${c.failed || 0} failed)</span></td>
            <td>${formatNumber(c.delivered)} <span style="color:var(--text-muted);font-size:11px">(${dr}%)</span></td>
            <td>${formatNumber(c.read)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div class="progress-bar" style="width:60px"><div class="progress-fill ${dr > 70 ? 'green' : dr > 40 ? '' : 'red'}" style="width:${dr}%"></div></div>
                    <span style="font-size:12px">${dr}%</span>
                </div>
            </td>
            <td style="font-size:11px;color:var(--text-muted)">${formatDate(c.created_at)}</td>
            <td>
                <div style="display:flex;gap:6px">
                    ${c.status === 'draft' ? `<button class="btn btn-sm btn-success" onclick="startCampaign('${c.uuid}')">▶ Start</button>` : ''}
                    ${c.status === 'sending' ? `<button class="btn btn-sm btn-secondary" onclick="pauseCampaign('${c.uuid}')">⏸ Pause</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="deleteCampaign('${c.uuid}')">🗑</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function filterCampaigns(q) {
    const filtered = allCampaigns.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.template_name || '').toLowerCase().includes(q.toLowerCase())
    );
    renderCampaignsTable(filtered);
}

function handleAudienceChange(val) {
    document.getElementById('groupFilterDiv').classList.toggle('hidden', val !== 'group');
    document.getElementById('contactCheckboxes').classList.toggle('hidden', val !== 'selected');
    if (val === 'selected') loadCampaignContactList();
}

async function loadCampaignContactList() {
    const res = await API.contacts.list('limit=500');
    if (!res?.success) return;
    document.getElementById('totalContactCount').textContent = res.total || res.data?.length || 0;
    document.getElementById('campaignContactList').innerHTML = (res.data || []).map(c =>
        `<label class="checkbox-wrapper" style="margin-bottom:6px">
            <input type="checkbox" class="campaign-contact-cb" value="${c.id}">
            ${c.name} (${c.phone})
        </label>`
    ).join('');
}

function toggleCampaignContacts(cb) {
    document.querySelectorAll('.campaign-contact-cb').forEach(c => c.checked = cb.checked);
}

async function createCampaign() {
    const name = document.getElementById('campaignName').value.trim();
    const templateId = document.getElementById('campaignTemplate').value;
    if (!name) return showToast('Campaign name is required', 'error');
    if (!templateId) return showToast('Please select a template', 'error');

    const audienceType = document.getElementById('campaignAudience').value;
    const groupId = document.getElementById('campaignGroup')?.value || null;
    const scheduledAt = document.getElementById('campaignSchedule').value || null;
    const autoRetry = document.getElementById('campaignAutoRetry').checked;

    let contactIds = [];
    if (audienceType === 'selected') {
        contactIds = [...document.querySelectorAll('.campaign-contact-cb:checked')].map(cb => parseInt(cb.value));
        if (!contactIds.length) return showToast('Please select at least one contact', 'error');
    }

    const res = await API.campaigns.create({
        name, template_id: parseInt(templateId), audience_type: audienceType,
        group_id: groupId ? parseInt(groupId) : null,
        contact_ids: contactIds, scheduled_at: scheduledAt,
        auto_retry: autoRetry, start_now: !scheduledAt
    });

    if (res?.success) {
        showToast(`Campaign "${name}" created! ${res.recipients} recipients queued.`, 'success');
        closeModal('createCampaignModal');
        document.getElementById('campaignName').value = '';
        await loadCampaigns();
    } else {
        showToast(res?.error || 'Failed to create campaign', 'error');
    }
}

async function startCampaign(uuid) {
    const res = await API.campaigns.start(uuid);
    if (res?.success) {
        showToast('Campaign started! Messages are being sent.', 'success');
        await loadCampaigns();
    } else {
        showToast(res?.error || 'Failed to start campaign', 'error');
    }
}

async function pauseCampaign(uuid) {
    const res = await API.campaigns.pause(uuid);
    if (res?.success) { showToast('Campaign paused', 'info'); await loadCampaigns(); }
}

async function deleteCampaign(uuid) {
    if (!confirm('Delete this campaign? This action cannot be undone.')) return;
    const res = await API.campaigns.delete(uuid);
    if (res?.success) { showToast('Campaign deleted', 'info'); await loadCampaigns(); }
    else showToast(res?.error || 'Failed to delete', 'error');
}
