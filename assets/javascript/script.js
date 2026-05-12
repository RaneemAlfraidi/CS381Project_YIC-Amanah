// ============================================================
//  YIC Amanah – Main Script (Phase 3 rewrite)
//  All data now comes from the PHP API via fetch().
//  sessionStorage is used to hold the session user object.
// ============================================================

// ── API base paths ───────────────────────────────────────────
const API = {
    users:       '../api/users.php',
    foundItems:  '../api/found_items.php',
    lostReports: '../api/lost_reports.php',
    claims:      '../api/claims.php',
};

// ── Helpers ──────────────────────────────────────────────────

/** POST helper – sends FormData or plain object as POST body */
async function post(url, data = {}) {
    const form = new FormData();
    for (const [k, v] of Object.entries(data)) form.append(k, v);
    const res  = await fetch(url, { method: 'POST', body: form });
    return res.json();
}

/** GET helper */
async function get(url) {
    const res = await fetch(url);
    return res.json();
}

/** Session helpers */
function getSession()     { return JSON.parse(sessionStorage.getItem('yic_current_user')); }
function setSession(user) { sessionStorage.setItem('yic_current_user', JSON.stringify(user)); }
function clearSession()   { sessionStorage.removeItem('yic_current_user'); }

// ── Custom alert / confirm / prompt (unchanged UI) ──────────
function showAlert(message, callback) {
    let box = document.getElementById('custom-alert');
    if (!box) {
        box = document.createElement('div');
        box.id        = 'custom-alert';
        box.className = 'alert-box';
        box.innerHTML = `<div class="alert-content"><p id="alert-message"></p><button id="alert-ok">OK</button></div>`;
        document.body.appendChild(box);
    }
    document.getElementById('alert-message').innerText = message;
    box.style.display = 'flex';
    document.getElementById('alert-ok').onclick = () => {
        box.style.display = 'none';
        if (callback) callback();
    };
}

function showConfirm(message, onYes, onNo) {
    let box = document.getElementById('custom-confirm');
    if (!box) {
        box = document.createElement('div');
        box.id        = 'custom-confirm';
        box.className = 'alert-box';
        box.innerHTML = `
            <div class="alert-content confirm-box">
                <p id="confirm-message"></p>
                <div style="display:flex;gap:15px;justify-content:center;margin-top:10px;">
                    <button id="confirm-yes" style="background-color:#2b5c3f;">Yes</button>
                    <button id="confirm-no"  style="background-color:#7f2d2d;">No</button>
                </div>
            </div>`;
        document.body.appendChild(box);
    }
    document.getElementById('confirm-message').innerText = message;
    box.style.display = 'flex';
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn  = document.getElementById('confirm-no');
    const newYes = yesBtn.cloneNode(true);
    const newNo  = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo,  noBtn);
    newYes.onclick = () => { box.style.display = 'none'; if (onYes) onYes(); };
    newNo.onclick  = () => { box.style.display = 'none'; if (onNo)  onNo();  };
}

function showPrompt(message, onConfirm) {
    let box = document.getElementById('custom-prompt');
    if (!box) {
        box = document.createElement('div');
        box.id = 'custom-prompt';
        box.className = 'alert-box';
        box.innerHTML = `
            <div class="alert-content confirm-box prompt-box">
                <p id="prompt-message"></p>
                <input type="text" id="prompt-input" class="prompt-input" placeholder="Type here...">
                <div class="prompt-actions">
                    <button id="prompt-yes" class="prompt-btn-yes">Submit</button>
                    <button id="prompt-no" class="prompt-btn-no">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(box);
    }

    document.getElementById('prompt-message').innerText = message;
    const input = document.getElementById('prompt-input');
    input.value = ''; 
    input.classList.remove('input-error'); 
    box.style.display = 'flex';

    document.getElementById('prompt-yes').onclick = () => {
        const val = input.value.trim();
        if (val) {
            box.style.display = 'none';
            if (onConfirm) onConfirm(val);
        } else {
            input.classList.add('input-error'); 
        }
    };
    
    document.getElementById('prompt-no').onclick = () => {
        box.style.display = 'none';
    };
}

// ── Utility functions for display ───────────────────────────
function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function statusClass(status) {
    return { available: 'status-green', claimed: 'status-under-review', delivered: 'status-approved' }[status] || '';
}

function claimStatusClass(status) {
    return { pending: 'status-under-review', approved: 'status-approved', rejected: 'status-rejected' }[status] || '';
}

function claimStatusLabel(status) {
    return { pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected' }[status] || cap(status);
}

function reportStatusClass(status) {
    return { pending: 'status-under-review', found: 'status-approved', closed: 'status-red' }[status] || '';
}

// ── Badge updaters (renamed but fully functional) ───────────
async function updateAdminNotification() {
    const badge = document.getElementById('admin-claims-badge');
    if (!badge) return;
    const res = await get(`${API.claims}?action=getAll`);
    if (res.success && res.data) {
        const pendingCount = res.data.filter(c => c.status === 'pending').length;
        if (pendingCount > 0) {
            badge.innerText = pendingCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function updateStudentNotification() {
    const badge = document.getElementById('student-claims-badge');
    if (!badge) return;
    const user = getSession();
    if (!user) return;
    const res = await get(`${API.claims}?action=getByStudent&student_id=${user.id}`);
    if (res.success && res.data) {
        const updatedCount = res.data.filter(c => c.status !== 'pending').length;
        if (updatedCount > 0) {
            badge.innerText = updatedCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ── Global claim action buttons (approve/reject/view) with badge refresh ──
function attachClaimButtons(container, refreshCallback) {
    // Approve buttons
    container.querySelectorAll('.approve-btn').forEach(btn => {
        // Remove old listener to avoid duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const user = getSession();
            showConfirm('Approve this claim?', async () => {
                const res = await post(`${API.claims}?action=review&id=${newBtn.dataset.id}`, {
                    status: 'approved',
                    reviewed_by: user?.id,
                });
                showAlert(res.message, () => {
                    if (refreshCallback) refreshCallback();
                    updateAdminNotification();
                    updateStudentNotification();
                });
            });
        });
    });

    // Reject buttons
    container.querySelectorAll('.reject-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const user = getSession();
            showConfirm('Reject this claim?', async () => {
                const res = await post(`${API.claims}?action=review&id=${newBtn.dataset.id}`, {
                    status: 'rejected',
                    reviewed_by: user?.id,
                });
                showAlert(res.message, () => {
                    if (refreshCallback) refreshCallback();
                    updateAdminNotification();
                    updateStudentNotification();
                });
            });
        });
    });

    // View proof buttons
    container.querySelectorAll('.view-proof-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAlert(newBtn.dataset.proof);
        });
    });
}

// ── Page routing ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    updateAdminNotification();
    updateStudentNotification();
    const page        = window.location.pathname.split('/').pop();
    const currentUser = getSession();

    // ── Route protection ──────────────────────────────────────
    const studentPages = ['Student_dashboard.html', 'report_item.html', 'found_items.html', 'my_claims.html'];
    const adminPages   = ['admin_dashboard.html', 'manage_items.html', 'manage_claims.html', 'manage_lost_reports.html'];

    if (studentPages.includes(page)) {
        if (!currentUser || currentUser.role !== 'student') {
            showAlert('Student area only. Please log in as a student.', () => {
                window.location.href = 'student_auth.html';
            });
            return;
        }
        updateUserInterface(currentUser);
    }

    if (adminPages.includes(page)) {
        if (!currentUser || currentUser.role !== 'admin') {
            showAlert('Admin area only. Please log in as admin.', () => {
                window.location.href = 'admin_auth.html';
            });
            return;
        }
        updateUserInterface(currentUser);
    }

    // ── Update sidebar name / avatar ──────────────────────────
    function updateUserInterface(user) {
        const welcomeHeader = document.querySelector('.welcome-header h1');
        if (welcomeHeader && welcomeHeader.textContent.includes('Welcome back,')) {
            welcomeHeader.textContent = `Welcome back, ${user.name.split(' ')[0]}`;
        }
        const userAvatar   = document.querySelector('.user-avatar');
        const userNameSpan = document.querySelector('.user-profile-menu strong');
        const userRoleSpan = document.querySelector('.user-profile-menu p:last-child');
        if (userAvatar && userAvatar.textContent.trim().length <= 3) {
            userAvatar.textContent = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        }
        if (userNameSpan) userNameSpan.textContent = user.name;
        if (userRoleSpan) userRoleSpan.textContent = user.role === 'admin' ? 'Administrator, YIC' : 'Student, YIC';
    }

    // ── Dynamic current date ──────────────────────────────────
    function setCurrentDate() {
        const dateElement = document.getElementById('current-date-display');
        if (!dateElement) return;
        const now = new Date();
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        const formattedDate = now.toLocaleDateString('en-US', options);
        dateElement.textContent = `${formattedDate} | YIC Campus`;
    }
    if (document.getElementById('current-date-display')) {
        setCurrentDate();
    }

    // ── Logout ────────────────────────────────────────────────
    document.addEventListener('click', (e) => {
       let target = e.target;
       while (target && target !== document.body) {
            if (target.classList?.contains('logout-btn')) {
                e.preventDefault();
                showConfirm('Log out?', async () => {
                    clearSession();
                    try {
                        await post(`${API.users}?action=logout`);
                    } catch (error) {
                        console.log("Ignored server error during logout");
                    }
                    window.location.href = 'Index.html';
                });
                return;
            }
            target = target.parentElement;
        }
    });

    // ── Search bar (client-side filter) ──────────────────────
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.item-card, .data-table tbody tr').forEach(el => {
                el.style.display = el.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

    // ══════════════════════════════════════════════════════════
    //  PAGE: student_auth.html (unchanged, fully functional)
    // ══════════════════════════════════════════════════════════
    const studentLoginBox  = document.getElementById('student-login-box');
    const studentSignupBox = document.getElementById('student-signup-box');

    if (studentLoginBox && studentSignupBox) {
        document.getElementById('show-student-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            studentLoginBox.style.display  = 'none';
            studentSignupBox.style.display = 'block';
        });
        document.getElementById('show-student-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            studentSignupBox.style.display = 'none';
            studentLoginBox.style.display  = 'block';
        });
    }

    document.getElementById('student-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('student-email').value.trim();
        const password = document.getElementById('student-password').value;
        if (!email || !password) { showAlert('Please fill in both fields.'); return; }

        const data = await post(`${API.users}?action=login`, { email, password });
        if (data.success && data.user.role === 'student') {
            setSession({ email: data.user.email, name: data.user.full_name, role: 'student', id: data.user.user_id });
            showAlert(`Welcome back, ${data.user.full_name}!`, () => {
                window.location.href = 'Student_dashboard.html';
            });
        } else if (data.success && data.user.role !== 'student') {
            showAlert('This account is not a student account.');
        } else {
            showAlert(data.message || 'Invalid credentials.');
        }
    });

    document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name        = document.getElementById('student-fullname').value.trim();
        const email            = document.getElementById('student-reg-email').value.trim();
        const password         = document.getElementById('student-reg-password').value;
        const confirm_password = document.getElementById('student-confirm-password').value;

        if (!full_name || !email || !password) { showAlert('Please fill all fields.'); return; }

        const data = await post(`${API.users}?action=register`, { full_name, email, password, confirm_password });
        if (data.success) {
            const login = await post(`${API.users}?action=login`, { email, password });
            if (login.success) {
                setSession({ email: login.user.email, name: login.user.full_name, role: 'student', id: login.user.user_id });
            }
            showAlert(`Account created! Welcome, ${full_name}!`, () => {
                window.location.href = 'Student_dashboard.html';
            });
        } else {
            showAlert(data.message || 'Registration failed.');
        }
    });

    // ══════════════════════════════════════════════════════════
    //  PAGE: admin_auth.html (FULLY FIXED with signup & invite)
    // ══════════════════════════════════════════════════════════
    const adminLoginBox  = document.getElementById('admin-login-box');
    const adminSignupBox = document.getElementById('admin-signup-box');
    if (adminLoginBox && adminSignupBox) {
        document.getElementById('show-admin-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            adminLoginBox.style.display = 'none';
            adminSignupBox.style.display = 'block';
        });
        document.getElementById('show-admin-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            adminSignupBox.style.display = 'none';
            adminLoginBox.style.display = 'block';
        });
    }

    // Admin Login (with role check)
    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;

        const data = await post(`${API.users}?action=login`, { email, password });

        if (data.success && data.user.role === 'admin') {
            setSession({ 
                email: data.user.email, 
                name: data.user.full_name, 
                role: 'admin', 
                id: data.user.user_id 
            });
            showAlert(`Welcome back, ${data.user.full_name}!`, () => {
                window.location.href = 'admin_dashboard.html';
            });
        } else if (data.success && data.user.role !== 'admin') {
            showAlert('Access Denied: Admins only.');
        } else {
            showAlert(data.message || 'Invalid credentials.');
        }
    });

    // Admin Signup with Invite Token (fully taken from old script)
    document.getElementById('admin-signup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name     = document.getElementById('admin-fullname').value.trim();
        const email         = document.getElementById('admin-reg-email').value.trim();
        const password      = document.getElementById('admin-reg-password').value;
        const confirm_password = document.getElementById('admin-confirm-password').value;
        const invite_token  = document.getElementById('admin-invite-token').value.trim();

        if (!full_name || !email || !password || !invite_token) {
            showAlert('All fields are required, including invite token.');
            return;
        }

        const reg = await post(`${API.users}?action=registerAdmin`, { 
            full_name, email, password, confirm_password, invite_token 
        });

        if (reg.success) {
            // Auto-login after successful signup
            const login = await post(`${API.users}?action=login`, { email, password });
            if (login.success) {
                setSession({ 
                    email: login.user.email, 
                    name: login.user.full_name, 
                    role: 'admin', 
                    id: login.user.user_id 
                });
            }
            showAlert('Admin account created!', () => {
                window.location.href = 'admin_dashboard.html';
            });
        } else {
            showAlert(reg.message || 'Registration failed. Check invite token or contact main admin.');
        }
    });

    // ══════════════════════════════════════════════════════════
    //  PAGE: admin_dashboard.html (with invite token generator)
    // ══════════════════════════════════════════════════════════
    if (page === 'admin_dashboard.html') {
        loadAdminDashboard();
        
        // Generate invite token button (from old script)
        const generateBtn = document.getElementById('generate-invite-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const res = await post(`${API.users}?action=generateInvite`);
                if (res.success) {
                    showAlert(`Invite token (valid 24h):\n\n${res.token}`);
                } else {
                    showAlert(res.message || 'Could not generate token.');
                }
            });
        }
    }

    async function loadAdminDashboard() {
        const [itemsRes, claimsRes] = await Promise.all([
            get(`${API.foundItems}?action=getAll`),
            get(`${API.claims}?action=getAll`),
        ]);

        if (itemsRes.success) {
            const items = itemsRes.data;
            const delivered = items.filter(i => i.status === 'delivered').length;
            const totalFound = items.length;
            const deliveredElem = document.getElementById('delivered-count');
            const totalFoundElem = document.getElementById('total-found-count');
            if (deliveredElem) deliveredElem.textContent = delivered;
            if (totalFoundElem) totalFoundElem.textContent = totalFound;
        }

        if (claimsRes.success) {
            const pending = claimsRes.data.filter(c => c.status === 'pending').length;
            const pendingElem = document.getElementById('pending-claims-count');
            if (pendingElem) pendingElem.textContent = pending;

            // Render recent pending claims in the table
            const tbody = document.querySelector('.data-table tbody');
            const pending_claims = claimsRes.data.filter(c => c.status === 'pending').slice(0, 5);
            if (tbody && pending_claims.length) {
                tbody.innerHTML = pending_claims.map(c => `
                    <tr>
                        <td data-label="Student">${escHtml(c.student_name)}</td>
                        <td data-label="Item">${escHtml(c.item_name)}</td>
                        <td data-label="Date">${formatDate(c.submitted_at)}</td>
                        <td data-label="Action">
                            <div class="admin-actions">
                                <a href="#" class="status-badge status-green approve-btn" data-id="${c.claim_id}">Approve</a>
                                <a href="#" class="status-badge status-red reject-btn" data-id="${c.claim_id}">Reject</a>
                            </div>
                        </td>
                    </tr>`).join('');
                attachClaimButtons(tbody, loadAdminDashboard);
            } else if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="color:#888;text-align:center;">No pending claims.</td></tr>';
            }
        }
    }

    // ══════════════════════════════════════════════════════════
    //  PAGE: manage_items.html (unchanged)
    // ══════════════════════════════════════════════════════════
    if (page === 'manage_items.html') {
        loadManageItems();
    }

    async function loadManageItems() {
        const res = await get(`${API.foundItems}?action=getAll`);
        if (!res.success) return;
        renderItemsTable(res.data);
    }

    function renderItemsTable(items) {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;

        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:#888;text-align:center;">No items yet.</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
                <td data-label="Item">${escHtml(item.item_name)}</td>
                <td data-label="Location">${escHtml(item.location_found)}</td>
                <td data-label="Status"><span class="status-badge ${statusClass(item.status)}">${cap(item.status)}</span></td>
                <td data-label="Action">
                    <div class="admin-actions">
                        <a href="#" class="status-badge status-green edit-item-btn" data-id="${item.item_id}">Edit</a>
                        <a href="#" class="status-badge status-red delete-item-btn" data-id="${item.item_id}">Delete</a>
                    </div>
                </td>
            </tr>`).join('');

        tbody.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.dataset.id;
                showConfirm('Delete this item?', async () => {
                    const res = await post(`${API.foundItems}?action=delete&id=${id}`);
                    showAlert(res.message, loadManageItems);
                });
            });
        });

        tbody.querySelectorAll('.edit-item-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id  = btn.dataset.id;
                const res = await get(`${API.foundItems}?action=getOne&id=${id}`);
                if (!res.success) return;
                const item = res.data;
                document.getElementById('item-name').value    = item.item_name;
                document.getElementById('date-found').value   = item.date_found;
                document.getElementById('category').value     = item.category;
                document.getElementById('location').value     = item.location_found;
                document.getElementById('description').value  = item.description || '';

                const form = document.getElementById('add-item-form');
                form.dataset.editId = id;
                form.querySelector('button[type="submit"]').textContent = 'Update Item';
            });
        });
    }

    document.getElementById('add-item-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form       = e.target;
        const editId     = form.dataset.editId;
        const item_name  = document.getElementById('item-name').value.trim();
        const date_found = document.getElementById('date-found').value;
        const category   = document.getElementById('category').value;
        const location   = document.getElementById('location').value.trim();
        const description= document.getElementById('description').value.trim();
        const user       = getSession();

        if (!item_name || !date_found || !location) {
            showAlert('Please fill in all required fields.');
            return;
        }

        let res;
        if (editId) {
            res = await post(`${API.foundItems}?action=update&id=${editId}`, {
                item_name, date_found, category,
                location_found: location, description,
            });
        } else {
            res = await post(`${API.foundItems}?action=create`, {
                item_name, date_found, category,
                location_found: location, description,
                posted_by: user.id,
            });
        }

        if (res.success) {
            form.reset();
            delete form.dataset.editId;
            form.querySelector('button[type="submit"]').textContent = 'Submit';
            showAlert(res.message, loadManageItems);
        } else {
            showAlert(res.message || 'Something went wrong.');
        }
    });

    // ══════════════════════════════════════════════════════════
    //  PAGE: manage_claims.html
    // ══════════════════════════════════════════════════════════
    if (page === 'manage_claims.html') {
        loadManageClaims();
    }

    async function loadManageClaims() {
        const res = await get(`${API.claims}?action=getAll`);
        if (!res.success) return;

        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;

        if (!res.data.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:#888;text-align:center;">No claims yet.</td></tr>';
            return;
        }

        tbody.innerHTML = res.data.map(c => {
            const actions = c.status === 'pending'
                ? `<a href="#" class="status-badge status-green approve-btn" data-id="${c.claim_id}">Approve</a>
                   <a href="#" class="status-badge status-red reject-btn" data-id="${c.claim_id}">Reject</a>`
                : `<span style="color:#888;">Done</span>`;
            return `
                <tr>
                    <td data-label="Student">${escHtml(c.student_name)}</td>
                    <td data-label="Item">${escHtml(c.item_name)}</td>
                    <td data-label="Date">${formatDate(c.submitted_at)}</td>
                    <td data-label="Proof">
                        <a href="#" class="status-badge status-teal view-proof-btn" data-proof="${escHtml(c.proof_details || 'No proof provided')}">View</a>
                    </td>
                    <td data-label="Status"><span class="status-badge ${claimStatusClass(c.status)}">${cap(c.status)}</span></td>
                    <td data-label="Action"><div class="admin-actions">${actions}</div></td>
                </tr>`;
        }).join('');

        attachClaimButtons(tbody, loadManageClaims);
    }

    // ══════════════════════════════════════════════════════════
    //  PAGE: found_items.html
    // ══════════════════════════════════════════════════════════
    if (page === 'found_items.html') {
        loadFoundItems();
    }

    async function loadFoundItems() {
        const res = await get(`${API.foundItems}?action=getAll`);
        if (!res.success) return;

        const grid = document.querySelector('.items-grid');
        if (!grid) return;

        const available = res.data.filter(i => i.status === 'available');

        if (!available.length) {
            grid.innerHTML = '<p style="color:#888;">No items available right now.</p>';
            return;
        }

        grid.innerHTML = available.map(item => `
            <div class="item-card">
                <div>
                    <h4>${escHtml(item.item_name)}</h4>
                    <p class="item-meta">${escHtml(item.location_found)} – ${formatDate(item.date_found)}</p>
                    ${item.description ? `<p style="color:#aaa;font-size:0.85rem;margin-top:8px;">${escHtml(item.description)}</p>` : ''}
                </div>
                <div class="card-actions" style="display:flex;gap:10px;margin-top:15px;">
                    <a href="#" class="status-badge status-purple claim-btn" data-id="${item.item_id}" style="flex:1;text-align:center;">Claim it</a>
                </div>
            </div>`).join('');

        grid.querySelectorAll('.claim-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const user = getSession();
                if (!user) { showAlert('Please log in first.'); return; }

                showConfirm('Submit a claim for this item?', () => {
                   showPrompt('Briefly describe proof of ownership (e.g. what is on it, color, contents):', async (proof) => {
                       const res = await post(`${API.claims}?action=create`, {
                            student_id: user.id,
                            item_id: btn.dataset.id,
                            proof_details: proof
                       });
                       showAlert(res.message);
                       if (res.success) {
                           loadFoundItems();
                           updateStudentNotification();
                       }
                    });
                });
            });
        });
    }

    // ══════════════════════════════════════════════════════════
    //  PAGE: my_claims.html
    // ══════════════════════════════════════════════════════════
    if (page === 'my_claims.html') {
        loadMyClaims();
    }

    async function loadMyClaims() {
        const user = getSession();
        if (!user) return;

        const res   = await get(`${API.claims}?action=getByStudent&student_id=${user.id}`);
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody || !res.success) return;

        if (!res.data.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:#888;text-align:center;">You have no claims yet.</td></tr>';
            return;
        }

        tbody.innerHTML = res.data.map(c => `
            <tr>
                <td data-label="Item">${escHtml(c.item_name)}</td>
                <td data-label="Date Claimed">${formatDate(c.submitted_at)}</td>
                <td data-label="Status"><span class="status-badge ${claimStatusClass(c.status)}">${claimStatusLabel(c.status)}</span></td>
                <td data-label="Details">
                    ${c.proof_details
                        ? `<span class="status-badge status-purple" title="${escHtml(c.proof_details)}" style="cursor:pointer;" onclick="showAlert('${escHtml(c.proof_details).replace(/'/g,'\\\'')}')">View</span>`
                        : '—'}
                </td>
            </tr>`).join('');
    }

    // ══════════════════════════════════════════════════════════
    //  PAGE: report_item.html
    // ══════════════════════════════════════════════════════════
    document.getElementById('report-item-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user        = getSession();
        const item_name   = document.getElementById('item-name').value.trim();
        const date_lost   = document.getElementById('date-lost').value;
        const category    = document.getElementById('category').value;
        const location    = document.getElementById('location').value.trim();
        const description = document.getElementById('description').value.trim();

        if (!item_name || !date_lost || !location) {
            showAlert('Please fill in all required fields (Item, Date, Location).');
            return;
        }

        const res = await post(`${API.lostReports}?action=create`, {
            student_id:   user.id,
            item_name,
            date_lost,
            category,
            location_lost: location,
            description,
        });

        if (res.success) {
            showAlert('Report submitted successfully!', () => {
                e.target.reset();
                loadMyReports();
            });
        } else {
            showAlert(res.message || 'Submission failed.');
        }
    });

    if (page === 'report_item.html') {
        loadMyReports();
    }

    async function loadMyReports() {
        const user  = getSession();
        const res   = await get(`${API.lostReports}?action=getByStudent&student_id=${user.id}`);
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody || !res.success) return;

        if (!res.data.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:#888;text-align:center;">No reports yet.</td></tr>';
            return;
        }

        tbody.innerHTML = res.data.map(r => `
            <tr>
                <td data-label="Item">${escHtml(r.item_name)}</td>
                <td data-label="Date">${formatDate(r.date_lost)}</td>
                <td data-label="Location">${escHtml(r.location_lost)}</td>
                <td data-label="Status"><span class="status-badge ${reportStatusClass(r.status)}">${cap(r.status)}</span></td>
                <td data-label="Action">
                    <a href="#" class="status-badge status-red delete-report-btn" data-id="${r.report_id}">Delete</a>
                </td>
            </tr>`).join('');

        tbody.querySelectorAll('.delete-report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showConfirm('Delete this report?', async () => {
                    const res = await post(`${API.lostReports}?action=delete&id=${btn.dataset.id}`);
                    showAlert(res.message, loadMyReports);
                });
            });
        });
    }

    // ══════════════════════════════════════════════════════════
    //  PAGE: Student_dashboard.html
    // ══════════════════════════════════════════════════════════
    if (page === 'Student_dashboard.html') {
        loadStudentDashboard();
        loadRecentFoundItems();
    }

    async function loadStudentDashboard() {
        const user = getSession();
        if (!user) return;

        const [reportsRes, claimsRes, itemsRes] = await Promise.all([
            get(`${API.lostReports}?action=getByStudent&student_id=${user.id}`),
            get(`${API.claims}?action=getByStudent&student_id=${user.id}`),
            get(`${API.foundItems}?action=getAll`),
        ]);

        if (reportsRes.success) {
            const pendingReports = reportsRes.data.filter(r => r.status === 'pending').length;
            const activeElem = document.getElementById('active-reports-count');
            if (activeElem) activeElem.textContent = pendingReports;
        }

        if (itemsRes.success) {
            const deliveredItems = itemsRes.data.filter(i => i.status === 'delivered').length;
            const reunitedElem = document.getElementById('total-reunited-count');
            if (reunitedElem) reunitedElem.textContent = deliveredItems;
        }

        if (claimsRes.success) {
            const claimsElem = document.getElementById('my-claims-count');
            if (claimsElem) claimsElem.textContent = claimsRes.data.length;
        }

        if (itemsRes.success) {
            const availableItems = itemsRes.data.filter(i => i.status === 'available').length;
            const availableElem = document.getElementById('items-available-count');
            if (availableElem) availableElem.textContent = availableItems;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  PAGE: manage_lost_reports.html (Admin view)
    // ══════════════════════════════════════════════════════════
    if (page === 'manage_lost_reports.html') {
        loadAllLostReports();
    }

    async function loadAllLostReports() {
        const res = await get(`${API.lostReports}?action=getAll`);
        const tbody = document.getElementById('lost-reports-tbody');
        if (!tbody) return;

        if (!res.success || !res.data.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="color:#888;text-align:center;">No lost reports found.</td></tr>';
            return;
        }

        tbody.innerHTML = res.data.map(r => {
            let statusClass = '';
            if (r.status === 'pending') statusClass = 'status-under-review';
            else if (r.status === 'found') statusClass = 'status-approved';
            else if (r.status === 'closed') statusClass = 'status-red';

            let actions = '';
            if (r.status === 'pending') {
                actions = `
                    <div class="admin-actions">
                        <a href="#" class="status-badge status-green mark-found-btn" data-id="${r.report_id}">Mark Found</a>
                        <a href="#" class="status-badge status-red close-btn" data-id="${r.report_id}">Close</a>
                    </div>`;
            } else {
                actions = '<span style="color:#888;">—</span>';
            }

            return `
                <tr>
                    <td data-label="Student">${escHtml(r.student_name)}</td>
                    <td data-label="Item">${escHtml(r.item_name)}</td>
                    <td data-label="Category">${cap(r.category)}</td>
                    <td data-label="Location">${escHtml(r.location_lost)}</td>
                    <td data-label="Date Lost">${formatDate(r.date_lost)}</td>
                    <td data-label="Status"><span class="status-badge ${statusClass}">${cap(r.status)}</span></td>
                    <td data-label="Action">${actions}</td>
                </tr>`;
        }).join('');

        tbody.querySelectorAll('.mark-found-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                showConfirm('Mark this report as "found"?', async () => {
                    const res = await post(`${API.lostReports}?action=updateStatus&id=${btn.dataset.id}`, { status: 'found' });
                    showAlert(res.message, loadAllLostReports);
                });
            });
        });

        tbody.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                showConfirm('Close this report?', async () => {
                    const res = await post(`${API.lostReports}?action=updateStatus&id=${btn.dataset.id}`, { status: 'closed' });
                    showAlert(res.message, loadAllLostReports);
                });
            });
        });
    }

    // ── Load recent found items for student dashboard ─────────
    async function loadRecentFoundItems() {
        const grid = document.getElementById('recent-items-grid');
        const noMessage = document.getElementById('no-items-message');
        
        if (!grid || !noMessage) return;

        const res = await get(`${API.foundItems}?action=getRecent`);
        
        if (res.success && res.data && res.data.length > 0) {
            noMessage.style.display = 'none';
            grid.innerHTML = '';
            
            res.data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'recent-card';
                
                const itemName = escHtml(item.item_name);
                const location = escHtml(item.location_found);
                const date     = formatDate(item.date_found);
                
                card.innerHTML = `
                    <div>
                        <h4>${itemName}</h4>
                        <div class="meta">${location} - ${date}</div>
                    </div>
                    <div class="actions">
                        <a href="found_items.html?claim_id=${item.item_id}">Claim it</a>
                        <a href="found_items.html?detail_id=${item.item_id}">Details</a>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            noMessage.style.display = 'block';
            grid.innerHTML = '';
        }
    }

}); // end DOMContentLoaded