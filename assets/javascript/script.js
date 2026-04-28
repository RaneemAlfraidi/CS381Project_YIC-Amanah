document.addEventListener('DOMContentLoaded', () => {
    console.log("YIC Amanah Script Loaded");

    // ========================================
    // CUSTOM ALERT & CONFIRM (same as before)
    // ========================================
    function showAlert(message, callback) {
        let box = document.getElementById('custom-alert');
        if (!box) {
            box = document.createElement('div');
            box.id = 'custom-alert';
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
            box.id = 'custom-confirm';
            box.className = 'alert-box';
            box.innerHTML = `
                <div class="alert-content confirm-box">
                    <p id="confirm-message"></p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 10px;">
                        <button id="confirm-yes" style="background-color: #2b5c3f;">Yes</button>
                        <button id="confirm-no" style="background-color: #7f2d2d;">No</button>
                    </div>
                </div>`;
            document.body.appendChild(box);
        }
        document.getElementById('confirm-message').innerText = message;
        box.style.display = 'flex';
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');
        const newYes = yesBtn.cloneNode(true);
        const newNo = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYes, yesBtn);
        noBtn.parentNode.replaceChild(newNo, noBtn);
        newYes.onclick = () => { box.style.display = 'none'; if (onYes) onYes(); };
        newNo.onclick = () => { box.style.display = 'none'; if (onNo) onNo(); };
    }

    // ========================================
    // ADMIN CREDENTIALS (hardcoded)
    // ========================================
    const ADMIN_CREDENTIALS = [
        { email: "y4f441500093@rcjy.edu.sa", password: "admin123", name: "Khadijah Mahrous" },
        { email: "y4f441500506@rcjy.edu.sa", password: "admin123", name: "Raneem Alfraidi" }
    ];

    function isAdminCredentials(email, password) {
        return ADMIN_CREDENTIALS.some(admin => 
            admin.email.toLowerCase() === email.toLowerCase() && admin.password === password
        );
    }

    function getAdminName(email, password) {
        const admin = ADMIN_CREDENTIALS.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
        return admin ? admin.name : null;
    }

    // Student storage helpers
    function getStudents() {
        return JSON.parse(localStorage.getItem('yic_students') || '[]');
    }

    function saveStudents(students) {
        localStorage.setItem('yic_students', JSON.stringify(students));
    }

    function isRegisteredStudent(email, password) {
        return getStudents().some(s => s.email.toLowerCase() === email.toLowerCase() && s.password === password);
    }

    function getRegisteredStudentName(email, password) {
        const student = getStudents().find(s => s.email.toLowerCase() === email.toLowerCase() && s.password === password);
        return student ? student.name : null;
    }

    // ========================================
    // SESSION & ROLE PROTECTION
    // ========================================
    const currentPage = window.location.pathname.split('/').pop();
    const currentUser = JSON.parse(localStorage.getItem('yic_current_user'));

    // Protect pages based on role
    if (currentPage === 'Student_dashboard.html' || currentPage === 'report_item.html' || currentPage === 'found_items.html' || currentPage === 'my_claims.html') {
        if (!currentUser || currentUser.role !== 'student') {
            showAlert("Student area only. Please log in as a student.", () => { window.location.href = 'student_auth.html'; });
        } else {
            updateUserInterface(currentUser);
        }
    }
    else if (currentPage === 'admin_dashboard.html' || currentPage === 'manage_items.html' || currentPage === 'manage_claims.html') {
        if (!currentUser || currentUser.role !== 'admin') {
            showAlert("Admin area only. Please log in as admin.", () => { window.location.href = 'admin_auth.html'; });
        } else {
            updateUserInterface(currentUser);
        }
    }

    function updateUserInterface(user) {
        const welcomeHeader = document.querySelector('.welcome-header h1');
        if (welcomeHeader && welcomeHeader.textContent.includes('Welcome back,')) {
            welcomeHeader.textContent = `Welcome back, ${user.name.split(' ')[0]}`;
        }
        const userAvatar = document.querySelector('.user-avatar');
        const userNameSpan = document.querySelector('.user-profile-menu strong');
        const userRoleSpan = document.querySelector('.user-profile-menu p:last-child');
        if (userAvatar && userAvatar.textContent.length <= 3) {
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            userAvatar.textContent = initials;
        }
        if (userNameSpan) userNameSpan.textContent = user.name;
        if (userRoleSpan) {
            userRoleSpan.textContent = user.role === 'admin' ? 'Administrator, YIC' : 'Student, YIC';
        }
    }

    // ========================================
    // STUDENT AUTH (student_auth.html)
    // ========================================
    // Toggle between login and signup
    const studentLoginBox = document.getElementById('student-login-box');
    const studentSignupBox = document.getElementById('student-signup-box');
    if (studentLoginBox && studentSignupBox) {
        document.getElementById('show-student-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            studentLoginBox.style.display = 'none';
            studentSignupBox.style.display = 'block';
        });
        document.getElementById('show-student-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            studentSignupBox.style.display = 'none';
            studentLoginBox.style.display = 'block';
        });
    }

    // Student login
    const studentLoginForm = document.getElementById('student-login-form');
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('student-email').value.trim().toLowerCase();
            const password = document.getElementById('student-password').value;
            if (!email || !password) { showAlert('Please fill in both fields.'); return; }
            if (isRegisteredStudent(email, password)) {
                const name = getRegisteredStudentName(email, password);
                localStorage.setItem('yic_current_user', JSON.stringify({ email, name, role: 'student', loginTime: new Date().toISOString() }));
                showAlert(`Welcome back, ${name}!`, () => { window.location.href = 'Student_dashboard.html'; });
            } else {
                showAlert('Invalid student credentials. Please sign up first.');
            }
        });
    }

    // Student signup
    const studentSignupForm = document.getElementById('student-signup-form');
    if (studentSignupForm) {
        studentSignupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fullName = document.getElementById('student-fullname').value.trim();
            const email = document.getElementById('student-reg-email').value.trim().toLowerCase();
            const password = document.getElementById('student-reg-password').value;
            const confirm = document.getElementById('student-confirm-password').value;
            if (!fullName || !email || !password) { showAlert('Please fill all fields.'); return; }
            if (ADMIN_CREDENTIALS.some(a => a.email.toLowerCase() === email)) { showAlert('This email is reserved for admins.'); return; }
            if (getStudents().some(s => s.email === email)) { showAlert('Email already registered. Please log in.'); return; }
            if (password.length < 4) { showAlert('Password must be at least 4 characters.'); return; }
            if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) { showAlert('Password must contain a letter and a number.'); return; }
            if (password !== confirm) { showAlert('Passwords do not match.'); return; }
            const students = getStudents();
            students.push({ email, name: fullName, role: 'student', password, registeredDate: new Date().toISOString() });
            saveStudents(students);
            localStorage.setItem('yic_current_user', JSON.stringify({ email, name: fullName, role: 'student', loginTime: new Date().toISOString() }));
            showAlert(`Account created! Welcome, ${fullName}!`, () => { window.location.href = 'Student_dashboard.html'; });
        });
    }

    // ========================================
    // ADMIN AUTH (admin_auth.html) - only login
    // ========================================
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value.trim().toLowerCase();
            const password = document.getElementById('admin-password').value;
            if (!email || !password) { showAlert('Please enter email and password.'); return; }
            if (isAdminCredentials(email, password)) {
                const name = getAdminName(email, password);
                localStorage.setItem('yic_current_user', JSON.stringify({ email, name, role: 'admin', loginTime: new Date().toISOString() }));
                showAlert(`Welcome back, ${name}!`, () => { window.location.href = 'admin_dashboard.html'; });
            } else {
                showAlert('Invalid admin credentials. Access denied.');
            }
        });
    }

    // ========================================
    // LOGOUT (works everywhere)
    // ========================================
    document.addEventListener('click', (e) => {
        let target = e.target;
        while (target && target !== document.body) {
            if (target.classList && target.classList.contains('logout-btn')) {
                e.preventDefault();
                showConfirm('Log out?', () => {
                    localStorage.removeItem('yic_current_user');
                    window.location.href = 'Index.html';
                });
                return;
            }
            target = target.parentElement;
        }
    });

    // ========================================
    // SEARCH, REPORT, ADMIN ACTIONS (unchanged from previous working version)
    // ========================================
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.item-card, .data-table tbody tr').forEach(el => {
                el.style.display = el.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

    const reportForm = document.querySelector('.form-container form');
    if (reportForm && reportForm.id !== 'add-item-form') {
        reportForm.addEventListener('submit', (e) => {
            const itemName = document.getElementById('item-name')?.value.trim();
            const dateLost = document.getElementById('date-lost')?.value;
            const location = document.getElementById('location')?.value.trim();
            if (!itemName || !dateLost || !location) {
                e.preventDefault();
                showAlert('Please fill in all required fields (Item, Date, Location).');
            } else {
                showAlert('Report submitted successfully!');
            }
        });
    }

    // Admin approve/reject/delete
    document.querySelectorAll('.status-green, .btn-approve').forEach(btn => {
        if (btn.textContent.includes('Approve')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showConfirm('Approve this claim?', () => {
                    showAlert('Claim approved.');
                    const row = btn.closest('tr');
                    if (row) {
                        row.querySelector('td:nth-child(4)').innerHTML = '<span class="status-badge status-approved">Approved</span>';
                        row.querySelector('td:last-child').innerHTML = '<span style="color:#888;">Done</span>';
                    }
                });
            });
        }
    });
    document.querySelectorAll('.status-red, .btn-reject').forEach(btn => {
        if (btn.textContent.includes('Reject')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showConfirm('Reject this claim?', () => {
                    showAlert('Claim rejected.');
                    const row = btn.closest('tr');
                    if (row) {
                        row.querySelector('td:nth-child(4)').innerHTML = '<span class="status-badge status-red">Rejected</span>';
                        row.querySelector('td:last-child').innerHTML = '<span style="color:#888;">Done</span>';
                    }
                });
            });
        }
    });
    document.querySelectorAll('.status-red').forEach(btn => {
        if (btn.textContent.includes('Delete')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showConfirm('Delete this item?', () => {
                    showAlert('Item deleted.');
                    btn.closest('tr')?.remove();
                });
            });
        }
    });
});
