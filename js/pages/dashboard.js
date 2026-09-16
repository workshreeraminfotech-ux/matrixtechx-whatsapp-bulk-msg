// Dashboard Page
let dashCharts = {};

async function loadDashboard() {
    const data = await API.dashboard();
    if (!data?.success) return;
    const d = data.data;

    // Stats
    document.getElementById('stat-contacts').textContent = formatNumber(d.total_contacts);
    document.getElementById('stat-sent').textContent = formatNumber(d.total_sent);
    document.getElementById('stat-delivered').textContent = formatNumber(d.total_delivered);
    document.getElementById('stat-read').textContent = formatNumber(d.total_read);
    document.getElementById('stat-failed').textContent = formatNumber(d.total_failed);
    document.getElementById('stat-campaigns').textContent = formatNumber(d.total_campaigns);
    document.getElementById('stat-templates').textContent = formatNumber(d.total_templates);
    document.getElementById('stat-today').textContent = d.today_campaigns || '0';

    // Delivery rate
    const dr = d.delivery_rate || 0;
    document.getElementById('deliveryRateVal').textContent = dr + '%';
    document.getElementById('deliveryRateBar').style.width = dr + '%';
    document.getElementById('deliveryRateDesc').textContent = `${formatNumber(d.total_delivered)} of ${formatNumber(d.total_sent)} messages`;

    // Read rate
    const rr = d.read_rate || 0;
    document.getElementById('readRateVal').textContent = rr + '%';
    document.getElementById('readRateBar').style.width = rr + '%';
    document.getElementById('readRateDesc').textContent = `${formatNumber(d.total_read)} of ${formatNumber(d.total_sent)} messages`;

    // Monthly growth
    const thisM = d.this_month_sent || 0, lastM = d.last_month_sent || 0;
    const growthPct = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : (thisM > 0 ? 100 : 0);
    document.getElementById('monthlyGrowthVal').textContent = (growthPct >= 0 ? '+' : '') + growthPct + '%';
    document.getElementById('monthlyGrowthBar').style.width = Math.min(Math.abs(growthPct), 100) + '%';
    document.getElementById('monthlyGrowthDesc').textContent = `${formatNumber(thisM)} this month vs ${formatNumber(lastM)} last month`;

    // Charts
    await loadDashboardCharts();
}

async function loadDashboardCharts() {
    // Contact growth
    const contactData = await API.analytics.contacts(30);
    const campaignData = await API.analytics.campaigns(30);

    // Destroy old charts
    Object.values(dashCharts).forEach(c => c.destroy());
    dashCharts = {};

    // Contact Growth Chart
    const cgCtx = document.getElementById('contactGrowthChart');
    if (cgCtx) {
        const labels = contactData?.data?.map(d => d.date) || [];
        const values = contactData?.data?.map(d => d.new_contacts) || [];
        dashCharts.cg = new Chart(cgCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'New Contacts',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointRadius: 3
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#1a2d4a' }, beginAtZero: true } } }
        });
    }

    // Campaign Overview Doughnut
    const camCtx = document.getElementById('campaignChart');
    if (camCtx) {
        const sent = campaignData?.data?.reduce((s, d) => s + (d.sent || 0), 0) || 0;
        const delivered = campaignData?.data?.reduce((s, d) => s + (d.delivered || 0), 0) || 0;
        const read = campaignData?.data?.reduce((s, d) => s + (d.read || 0), 0) || 0;
        const failed = campaignData?.data?.reduce((s, d) => s + (d.failed || 0), 0) || 0;

        dashCharts.camp = new Chart(camCtx, {
            type: 'doughnut',
            data: {
                labels: ['Sent', 'Delivered', 'Read', 'Failed'],
                datasets: [{ data: [sent, delivered, read, failed], backgroundColor: ['#3b82f6','#10b981','#8b5cf6','#ef4444'], borderWidth: 0, hoverOffset: 6 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } }, cutout: '65%' }
        });
    }
}
