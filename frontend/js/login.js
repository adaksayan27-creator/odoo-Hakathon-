// Login Form Controller
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in, redirect if true
    checkAuth();

    const form = document.getElementById('signin-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            const user = DB.users[email];
            if (user && user.password === password) {
                // Set Session
                localStorage.setItem('hrms_current_user', JSON.stringify(user));
                // Set default viewed employee
                localStorage.setItem('hrms_viewed_employee', user.email);

                showToast(`Welcome back, ${user.name}!`, 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    if (user.role === 'Admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 800);
            } else {
                showToast('Invalid email or password combination.', 'danger');
            }
        });
    }
});