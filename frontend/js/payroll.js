// Payroll Section Controller
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initLayout('payroll');

    const currentUser = getCurrentUser();
    const targetEmail = getViewedEmployee();
    const targetUser = DB.users[targetEmail];

    if (!targetUser) return;

    function renderPayroll() {
        const payroll = DB.payroll[targetUser.email] || { basic: 0, hra: 0, bonus: 0, deductions: 0 };

        // Slip text fields
        document.getElementById('payslip-emp-name').textContent = targetUser.name;
        document.getElementById('payslip-emp-id').textContent = targetUser.employeeId;
        document.getElementById('payslip-emp-title').textContent = `${targetUser.jobTitle} - ${targetUser.department}`;
        document.getElementById('payslip-basic-val').textContent = `$${payroll.basic.toLocaleString()}`;
        document.getElementById('payslip-hra-val').textContent = `$${payroll.hra.toLocaleString()}`;
        document.getElementById('payslip-bonus-val').textContent = `$${payroll.bonus.toLocaleString()}`;
        document.getElementById('payslip-deduct-val').textContent = `-$${payroll.deductions.toLocaleString()}`;

        const net = payroll.basic + payroll.hra + payroll.bonus - payroll.deductions;
        document.getElementById('payslip-net-val').textContent = `$${net.toLocaleString()}`;

        // Admin Salary Structure Form
        const controls = document.getElementById('admin-payroll-controls');
        if (currentUser.role === 'Admin' && controls) {
            controls.classList.remove('d-none');
            document.getElementById('payroll-basic-salary').value = payroll.basic;
            document.getElementById('payroll-hra').value = payroll.hra;
            document.getElementById('payroll-bonus').value = payroll.bonus;
            document.getElementById('payroll-deductions').value = payroll.deductions;
        } else if (controls) {
            controls.classList.add('d-none');
        }
    }

    // Admin save salary form handler
    const salaryForm = document.getElementById('admin-payroll-structure-form');
    if (salaryForm) {
        salaryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (currentUser.role !== 'Admin') return;

            DB.payroll[targetUser.email] = {
                email: targetUser.email,
                basic: parseInt(document.getElementById('payroll-basic-salary').value),
                hra: parseInt(document.getElementById('payroll-hra').value),
                bonus: parseInt(document.getElementById('payroll-bonus').value),
                deductions: parseInt(document.getElementById('payroll-deductions').value)
            };
            saveDB('payroll');

            showToast(`Salary structure updated for ${targetUser.name}!`, 'success');
            renderPayroll();
        });
    }

    // Print Payslip Button
    const printBtn = document.getElementById('btn-print-payslip');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    renderPayroll();
});
