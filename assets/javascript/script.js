document.addEventListener('DOMContentLoaded', () => {
    console.log("Script Loaded and Ready");

    // --- 1. LOGIN LOGIC ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevents page refresh
            
            const email = document.getElementById('login-email').value.toLowerCase();
            
            // Requirement: Role-based simulation
            if (email.includes('admin')) {
                alert("Redirecting to Admin Workspace...");
                window.location.href = "admin_dashboard.html";
            } else {
                alert("Redirecting to Student Dashboard...");
                window.location.href = "Student_dashboard.html";
            }
        });
    }

    // --- 2. SIGNUP LOGIC (Fixed IDs) ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Fixed: IDs now match auth.html
            const p1 = document.getElementById('reg-password').value;
            const p2 = document.getElementById('confirm-password').value;

            if (p1 !== p2) {
                alert("Passwords do not match!");
                return;
            }

            alert("Account created successfully!");
            window.location.href = "Student_dashboard.html";
        });
    }

    // --- 3. DYNAMIC SEARCH (Phase 2 Requirement) ---
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.item-card, .data-table tbody tr');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    // --- 4. LOGOUT CONFIRMATION ---
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('logout-btn')) {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = "Index.html";
            }
        }
    });
});