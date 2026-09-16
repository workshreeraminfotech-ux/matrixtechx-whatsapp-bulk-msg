// Team Inbox Page
let activeConvId = null;
let inboxTab = 'all';

async function loadInbox() {
    await loadConversations();
}

async function loadConversations() {
    const res = await API.team.conversations(`tab=${inboxTab}`);
    const list = document.getElementById('conversationsList');

    if (!res?.success || !res.data?.length) {
        list.innerHTML = `<div class="empty-state" style="padding:40px 20px">
            <div class="empty-icon">💬</div>
            <p class="empty-desc">No conversations yet</p>
        </div>`;
        return;
    }

    list.innerHTML = res.data.map(cv => `
        <div class="conversation-item ${cv.uuid === activeConvId ? 'active' : ''}" onclick="openConversation('${cv.uuid}', '${cv.contact_name}', '${cv.contact_phone}')">
            <div class="conv-avatar">
                ${makeAvatar(cv.contact_name || cv.contact_phone, 38)}
            </div>
            <div class="conv-content">
                <div class="conv-header">
                    <span class="conv-name">${cv.contact_name || cv.contact_phone}</span>
                    <span class="conv-time">${formatDate(cv.last_message_at).split(',')[0]}</span>
                </div>
                <div class="conv-preview">${cv.last_message || 'No messages yet'}</div>
            </div>
            ${cv.unread_count > 0 ? `<span class="conv-badge">${cv.unread_count}</span>` : ''}
        </div>
    `).join('');
}

async function openConversation(uuid, name, phone) {
    activeConvId = uuid;
    const chatPanel = document.getElementById('inboxChat');

    chatPanel.innerHTML = `
        <div class="chat-header">
            ${makeAvatar(name || phone, 36)}
            <div class="chat-contact-info">
                <div class="chat-contact-name">${name || phone}</div>
                <div class="chat-contact-status">● Online</div>
            </div>
            <div class="chat-header-actions">
                <button class="btn btn-sm btn-secondary" title="Assign">👤 Assign</button>
                <button class="btn btn-sm btn-secondary" title="Profile">📋</button>
            </div>
        </div>
        <div class="messages-area" id="messagesArea">
            <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Loading messages...</div>
        </div>
        <div class="chat-window-expired hidden" id="windowExpired">
            ⏰ 24-hour window expired. You can only send template messages.
        </div>
        <div class="chat-input-area">
            <input type="text" class="chat-input" id="chatInputText" placeholder="Type a message..." onkeydown="handleChatKey(event,'${uuid}')">
            <button class="chat-send-btn" onclick="sendInboxMessage('${uuid}')" title="Send">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
        </div>
    `;

    // Load messages
    const res = await API.team.messages(uuid);
    const area = document.getElementById('messagesArea');
    if (!res?.success || !res.data?.length) {
        area.innerHTML = `<div class="empty-state" style="height:100%"><div class="empty-icon">💬</div><p class="empty-desc">No messages yet</p></div>`;
        return;
    }

    area.innerHTML = res.data.map(m => `
        <div class="msg ${m.direction}">
            <div class="msg-bubble">${m.content || ''}</div>
            <div class="msg-time">${formatDate(m.created_at)} ${m.direction === 'outbound' ? getStatusIcon(m.status) : ''}</div>
        </div>
    `).join('');
    area.scrollTop = area.scrollHeight;

    // Refresh conversation list
    await loadConversations();
}

function getStatusIcon(status) {
    const icons = { sent: '✓', delivered: '✓✓', read: '<span style="color:#60a5fa">✓✓</span>', failed: '<span style="color:#ef4444">✗</span>' };
    return icons[status] || '✓';
}

function handleChatKey(e, uuid) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInboxMessage(uuid); }
}

async function sendInboxMessage(uuid) {
    const input = document.getElementById('chatInputText');
    const content = input?.value?.trim();
    if (!content) return;

    const res = await API.team.send(uuid, { content, type: 'text' });
    if (res?.success) {
        input.value = '';
        const area = document.getElementById('messagesArea');
        const msgEl = document.createElement('div');
        msgEl.className = 'msg outbound';
        msgEl.innerHTML = `<div class="msg-bubble">${content}</div><div class="msg-time">Now ✓</div>`;
        area.appendChild(msgEl);
        area.scrollTop = area.scrollHeight;
    } else {
        showToast(res?.error || 'Failed to send message', 'error');
    }
}

function switchInboxTab(tab, btn) {
    inboxTab = tab;
    document.querySelectorAll('.inbox-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadConversations();
}
