// MatrixTechX - API Helper (frontend)
const API_BASE = '/api';

function getToken() { return localStorage.getItem('mtx_token'); }

async function apiCall(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        }
    };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(API_BASE + endpoint, opts);
        if (res.status === 401) {
            localStorage.removeItem('mtx_token');
            window.location.href = '/';
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, error: err.message };
    }
}

const API = {
    get: (ep) => apiCall(ep, 'GET'),
    post: (ep, body) => apiCall(ep, 'POST', body),
    put: (ep, body) => apiCall(ep, 'PUT', body),
    delete: (ep) => apiCall(ep, 'DELETE'),

    // Specific endpoints
    auth: {
        me: () => API.get('/auth/me'),
        logout: () => API.post('/auth/logout')
    },
    dashboard: () => API.get('/analytics/dashboard'),
    analytics: {
        campaigns: (days) => API.get(`/analytics/campaigns?days=${days}`),
        contacts: (days) => API.get(`/analytics/contacts?days=${days}`),
        status: () => API.get('/analytics/message-status')
    },
    contacts: {
        list: (params = '') => API.get('/contacts' + (params ? '?' + params : '')),
        create: (data) => API.post('/contacts', data),
        update: (id, data) => API.put(`/contacts/${id}`, data),
        delete: (id) => API.delete(`/contacts/${id}`),
        import: (data) => API.post('/contacts/import', data),
        export: () => API.get('/contacts/export')
    },
    groups: {
        list: () => API.get('/groups'),
        create: (data) => API.post('/groups', data),
        update: (id, data) => API.put(`/groups/${id}`, data),
        delete: (id) => API.delete(`/groups/${id}`)
    },
    templates: {
        list: (params = '') => API.get('/templates' + (params ? '?' + params : '')),
        create: (data) => API.post('/templates', data),
        delete: (id) => API.delete(`/templates/${id}`),
        sync: () => API.post('/templates/sync', {})
    },
    campaigns: {
        list: () => API.get('/campaigns'),
        create: (data) => API.post('/campaigns', data),
        start: (id) => API.post(`/campaigns/${id}/start`),
        pause: (id) => API.post(`/campaigns/${id}/pause`),
        delete: (id) => API.delete(`/campaigns/${id}`)
    },
    team: {
        list: () => API.get('/team'),
        create: (data) => API.post('/team', data),
        delete: (id) => API.delete(`/team/${id}`),
        conversations: (params = '') => API.get('/team/conversations' + (params ? '?' + params : '')),
        messages: (id) => API.get(`/team/conversations/${id}/messages`),
        send: (id, data) => API.post(`/team/conversations/${id}/send`, data)
    },
    settings: {
        channel: () => API.get('/settings/channel'),
        updateChannel: (data) => API.put('/settings/channel', data),
        notifications: () => API.get('/settings/notifications'),
        updateNotifications: (data) => API.put('/settings/notifications', data),
        apiKeys: () => API.get('/settings/api-keys'),
        createApiKey: (data) => API.post('/settings/api-keys', data),
        revokeApiKey: (id) => API.delete(`/settings/api-keys/${id}`),
        widget: () => API.get('/settings/widget'),
        updateWidget: (data) => API.put('/settings/widget', data)
    }
};
