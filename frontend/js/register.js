// Register Form Controller
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    let mockVerifyCode = '';
    let pendingRegData = null;

    const signupForm = document.getElementById('signup-form');
    const pwdInput = document.getElementById('signup-password');

    // Password strength check
    function getPasswordStrength(pwd) {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score;
    }

    if (pwdInput) {
        pwdInput.addEventListener('input', (e) => {
            const pwd = e.target.value;
            const strength = getPasswordStrength(pwd);
            const bar = document.getElementById('pwd-strength-bar');
            const txt = document.getElementById('pwd-strength-text');

            let percent = (strength / 4) * 100;
            bar.style.width = percent + '%';

            if (strength <= 1) {
                bar.style.backgroundColor = 'var(--color-danger)';
                txt.textContent = 'Weak Password';
            } else if (strength === 2 || strength === 3) {
                bar.style.backgroundColor = 'var(--color-warning)';
                txt.textContent = 'Medium Password';
            } else {
                bar.style.backgroundColor = 'var(--color-success)';
                txt.textContent = 'Strong Password';
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const empid = document.getElementById('signup-empid').value;
            const email = document.getElementById('signup-email').value;
            const password = pwdInput.value;
            const role = document.getElementById('signup-role').value;

            if (DB.users[email]) {
                showToast('This email is already registered.', 'warning');
                return;
            }

            if (getPasswordStrength(password) < 4) {
                showToast('Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.', 'warning');
                return;
            }

            pendingRegData = {
                email,
                password,
                employeeId: empid,
                name: email.split('@')[0].replace('.', ' '),
                role: role,
                address: 'Kolkata, India',
                phone: 'Add contact details',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                jobTitle: role === 'Admin' ? 'HR Specialist' : 'Software Developer',
                department: role === 'Admin' ? 'HR Operations' : 'Engineering',
                joinDate: new Date().toISOString().split('T')[0],
                status: 'Active'
            };

            // OTP Generation
            mockVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();
            document.getElementById('verification-modal').classList.add('active');

            setTimeout(() => {
                showToast(`[MOCK EMAIL SENT] Verification code is: ${mockVerifyCode}`, 'success');
            }, 800);
        });
    }

    // Modal submit handler
    const btnSubmitVerification = document.getElementById('btn-submit-verification');
    if (btnSubmitVerification) {
        btnSubmitVerification.addEventListener('click', () => {
            const inputCode = document.getElementById('verification-code-input').value;
            if (inputCode === mockVerifyCode) {
                // Save database entries
                DB.users[pendingRegData.email] = pendingRegData;
                saveDB('users');

                DB.payroll[pendingRegData.email] = {
                    email: pendingRegData.email,
                    basic: 3200,
                    hra: 800,
                    bonus: 200,
                    deductions: 500
                };
                saveDB('payroll');

                document.getElementById('verification-modal').classList.remove('active');
                document.getElementById('verification-code-input').value = '';
                showToast('Registration complete! Redirecting to sign in...', 'success');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1200);
            } else {
                showToast('Incorrect code. Please check and try again.', 'danger');
            }
        });
    }

    const resendLink = document.getElementById('resend-verification-link');
    if (resendLink) {
        resendLink.addEventListener('click', (e) => {
            e.preventDefault();
            mockVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();
            showToast(`New code sent: ${mockVerifyCode}`, 'success');
        });
    }
});
