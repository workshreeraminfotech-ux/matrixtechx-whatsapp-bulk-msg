// API Documentation Page
function renderApiDocs() {
    const base = window.location.origin + '/api';
    document.getElementById('apiDocsContent').innerHTML = `
        <div class="api-section" id="api-auth">
            <h2>🔐 Authentication</h2>
            <p>All API requests require a Bearer token in the Authorization header.</p>
            <div class="code-block"><button class="code-copy" onclick="copyCode(this)">📋 Copy</button>Authorization: Bearer YOUR_JWT_TOKEN</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/auth/login</div>
            <div class="code-block"><button class="code-copy" onclick="copyCode(this)">📋 Copy</button>{
  "email": "admin@matrixtechx.com",
  "password": "Admin@123456"
}</div>
            <div class="api-endpoint"><span class="method-badge method-get">GET</span>${base}/auth/me</div>
        </div>

        <div class="api-section" id="api-contacts">
            <h2>👥 Contacts</h2>
            <div class="api-endpoint"><span class="method-badge method-get">GET</span>${base}/contacts</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/contacts</div>
            <div class="code-block"><button class="code-copy" onclick="copyCode(this)">📋 Copy</button>{
  "name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com"
}</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/contacts/import</div>
            <div class="code-block"><button class="code-copy" onclick="copyCode(this)">📋 Copy</button>{
  "contacts": [
    {"name":"John","phone":"+919876543210"},
    {"name":"Jane","phone":"+919876543211"}
  ]
}</div>
            <div class="api-endpoint"><span class="method-badge method-delete">DELETE</span>${base}/contacts/:id</div>
        </div>

        <div class="api-section" id="api-campaigns">
            <h2>📣 Campaigns</h2>
            <div class="api-endpoint"><span class="method-badge method-get">GET</span>${base}/campaigns</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/campaigns</div>
            <div class="code-block"><button class="code-copy" onclick="copyCode(this)">📋 Copy</button>{
  "name": "My Campaign",
  "template_id": 1,
  "audience_type": "all",
  "start_now": true
}</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/campaigns/:id/start</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/campaigns/:id/pause</div>
        </div>

        <div class="api-section" id="api-templates">
            <h2>📝 Templates</h2>
            <div class="api-endpoint"><span class="method-badge method-get">GET</span>${base}/templates</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/templates</div>
            <div class="code-block"><button class="code-copy" onclick="copyCode(this)">📋 Copy</button>{
  "name": "welcome_message",
  "category": "MARKETING",
  "language": "en_US",
  "body": "Hello {{1}}, welcome to MatrixTechX!"
}</div>
            <div class="api-endpoint"><span class="method-badge method-post">POST</span>${base}/templates/sync</div>
        </div>

        <div class="api-section" id="api-webhook">
            <h2>🔗 Webhook</h2>
            <p>Configure this webhook URL in your Meta Developer App:</p>
            <div class="code-block">${window.location.origin}/api/webhook</div>
            <p>The webhook handles:</p>
            <ul style="padding-left:20px;font-size:13px;color:var(--text-secondary);line-height:2;margin-top:8px">
                <li><strong>Incoming messages</strong> — Auto-creates contacts and conversations</li>
                <li><strong>Delivery receipts</strong> — Updates message status (sent → delivered → read)</li>
                <li><strong>Campaign tracking</strong> — Updates campaign delivery/read stats in real-time</li>
            </ul>
        </div>
    `;
}

function copyCode(btn) {
    const code = btn.nextSibling.textContent || btn.parentElement.textContent;
    navigator.clipboard.writeText(code.replace('📋 Copy', '').trim())
        .then(() => { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = '📋 Copy', 2000); });
}
