/**
 * Azure Admin & Operations Portal - Frontend Application Controller
 */

// Global State
const state = {
    currentTab: 'overview',
    vms: [],
    resourceGroups: [],
    storageAccounts: [],
    costs: null,
    rbac: [],
    activities: [],
    demoMode: true,
    charts: {
        trend: null,
        service: null
    }
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initEventListeners();
    loadAllData();
});

// Navigation Handling
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            navigateTo(tab);
        });
    });

    // Handle initial hash or default to overview
    const hash = window.location.hash.replace('#', '') || 'overview';
    navigateTo(hash);
}

function navigateTo(tab) {
    if (!document.getElementById(`section-${tab}`)) {
        tab = 'overview';
    }
    state.currentTab = tab;
    window.location.hash = tab;

    // Update active nav class
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-tab') === tab);
    });

    // Update active view section
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.toggle('active', el.id === `section-${tab}`);
    });

    // Update Topbar Titles
    const titles = {
        overview: { title: "Overview & Telemetry", sub: "Real-time resource health, KPIs & Azure spending" },
        vms: { title: "Virtual Machines", sub: "Manage VM power states, compute sizing and networking" },
        rgs: { title: "Resource Groups", sub: "Azure resource organization, lifecycle and tagging" },
        storage: { title: "Storage Accounts", sub: "Blob, File, Data Lake Gen2 accounts & endpoint security" },
        costs: { title: "FinOps Cost Management", sub: "Budget tracking, spend forecasting and cost optimization" },
        rbac: { title: "RBAC & Security Governance", sub: "Identity permissions, role assignments and security checks" },
        activities: { title: "Activity Audit Trail", sub: "Track administrative operations across your subscription" },
        settings: { title: "Settings & Connectivity", sub: "Manage Azure credentials, API connections and simulation mode" }
    };

    const current = titles[tab] || titles.overview;
    document.getElementById('pageTitle').textContent = current.title;
    document.getElementById('pageSubtitle').textContent = current.sub;

    // Refresh tab-specific renders if data exists
    if (tab === 'overview' && state.costs) renderCharts();
}

// Event Listeners
function initEventListeners() {
    document.getElementById('btnRefresh').addEventListener('click', () => {
        showToast('Refreshing Azure resources...', 'info');
        loadAllData();
    });

    // VM Filters
    const vmSearch = document.getElementById('vmSearchInput');
    const vmFilter = document.getElementById('vmStateFilter');
    if (vmSearch) vmSearch.addEventListener('input', renderVMsTable);
    if (vmFilter) vmFilter.addEventListener('change', renderVMsTable);

    // Create RG Modal Triggers
    const btnOpenModal = document.getElementById('btnOpenCreateRgModal');
    if (btnOpenModal) btnOpenModal.addEventListener('click', openCreateRgModal);

    const btnSubmitRg = document.getElementById('btnSubmitCreateRg');
    if (btnSubmitRg) btnSubmitRg.addEventListener('click', handleCreateRgSubmit);

    // Settings actions
    const btnTestConn = document.getElementById('btnTestConnection');
    if (btnTestConn) btnTestConn.addEventListener('click', testConnection);

    const btnToggleMode = document.getElementById('btnToggleDemoMode');
    if (btnToggleMode) btnToggleMode.addEventListener('click', toggleDemoMode);
}

// Load All Data from REST APIs
async function loadAllData() {
    try {
        await Promise.all([
            fetchSystemStatus(),
            fetchSummary(),
            fetchVMs(),
            fetchResourceGroups(),
            fetchStorage(),
            fetchCosts(),
            fetchRBAC(),
            fetchActivities()
        ]);
    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

async function fetchSystemStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        state.demoMode = data.demo_mode;
        
        const badge = document.getElementById('currentModeLabel');
        const subName = document.getElementById('footerSubName');
        
        if (badge) {
            badge.textContent = state.demoMode ? 'Demo / Sandbox' : 'Live Azure';
        }
        if (subName && data.subscription) {
            subName.textContent = data.subscription.display_name || data.subscription.subscription_id;
        }
    } catch (e) {
        console.error('Error fetching status:', e);
    }
}

async function fetchSummary() {
    try {
        const res = await fetch('/api/summary');
        const data = await res.json();
        const s = data.summary;

        document.getElementById('kpiTotalVms').textContent = s.total_vms;
        document.getElementById('kpiRunningVms').textContent = `${s.running_vms} Running`;
        document.getElementById('kpiStoppedVms').textContent = `${s.stopped_vms + s.deallocated_vms} Stopped`;
        document.getElementById('kpiTotalRgs').textContent = s.total_resource_groups;
        document.getElementById('kpiTotalStorage').textContent = s.total_storage_accounts;
        document.getElementById('kpiMonthlyCost').textContent = `$${s.total_monthly_cost.toLocaleString()}`;
        document.getElementById('kpiBudgetStatus').textContent = s.budget_status;

        // Populate quick overview activity table
        renderActivityTable(data.recent_activities, 'overviewActivityTable', 5);
    } catch (e) {
        console.error('Error fetching summary:', e);
    }
}

async function fetchVMs() {
    try {
        const res = await fetch('/api/vms');
        const data = await res.json();
        state.vms = data.vms || [];
        document.getElementById('vmCountBadge').textContent = state.vms.length;
        renderVMsTable();
    } catch (e) {
        console.error('Error fetching VMs:', e);
    }
}

function renderVMsTable() {
    const tbody = document.querySelector('#vmsTable tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('vmSearchInput')?.value || '').toLowerCase();
    const filterState = document.getElementById('vmStateFilter')?.value || 'ALL';

    const filtered = state.vms.filter(vm => {
        const matchesSearch = vm.name.toLowerCase().includes(searchTerm) || 
                              vm.resource_group.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;

        const isRunning = vm.power_state.toLowerCase().includes('running');
        if (filterState === 'RUNNING' && !isRunning) return false;
        if (filterState === 'STOPPED' && isRunning) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">No matching virtual machines found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(vm => {
        const isRunning = vm.power_state.toLowerCase().includes('running');
        const badgeClass = isRunning ? 'badge-success' : (vm.power_state.toLowerCase().includes('deallocated') ? 'badge-secondary' : 'badge-warning');

        return `
            <tr>
                <td><strong>${escapeHtml(vm.name)}</strong></td>
                <td><span class="badge badge-info">${escapeHtml(vm.resource_group)}</span></td>
                <td>${escapeHtml(vm.location)}</td>
                <td>
                    <div><strong>${escapeHtml(vm.vm_size)}</strong></div>
                    <small class="text-muted">${vm.vcpus || 2} vCPU · ${vm.memory_gb || 8} GB</small>
                </td>
                <td>${escapeHtml(vm.os_type)}</td>
                <td>
                    <span class="badge ${badgeClass}">
                        <i class="fa-solid fa-circle" style="font-size: 6px; margin-right: 4px;"></i>
                        ${escapeHtml(vm.power_state)}
                    </span>
                </td>
                <td>
                    <div><small>Priv:</small> <code>${escapeHtml(vm.private_ip)}</code></div>
                    <div><small>Pub:</small> <code>${escapeHtml(vm.public_ip)}</code></div>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        ${isRunning ? `
                            <button class="btn btn-warning btn-sm" onclick="triggerVmAction('${escapeHtml(vm.resource_group)}', '${escapeHtml(vm.name)}', 'stop')" title="Stop VM">
                                <i class="fa-solid fa-stop"></i>
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="triggerVmAction('${escapeHtml(vm.resource_group)}', '${escapeHtml(vm.name)}', 'restart')" title="Restart VM">
                                <i class="fa-solid fa-arrows-rotate"></i>
                            </button>
                        ` : `
                            <button class="btn btn-success btn-sm" onclick="triggerVmAction('${escapeHtml(vm.resource_group)}', '${escapeHtml(vm.name)}', 'start')" title="Start VM">
                                <i class="fa-solid fa-play"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function triggerVmAction(rg, vmName, action) {
    showToast(`Sending '${action}' signal to ${vmName}...`, 'info');
    try {
        const res = await fetch(`/api/vms/${encodeURIComponent(rg)}/${encodeURIComponent(vmName)}/${encodeURIComponent(action)}`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(data.message, 'success');
            // Refresh VM list and summaries
            await fetchVMs();
            await fetchSummary();
            await fetchActivities();
        } else {
            showToast(data.detail || data.message || 'Action failed', 'error');
        }
    } catch (e) {
        showToast(`Request error: ${e.message}`, 'error');
    }
}

async function fetchResourceGroups() {
    try {
        const res = await fetch('/api/resource-groups');
        const data = await res.json();
        state.resourceGroups = data.resource_groups || [];
        renderResourceGroupsTable();
    } catch (e) {
        console.error('Error fetching RGs:', e);
    }
}

function renderResourceGroupsTable() {
    const tbody = document.querySelector('#rgsTable tbody');
    if (!tbody) return;

    if (state.resourceGroups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No resource groups found.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.resourceGroups.map(rg => {
        const tagBadges = Object.entries(rg.tags || {}).map(([k, v]) => 
            `<span class="badge badge-secondary" style="margin-right: 4px;">${escapeHtml(k)}: ${escapeHtml(v)}</span>`
        ).join('') || '<span class="text-muted">No tags</span>';

        return `
            <tr>
                <td><strong>${escapeHtml(rg.name)}</strong></td>
                <td><i class="fa-solid fa-globe"></i> ${escapeHtml(rg.location)}</td>
                <td><span class="badge badge-success">${escapeHtml(rg.provisioning_state)}</span></td>
                <td><strong>${rg.resource_count}</strong> resources</td>
                <td>${tagBadges}</td>
            </tr>
        `;
    }).join('');
}

async function fetchStorage() {
    try {
        const res = await fetch('/api/storage');
        const data = await res.json();
        state.storageAccounts = data.storage_accounts || [];
        renderStorageTable();
    } catch (e) {
        console.error('Error fetching storage:', e);
    }
}

function renderStorageTable() {
    const tbody = document.querySelector('#storageTable tbody');
    if (!tbody) return;

    if (state.storageAccounts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No storage accounts found.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.storageAccounts.map(sa => {
        const blobUrl = sa.primary_endpoints?.blob || 'N/A';
        return `
            <tr>
                <td><strong>${escapeHtml(sa.name)}</strong></td>
                <td><span class="badge badge-info">${escapeHtml(sa.resource_group)}</span></td>
                <td>${escapeHtml(sa.location)}</td>
                <td><span class="badge badge-primary">${escapeHtml(sa.sku)}</span></td>
                <td>${escapeHtml(sa.access_tier)}</td>
                <td><a href="${escapeHtml(blobUrl)}" target="_blank" style="color: var(--azure-blue); text-decoration: none;"><code>${escapeHtml(blobUrl)}</code></a></td>
                <td>${sa.enable_https_traffic_only ? '<span class="text-success"><i class="fa-solid fa-check"></i> Enabled</span>' : '<span class="text-danger">Disabled</span>'}</td>
            </tr>
        `;
    }).join('');
}

async function fetchCosts() {
    try {
        const res = await fetch('/api/costs');
        state.costs = await res.json();

        // Populate FinOps tab stats
        document.getElementById('costMtdValue').textContent = `$${state.costs.total_monthly_cost?.toLocaleString()}`;
        document.getElementById('costForecastValue').textContent = `$${state.costs.forecasted_cost?.toLocaleString()}`;
        document.getElementById('costBudgetValue').textContent = `$${state.costs.budget_limit?.toLocaleString()}`;

        // Populate recommendations
        renderRecommendations(state.costs.recommendations || []);
        renderCharts();
    } catch (e) {
        console.error('Error fetching costs:', e);
    }
}

function renderRecommendations(recs) {
    const container = document.getElementById('costRecommendationsContainer');
    const badge = document.getElementById('savingsBadge');
    if (!container) return;

    const totalSavings = recs.reduce((sum, r) => sum + (r.potential_savings_monthly || 0), 0);
    if (badge) badge.textContent = `$${totalSavings.toFixed(2)} / Month Potential Savings`;

    if (recs.length === 0) {
        container.innerHTML = `<p class="text-muted">No cost optimizations currently identified.</p>`;
        return;
    }

    container.innerHTML = recs.map(rec => `
        <div class="recommendation-card">
            <div>
                <div class="rec-title"><i class="fa-solid fa-circle-exclamation text-warning"></i> ${escapeHtml(rec.type)}: ${escapeHtml(rec.resource)}</div>
                <div class="rec-desc">${escapeHtml(rec.description)}</div>
            </div>
            <div class="rec-savings">
                <div>+$${rec.potential_savings_monthly.toFixed(2)}/mo</div>
                <small class="badge badge-warning">${rec.impact} Impact</small>
            </div>
        </div>
    `).join('');
}

function renderCharts() {
    if (!state.costs) return;

    // 1. Spending Trend Chart
    const trendCtx = document.getElementById('costTrendChart')?.getContext('2d');
    if (trendCtx) {
        if (state.charts.trend) state.charts.trend.destroy();

        const labels = state.costs.monthly_trends.map(t => t.month);
        const actuals = state.costs.monthly_trends.map(t => t.actual);
        const budgets = state.costs.monthly_trends.map(t => t.budget);

        state.charts.trend = new Chart(trendCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actual Spend ($)',
                        data: actuals,
                        backgroundColor: '#0078d4',
                        borderRadius: 4
                    },
                    {
                        label: 'Budget Limit ($)',
                        data: budgets,
                        type: 'line',
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 2. Cost by Service Chart
    const serviceCtx = document.getElementById('costServiceChart')?.getContext('2d');
    if (serviceCtx) {
        if (state.charts.service) state.charts.service.destroy();

        const labels = state.costs.costs_by_service.map(s => s.service);
        const data = state.costs.costs_by_service.map(s => s.cost);

        state.charts.service = new Chart(serviceCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#0078d4', '#9333ea', '#0891b2', '#f59e0b', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
                },
                cutout: '68%'
            }
        });
    }
}

async function fetchRBAC() {
    try {
        const res = await fetch('/api/rbac');
        const data = await res.json();
        state.rbac = data.role_assignments || [];
        renderRBACTable();
    } catch (e) {
        console.error('Error fetching RBAC:', e);
    }
}

function renderRBACTable() {
    const tbody = document.querySelector('#rbacTable tbody');
    if (!tbody) return;

    if (state.rbac.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No role assignments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.rbac.map(ra => `
        <tr>
            <td><strong>${escapeHtml(ra.principal_name)}</strong></td>
            <td><span class="badge badge-secondary">${escapeHtml(ra.principal_type)}</span></td>
            <td><span class="badge badge-primary">${escapeHtml(ra.role_definition_name)}</span></td>
            <td><code>${escapeHtml(ra.scope)}</code></td>
        </tr>
    `).join('');
}

async function fetchActivities() {
    try {
        const res = await fetch('/api/activities');
        const data = await res.json();
        state.activities = data.activities || [];
        renderActivityTable(state.activities, 'fullActivityTable');
    } catch (e) {
        console.error('Error fetching activities:', e);
    }
}

function renderActivityTable(list, tableId, limit = 50) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    const items = list.slice(0, limit);
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No activity records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(a => `
        <tr>
            <td><small>${escapeHtml(a.timestamp)}</small></td>
            <td><code>${escapeHtml(a.caller)}</code></td>
            <td><strong>${escapeHtml(a.action)}</strong></td>
            <td>${escapeHtml(a.resource)}</td>
            <td><span class="badge badge-success">${escapeHtml(a.status)}</span></td>
        </tr>
    `).join('');
}

// Create Resource Group Modal Handlers
function openCreateRgModal() {
    document.getElementById('createRgModal').style.display = 'flex';
    document.getElementById('rgNameInput').focus();
}

function closeCreateRgModal() {
    document.getElementById('createRgModal').style.display = 'none';
    document.getElementById('createRgForm').reset();
}

async function handleCreateRgSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('rgNameInput').value.trim();
    const location = document.getElementById('rgLocationSelect').value;
    const env = document.getElementById('rgEnvTagInput').value.trim();

    if (!name) {
        showToast('Please enter a Resource Group name', 'error');
        return;
    }

    try {
        const res = await fetch('/api/resource-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                location: location,
                tags: { Environment: env, ManagedBy: "AzureAdminPortal" }
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast(data.message, 'success');
            closeCreateRgModal();
            await fetchResourceGroups();
            await fetchSummary();
            await fetchActivities();
        } else {
            showToast(data.detail || data.message || 'Error creating resource group', 'error');
        }
    } catch (err) {
        showToast(`Request failed: ${err.message}`, 'error');
    }
}

// Settings & Testing
async function testConnection() {
    const box = document.getElementById('connectionResultBox');
    box.style.display = 'block';
    box.className = 'callout callout-info mt-3';
    box.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing Azure API connectivity...';

    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const conn = data.connection;

        if (conn.connected) {
            box.className = 'callout callout-info mt-3';
            box.innerHTML = `<strong><i class="fa-solid fa-circle-check text-success"></i> Connected (${conn.mode})</strong><p>${conn.message}</p>`;
            showToast('Connection verified successfully', 'success');
        } else {
            box.className = 'callout callout-info mt-3';
            box.style.borderColor = 'var(--danger)';
            box.style.backgroundColor = 'var(--danger-bg)';
            box.style.color = 'var(--danger)';
            box.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation text-danger"></i> Connection Warning (${conn.mode})</strong><p>${conn.message}</p>`;
        }
    } catch (err) {
        box.innerHTML = `<span class="text-danger">Failed to reach server: ${err.message}</span>`;
    }
}

async function toggleDemoMode() {
    const newMode = !state.demoMode;
    try {
        const res = await fetch('/api/mode/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ demo_mode: newMode })
        });
        const data = await res.json();
        showToast(data.message, 'info');
        await loadAllData();
    } catch (err) {
        showToast(`Could not toggle mode: ${err.message}`, 'error');
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Escape HTML utility
function escapeHtml(str) {
    if (typeof str !== 'string') return str || '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
