// HR Admin Control Board Controller — Full Access Edition
document.addEventListener('DOMContentLoaded', () => {
    checkAuth('Admin');
    initLayout('admin');

    const currentUser = getCurrentUser();
    const todayStr = new Date().toISOString().split('T')[0];

    // ==================== CONFIRM DELETE MODAL ====================
    let pendingDeleteCallback = null;

    function showConfirmDelete(title, body, onConfirm) {
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-body').textContent = body;
        pendingDeleteCallback = onConfirm;
        const modal = document.getElementById('confirm-delete-modal');
        modal.style.display = 'flex';
    }

    document.getElementById('btn-confirm-delete-cancel').addEventListener('click', () => {
        document.getElementById('confirm-delete-modal').style.display = 'none';
        pendingDeleteCallback = null;
    });

    document.getElementById('btn-confirm-delete-ok').addEventListener('click', () => {
        document.getElementById('confirm-delete-modal').style.display = 'none';
        if (typeof pendingDeleteCallback === 'function') pendingDeleteCallback();
        pendingDeleteCallback = null;
    });

    // ==================== EMAIL HELPER ====================
    async function callEmailAPI(endpoint, payload) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                let msg = 'Email notification sent successfully!';
                if (data.previewUrl) {
                    msg += ` <a href="${data.previewUrl}" target="_blank" style="text-decoration:underline; color:var(--accent-color);">Preview email</a>`;
                }
                showToastHTML(msg, 'success');
                renderEmailLog();
            }
        } catch (e) {
            console.warn('Email send failed:', e.message);
        }
    }

    function showToastHTML(html, type = 'primary') {
        let container = document.getElementById('alerts-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'alerts-container';
            container.className = 'alerts-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `alert-toast ${type}`;
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'warning') icon = 'fa-triangle-exclamation';
        if (type === 'danger') icon = 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${html}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 6000);
    }

    // ==================== MAIN REGISTRY ====================
    function renderRegistry() {
        const employees = Object.values(DB.users).filter(u => u.role !== 'Admin');
        const totalCount = employees.length;

        document.getElementById('admin-dash-total-emp').textContent = totalCount;

        const logsToday = DB.attendance.filter(log => log.date === todayStr);
        const presentCount = logsToday.length;
        document.getElementById('admin-dash-present').textContent = presentCount;

        const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        document.getElementById('admin-dash-present-rate').innerHTML = `<i class="fa-solid fa-chart-line"></i> ${rate}% presence rate`;

        const pendingCount = DB.leaves.filter(l => l.status === 'Pending').length;
        document.getElementById('admin-dash-pending-leaves').textContent = pendingCount;

        const absentCount = Math.max(0, totalCount - presentCount);
        document.getElementById('admin-dash-absent').textContent = absentCount;

        // Employee Table
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
                            <button class="action-icon-btn btn-delete-emp" data-email="${user.email}" data-name="${user.name}" title="Delete Employee" style="color: var(--color-danger);"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.btn-view-emp').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    localStorage.setItem('hrms_viewed_employee', e.currentTarget.getAttribute('data-email'));
                    window.location.href = 'profile.html';
                });
            });

            document.querySelectorAll('.btn-edit-payroll').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    localStorage.setItem('hrms_viewed_employee', e.currentTarget.getAttribute('data-email'));
                    window.location.href = 'payroll.html';
                });
            });

            document.querySelectorAll('.btn-delete-emp').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const email = e.currentTarget.getAttribute('data-email');
                    const name = e.currentTarget.getAttribute('data-name');
                    showConfirmDelete(
                        `Delete Employee: ${name}?`,
                        `This will permanently remove ${name}'s account, attendance records, leave records, payroll data, and activities. This cannot be undone.`,
                        async () => {
                            const res = await fetch(`/api/admin/employee/${encodeURIComponent(email)}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.success) {
                                // Refresh local DB
                                delete DB.users[email];
                                delete DB.payroll[email];
                                DB.attendance = DB.attendance.filter(a => a.email !== email);
                                DB.leaves = DB.leaves.filter(l => l.email !== email);
                                DB.activities = DB.activities.filter(a => a.email !== email);
                                showToast(`Employee ${name} deleted successfully.`, 'success');
                                renderAll();
                            } else {
                                showToast(data.error || 'Delete failed.', 'danger');
                            }
                        }
                    );
                });
            });
        }

        // Pending Leaves Sidebar
        renderPendingLeavesSidebar();
    }

    // ==================== PENDING LEAVES SIDEBAR ====================
    function renderPendingLeavesSidebar() {
        const pendingList = document.getElementById('admin-leaves-sidebar-list');
        if (!pendingList) return;
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
                    <input type="text" class="form-input quick-comment-input" data-id="${leave.id}" placeholder="Add HR comment..." style="margin-top:10px; padding:6px; font-size:0.8rem;">
                    <div style="display:flex; gap: 8px; margin-top:8px;">
                        <button class="btn btn-accent btn-quick-approve" data-id="${leave.id}" style="padding:6px; font-size:0.75rem; width:50%;">Approve</button>
                        <button class="btn btn-secondary btn-quick-reject" data-id="${leave.id}" style="padding:6px; font-size:0.75rem; width:50%;">Reject</button>
                    </div>
                `;
                pendingList.appendChild(card);
            });

            document.querySelectorAll('.btn-quick-approve').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    const comment = document.querySelector(`.quick-comment-input[data-id="${id}"]`).value || 'Approved by Admin.';
                    processLeaveWorkflow(id, 'Approved', comment);
                });
            });

            document.querySelectorAll('.btn-quick-reject').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    const comment = document.querySelector(`.quick-comment-input[data-id="${id}"]`).value || 'Rejected by Admin.';
                    processLeaveWorkflow(id, 'Rejected', comment);
                });
            });
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
            text: `Leave request for ${leave.startDate} ${newStatus} by HR Admin`,
            timestamp: new Date().toISOString()
        });
        saveDB('activities');

        showToast(`Leave request ${newStatus}!`, 'success');

        // Send email notification
        callEmailAPI('/api/email/leave-decision', {
            leaveId: leave.id,
            status: newStatus,
            adminComment: comment
        });

        renderAll();
    }

    // ==================== BONUS MANAGEMENT ====================
    function renderBonusTable() {
        const tbody = document.getElementById('admin-bonus-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const employees = Object.values(DB.users).filter(u => u.role !== 'Admin');

        if (employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;" class="text-muted">No employees registered.</td></tr>';
            return;
        }

        employees.forEach(user => {
            const payroll = DB.payroll[user.email] || { basic: 0, hra: 0, bonus: 0, deductions: 0 };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="table-user-cell">
                        <img class="table-user-img" src="${user.avatar}" alt="Avatar">
                        <div>
                            <span style="font-weight:600; display:block;">${user.name}</span>
                            <span class="auth-subtitle">${user.employeeId}</span>
                        </div>
                    </div>
                </td>
                <td>${user.department}</td>
                <td style="font-weight:600;">$${payroll.basic.toLocaleString()}</td>
                <td>
                    <span class="attendance-status-badge status-badge-present" style="font-size:0.8rem; padding:4px 10px;">
                        +$${payroll.bonus.toLocaleString()}
                    </span>
                </td>
                <td>
                    <input type="number" class="form-input bonus-input" data-email="${user.email}" value="${payroll.bonus}" min="0" style="padding:6px 10px; width:120px; font-size:0.9rem;">
                </td>
                <td>
                    <button class="btn btn-accent btn-save-bonus" data-email="${user.email}" style="width:auto; padding:7px 16px; font-size:0.85rem;">
                        <i class="fa-solid fa-check"></i> Apply
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-save-bonus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.currentTarget.getAttribute('data-email');
                const bonusInput = document.querySelector(`.bonus-input[data-email="${email}"]`);
                const newBonus = parseInt(bonusInput.value) || 0;

                if (!DB.payroll[email]) {
                    DB.payroll[email] = { email, basic: 0, hra: 0, bonus: 0, deductions: 0 };
                }
                DB.payroll[email].bonus = newBonus;
                saveDB('payroll');

                showToast(`Bonus for ${DB.users[email]?.name} updated to $${newBonus.toLocaleString()}!`, 'success');

                // Send payroll email notification
                callEmailAPI('/api/email/payroll-update', {
                    employeeEmail: email,
                    payroll: DB.payroll[email]
                });

                renderBonusTable();
            });
        });
    }

    // ==================== ALL ATTENDANCE RECORDS ====================
    function renderAttendanceTable() {
        const filter = document.getElementById('admin-attendance-filter')?.value || 'all';
        const tbody = document.getElementById('admin-attendance-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Populate filter
        const filterEl = document.getElementById('admin-attendance-filter');
        if (filterEl && filterEl.options.length <= 1) {
            Object.values(DB.users).filter(u => u.role !== 'Admin').forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.email;
                opt.textContent = u.name;
                filterEl.appendChild(opt);
            });
            filterEl.addEventListener('change', renderAttendanceTable);
        }

        let records = DB.attendance.slice().reverse();
        if (filter !== 'all') records = records.filter(r => r.email === filter);

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;" class="text-muted">No attendance records found.</td></tr>';
            return;
        }

        records.forEach(log => {
            const user = DB.users[log.email];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="table-user-cell">
                        ${user ? `<img class="table-user-img" src="${user.avatar}" alt="">` : ''}
                        <span style="font-weight:600;">${user ? user.name : log.email}</span>
                    </div>
                </td>
                <td>${log.date}</td>
                <td>${log.checkIn}</td>
                <td>${log.checkOut || '--:--'}</td>
                <td>${log.totalHours || '--:--'}</td>
                <td><span class="attendance-status-badge status-badge-${log.status.toLowerCase().replace('-', '')}">${log.status}</span></td>
                <td>
                    <button class="action-icon-btn btn-delete-attendance" data-id="${log.id}" data-name="${user ? user.name : log.email}" title="Delete Record" style="color: var(--color-danger);">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete-attendance').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const name = e.currentTarget.getAttribute('data-name');
                showConfirmDelete(
                    'Delete Attendance Record?',
                    `Remove the attendance log for ${name}? This action cannot be undone.`,
                    async () => {
                        const res = await fetch(`/api/admin/attendance/${id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            DB.attendance = DB.attendance.filter(a => a.id !== id);
                            showToast('Attendance record deleted.', 'success');
                            renderAll();
                        } else {
                            showToast(data.error || 'Delete failed.', 'danger');
                        }
                    }
                );
            });
        });
    }

    // ==================== ALL LEAVE RECORDS ====================
    function renderAllLeavesTable() {
        const tbody = document.getElementById('admin-leaves-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const all = DB.leaves.slice().reverse();

        if (all.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;" class="text-muted">No leave records found.</td></tr>';
            return;
        }

        all.forEach(leave => {
            const user = DB.users[leave.email];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="table-user-cell">
                        ${user ? `<img class="table-user-img" src="${user.avatar}" alt="">` : ''}
                        <span style="font-weight:600;">${leave.employeeName}</span>
                    </div>
                </td>
                <td>${leave.type} Leave</td>
                <td>${leave.startDate}</td>
                <td>${leave.endDate}</td>
                <td>${leave.days} day(s)</td>
                <td><span class="attendance-status-badge status-badge-${leave.status.toLowerCase()}">${leave.status}</span></td>
                <td><span class="auth-subtitle">${leave.adminComment || '—'}</span></td>
                <td>
                    <button class="action-icon-btn btn-delete-leave" data-id="${leave.id}" data-name="${leave.employeeName}" title="Delete Leave" style="color: var(--color-danger);">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete-leave').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const name = e.currentTarget.getAttribute('data-name');
                showConfirmDelete(
                    'Delete Leave Record?',
                    `Permanently remove the leave request for ${name}? This cannot be undone.`,
                    async () => {
                        const res = await fetch(`/api/admin/leave/${id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            DB.leaves = DB.leaves.filter(l => l.id !== id);
                            showToast('Leave record deleted.', 'success');
                            renderAll();
                        } else {
                            showToast(data.error || 'Delete failed.', 'danger');
                        }
                    }
                );
            });
        });
    }

    // ==================== EMAIL LOG ====================
    async function renderEmailLog() {
        const container = document.getElementById('email-log-list');
        if (!container) return;
        try {
            const res = await fetch('/api/email/log');
            const emails = await res.json();

            if (!emails.length) {
                container.innerHTML = '<p class="auth-subtitle" style="text-align:center;">No emails sent yet.</p>';
                return;
            }

            container.innerHTML = '';
            emails.forEach(email => {
                const card = document.createElement('div');
                card.className = 'admin-pending-leave-card';
                card.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; gap:16px;';

                const sentTime = new Date(email.sentAt).toLocaleString();
                card.innerHTML = `
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <i class="fa-solid fa-envelope" style="color:var(--primary-color); font-size:0.85rem;"></i>
                            <span style="font-weight:700; font-size:0.9rem;">${email.subject}</span>
                        </div>
                        <p style="margin:0 0 4px 0; font-size:0.8rem; color:var(--text-muted);">
                            <i class="fa-solid fa-user"></i> To: ${email.toName} (${email.to})
                        </p>
                        <p style="margin:0; font-size:0.78rem; color:var(--text-muted); font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:400px;">${email.preview}</p>
                    </div>
                    <div style="text-align:right; white-space:nowrap; flex-shrink:0;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px;">${sentTime}</div>
                        ${email.previewUrl ? `<a href="${email.previewUrl}" target="_blank" class="btn btn-secondary" style="padding:5px 12px; font-size:0.78rem; width:auto; text-decoration:none; display:inline-block;"><i class="fa-solid fa-eye"></i> Preview</a>` : '<span class="auth-subtitle" style="font-size:0.75rem;">No preview</span>'}
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = '<p class="auth-subtitle" style="text-align:center;">Failed to load email log. Server may be offline.</p>';
        }
    }

    document.getElementById('btn-refresh-email-log')?.addEventListener('click', renderEmailLog);

    // ==================== RENDER ALL ====================
    function renderAll() {
        renderRegistry();
        renderBonusTable();
        renderAttendanceTable();
        renderAllLeavesTable();
        renderEmailLog();
    }

    renderAll();
});
