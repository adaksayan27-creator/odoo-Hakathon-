// Profile Section Controller
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initLayout('profile');

    const currentUser = getCurrentUser();
    const targetEmail = getViewedEmployee();
    const targetUser = DB.users[targetEmail];

    if (!targetUser) return;

    // Render profile header details
    function renderProfile() {
        document.getElementById('profile-avatar').src = targetUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
        document.getElementById('profile-full-name').textContent = targetUser.name;
        document.getElementById('profile-designation').textContent = `${targetUser.jobTitle} • ${targetUser.department}`;

        // Personal form inputs
        document.getElementById('profile-address').value = targetUser.address || '';
        document.getElementById('profile-phone').value = targetUser.phone || '';
        document.getElementById('profile-email').value = targetUser.email || '';
        document.getElementById('profile-empid').value = targetUser.employeeId || '';

        // Job details form inputs
        document.getElementById('profile-job-title').value = targetUser.jobTitle || '';
        document.getElementById('profile-department').value = targetUser.department || '';
        document.getElementById('profile-join-date').value = targetUser.joinDate || '';
        document.getElementById('profile-status').value = targetUser.status || 'Active';

        // Salary details inputs
        const payroll = DB.payroll[targetUser.email] || { basic: 0, hra: 0, bonus: 0, deductions: 0 };
        document.getElementById('profile-salary-basic').value = `$${payroll.basic.toLocaleString()}`;
        document.getElementById('profile-salary-hra').value = `$${payroll.hra.toLocaleString()}`;
        document.getElementById('profile-salary-bonus').value = `$${payroll.bonus.toLocaleString()}`;
        document.getElementById('profile-salary-deductions').value = `-$${payroll.deductions.toLocaleString()}`;
        
        const netPay = payroll.basic + payroll.hra + payroll.bonus - payroll.deductions;
        document.getElementById('profile-salary-net').textContent = `$${netPay.toLocaleString()}`;

        // Check if Admin to edit job details
        const jobActions = document.getElementById('admin-job-actions');
        const jobMsg = document.getElementById('emp-job-msg');
        const jobFields = document.querySelectorAll('#profile-job-form input, #profile-job-form select');

        if (currentUser.role === 'Admin') {
            if (jobActions) jobActions.classList.remove('d-none');
            if (jobMsg) jobMsg.classList.add('d-none');
            jobFields.forEach(f => f.disabled = false);
        } else {
            if (jobActions) jobActions.classList.add('d-none');
            if (jobMsg) jobMsg.classList.remove('d-none');
            jobFields.forEach(f => f.disabled = true);
        }

        // Avatar camera upload label toggle
        const avatarLabel = document.getElementById('profile-avatar-label');
        if (avatarLabel) {
            if (currentUser.role === 'Admin' || currentUser.email === targetUser.email) {
                avatarLabel.style.display = 'flex';
            } else {
                avatarLabel.style.display = 'none';
            }
        }
    }

    // Tabs navigation
    const tabs = ['personal', 'job', 'salary', 'docs'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`btn-profile-tab-${tab}`);
        if (btn) {
            btn.addEventListener('click', () => {
                // Deactivate all
                tabs.forEach(t => {
                    document.getElementById(`btn-profile-tab-${t}`).classList.remove('active');
                    document.getElementById(`profile-tab-${t}-content`).classList.add('d-none');
                });
                // Activate selected
                btn.classList.add('active');
                document.getElementById(`profile-tab-${tab}-content`).classList.remove('d-none');
            });
        }
    });

    // Avatar Upload Listener
    const avatarInput = document.getElementById('profile-avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                targetUser.avatar = event.target.result;
                DB.users[targetEmail] = targetUser;
                saveDB('users');

                // If editing self, update active session
                if (currentUser.email === targetUser.email) {
                    localStorage.setItem('hrms_current_user', JSON.stringify(targetUser));
                }

                window.location.reload();
            };
            reader.readAsDataURL(file);
        });
    }

    // Form Submissions
    const personalForm = document.getElementById('profile-personal-form');
    if (personalForm) {
        personalForm.addEventListener('submit', (e) => {
            e.preventDefault();

            targetUser.address = document.getElementById('profile-address').value;
            targetUser.phone = document.getElementById('profile-phone').value;

            DB.users[targetEmail] = targetUser;
            saveDB('users');

            if (currentUser.email === targetUser.email) {
                localStorage.setItem('hrms_current_user', JSON.stringify(targetUser));
            }

            showToast('Personal information updated.', 'success');
            renderProfile();
        });
    }

    const jobForm = document.getElementById('profile-job-form');
    if (jobForm) {
        jobForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (currentUser.role !== 'Admin') return;

            targetUser.jobTitle = document.getElementById('profile-job-title').value;
            targetUser.department = document.getElementById('profile-department').value;
            targetUser.joinDate = document.getElementById('profile-join-date').value;
            targetUser.status = document.getElementById('profile-status').value;

            DB.users[targetEmail] = targetUser;
            saveDB('users');

            showToast('Job profile modified by HR Admin.', 'success');
            renderProfile();
        });
    }

    renderProfile();
});
