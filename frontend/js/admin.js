// HR Admin Control Board Controller
document.addEventListener('DOMContentLoaded', () => {
    checkAuth('Admin');
    initLayout('admin');

    const currentUser = getCurrentUser();

    function renderRegistry() {
        const todayStr = '2026-07-04';
        const employees = Object.values(DB.users).filter(u => u.role !== 'Admin');
        const totalCount = employees.length;

        document.getElementById('admin-dash-total-emp').textContent = totalCount;

        // Presence calculations
        const logsToday = DB.attendance.filter(log => log.date === todayStr);
        const presentCount = logsToday.length;
        document.getElementById('admin-dash-present').textContent = presentCount;

        const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        document.getElementById('admin-dash-present-rate').innerHTML = `<i class="fa-solid fa-chart-line"></i> ${rate}% presence rate`;

        const pendingCount = DB.leaves.filter(l => l.status === 'Pending').length;
        document.getElementById('admin-dash-pending-leaves').textContent = pendingCount;

        const absentCount = Math.max(0, totalCount - presentCount);
        document.getElementById('admin-dash-absent').textContent = absentCount;

        // Employee Registry Table
        const tbody = document.getElementById('admin-employee-table-body');
        if (tbody) {
            tbody.innerHTML = '';

            employees.forEach(user => {
                const isPresent = DB.attendance.some(log => log.email === user.email && log.date === todayStr);
                const statusText = isPresent ? 'Online' : 'Offline';
                const statusClass = isPresent ? 'status-badge-present' : 'status-badge-absent';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="table-user-cell">
                            <img class="table-user-img" src="${user.avatar}" alt="Avatar">
                            <div>
                                <span style="font-weight: 600; display:block;">${user.name}</span>
                                <span class="auth-subtitle">${user.email}</span>
                            </div>
                        </div>
                    </td>
                    <td>${user.employeeId}</td>
                    <td>${user.jobTitle}</td>
                    <td>${user.role}</td>
                    <td><span class="attendance-status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons-wrap">
                            <button class="action-icon-btn btn-view-emp" data-email="${user.email}" title="Inspect Profile"><i class="fa-solid fa-eye"></i></button>
                            <button class="action-icon-btn btn-edit-payroll" data-email="${user.email}" title="Modify Salary"><i class="fa-solid fa-credit-card"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Set button events
            document.querySelectorAll('.btn-view-emp').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const email = e.currentTarget.getAttribute('data-email');
                    localStorage.setItem('hrms_viewed_employee', email);
                    window.location.href = 'profile.html';
                });
            });

            document.querySelectorAll('.btn-edit-payroll').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const email = e.currentTarget.getAttribute('data-email');
                    localStorage.setItem('hrms_viewed_employee', email);
                    window.location.href = 'payroll.html';
                });
            });
        }

        // Pending Leaves approvals card on side widget
        const pendingList = document.getElementById('admin-leaves-sidebar-list');
        if (pendingList) {
            pendingList.innerHTML = '';
            const pendings = DB.leaves.filter(l => l.status === 'Pending');

            if (pendings.length === 0) {
                pendingList.innerHTML = '<p class="auth-subtitle" style="text-align: center;">No pending requests</p>';
            } else {
                pendings.forEach(leave => {
                    const card = document.createElement('div');
                    card.className = 'admin-pending-leave-card';
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600; font-size:0.9rem;">${leave.employeeName}</span>
                            <span class="attendance-status-badge status-badge-leave" style="font-size:0.7rem; margin:0;">${leave.type}</span>
                        </div>
                        <p style="font-size:0.8rem; margin:8px 0; color:var(--text-muted);">${leave.startDate} to ${leave.endDate} (${leave.days} days)</p>
                        <div style="font-style:italic; font-size:0.75rem; color:var(--text-muted); border-left: 2px solid var(--primary-light); padding-left: 6px;">"${leave.remarks}"</div>
                        <div style="display:flex; gap: 8px; margin-top:10px;">
                            <button class="btn btn-accent btn-quick-approve" data-id="${leave.id}" style="padding:6px; font-size:0.75rem; width:50%;">Approve</button>
                            <button class="btn btn-secondary btn-quick-reject" data-id="${leave.id}" style="padding:6px; font-size:0.75rem; width:50%;">Reject</button>
                        </div>
                    `;
                    pendingList.appendChild(card);
                });

                // Approve/Reject event hooks
                document.querySelectorAll('.btn-quick-approve').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = parseInt(e.currentTarget.getAttribute('data-id'));
                        processLeaveWorkflow(id, 'Approved', 'Approved via admin quick action.');
                    });
                });

                document.querySelectorAll('.btn-quick-reject').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = parseInt(e.currentTarget.getAttribute('data-id'));
                        processLeaveWorkflow(id, 'Rejected', 'Rejected via admin quick action.');
                    });
                });
            }
        }
    }

    function processLeaveWorkflow(id, newStatus, comment) {
        const leave = DB.leaves.find(l => l.id === id);
        if (!leave) return;

        leave.status = newStatus;
        leave.adminComment = comment;
        saveDB('leaves');

        DB.activities.push({
            id: DB.activities.length + 1,
            email: leave.email,
            text: `Leave request for ${leave.startDate} status changed to: ${newStatus}`,
            timestamp: new Date().toISOString()
        });
        saveDB('activities');

        showToast(`Leave request ${newStatus}!`, 'success');
        renderRegistry();
    }

    renderRegistry();
});
