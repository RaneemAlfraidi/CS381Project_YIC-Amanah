document.addEventListener('DOMContentLoaded', () => {
    console.log("YIC Amanah Script Loaded");

    // ========================================
    // PREDEFINED ADMIN CREDENTIALS
    // ========================================

    const ADMIN_CREDENTIALS = [
           { email: "y4f441500093@rcjy.edu.sa", password: "admin123", name: "Khadijah Mahrous" },
        { email: "y4f441500506@rcjy.edu.sa", password: "admin123", name: "Rannem Alfraidi" }
    ];

    function isAdminCredentials(email, password) {
        return ADMIN_CREDENTIALS.some(admin => 
            admin.email.toLowerCase() === email.toLowerCase() && 
            admin.password === password
        );
    }

    function getAdminName(email, password) {
        const admin = ADMIN_CREDENTIALS.find(a => 
            a.email.toLowerCase() === email.toLowerCase() && 
            a.password === password
        );
        return admin ? admin.name : null;
    }

    // Helper function to check if a student is registered
    function isRegisteredStudent(email, password) {
        const students = JSON.parse(localStorage.getItem('yic_students') || '[]');
        return students.some(student => 
            student.email.toLowerCase() === email.toLowerCase() && 
            student.password === password
        );
    }

    // Helper function to get registered student name
    function getRegisteredStudentName(email, password) {
        const students = JSON.parse(localStorage.getItem('yic_students') || '[]');
        const student = students.find(s => 
            s.email.toLowerCase() === email.toLowerCase() && 
            s.password === password
        );
        return student ? student.name : null;
    }

    // ========================================
    // 1. SESSION MANAGEMENT
    // ========================================
    
    const protectedPages = ['Student_dashboard.html', 'admin_dashboard.html', 'report_item.html', 'found_items.html', 'my_claims.html', 'manage_items.html', 'manage_claims.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        const currentUser = JSON.parse(localStorage.getItem('yic_current_user'));
        if (!currentUser) {
            window.location.href = 'auth.html';
            return;
        }
        updateUserInterface(currentUser);
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
        if (userRoleSpan) userRoleSpan.textContent = user.role === 'admin' ? 'Administrator, YIC' : 'Student, YIC';
    }

    // ========================================
    // 2. LOGIN LOGIC (checks if user is registered)
    // ========================================
    
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim().toLowerCase();
            const password = document.getElementById('login-password').value;
            
            // Validation: Check empty fields
            if (!email || !password) {
                alert('Please fill in both email and password.');
                return;
            }
            
            // Validation: Email format
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('Please enter a valid email address (e.g., name@example.com).');
                return;
            }
            
            // Validation: Password minimum length
            if (password.length < 4) {
                alert('Password must be at least 4 characters.');
                return;
            }
            
            // Check if this is an admin login
            const isAdmin = isAdminCredentials(email, password);
            
            if (isAdmin) {
                // Admin login - predefined admins always work
                const userName = getAdminName(email, password);
                const user = { email, name: userName, role: 'admin', password: password, loginTime: new Date().toISOString() };
                localStorage.setItem('yic_current_user', JSON.stringify(user));
                alert(`Welcome back, ${userName}! Redirecting to Admin Dashboard...`);
                window.location.href = 'admin_dashboard.html';
            } else {
                // Student login - check if registered
                const isRegistered = isRegisteredStudent(email, password);
                
                if (isRegistered) {
                    // Registered student
                    const userName = getRegisteredStudentName(email, password);
                    const user = { email, name: userName, role: 'student', password: password, loginTime: new Date().toISOString() };
                    localStorage.setItem('yic_current_user', JSON.stringify(user));
                    alert(`Welcome back, ${userName}! Redirecting to Student Dashboard...`);
                    window.location.href = 'Student_dashboard.html';
                } else {
                    // Not registered - ask to sign up
                    const signUpChoice = confirm(
                        "Account not found. ❌\n\n" +
                        "You don't have an account yet.\n" +
                        "Would you like to sign up now?"
                    );
                    
                    if (signUpChoice) {
                        // Switch to signup form
                        const loginBox = document.getElementById('login-box');
                        const signupBox = document.getElementById('signup-box');
                        if (loginBox && signupBox) {
                            loginBox.style.display = 'none';
                            signupBox.style.display = 'block';
                        }
                        // Optional: pre-fill email field
                        const emailField = document.getElementById('reg-email');
                        if (emailField) emailField.value = email;
                    } else {
                        alert("Please create an account first to log in.");
                    }
                }
            }
        });
    }

    // ========================================
    // 3. SIGNUP LOGIC (students only - stores password)
    // ========================================
    
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('full-name').value.trim();
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validation 1: Full name not empty
            if (!fullName) {
                alert('Please enter your full name.');
                return;
            }
            
            // Validation 2: Email not empty
            if (!email) {
                alert('Please enter your email address.');
                return;
            }
            
            // Validation 3: Email format
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('Please enter a valid email address (e.g., name@example.com).');
                return;
            }
            
            // Validation 4: Check if email is already registered
            const existingStudents = JSON.parse(localStorage.getItem('yic_students') || '[]');
            const emailExists = existingStudents.some(s => s.email.toLowerCase() === email);
            if (emailExists) {
                alert('This email is already registered. Please log in instead.');
                // Switch to login form
                const loginBox = document.getElementById('login-box');
                const signupBox = document.getElementById('signup-box');
                if (loginBox && signupBox) {
                    loginBox.style.display = 'block';
                    signupBox.style.display = 'none';
                }
                return;
            }
            
            // Validation 5: Prevent using admin emails for student signup
            const isReservedAdminEmail = ADMIN_CREDENTIALS.some(admin => 
                admin.email.toLowerCase() === email
            );
            if (isReservedAdminEmail) {
                alert('This email is reserved for administrators. Please use a different email address.');
                return;
            }
            
            // Validation 6: Password not empty
            if (!password) {
                alert('Please enter a password.');
                return;
            }
            
            // Validation 7: Password minimum length
            if (password.length < 4) {
                alert('Password must be at least 4 characters long.');
                return;
            }
            
            // Validation 8: Password strength (at least one letter and one number)
            const hasLetter = /[a-zA-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (!hasLetter || !hasNumber) {
                alert('Password must contain at least one letter and one number.');
                return;
            }
            
            // Validation 9: Passwords match
            if (password !== confirmPassword) {
                alert('Passwords do not match. Please re-enter.');
                return;
            }
            
            // All validations passed - create account
            const newStudent = { 
                email: email, 
                name: fullName, 
                role: 'student', 
                password: password,  // Store password for login verification
                registeredDate: new Date().toISOString()
            };
            
            // Save to students list
            let students = JSON.parse(localStorage.getItem('yic_students') || '[]');
            students.push(newStudent);
            localStorage.setItem('yic_students', JSON.stringify(students));
            
            // Auto-login after signup
            const user = { 
                email: email, 
                name: fullName, 
                role: 'student', 
                password: password,
                loginTime: new Date().toISOString() 
            };
            localStorage.setItem('yic_current_user', JSON.stringify(user));
            
            alert(`Account created successfully! Welcome, ${fullName}!`);
            window.location.href = 'Student_dashboard.html';
        });
    }

    // ========================================
    // 4. LOGOUT CONFIRMATION
    // ========================================
    
    document.addEventListener('click', (e) => {
        let target = e.target;
        while (target && target !== document.body) {
            if (target.classList && target.classList.contains('logout-btn')) {
                e.preventDefault();
                if (confirm('Are you sure you want to log out?')) {
                    localStorage.removeItem('yic_current_user');
                    window.location.href = 'Index.html';
                }
                return;
            }
            target = target.parentElement;
        }
    });

    // ========================================
    // 5. DYNAMIC SEARCH
    // ========================================
    
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.item-card, .data-table tbody tr').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // ========================================
    // 6. REPORT FORM VALIDATION
    // ========================================
    
    const reportForm = document.querySelector('.form-container form');
    if (reportForm && reportForm.action && reportForm.action.includes('report_item.php')) {
        reportForm.addEventListener('submit', (e) => {
            const itemName = document.getElementById('item-name')?.value.trim();
            const dateLost = document.getElementById('date-lost')?.value;
            const location = document.getElementById('location')?.value.trim();
            
            if (!itemName) { 
                e.preventDefault(); 
                alert('Please enter the item name.'); 
                return; 
            }
            if (!dateLost) { 
                e.preventDefault(); 
                alert('Please select the date you lost the item.'); 
                return; 
            }
            if (!location) { 
                e.preventDefault(); 
                alert('Please enter the location.'); 
                return; 
            }
            alert('Your lost item report has been submitted successfully!');
        });
    }

    // ========================================
    // 7. ADMIN ACTIONS (Approve/Reject)
    // ========================================
    
    document.querySelectorAll('.status-green, .btn-approve').forEach(btn => {
        if (btn.textContent.includes('Approve') || btn.classList.contains('status-green')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Approve this claim?')) {
                    alert('Claim approved successfully!');
                    const row = btn.closest('tr');
                    if (row) {
                        const statusCell = row.querySelector('td:nth-child(4)');
                        if (statusCell) statusCell.innerHTML = '<span class="status-badge status-approved">Approved</span>';
                        const actionCell = row.querySelector('td:last-child');
                        if (actionCell) actionCell.innerHTML = '<span style="color: #888;">Done</span>';
                    }
                }
            });
        }
    });
    
    document.querySelectorAll('.status-red, .btn-reject').forEach(btn => {
        if (btn.textContent.includes('Reject') || btn.classList.contains('status-red')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Reject this claim?')) {
                    alert('Claim rejected.');
                    const row = btn.closest('tr');
                    if (row) {
                        const statusCell = row.querySelector('td:nth-child(4)');
                        if (statusCell) statusCell.innerHTML = '<span class="status-badge status-red">Rejected</span>';
                        const actionCell = row.querySelector('td:last-child');
                        if (actionCell) actionCell.innerHTML = '<span style="color: #888;">Done</span>';
                    }
                }
            });
        }
    });

    // Delete item confirmation
    document.querySelectorAll('.status-red').forEach(btn => {
        if (btn.textContent.includes('Delete')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Permanently delete this item?')) {
                    alert('Item deleted.');
                    const row = btn.closest('tr');
                    if (row) row.remove();
                }
            });
        }
    });

    // ========================================
    // 8. TOGGLE BETWEEN LOGIN/SIGNUP
    // ========================================
    
    window.toggleAuth = window.toggleAuth || function() {
        const loginBox = document.getElementById('login-box');
        const signupBox = document.getElementById('signup-box');
        if (loginBox && signupBox) {
            if (loginBox.style.display === 'none') {
                loginBox.style.display = 'block';
                signupBox.style.display = 'none';
            } else {
                loginBox.style.display = 'none';
                signupBox.style.display = 'block';
            }
        }
    };
});