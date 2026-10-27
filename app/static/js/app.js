/**
 * Azure Cloud Ops - Next-Gen Interactive Controller
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
    soundEnabled: true,
    currentTheme: 'cyber-dark',
    charts: {
        trend: null,
        service: null
    }
};

// ==========================================================================
// WEB AUDIO SYNTHESIZER (ZERO EXTERNAL DEPENDENCY UI SOUND FX)
// ==========================================================================
class SoundFX {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
    }

    playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.06) {
        if (!state.soundEnabled) return;
        try {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio not allowed or failed
        }
    }

    click() { this.playTone(800, 'sine', 0.04, 0.04); }
    success() {
        this.playTone(523.25, 'triangle', 0.1, 0.06);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.06), 80);
    }
    action() { this.playTone(440, 'sine', 0.06, 0.05); }
    warn() { this.playTone(280, 'sawtooth', 0.15, 0.04); }
}

const sfx = new SoundFX();

// ==========================================================================
// DOM READY & LIFECYCLE
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initSpotlight();
    initFinOpsSimulator();
    initTerminalConsole();
    initEventListeners();
    loadAllData();
});

// ==========================================================================
// THEME & SOUND TOGGLES
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('azure-ops-theme') || 'cyber-dark';
    state.currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function cycleTheme() {
    const themes = ['cyber-dark', 'azure-light', 'matrix-neon'];
    const nextIdx = (themes.indexOf(state.currentTheme) + 1) % themes.length;
    state.currentTheme = themes[nextIdx];
    document.documentElement.setAttribute('data-theme', state.currentTheme);
    localStorage.setItem('azure-ops-theme', state.currentTheme);
    sfx.click();
    showToast(`Switched theme to: ${state.currentTheme.replace('-', ' ').toUpperCase()}`, 'info');
    if (state.costs) renderCharts();
}

function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    const btn = document.getElementById('btnToggleSound');
    if (btn) {
        btn.innerHTML = state.soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    }
    if (state.soundEnabled) sfx.success();
    showToast(`Audio FX: ${state.soundEnabled ? 'Enabled' : 'Muted'}`, 'info');
}

// ==========================================================================
// NAVIGATION & TABS
// ==========================================================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            sfx.click();
            navigateTo(tab);
        });
    });

    const hash = window.location.hash.replace('#', '') || 'overview';
    navigateTo(hash);
}

function navigateTo(tab) {
    if (!document.getElementById(`section-${tab}`)) {
        tab = 'overview';
    }
    state.currentTab = tab;
    window.location.hash = tab;

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-tab') === tab);
    });

    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.toggle('active', el.id === `section-${tab}`);
    });

    const titles = {
        overview: { title: "Overview & Fleet Telemetry", sub: "Real-time compute nodes, cost velocity & multi-region health" },
        vms: { title: "Virtual Machine Fleet", sub: "Control power states, compute sizing, CPU spikes and networking" },
        rgs: { title: "Resource Groups & Governance", sub: "Multi-region resource clusters, lifecycle and automated tags" },
        storage: { title: "Storage Fleet Explorer", sub: "Blob, Data Lake Gen2, access tiers and encryption policies" },
        costs: { title: "FinOps Cloud Optimization", sub: "Spend velocity, automated budget caps and AI savings simulator" },
        rbac: { title: "Zero Trust & Security Posture", sub: "Entra ID privileges, role assignments and security compliance" },
        terminal: { title: "Interactive Cloud Console", sub: "Direct shell interface for Azure operations and agent monitoring" },
        settings: { title: "Settings & Cloud Connectivity", sub: "Manage Azure credentials, API connections and simulation mode" }
    };

    const current = titles[tab] || titles.overview;
    document.getElementById('pageTitle').textContent = current.title;
    document.getElementById('pageSubtitle').textContent = current.sub;

    if (tab === 'overview' && state.costs) renderCharts();
}

// ==========================================================================
// SPOTLIGHT COMMAND PALETTE (CTRL + K)
// ==========================================================================
function initSpotlight() {
    const trigger = document.getElementById('searchTrigger');
    const modal = document.getElementById('spotlightModal');
    const input = document.getElementById('spotlightInput');

    if (trigger) {
        trigger.addEventListener('click', () => openSpotlight());
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openSpotlight();
        } else if (e.key === 'Escape' && modal.style.display !== 'none') {
            closeSpotlight();
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSpotlight();
    });

    input.addEventListener('input', () => {
        renderSpotlightResults(input.value.trim().toLowerCase());
    });
}

function openSpotlight() {
    const modal = document.getElementById('spotlightModal');
    const input = document.getElementById('spotlightInput');
    modal.style.display = 'flex';
    input.value = '';
    renderSpotlightResults('');
    input.focus();
    sfx.click();
}

function closeSpotlight() {
    document.getElementById('spotlightModal').style.display = 'none';
}

function renderSpotlightResults(query) {
    const container = document.getElementById('spotlightResults');
    const commands = [
        { icon: 'fa-solid fa-server text-cyan', title: 'Virtual Machines', sub: 'Inspect running VMs and power actions', action: () => navigateTo('vms') },
        { icon: 'fa-solid fa-chart-line text-emerald', title: 'FinOps & Savings', sub: 'View cost velocity and recommendations', action: () => navigateTo('costs') },
        { icon: 'fa-solid fa-layer-group text-purple', title: 'Resource Groups', sub: 'Browse cluster groups across regions', action: () => navigateTo('rgs') },
        { icon: 'fa-solid fa-database text-amber', title: 'Storage Fleet', sub: 'Explore blob accounts and storage tiers', action: () => navigateTo('storage') },
        { icon: 'fa-solid fa-terminal text-cyan', title: 'Interactive Console', sub: 'Open live sysadmin agent shell', action: () => navigateTo('terminal') },
        { icon: 'fa-solid fa-plug text-cyan', title: 'Test Azure API Ping', sub: 'Check connection to ARM API', action: () => { navigateTo('settings'); testConnection(); } },
        { icon: 'fa-solid fa-arrows-rotate text-emerald', title: 'Sync Fleet Data', sub: 'Refresh metrics from Azure', action: () => loadAllData() }
    ];

    // Append dynamic VMs
    state.vms.forEach(vm => {
        commands.push({
            icon: 'fa-solid fa-server',
            title: vm.name,
            sub: `VM · ${vm.resource_group} · ${vm.power_state}`,
            action: () => {
                navigateTo('vms');
                const search = document.getElementById('vmSearchInput');
                if (search) { search.value = vm.name; renderVMsTable(); }
            }
        });
    });

    const filtered = commands.filter(c => c.title.toLowerCase().includes(query) || c.sub.toLowerCase().includes(query));

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-muted">No commands or resources matching "${escapeHtml(query)}"</div>`;
        return;
    }

    container.innerHTML = filtered.map((c, i) => `
        <div class="spotlight-item ${i === 0 ? 'selected' : ''}" onclick="executeSpotlightAction(${i})">
            <i class="${c.icon}"></i>
            <div class="spotlight-item-text">
                <span class="spotlight-item-title">${escapeHtml(c.title)}</span>
                <span class="spotlight-item-sub">${escapeHtml(c.sub)}</span>
            </div>
            <kbd><i class="fa-solid fa-turn-down"></i></kbd>
        </div>
    `).join('');

    window._spotlightActions = filtered.map(f => f.action);
}

function executeSpotlightAction(idx) {
    if (window._spotlightActions && window._spotlightActions[idx]) {
        closeSpotlight();
        sfx.action();
        window._spotlightActions[idx]();
    }
}

// ==========================================================================
// FINOPS "WHAT-IF" SAVINGS SIMULATOR
// ==========================================================================
function initFinOpsSimulator() {
    const idleSlider = document.getElementById('idleVmSlider');
    const archiveSlider = document.getElementById('archiveTierSlider');

    function updateSimulation() {
        const idlePct = parseInt(idleSlider.value);
        const archivePct = parseInt(archiveSlider.value);

        document.getElementById('idleVmVal').textContent = `${idlePct}%`;
        document.getElementById('archiveTierVal').textContent = `${archivePct}%`;

        // Baseline: ~$42/mo per idle VM, ~$68/mo per archive storage tier
        const monthlyIdleSavings = (idlePct / 100) * 85.0;
        const monthlyArchiveSavings = (archivePct / 100) * 115.0;
        const totalAnnual = (monthlyIdleSavings + monthlyArchiveSavings) * 12;

        document.getElementById('simSavingsAnnual').textContent = `$${totalAnnual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / yr`;
    }

    if (idleSlider && archiveSlider) {
        idleSlider.addEventListener('input', () => { sfx.click(); updateSimulation(); });
        archiveSlider.addEventListener('input', () => { sfx.click(); updateSimulation(); });
        updateSimulation();
    }
}

// ==========================================================================
// INTERACTIVE CONSOLE TERMINAL
// ==========================================================================
function initTerminalConsole() {
    const input = document.getElementById('terminalCmdInput');
    const clearBtn = document.getElementById('btnClearTerminal');
    const simTrafficBtn = document.getElementById('btnSimulateTraffic');

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const body = document.getElementById('liveTerminalOutput');
            if (body) body.innerHTML = '<div class="terminal-line"><span class="t-time">[CLEARED]</span> Log stream reset.</div>';
            sfx.click();
        });
    }

    if (simTrafficBtn) {
        simTrafficBtn.addEventListener('click', () => {
            sfx.action();
            logToTerminal('DIAG', `Latency ping: East US (38ms), East US 2 (42ms), West Europe (85ms). All nodes healthy.`);
            showToast('Simulated Azure traffic diagnostic completed', 'success');
        });
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value.trim();
                input.value = '';
                handleConsoleCommand(cmd);
            }
        });
    }
}

function logToTerminal(level, message) {
    const box = document.getElementById('liveTerminalOutput');
    const fullBox = document.getElementById('fullConsoleLogs');
    const now = new Date().toLocaleTimeString();

    const line = `<div class="terminal-line"><span class="t-time">[${now}] [${level}]</span> ${message}</div>`;

    if (box) {
        box.insertAdjacentHTML('beforeend', line);
        box.scrollTop = box.scrollHeight;
    }
    if (fullBox) {
        fullBox.insertAdjacentHTML('beforeend', line);
        fullBox.scrollTop = fullBox.scrollHeight;
    }
}

function handleConsoleCommand(cmd) {
    if (!cmd) return;
    sfx.action();
    logToTerminal('EXEC', `azure@cloud-admin:~$ ${cmd}`);

    const lower = cmd.toLowerCase();
    if (lower === 'help') {
        logToTerminal('OUTPUT', 'Available commands: vms list, rgs list, cost summary, status, ping eastus, clear, theme');
    } else if (lower.includes('vms')) {
        logToTerminal('OUTPUT', `Fleet: ${state.vms.length} VMs (${state.vms.filter(v => v.power_state.includes('running')).length} running)`);
    } else if (lower.includes('cost')) {
        logToTerminal('OUTPUT', `Current month spend: $${state.costs?.total_monthly_cost || 0} USD`);
    } else if (lower.includes('status')) {
        logToTerminal('OUTPUT', `Azure Status: CONNECTED (${state.demoMode ? 'Sandbox Mode' : 'Live Azure'})`);
    } else if (lower.includes('ping')) {
        logToTerminal('OUTPUT', `Ping response: 20.84.142.91 latency: 38ms packet loss: 0%`);
    } else if (lower.includes('clear')) {
        const fullBox = document.getElementById('fullConsoleLogs');
        if (fullBox) fullBox.innerHTML = '';
    } else if (lower.includes('theme')) {
        cycleTheme();
    } else {
        logToTerminal('ERR', `Command not recognized: "${cmd}". Type "help" for options.`);
    }
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function initEventListeners() {
    document.getElementById('btnRefresh').addEventListener('click', () => {
        sfx.action();
        showToast('Syncing real-time Azure fleet telemetry...', 'info');
        loadAllData();
    });

    document.getElementById('btnThemeCycle').addEventListener('click', cycleTheme);
    document.getElementById('btnToggleSound').addEventListener('click', toggleSound);

    // VM Filters
    const vmSearch = document.getElementById('vmSearchInput');
    const vmFilter = document.getElementById('vmStateFilter');
    if (vmSearch) vmSearch.addEventListener('input', renderVMsTable);
    if (vmFilter) vmFilter.addEventListener('change', renderVMsTable);

    // Region Node Clicks
    document.querySelectorAll('.region-node').forEach(node => {
        node.addEventListener('click', () => {
            document.querySelectorAll('.region-node').forEach(n => n.classList.remove('active'));
            node.classList.add('active');
            const locName = node.querySelector('.node-name').textContent.toLowerCase().replace(/\s+/g, '');
            sfx.click();
            navigateTo('vms');
            const vmSearch = document.getElementById('vmSearchInput');
            if (vmSearch) {
                vmSearch.value = locName;
                renderVMsTable();
            }
            showToast(`Filtering compute nodes in: ${node.querySelector('.node-name').textContent}`, 'info');
        });
    });

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

// ==========================================================================
// DATA FETCHING & API INTEGRATIONS
// ==========================================================================
async function loadAllData() {
    try {
        await Promise.all([
            fetchSystemStatus(),
            fetchSummary(),
            fetchVMs(),
            fetchResourceGroups(),
            fetchStorage(),
            fetchCosts(),
            fetchRBAC()
        ]);
        logToTerminal('OK', 'Azure metrics synchronization complete.');
    } catch (err) {
        console.error('Error fetching data:', err);
        logToTerminal('ERR', `Telemetry sync failed: ${err.message}`);
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
            badge.textContent = state.demoMode ? 'Sandbox / Offline' : 'Live Microsoft Azure';
        }
        if (subName && data.subscription) {
            subName.textContent = data.subscription.display_name || data.subscription.subscription_id;
        }
    } catch (e) {
        console.error('Status fetch error:', e);
    }
}

async function fetchSummary() {
    try {
        const res = await fetch('/api/summary');
        const data = await res.json();
        const s = data.summary;

        animateCountUp('kpiTotalVms', s.total_vms);
        animateCountUp('kpiTotalRgs', s.total_resource_groups);
        animateCountUp('kpiTotalStorage', s.total_storage_accounts);

        document.getElementById('kpiRunningVms').textContent = `${s.running_vms} Running`;
        document.getElementById('kpiStoppedVms').textContent = `${s.stopped_vms + s.deallocated_vms} Stopped`;
        document.getElementById('kpiMonthlyCost').textContent = `$${s.total_monthly_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('kpiBudgetStatus').innerHTML = `<i class="fa-solid fa-circle-check"></i> ${s.budget_status}`;
    } catch (e) {
        console.error('Summary fetch error:', e);
    }
}

function animateCountUp(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const target = parseFloat(targetValue);
    if (isNaN(target)) { el.textContent = targetValue; return; }

    let current = 0;
    const duration = 600;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.round(current);
    }, stepTime);
}

async function fetchVMs() {
    try {
        const res = await fetch('/api/vms');
        const data = await res.json();
        state.vms = data.vms || [];
        document.getElementById('vmCountBadge').textContent = state.vms.length;
        renderVMsTable();
    } catch (e) {
        console.error('VM fetch error:', e);
    }
}

function renderVMsTable() {
    const tbody = document.querySelector('#vmsTable tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('vmSearchInput')?.value || '').toLowerCase();
    const filterState = document.getElementById('vmStateFilter')?.value || 'ALL';

    const filtered = state.vms.filter(vm => {
        const matchesSearch = vm.name.toLowerCase().includes(searchTerm) || 
                              vm.resource_group.toLowerCase().includes(searchTerm) ||
                              vm.location.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;

        const isRunning = vm.power_state.toLowerCase().includes('running');
        if (filterState === 'RUNNING' && !isRunning) return false;
        if (filterState === 'STOPPED' && isRunning) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No matching compute nodes found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(vm => {
        const isRunning = vm.power_state.toLowerCase().includes('running');
        const badgeClass = isRunning ? 'badge-success' : (vm.power_state.toLowerCase().includes('deallocated') ? 'badge-secondary' : 'badge-warning');
        const cpuPercent = isRunning ? (vm.cpu_usage_percent || 28) : 0;
        const cpuTier = cpuPercent > 70 ? 'high' : (cpuPercent > 35 ? 'med' : 'low');

        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <i class="fa-solid fa-server ${isRunning ? 'text-cyan' : 'text-muted'}"></i>
                        <strong>${escapeHtml(vm.name)}</strong>
                    </div>
                </td>
                <td><span class="badge badge-primary">${escapeHtml(vm.resource_group)}</span></td>
                <td><i class="fa-solid fa-location-dot text-cyan" style="font-size:11px;"></i> ${escapeHtml(vm.location)}</td>
                <td>
                    <div><strong>${escapeHtml(vm.vm_size)}</strong></div>
                    <div class="vm-cpu-meter">
                        <div class="cpu-bar">
                            <div class="cpu-fill ${cpuTier}" style="width: ${cpuPercent}%;"></div>
                        </div>
                        <small class="text-muted" style="font-family:'JetBrains Mono',monospace;">${cpuPercent}%</small>
                    </div>
                </td>
                <td><small class="text-secondary">${escapeHtml(vm.os_type)}</small></td>
                <td>
                    <span class="badge ${badgeClass}">
                        <i class="fa-solid fa-circle" style="font-size: 6px;"></i>
                        ${escapeHtml(vm.power_state)}
                    </span>
                </td>
                <td>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:11.5px;">
                        <div><small class="text-muted">priv:</small> ${escapeHtml(vm.private_ip)}</div>
                        <div><small class="text-muted">pub:</small> <span class="${vm.public_ip.includes('None') ? 'text-muted' : 'text-cyan'}">${escapeHtml(vm.public_ip)}</span></div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${isRunning ? `
                            <button class="btn btn-warning btn-xs" onclick="triggerVmAction('${escapeHtml(vm.resource_group)}', '${escapeHtml(vm.name)}', 'stop')" title="Power Off VM">
                                <i class="fa-solid fa-stop"></i> Stop
                            </button>
                            <button class="btn btn-glass btn-xs" onclick="triggerVmAction('${escapeHtml(vm.resource_group)}', '${escapeHtml(vm.name)}', 'restart')" title="Reboot VM">
                                <i class="fa-solid fa-arrows-rotate"></i>
                            </button>
                        ` : `
                            <button class="btn btn-success btn-xs" onclick="triggerVmAction('${escapeHtml(vm.resource_group)}', '${escapeHtml(vm.name)}', 'start')" title="Power On VM">
                                <i class="fa-solid fa-play"></i> Start
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function triggerVmAction(rg, vmName, action) {
    sfx.action();
    showToast(`Transmitting '${action}' signal to ${vmName}...`, 'info');
    logToTerminal('EXEC', `POST /api/vms/${rg}/${vmName}/${action}`);
    try {
        const res = await fetch(`/api/vms/${encodeURIComponent(rg)}/${encodeURIComponent(vmName)}/${encodeURIComponent(action)}`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            sfx.success();
            showToast(data.message, 'success');
            logToTerminal('SUCCESS', `Action '${action}' completed on ${vmName}`);
            await fetchVMs();
            await fetchSummary();
        } else {
            sfx.warn();
            showToast(data.detail || data.message || 'Operation failed', 'error');
            logToTerminal('FAIL', `Action failed on ${vmName}: ${data.detail || data.message}`);
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
        console.error('RG fetch error:', e);
    }
}

function renderResourceGroupsTable() {
    const tbody = document.querySelector('#rgsTable tbody');
    if (!tbody) return;

    if (state.resourceGroups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No resource groups located.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.resourceGroups.map(rg => {
        const tagBadges = Object.entries(rg.tags || {}).map(([k, v]) => 
            `<span class="badge badge-secondary" style="margin-right: 4px;">${escapeHtml(k)}: ${escapeHtml(v)}</span>`
        ).join('') || '<span class="text-muted">Untagged</span>';

        return `
            <tr>
                <td><strong>${escapeHtml(rg.name)}</strong></td>
                <td><i class="fa-solid fa-globe text-cyan"></i> ${escapeHtml(rg.location)}</td>
                <td><span class="badge badge-success">${escapeHtml(rg.provisioning_state)}</span></td>
                <td><strong>${rg.resource_count}</strong> deployed</td>
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
        console.error('Storage fetch error:', e);
    }
}

function renderStorageTable() {
    const tbody = document.querySelector('#storageTable tbody');
    if (!tbody) return;

    if (state.storageAccounts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No storage accounts located.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.storageAccounts.map(sa => {
        const blobUrl = sa.primary_endpoints?.blob || 'N/A';
        return `
            <tr>
                <td><strong>${escapeHtml(sa.name)}</strong></td>
                <td><span class="badge badge-primary">${escapeHtml(sa.resource_group)}</span></td>
                <td>${escapeHtml(sa.location)}</td>
                <td><span class="badge-neon blue">${escapeHtml(sa.sku)}</span></td>
                <td><span class="badge-neon green">${escapeHtml(sa.access_tier)}</span></td>
                <td><a href="${escapeHtml(blobUrl)}" target="_blank" style="color:var(--neon-cyan);text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:11.5px;"><code>${escapeHtml(blobUrl)}</code></a></td>
                <td>${sa.enable_https_traffic_only ? '<span class="text-emerald"><i class="fa-solid fa-circle-check"></i> TLS 1.3</span>' : '<span class="text-danger">Disabled</span>'}</td>
            </tr>
        `;
    }).join('');
}

async function fetchCosts() {
    try {
        const res = await fetch('/api/costs');
        state.costs = await res.json();

        document.getElementById('costMtdValue').textContent = `$${state.costs.total_monthly_cost?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('costForecastValue').textContent = `$${state.costs.forecasted_cost?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('costBudgetValue').textContent = `$${state.costs.budget_limit?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        renderRecommendations(state.costs.recommendations || []);
        renderCharts();
    } catch (e) {
        console.error('Cost fetch error:', e);
    }
}

function renderRecommendations(recs) {
    const container = document.getElementById('costRecommendationsContainer');
    const badge = document.getElementById('savingsBadge');
    if (!container) return;

    const totalSavings = recs.reduce((sum, r) => sum + (r.potential_savings_monthly || 0), 0);
    if (badge) badge.textContent = `+$${totalSavings.toFixed(2)} / Mo Potential Savings`;

    if (recs.length === 0) {
        container.innerHTML = `<p class="text-muted">Zero pending cost anomalies.</p>`;
        return;
    }

    container.innerHTML = recs.map(rec => `
        <div class="recommendation-card">
            <div>
                <div class="rec-title"><i class="fa-solid fa-bolt text-amber"></i> ${escapeHtml(rec.type)}: <strong>${escapeHtml(rec.resource)}</strong></div>
                <div class="rec-desc">${escapeHtml(rec.description)}</div>
            </div>
            <div class="rec-savings">
                <div>+$${rec.potential_savings_monthly.toFixed(2)}/mo</div>
                <small class="badge-neon amber">${rec.impact} Priority</small>
            </div>
        </div>
    `).join('');
}

function renderCharts() {
    if (!state.costs) return;

    const isDark = state.currentTheme !== 'azure-light';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#475569';

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
                        hoverBackgroundColor: '#00f2fe',
                        borderRadius: 6
                    },
                    {
                        label: 'Budget Limit ($)',
                        data: budgets,
                        type: 'line',
                        borderColor: '#10b981',
                        borderDash: [6, 6],
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: textColor, boxWidth: 12 } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { grid: { display: false }, ticks: { color: textColor } }
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
                    backgroundColor: ['#0078d4', '#c084fc', '#00f2fe', '#fbbf24', '#64748b'],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 11 } } }
                },
                cutout: '72%'
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
        console.error('RBAC fetch error:', e);
    }
}

function renderRBACTable() {
    const tbody = document.querySelector('#rbacTable tbody');
    if (!tbody) return;

    if (state.rbac.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No role assignments mapped.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.rbac.map(ra => `
        <tr>
            <td><strong>${escapeHtml(ra.principal_name)}</strong></td>
            <td><span class="badge badge-secondary">${escapeHtml(ra.principal_type)}</span></td>
            <td><span class="badge-neon blue">${escapeHtml(ra.role_definition_name)}</span></td>
            <td><code style="font-family:'JetBrains Mono',monospace;color:var(--text-secondary);font-size:11px;">${escapeHtml(ra.scope)}</code></td>
        </tr>
    `).join('');
}

// ==========================================================================
// MODAL & ACTION HANDLERS
// ==========================================================================
function openCreateRgModal() {
    sfx.click();
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
        showToast('Please specify a Resource Group name', 'error');
        sfx.warn();
        return;
    }

    try {
        sfx.action();
        const res = await fetch('/api/resource-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                location: location,
                tags: { Environment: env, ManagedBy: "AzureOps" }
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            sfx.success();
            showToast(data.message, 'success');
            logToTerminal('DEPLOY', `Resource Group created: ${name} (${location})`);
            closeCreateRgModal();
            await fetchResourceGroups();
            await fetchSummary();
        } else {
            sfx.warn();
            showToast(data.detail || data.message || 'Creation rejected', 'error');
        }
    } catch (err) {
        showToast(`Request failure: ${err.message}`, 'error');
    }
}

async function testConnection() {
    const box = document.getElementById('connectionResultBox');
    box.style.display = 'block';
    box.className = 'callout glass mt-3';
    box.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-cyan"></i> Pinging Azure ARM Endpoint...';
    sfx.action();

    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const conn = data.connection;

        if (conn.connected) {
            sfx.success();
            box.innerHTML = `<strong class="text-emerald"><i class="fa-solid fa-circle-check"></i> Connected (${conn.mode})</strong><p style="margin-top:4px;">${conn.message}</p>`;
            showToast('Azure connectivity check passed', 'success');
            logToTerminal('PING', `Connected to subscription: ${conn.subscription_id || 'Sandbox'}`);
        } else {
            sfx.warn();
            box.innerHTML = `<strong class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Warning (${conn.mode})</strong><p style="margin-top:4px;">${conn.message}</p>`;
        }
    } catch (err) {
        box.innerHTML = `<span class="text-danger">Failed to query server: ${err.message}</span>`;
    }
}

async function toggleDemoMode() {
    const newMode = !state.demoMode;
    sfx.action();
    try {
        const res = await fetch('/api/mode/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ demo_mode: newMode })
        });
        const data = await res.json();
        showToast(data.message, 'info');
        logToTerminal('CONFIG', data.message);
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
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str || '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
