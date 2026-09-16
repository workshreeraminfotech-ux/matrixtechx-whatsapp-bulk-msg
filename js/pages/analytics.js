// Analytics Page
let analyticsCharts = {};

async function loadAnalytics() {
    const days = document.getElementById('analyticsDays')?.value || 30;

    // Destroy old charts
    Object.values(analyticsCharts).forEach(c => c.destroy());
    analyticsCharts = {};

    const [statusRes, campRes, contactRes] = await Promise.all([
        API.analytics.status(),
        API.analytics.campaigns(days),
        API.analytics.contacts(days)
    ]);

    if (statusRes?.success) {
        const d = statusRes.data;
        document.getElementById('an-sent').textContent = formatNumber(d.sent || 0);
        document.getElementById('an-delivered').textContent = formatNumber(d.delivered || 0);
        document.getElementById('an-read').textContent = formatNumber(d.read || 0);
        document.getElementById('an-failed').textContent = formatNumber(d.failed || 0);
    }

    // Campaign Line Chart
    const campCtx = document.getElementById('analyticsChart');
    if (campCtx && campRes?.success) {
        const labels = campRes.data.map(d => d.date);
        analyticsCharts.camp = new Chart(campCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Sent', data: campRes.data.map(d => d.sent || 0), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.4 },
                    { label: 'Delivered', data: campRes.data.map(d => d.delivered || 0), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4 },
                    { label: 'Read', data: campRes.data.map(d => d.read || 0), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', fill: true, tension: 0.4 }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#1a2d4a' }, beginAtZero: true } } }
        });
    }

    // Status Pie
    const pieCtx = document.getElementById('statusPieChart');
    if (pieCtx && statusRes?.success) {
        const d = statusRes.data;
        analyticsCharts.pie = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Sent', 'Delivered', 'Read', 'Failed'],
                datasets: [{ data: [d.sent || 0, d.delivered || 0, d.read || 0, d.failed || 0], backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444'], borderWidth: 0, hoverOffset: 8 }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } }, cutout: '60%' }
        });
    }

    // Contact Growth Bar
    const contCtx = document.getElementById('analyticsContactChart');
    if (contCtx && contactRes?.success) {
        analyticsCharts.cont = new Chart(contCtx, {
            type: 'bar',
            data: {
                labels: contactRes.data.map(d => d.date),
                datasets: [{ label: 'New Contacts', data: contactRes.data.map(d => d.new_contacts || 0), backgroundColor: 'rgba(59,130,246,0.6)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#1a2d4a' }, beginAtZero: true } } }
        });
    }
}
