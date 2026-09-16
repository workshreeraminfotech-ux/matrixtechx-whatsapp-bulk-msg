// Widget Builder Page
let widgetConfig = { title: 'Welcome!', subtitle: 'How can we help?', primary_color: '#3b82f6', accent_color: '#2563eb', style_preset: 'modern', position: 'bottom_right', response_time: 'A few minutes', chat_greeting: 'Hi! How can I help you today?' };

async function loadWidget() {
    const res = await API.settings.widget();
    if (res?.success && res.data) {
        widgetConfig = { ...widgetConfig, ...res.data };
    }
    renderWidgetTab('content', document.querySelector('.settings-tab.active'));
    applyWidgetPreview();
}

function switchWidgetTab(tab, btn) {
    document.querySelectorAll('#page-widget .settings-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderWidgetTab(tab, btn);
}

function renderWidgetTab(tab, btn) {
    const content = document.getElementById('widgetTabContent');
    if (tab === 'content') {
        content.innerHTML = `
            <div class="settings-section">
                <div class="settings-section-title">Content Settings</div>
                <div class="form-group"><label>Widget Title</label><input type="text" class="form-control" id="wt-title" value="${widgetConfig.title || 'Welcome!'}" oninput="updateWidget('title',this.value)"></div>
                <div class="form-group"><label>Subtitle</label><input type="text" class="form-control" id="wt-subtitle" value="${widgetConfig.subtitle || 'How can we help?'}" oninput="updateWidget('subtitle',this.value)"></div>
                <div class="form-group"><label>Chat Greeting</label><textarea class="form-control" id="wt-greeting" rows="2" oninput="updateWidget('chat_greeting',this.value)">${widgetConfig.chat_greeting || ''}</textarea></div>
                <div class="form-group"><label>Response Time</label><input type="text" class="form-control" id="wt-replyTime" value="${widgetConfig.response_time || 'A few minutes'}" oninput="updateWidget('response_time',this.value)"></div>
                <div class="form-group"><label>Site Name</label><input type="text" class="form-control" id="wt-siteName" value="${widgetConfig.site_name || ''}" placeholder="Your Company Name" oninput="updateWidget('site_name',this.value)"></div>
            </div>
            <div class="settings-section">
                <div class="settings-section-title">📋 Installation Code</div>
                <div class="settings-section-desc">Paste this code before closing &lt;/body&gt; tag</div>
                <div class="code-block" style="position:relative">
                    <button class="code-copy" onclick="copyWidgetCode()">📋 Copy</button>
                    <span id="installCode">&lt;!-- MatrixTechX Widget --&gt;
&lt;script src="${window.location.origin}/widget.js"&gt;&lt;/script&gt;
&lt;script&gt;MatrixWidget.init({ color: '${widgetConfig.primary_color || '#3b82f6'}' });&lt;/script&gt;</span>
                </div>
            </div>`;
    } else {
        content.innerHTML = `
            <div class="settings-section">
                <div class="settings-section-title">Design Settings</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
                    <div class="form-group"><label>Primary Color</label>
                        <div style="display:flex;align-items:center;gap:8px">
                            <input type="color" id="wt-primaryColor" value="${widgetConfig.primary_color || '#3b82f6'}" oninput="updateWidget('primary_color',this.value)" style="width:40px;height:36px;border:none;cursor:pointer;background:transparent">
                            <input type="text" class="form-control" value="${widgetConfig.primary_color || '#3b82f6'}" oninput="updateWidget('primary_color',this.value)">
                        </div>
                    </div>
                    <div class="form-group"><label>Accent Color</label>
                        <div style="display:flex;align-items:center;gap:8px">
                            <input type="color" id="wt-accentColor" value="${widgetConfig.accent_color || '#2563eb'}" oninput="updateWidget('accent_color',this.value)" style="width:40px;height:36px;border:none;cursor:pointer;background:transparent">
                            <input type="text" class="form-control" value="${widgetConfig.accent_color || '#2563eb'}" oninput="updateWidget('accent_color',this.value)">
                        </div>
                    </div>
                </div>
                <div class="form-group"><label>Widget Style</label>
                    <select class="form-control" onchange="updateWidget('style_preset',this.value)">
                        <option value="modern" ${widgetConfig.style_preset === 'modern' ? 'selected' : ''}>Modern</option>
                        <option value="classic" ${widgetConfig.style_preset === 'classic' ? 'selected' : ''}>Classic</option>
                        <option value="minimal" ${widgetConfig.style_preset === 'minimal' ? 'selected' : ''}>Minimal</option>
                    </select>
                </div>
                <div class="form-group"><label>Widget Position</label>
                    <select class="form-control" onchange="updateWidget('position',this.value)">
                        <option value="bottom_right" ${widgetConfig.position === 'bottom_right' ? 'selected' : ''}>Bottom Right</option>
                        <option value="bottom_left" ${widgetConfig.position === 'bottom_left' ? 'selected' : ''}>Bottom Left</option>
                    </select>
                </div>
            </div>`;
    }
}

function updateWidget(key, val) {
    widgetConfig[key] = val;
    applyWidgetPreview();
}

function applyWidgetPreview() {
    const title = document.getElementById('wpTitle');
    const subtitle = document.getElementById('wpSubtitle');
    const replyTime = document.getElementById('wpResponseTime');
    const header = document.getElementById('wpHeader');
    const sendBtn = document.getElementById('wpSendBtn');

    if (title) title.textContent = widgetConfig.title || 'Welcome!';
    if (subtitle) subtitle.textContent = widgetConfig.subtitle || 'How can we help?';
    if (replyTime) replyTime.textContent = widgetConfig.response_time || 'A few minutes';
    if (header) header.style.background = `linear-gradient(135deg, ${widgetConfig.primary_color || '#3b82f6'}, ${widgetConfig.accent_color || '#2563eb'})`;
    if (sendBtn) sendBtn.style.background = widgetConfig.primary_color || '#3b82f6';
}

async function saveWidgetConfig() {
    const res = await API.settings.updateWidget(widgetConfig);
    if (res?.success) showToast('Widget configuration saved!', 'success');
    else showToast(res?.error || 'Failed to save', 'error');
}

function copyWidgetCode() {
    const code = document.getElementById('installCode')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => showToast('Code copied!', 'success'));
}
