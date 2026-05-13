const API = {
    users:       '../api/users.php',
    foundItems:  '../api/found_items.php',
    lostReports: '../api/lost_reports.php',
    claims:      '../api/claims.php',
};

async function post(url, data = {}) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    const res = await fetch(url, { method: 'POST', body: fd });
    return res.json();
}
async function get(url) { return (await fetch(url)).json(); }

function getSession() { return JSON.parse(sessionStorage.getItem('yic_current_user')); }
function setSession(u) { sessionStorage.setItem('yic_current_user', JSON.stringify(u)); }
function clearSession() { sessionStorage.removeItem('yic_current_user'); }

function esc(str) { return String(str ?? '').replace(/[&<>]/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function createModal(id, html) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div'); el.id = id; el.className = 'alert-box';
        el.innerHTML = html; document.body.appendChild(el);
    }
    return el;
}
const alertModal = createModal('custom-alert', `<div class="alert-content"><p id="alert-message"></p><button id="alert-ok">OK</button></div>`);
function showAlert(msg, cb) {
    document.getElementById('alert-message').innerText = msg;
    alertModal.style.display = 'flex';
    document.getElementById('alert-ok').onclick = () => { alertModal.style.display = 'none'; if(cb) cb(); };
}

const confirmModal = createModal('custom-confirm', `<div class="alert-content confirm-box"><p id="confirm-message"></p><div style="display:flex;gap:15px;justify-content:center;margin-top:10px;"><button id="confirm-yes">Yes</button><button id="confirm-no">No</button></div></div>`);
function showConfirm(msg, onYes, onNo) {
    document.getElementById('confirm-message').innerText = msg;
    confirmModal.style.display = 'flex';
    const yes = document.getElementById('confirm-yes'), no = document.getElementById('confirm-no');
    const newYes = yes.cloneNode(true), newNo = no.cloneNode(true);
    yes.parentNode.replaceChild(newYes, yes); no.parentNode.replaceChild(newNo, no);
    newYes.onclick = () => { confirmModal.style.display = 'none'; if(onYes) onYes(); };
    newNo.onclick  = () => { confirmModal.style.display = 'none'; if(onNo) onNo(); };
}

const promptModal = createModal('custom-prompt', `<div class="alert-content confirm-box prompt-box"><p id="prompt-message"></p><input type="text" id="prompt-input" class="prompt-input"><div class="prompt-actions"><button id="prompt-yes">Submit</button><button id="prompt-no">Cancel</button></div></div>`);
function showPrompt(msg, onConfirm) {
    document.getElementById('prompt-message').innerText = msg;
    const inp = document.getElementById('prompt-input'); inp.value = ''; inp.classList.remove('input-error');
    promptModal.style.display = 'flex';
    document.getElementById('prompt-yes').onclick = () => {
        const val = inp.value.trim();
        if (val) { promptModal.style.display = 'none'; onConfirm(val); }
        else inp.classList.add('input-error');
    };
    document.getElementById('prompt-no').onclick = () => { promptModal.style.display = 'none'; };
}

async function updateAdminBadge() {
    const badge = document.getElementById('admin-claims-badge');
    if (!badge) return;
    const res = await get(`${API.claims}?action=getAll`);
    const pending = res.success ? res.data.filter(c => c.status === 'pending').length : 0;
    badge.innerText = pending || '';
    badge.style.display = pending ? 'inline-block' : 'none';
}
async function updateStudentBadge() {
    const badge = document.getElementById('student-claims-badge'), user = getSession();
    if (!badge || !user) return;
    const res = await get(`${API.claims}?action=getByStudent&student_id=${user.id}`);
    const count = res.success ? res.data.filter(c => c.status !== 'pending').length : 0;
    badge.innerText = count || '';
    badge.style.display = count ? 'inline-block' : 'none';
}

function statusClass(status, type = 'item') {
    const map = { available: 'status-green', claimed: 'status-under-review', delivered: 'status-approved',
                  pending: 'status-under-review', approved: 'status-approved', rejected: 'status-rejected',
                  found: 'status-approved', closed: 'status-red' };
    return map[status] || '';
}
function statusLabel(status) {
    const map = { pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected' };
    return map[status] || cap(status);
}

function renderTable(tbody, rows, columns, rowRenderer) {
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="${columns}" style="text-align:center;">No data</td></tr>`; return; }
    tbody.innerHTML = rows.map(rowRenderer).join('');
}

function attachDelegatedActions(container, selector, handler) {
    if (!container) return;
    container.querySelectorAll(selector).forEach(btn => btn.removeEventListener('click', handler));
    container.querySelectorAll(selector).forEach(btn => btn.addEventListener('click', handler));
}

async function loadAdminDashboard() {
    const user = getSession();
    const [items, claims] = await Promise.all([get(`${API.foundItems}?action=getAll`), get(`${API.claims}?action=getAll`)]);
    if (items.success) {
        const delivered = items.data.filter(i => i.status === 'claimed').length;
        document.getElementById('delivered-count') && (document.getElementById('delivered-count').innerText = delivered);
        document.getElementById('total-found-count') && (document.getElementById('total-found-count').innerText = items.data.length);
    }
    if (claims.success) {
        const pending = claims.data.filter(c => c.status === 'pending').length;
        document.getElementById('pending-claims-count') && (document.getElementById('pending-claims-count').innerText = pending);
        const tbody = document.querySelector('.data-table tbody');
        const pendingClaims = claims.data.filter(c => c.status === 'pending').slice(0,5);
        renderTable(tbody, pendingClaims, 4, c => `
            <tr><td>${esc(c.student_name)}</td><td>${esc(c.item_name)}</td><td>${formatDate(c.submitted_at)}</td>
            <td><div class="admin-actions"><a href="#" class="status-badge status-green approve-btn" data-id="${c.claim_id}">Approve</a>
            <a href="#" class="status-badge status-red reject-btn" data-id="${c.claim_id}">Reject</a></div></td></tr>
        `);
        attachDelegatedActions(tbody, '.approve-btn', async (e) => {
            e.preventDefault(); const id = e.target.dataset.id;
            showConfirm('Approve this claim?', async () => {
                const res = await post(`${API.claims}?action=review&id=${id}`, { status:'approved', reviewed_by:user.id });
                showAlert(res.message, loadAdminDashboard);
                updateAdminBadge(); updateStudentBadge();
            });
        });
        attachDelegatedActions(tbody, '.reject-btn', async (e) => {
            e.preventDefault(); const id = e.target.dataset.id;
            showConfirm('Reject this claim?', async () => {
                const res = await post(`${API.claims}?action=review&id=${id}`, { status:'rejected', reviewed_by:user.id });
                showAlert(res.message, loadAdminDashboard);
                updateAdminBadge(); updateStudentBadge();
            });
        });
    }
}

async function loadManageItems() {
    const res = await get(`${API.foundItems}?action=getAll`);
    const tbody = document.querySelector('.data-table tbody');
    renderTable(tbody, res.success ? res.data : [], 4, item => `
        <tr><td>${esc(item.item_name)}</td><td>${esc(item.location_found)}</td>
        <td><span class="status-badge ${statusClass(item.status)}">${cap(item.status)}</span></td>
        <td><div class="admin-actions"><a href="#" class="status-badge status-green edit-item-btn" data-id="${item.item_id}">Edit</a>
        <a href="#" class="status-badge status-red delete-item-btn" data-id="${item.item_id}">Delete</a></div></td></tr>
    `);
    attachDelegatedActions(tbody, '.delete-item-btn', async (e) => {
        e.preventDefault(); const id = e.target.dataset.id;
        showConfirm('Delete this item?', async () => {
            const res = await post(`${API.foundItems}?action=delete&id=${id}`);
            showAlert(res.message, loadManageItems);
        });
    });
    attachDelegatedActions(tbody, '.edit-item-btn', async (e) => {
        e.preventDefault(); const id = e.target.dataset.id;
        const res = await get(`${API.foundItems}?action=getOne&id=${id}`);
        const item = res.data;
        document.getElementById('item-name').value = item.item_name;
        document.getElementById('date-found').value = item.date_found;
        document.getElementById('category').value = item.category;
        document.getElementById('location').value = item.location_found;
        document.getElementById('description').value = item.description || '';
        const form = document.getElementById('add-item-form');
        form.dataset.editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Item';
    });
}

async function loadManageClaims() {
    const res = await get(`${API.claims}?action=getAll`);
    const tbody = document.querySelector('.data-table tbody');
    renderTable(tbody, res.success ? res.data : [], 6, c => `
        <tr><td>${esc(c.student_name)}</td><td>${esc(c.item_name)}</td><td>${formatDate(c.submitted_at)}</td>
        <td><a href="#" class="status-badge status-teal view-proof-btn" data-proof="${esc(c.proof_details || 'No proof')}">View</a></td>
        <td><span class="status-badge ${statusClass(c.status, 'claim')}">${cap(c.status)}</span></td>
        <td>${c.status === 'pending' ? `<div class="admin-actions"><a href="#" class="status-badge status-green approve-btn" data-id="${c.claim_id}">Approve</a>
        <a href="#" class="status-badge status-red reject-btn" data-id="${c.claim_id}">Reject</a></div>` : '<span style="color:#888;">Done</span>'}</td></tr>
    `);
    attachDelegatedActions(tbody, '.approve-btn', async (e) => {
        e.preventDefault(); const id = e.target.dataset.id;
        showConfirm('Approve?', async () => {
            const res = await post(`${API.claims}?action=review&id=${id}`, { status:'approved', reviewed_by:getSession().id });
            showAlert(res.message, loadManageClaims); updateAdminBadge(); updateStudentBadge();
        });
    });
    attachDelegatedActions(tbody, '.reject-btn', async (e) => {
        e.preventDefault(); const id = e.target.dataset.id;
        showConfirm('Reject?', async () => {
            const res = await post(`${API.claims}?action=review&id=${id}`, { status:'rejected', reviewed_by:getSession().id });
            showAlert(res.message, loadManageClaims); updateAdminBadge(); updateStudentBadge();
        });
    });
    attachDelegatedActions(tbody, '.view-proof-btn', e => { e.preventDefault(); showAlert(e.target.dataset.proof); });
}

async function loadFoundItems() {
    const res = await get(`${API.foundItems}?action=getAll`);
    const grid = document.querySelector('.items-grid');
    if (!grid) return;
    const available = res.success ? res.data.filter(i => i.status === 'available') : [];
    if (!available.length) { grid.innerHTML = '<p style="color:#888;">No items available.</p>'; return; }
    grid.innerHTML = available.map(item => `
        <div class="item-card"><div><h4>${esc(item.item_name)}</h4><p class="item-meta">${esc(item.location_found)} – ${formatDate(item.date_found)}</p>
        ${item.description ? `<p style="color:#aaa;">${esc(item.description)}</p>` : ''}</div>
        <div class="card-actions"><a href="#" class="status-badge status-purple claim-btn" data-id="${item.item_id}">Claim it</a></div></div>
    `).join('');
    attachDelegatedActions(grid, '.claim-btn', async (e) => {
        e.preventDefault(); const user = getSession();
        if (!user) { showAlert('Please log in first.'); return; }
        showConfirm('Claim this item?', () => {
            showPrompt('Proof of ownership:', async (proof) => {
                const res = await post(`${API.claims}?action=create`, { student_id:user.id, item_id:e.target.dataset.id, proof_details:proof });
                showAlert(res.message);
                if (res.success) { loadFoundItems(); updateStudentBadge(); }
            });
        });
    });
}

async function loadMyClaims() {
    const user = getSession(); if (!user) return;
    const res = await get(`${API.claims}?action=getByStudent&student_id=${user.id}`);
    const tbody = document.querySelector('.data-table tbody');
    renderTable(tbody, res.success ? res.data : [], 4, c => `
        <tr>
            <td>${esc(c.item_name)}</td>
            <td>${formatDate(c.submitted_at)}</td>
            <td>
                <span class="status-badge ${statusClass(c.status, 'claim')}">${statusLabel(c.status)}</span>
                ${c.status === 'approved' ? '<div style="font-size:0.75rem; color:#888; margin-top:4px;">📍 Please visit the YIC Amanah office to collect your item.</div>' : ''}
            </td>
            <td>${c.proof_details ? `<span class="status-badge status-purple view-proof-btn" data-proof="${esc(c.proof_details)}">View</span>` : '-'}</td>
        </tr>
    `);
    attachDelegatedActions(tbody, '.view-proof-btn', e => { e.preventDefault(); showAlert(e.target.dataset.proof); });
}

async function loadReportItem() {
    const user = getSession(); if (!user) return;
    const res = await get(`${API.lostReports}?action=getByStudent&student_id=${user.id}`);
    const tbody = document.querySelector('.data-table tbody');
    renderTable(tbody, res.success ? res.data : [], 5, r => `
        <tr><td>${esc(r.item_name)}</td><td>${formatDate(r.date_lost)}</td><td>${esc(r.location_lost)}</td>
        <td>
                <span class="status-badge ${statusClass(r.status)}">${cap(r.status)}</span>
                ${r.status === 'found' ? '<div style="font-size:0.75rem; color:#888; margin-top:4px;">📍 Your item has been located! Please check the Amanah office.</div>' : ''}
            </td>
        <td><a href="#" class="status-badge status-red delete-report-btn" data-id="${r.report_id}">Delete</a></td></tr>
    `);
    attachDelegatedActions(tbody, '.delete-report-btn', async (e) => {
        e.preventDefault(); const id = e.target.dataset.id;
        showConfirm('Delete this report?', async () => {
            const res = await post(`${API.lostReports}?action=delete&id=${id}`);
            showAlert(res.message, loadReportItem);
        });
    });
}

async function loadStudentDashboard() {
    const user = getSession(); if (!user) return;
    const [reports, claims, items] = await Promise.all([
        get(`${API.lostReports}?action=getByStudent&student_id=${user.id}`),
        get(`${API.claims}?action=getByStudent&student_id=${user.id}`),
        get(`${API.foundItems}?action=getAll`)
    ]);
    if (reports.success) document.getElementById('active-reports-count') && (document.getElementById('active-reports-count').innerText = reports.data.filter(r => r.status === 'pending').length);
    if (claims.success) document.getElementById('total-reunited-count') && (document.getElementById('total-reunited-count').innerText = claims.data.filter(c => c.status === 'approved').length);
    if (claims.success) document.getElementById('my-claims-count') && (document.getElementById('my-claims-count').innerText = claims.data.length);
    if (items.success) document.getElementById('items-available-count') && (document.getElementById('items-available-count').innerText = items.data.filter(i => i.status === 'available').length);
}

async function loadAllLostReports() {
    const res = await get(`${API.lostReports}?action=getAll`);
    const tbody = document.getElementById('lost-reports-tbody');
    renderTable(tbody, res.success ? res.data : [], 7, r => `
        <tr><td>${esc(r.student_name)}</td><td>${esc(r.item_name)}</td><td>${cap(r.category)}</td><td>${esc(r.location_lost)}</td>
        <td>${formatDate(r.date_lost)}</td><td><span class="status-badge ${statusClass(r.status)}">${cap(r.status)}</span></td>
        <td>${r.status === 'pending' ? `<div class="admin-actions"><a href="#" class="status-badge status-green mark-found-btn" data-id="${r.report_id}">Mark Found</a>
        <a href="#" class="status-badge status-red close-btn" data-id="${r.report_id}">Close</a></div>` : '—'}</td></tr>
    `);
    attachDelegatedActions(tbody, '.mark-found-btn', async (e) => {
        e.preventDefault(); const id = e.target.dataset.id;
        showConfirm('Mark as found?', async () => {
            const res = await post(`${API.lostReports}?action=updateStatus&id=${id}`, { status:'found' });
            showAlert(res.message, loadAllLostReports);
        });
    });
    attachDelegatedActions(tbody, '.close-btn', async (e) => {
        e.preventDefault(); const id = e.target.dataset.id;
        showConfirm('Close this report?', async () => {
            const res = await post(`${API.lostReports}?action=updateStatus&id=${id}`, { status:'closed' });
            showAlert(res.message, loadAllLostReports);
        });
    });
}

async function loadRecentFoundItems() {
    const res = await get(`${API.foundItems}?action=getAll`);
    const grid = document.getElementById('recent-items-grid');
    if (!grid) return;
    const available = res.data?.filter(i => i.status === 'available').sort((a, b) => b.item_id - a.item_id).slice(0, 3) || [];
    const noMsg = document.getElementById('no-items-message');

    if (!available.length) {
        if (noMsg) noMsg.style.display = 'block';
        grid.innerHTML = '';
        return;
    }

    if (noMsg) noMsg.style.display = 'none';
    grid.innerHTML = available.map(item => `
        <div class="item-card">
            <div>
                <h4>${esc(item.item_name)}</h4>
                <p class="item-meta">${esc(item.location_found)} - ${formatDate(item.date_found)}</p>
                ${item.description ? `<p style="color:#aaa;">${esc(item.description)}</p>` : ''}
            </div>
            <div class="card-actions">
                <a href="#" class="status-badge status-purple claim-btn" data-id="${item.item_id}">Claim it</a>
            </div>
        </div>
    `).join('');
    attachDelegatedActions(grid, '.claim-btn', async (e) => {
        e.preventDefault(); 
        const user = getSession();
        if (!user) { showAlert('Please log in first.'); return; }
        showConfirm('Claim this item?', () => {
            showPrompt('Proof of ownership:', async (proof) => {
                const res = await post(`${API.claims}?action=create`, { student_id: user.id, item_id: e.target.dataset.id, proof_details: proof });
                showAlert(res.message);
                if (res.success) { loadRecentFoundItems(); updateStudentBadge(); }
            });
        });
    });
}

function initStudentAuth() {
    const loginBox = document.getElementById('student-login-box'), signupBox = document.getElementById('student-signup-box');
    if (!loginBox) return;
    document.getElementById('show-student-signup')?.addEventListener('click', e => { e.preventDefault(); loginBox.style.display='none'; signupBox.style.display='block'; });
    document.getElementById('show-student-login')?.addEventListener('click', e => { e.preventDefault(); signupBox.style.display='none'; loginBox.style.display='block'; });
    document.getElementById('student-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await post(`${API.users}?action=login`, { email: document.getElementById('student-email').value.trim(), password: document.getElementById('student-password').value, role: 'student' });
        if (res.success && res.user.role === 'student') {
            setSession({ email:res.user.email, name:res.user.full_name, role:'student', id:res.user.user_id });
            showAlert(`Welcome ${res.user.full_name}!`, () => location.href='Student_dashboard.html');
        } else showAlert(res.message || 'Invalid credentials.');
    });
    document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reg = await post(`${API.users}?action=register`, {
            full_name: document.getElementById('student-fullname').value.trim(),
            email: document.getElementById('student-reg-email').value.trim(),
            password: document.getElementById('student-reg-password').value,
            confirm_password: document.getElementById('student-confirm-password').value
        });
        if (reg.success) {
            const login = await post(`${API.users}?action=login`, { email: reg.email, password: reg.password });
            if (login.success) setSession({ email:login.user.email, name:login.user.full_name, role:'student', id:login.user.user_id });
            showAlert('Account created!', () => location.href='Student_dashboard.html');
        } else showAlert(reg.message);
    });
}

function initAdminAuth() {
    const loginBox = document.getElementById('admin-login-box'), signupBox = document.getElementById('admin-signup-box');
    if (!loginBox) return;
    document.getElementById('show-admin-signup')?.addEventListener('click', e => { e.preventDefault(); loginBox.style.display='none'; signupBox.style.display='block'; });
    document.getElementById('show-admin-login')?.addEventListener('click', e => { e.preventDefault(); signupBox.style.display='none'; loginBox.style.display='block'; });
    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await post(`${API.users}?action=login`, { email: document.getElementById('admin-email').value.trim(), password: document.getElementById('admin-password').value, role: 'admin' });
        if (res.success && res.user.role === 'admin') {
            setSession({ email:res.user.email, name:res.user.full_name, role:'admin', id:res.user.user_id });
            showAlert(`Welcome ${res.user.full_name}!`, () => location.href='admin_dashboard.html');
        } else showAlert(res.message || 'Invalid credentials.');
    });
    document.getElementById('admin-signup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = document.getElementById('admin-fullname').value.trim();
        const email = document.getElementById('admin-reg-email').value.trim();
        const password = document.getElementById('admin-reg-password').value;
        const confirm_password = document.getElementById('admin-confirm-password').value;
        const invite_token = document.getElementById('admin-invite-token').value.trim();

        const reg = await post(`${API.users}?action=registerAdmin`, {
            full_name, email, password, confirm_password, invite_token
        });
        if (reg.success) {
            const login = await post(`${API.users}?action=login`, { email, password });
            if (login.success && login.user.role === 'admin') {
                setSession({ email: login.user.email, name: login.user.full_name, role: 'admin', id: login.user.user_id });
                showAlert('Admin account created!', () => location.href = 'admin_dashboard.html');
            } else {
                showAlert('Account created but auto-login failed. Please log in manually.', () => {
                    loginBox.style.display = 'block';
                    signupBox.style.display = 'none';
                });
            }
        } else {
            showAlert(reg.message);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateAdminBadge(); updateStudentBadge();
    const page = window.location.pathname.split('/').pop();
    const user = getSession();

    const studentPages = ['Student_dashboard.html','report_item.html','found_items.html','my_claims.html'];
    const adminPages   = ['admin_dashboard.html','manage_items.html','manage_claims.html','manage_lost_reports.html'];
    if (studentPages.includes(page) && (!user || user.role !== 'student')) {
        showAlert('Student area only.', () => location.href='student_auth.html'); return;
    }
    if (adminPages.includes(page) && (!user || user.role !== 'admin')) {
        showAlert('Admin area only.', () => location.href='admin_auth.html'); return;
    }

    if (user) {
        const welcome = document.querySelector('.welcome-header h1');
        if (welcome && welcome.innerText.includes('Welcome back,')) welcome.innerText = `Welcome back, ${user.name.split(' ')[0]}`;
        const avatar = document.querySelector('.user-avatar');
        if (avatar && avatar.innerText.length <= 3) avatar.innerText = user.name.split(' ').map(n=>n[0]).join('').toUpperCase();
        const nameSpan = document.querySelector('.user-profile-menu strong');
        if (nameSpan) nameSpan.innerText = user.name;
        const roleSpan = document.querySelector('.user-profile-menu p:last-child');
        if (roleSpan) roleSpan.innerText = user.role === 'admin' ? 'Administrator, YIC' : 'Student, YIC';
    }
    document.getElementById('current-date-display') && (() => {
        const d = new Date();
        document.getElementById('current-date-display').innerText = `${d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })} | YIC Campus`;
    })();

   const todayStr = new Date().toISOString().split('T')[0];
    const dFound = document.getElementById('date-found');
    if (dFound) dFound.max = todayStr;
    const dLost = document.getElementById('date-lost');
    if (dLost) dLost.max = todayStr;

    document.addEventListener('click', e => {
        let t = e.target; while(t && t !== document.body) {
            if (t.classList?.contains('logout-btn')) {
                e.preventDefault();
                showConfirm('Log out?', async () => { clearSession(); await post(`${API.users}?action=logout`); location.href='Index.html'; });
                return;
            } t = t.parentElement;
        }
    });

    const search = document.querySelector('.search-bar');
    if (search) search.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.item-card, .data-table tbody tr').forEach(el => el.style.display = el.innerText.toLowerCase().includes(term) ? '' : 'none');
    });

    const form = document.getElementById('add-item-form');
    if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = form.dataset.editId;
        const data = { item_name: document.getElementById('item-name').value.trim(), date_found: document.getElementById('date-found').value,
                       category: document.getElementById('category').value, location_found: document.getElementById('location').value.trim(),
                       description: document.getElementById('description').value.trim() };
        if (!data.item_name || !data.date_found || !data.location_found) { showAlert('Please fill required fields.'); return; }
        let res;
        if (editId) res = await post(`${API.foundItems}?action=update&id=${editId}`, data);
        else { data.posted_by = getSession().id; res = await post(`${API.foundItems}?action=create`, data); }
        if (res.success) {
            form.reset(); delete form.dataset.editId; form.querySelector('button[type="submit"]').innerText = 'Submit';
            showAlert(res.message, loadManageItems);
        } else showAlert(res.message);
    });
    document.getElementById('report-item-form')?.addEventListener('submit', async (e) => {
        e.preventDefault(); const user = getSession();
        const data = { student_id: user.id, item_name: document.getElementById('item-name').value.trim(), date_lost: document.getElementById('date-lost').value,
                       category: document.getElementById('category').value, location_lost: document.getElementById('location').value.trim(),
                       description: document.getElementById('description').value.trim() };
        if (!data.item_name || !data.date_lost || !data.location_lost) { showAlert('Please fill required fields.'); return; }
        const res = await post(`${API.lostReports}?action=create`, data);
        if (res.success) showAlert('Report submitted!', () => { e.target.reset(); loadReportItem(); });
        else showAlert(res.message);
    });

    switch (page) {
        case 'student_auth.html': initStudentAuth(); break;
        case 'admin_auth.html': initAdminAuth(); break;
        case 'admin_dashboard.html': loadAdminDashboard(); 
            document.getElementById('generate-invite-btn')?.addEventListener('click', async () => {
                const user = getSession();
                if (!user || user.role !== 'admin') { showAlert('Unauthorised.'); return; }
                const res = await post(`${API.users}?action=generateInvite`, { admin_id: user.id });
                showAlert(res.success ? `Invite token (24h valid):\n\n${res.token}` : res.message);
            }); break;
        case 'manage_items.html': loadManageItems(); break;
        case 'manage_claims.html': loadManageClaims(); break;
        case 'found_items.html': loadFoundItems(); break;
        case 'my_claims.html': loadMyClaims(); break;
        case 'report_item.html': loadReportItem(); break;
        case 'Student_dashboard.html': loadStudentDashboard(); loadRecentFoundItems(); break;
        case 'manage_lost_reports.html': loadAllLostReports(); break;
    }
});
