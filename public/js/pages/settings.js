// Settings Page
let settingsTab = 'whatsapp';

async function loadSettings() {
    await switchSettingsTab(settingsTab, document.querySelector('.settings-tab.active'));
}

async function switchSettingsTab(tab, btn) {
    settingsTab = tab;
    document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const content = document.getElementById('settingsContent');
    switch(tab) {
        case 'whatsapp': content.innerHTML = await renderWhatsAppSettings(); break;
        case 'team': content.innerHTML = await renderTeamSettings(); break;
        case 'notifications': content.innerHTML = await renderNotificationSettings(); break;
        case 'apikeys': content.innerHTML = await renderApiKeySettings(); break;
        case 'billing': content.innerHTML = renderBillingSettings(); break;
    }
}

async function renderWhatsAppSettings() {
    const res = await API.settings.channel();
    const c = res?.data || {};
    return `
        <div class="settings-section">
            <div class="settings-section-title">📱 WhatsApp Business Configuration</div>
            <div class="settings-section-desc">Connect your WhatsApp Business account via Meta's Cloud API</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group">
                    <label>Phone Number ID</label>
                    <input type="text" class="form-control" id="waPhoneId" value="${c.phone_number_id || ''}" placeholder="Your WhatsApp Phone Number ID">
                </div>
                <div class="form-group">
                    <label>Business Account ID</label>
                    <input type="text" class="form-control" id="waBusinessId" value="${c.business_account_id || ''}" placeholder="Your WhatsApp Business Account ID">
                </div>
            </div>
            <div class="form-group">
                <label>Permanent Access Token</label>
                <input type="password" class="form-control" id="waToken" value="${c.access_token || ''}" placeholder="Your permanent access token">
            </div>
            <div class="form-group">
                <label>Webhook Verify Token</label>
                <input type="text" class="form-control" id="waWebhook" value="${c.webhook_verify_token || 'matrixtechx_webhook_verify_2024'}">
            </div>
            <div style="padding:14px;background:var(--accent-light);border:1px solid rgba(59,130,246,0.3);border-radius:var(--radius-md);margin-bottom:16px">
                <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:4px">🔗 Webhook URL</div>
                <code style="font-size:12px;color:var(--text-secondary)">${window.location.origin}/api/webhook</code>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Add this URL to your Meta App's webhook configuration</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
                <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:${c.status === 'connected' ? 'var(--green)' : 'var(--text-muted)'}">
                    ${c.status === 'connected' ? '✅ Connected' : '⚪ Not Connected'}
                </span>
                <div style="flex:1"></div>
                <button class="btn btn-primary" onclick="saveWhatsAppSettings()">💾 Save Settings</button>
            </div>
        </div>
        <div class="settings-section">
            <div class="settings-section-title">📋 Setup Guide</div>
            <ol style="padding-left:20px;font-size:13px;color:var(--text-secondary);line-height:2">
                <li>Go to <a href="https://developers.facebook.com" target="_blank" style="color:var(--accent)">Facebook Developers</a></li>
                <li>Create an App → Add WhatsApp product</li>
                <li>Get your <strong>Phone Number ID</strong> and <strong>Business Account ID</strong></li>
                <li>Create a <strong>System User Token</strong> (permanent access token)</li>
                <li>Add webhook URL above with your Verify Token</li>
                <li>Subscribe to: <code>messages</code>, <code>message_deliveries</code>, <code>message_reads</code></li>
            </ol>
        </div>`;
}

async function saveWhatsAppSettings() {
    const res = await API.settings.updateChannel({
        phone_number_id: document.getElementById('waPhoneId').value,
        access_token: document.getElementById('waToken').value,
        business_account_id: document.getElementById('waBusinessId').value,
        webhook_verify_token: document.getElementById('waWebhook').value
    });
    if (res?.success) showToast('WhatsApp settings saved!', 'success');
    else showToast(res?.error || 'Failed to save', 'error');
}

async function renderTeamSettings() {
    const res = await API.team.list();
    const members = res?.data || [];
    return `
        <div class="settings-section">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                <div><div class="settings-section-title">👥 Team Members</div><div class="settings-section-desc">Manage team access and permissions</div></div>
                <button class="btn btn-primary" onclick="openAddMemberModal()">+ Add Member</button>
            </div>
            ${members.map(u => `
                <div class="team-member-card">
                    ${makeAvatar(u.name, 40)}
                    <div class="team-member-info">
                        <div class="team-member-name">${u.name}</div>
                        <div class="team-member-email">${u.email}</div>
                    </div>
                    <span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-info'}">${u.role}</span>
                    ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="removeTeamMember('${u.uuid}')">Remove</button>` : ''}
                </div>
            `).join('')}
        </div>`;
}

async function renderNotificationSettings() {
    const res = await API.settings.notifications();
    const p = res?.data || {};
    const row = (label, desc, key) => `
        <div class="notif-row">
            <div class="notif-info"><div class="notif-title">${label}</div><div class="notif-desc">${desc}</div></div>
            <div class="notif-controls">
                <div class="notif-control"><label class="toggle"><input type="checkbox" ${p[`${key}_inapp`] ? 'checked' : ''} onchange="updateNotif('${key}_inapp',this.checked)"><span class="toggle-slider"></span></label><span>In-App</span></div>
                <div class="notif-control"><label class="toggle"><input type="checkbox" ${p[`${key}_email`] ? 'checked' : ''} onchange="updateNotif('${key}_email',this.checked)"><span class="toggle-slider"></span></label><span>Email</span></div>
                <div class="notif-control"><label class="toggle"><input type="checkbox" ${p[`${key}_sound`] !== undefined ? (p[`${key}_sound`] ? 'checked' : '') : 'checked'} onchange="updateNotif('${key}_sound',this.checked)"><span class="toggle-slider"></span></label><span>Sound</span></div>
            </div>
        </div>`;
    return `<div class="settings-section">
        <div class="settings-section-title">🔔 Notification Preferences</div>
        <div class="settings-section-desc">Control when and how you receive notifications</div>
        ${row('New Message', 'When a new message arrives in your inbox', 'new_message')}
        ${row('Template Approved', 'When WhatsApp approves your template', 'template_approved')}
        ${row('Template Rejected', 'When WhatsApp rejects your template', 'template_rejected')}
        ${row('Campaign Completed', 'When a campaign finishes sending', 'campaign_completed')}
    </div>`;
}

async function updateNotif(key, val) {
    await API.settings.updateNotifications({ [key]: val ? 1 : 0 });
}

async function renderApiKeySettings() {
    const res = await API.settings.apiKeys();
    const keys = res?.data || [];
    const stats = res?.stats || {};
    return `
        <div class="settings-section">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
                <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:var(--radius-md);border:1px solid var(--border)">
                    <div style="font-size:24px;font-weight:800">${stats.total_requests || 0}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Total Requests</div>
                </div>
                <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:var(--radius-md);border:1px solid var(--border)">
                    <div style="font-size:24px;font-weight:800;color:var(--green)">${stats.active_keys || 0}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Active Keys</div>
                </div>
                <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:var(--radius-md);border:1px solid var(--border)">
                    <div style="font-size:24px;font-weight:800;color:var(--red)">${stats.revoked_keys || 0}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Revoked Keys</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                <div class="settings-section-title">🔑 API Keys</div>
                <button class="btn btn-primary" onclick="createApiKey()">+ Generate New Key</button>
            </div>
            ${keys.length ? keys.map(k => `
                <div class="api-key-row">
                    <div>
                        <div class="api-key-name">${k.name}</div>
                        <div class="api-key-prefix">${k.key_prefix}</div>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted)">${k.request_count} requests</div>
                    <div style="font-size:11px;color:var(--text-muted)">Last used: ${k.last_used ? formatDate(k.last_used) : 'Never'}</div>
                    <span class="badge ${k.is_active ? 'badge-success' : 'badge-danger'}">${k.is_active ? 'ACTIVE' : 'REVOKED'}</span>
                    ${k.is_active ? `<button class="btn btn-sm btn-danger" onclick="revokeApiKey('${k.uuid}')">Revoke</button>` : ''}
                </div>
            `).join('') : '<div class="empty-state" style="padding:30px"><div class="empty-icon">🔑</div><p class="empty-desc">No API keys yet</p></div>'}
        </div>`;
}

async function createApiKey() {
    const name = prompt('Enter a name for this API key:');
    if (!name) return;
    const res = await API.settings.createApiKey({ name });
    if (res?.success) {
        alert(`✅ API Key Created!\n\nKey: ${res.data.key}\n\n⚠️ Copy this now — it won't be shown again!`);
        await loadSettings();
    } else showToast(res?.error || 'Failed to create key', 'error');
}

async function revokeApiKey(uuid) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    const res = await API.settings.revokeApiKey(uuid);
    if (res?.success) { showToast('API key revoked', 'info'); await loadSettings(); }
}

function renderBillingSettings() {
    return `<div class="settings-section">
        <div class="settings-section-title">💳 Billing & Membership</div>
        <div class="settings-section-desc">Manage your subscription plan and billing</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px">
            ${['Starter','Professional','Enterprise'].map((plan, i) => `
                <div style="padding:24px;background:var(--bg-secondary);border:${i===1?'2px solid var(--accent)':'1px solid var(--border)'};border-radius:var(--radius-lg);text-align:center">
                    <div style="font-size:16px;font-weight:800;margin-bottom:8px">${plan}</div>
                    <div style="font-size:28px;font-weight:800;color:var(--accent);margin-bottom:16px">${i===0?'Free':i===1?'₹2,999':'₹9,999'}<span style="font-size:12px;color:var(--text-muted)">/mo</span></div>
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${i===0?'1,000 messages':'Unlimited messages'}</div>
                    <button class="btn ${i===1?'btn-primary':'btn-secondary'} w-full">${i===0?'Current Plan':'Upgrade'}</button>
                </div>
            `).join('')}
        </div>
    </div>`;
}

function openAddMemberModal() {
    showToast('Add team member feature coming soon', 'info');
}

async function removeTeamMember(uuid) {
    if (!confirm('Remove this team member?')) return;
    const res = await API.team.delete(uuid);
    if (res?.success) { showToast('Team member removed', 'info'); await loadSettings(); }
}
