// Leave Section Controller
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initLayout('leave');

    const currentUser = getCurrentUser();
    const targetEmail = getViewedEmployee();
    const targetUser = DB.users[targetEmail];

    if (!targetUser) return;

    // Leave request submission form
    const form = document.getElementById('leave-request-form');
    if (form) {
        // Disable submission if looking at someone else's profile
        if (currentUser.email !== targetUser.email) {
            const btn = form.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'View-Only Mode';
            }
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const type = document.getElementById('leave-type').value;
            const start = document.getElementById('leave-start-date').value;
            const end = document.getElementById('leave-end-date').value;
            const remarks = document.getElementById('leave-remarks').value;

            if (start > end) {
                showToast('Start date cannot be after end date.', 'warning');
                return;
            }

            const diffTime = Math.abs(new Date(end) - new Date(start));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            DB.leaves.push({
                id: DB.leaves.length + 1,
                email: currentUser.email,
                employeeName: currentUser.name,
                type: type,
                startDate: start,
                endDate: end,
                days: diffDays,
                status: 'Pending',
                remarks: remarks,
                adminComment: ''
            });
            saveDB('leaves');

            DB.activities.push({
                id: DB.activities.length + 1,
                email: currentUser.email,
                text: `Submitted ${type} Leave request for ${diffDays} day(s)`,
                timestamp: new Date().toISOString()
            });
            saveDB('activities');

            showToast('Leave request submitted successfully!', 'success');
            form.reset();
            renderLeaves();
        });
    }

    // Render Leaves lists
    function renderLeaves() {
        // 1. Employee Leave logs
        const historyBody = document.getElementById('employee-leaves-history-tbody');
        if (historyBody) {
            historyBody.innerHTML = '';
            const userLeaves = DB.leaves.filter(l => l.email === targetUser.email).reverse();

            if (userLeaves.length === 0) {
                historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center;" class="text-muted">No leave requests logged.</td></tr>';
            } else {
                userLeaves.forEach(leave => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${leave.type} Leave</strong></td>
                        <td>${leave.startDate}</td>
                        <td>${leave.endDate}</td>
                        <td>${leave.days} day(s)</td>
                        <td><span class="attendance-status-badge status-badge-${leave.status.toLowerCase()}">${leave.status}</span></td>
                        <td><span class="auth-subtitle">${leave.adminComment || 'Waiting review'}</span></td>
                    `;
                    historyBody.appendChild(tr);
                });
            }
        }

        // 2. Company-Wide Approvals (Admin view only)
        const adminApprovalsPanel = document.getElementById('admin-leave-approvals-panel');
        if (currentUser.role === 'Admin' && adminApprovalsPanel) {
            adminApprovalsPanel.classList.remove('d-none');
            const approvalsBody = document.getElementById('admin-leave-approvals-tbody');
            if (approvalsBody) {
                approvalsBody.innerHTML = '';

                if (DB.leaves.length === 0) {
                    approvalsBody.innerHTML = '<tr><td colspan="8" style="text-align:center;" class="text-muted">No leave requests recorded.</td></tr>';
                } else {
                    DB.leaves.slice().reverse().forEach(leave => {
                        const tr = document.createElement('tr');
                        let actionsCell = '';
                        if (leave.status === 'Pending') {
                            actionsCell = `
                                <div class="action-buttons-wrap">
                                    <button class="action-icon-btn btn-approve btn-action-approve" data-id="${leave.id}" title="Approve"><i class="fa-solid fa-check"></i></button>
                                    <button class="action-icon-btn btn-reject btn-action-reject" data-id="${leave.id}" title="Reject"><i class="fa-solid fa-xmark"></i></button>
                                </div>
                            `;
                        } else {
                            actionsCell = `<span class="auth-subtitle"><i class="fa-solid fa-lock"></i> Locked</span>`;
                        }

                        const commentInputId = `admin-comment-input-${leave.id}`;
                        tr.innerHTML = `
                            <td><strong>${leave.employeeName}</strong></td>
                            <td>${leave.type} Leave</td>
                            <td>${leave.startDate}</td>
                            <td>${leave.endDate}</td>
                            <td><span class="auth-subtitle" title="${leave.remarks}">${leave.remarks}</span></td>
                            <td><span class="attendance-status-badge status-badge-${leave.status.toLowerCase()}">${leave.status}</span></td>
                            <td>
                                <input type="text" id="${commentInputId}" class="form-input" placeholder="Add feedback..." value="${leave.adminComment}" ${leave.status !== 'Pending' ? 'disabled readonly style="background:var(--bg-app); border:none;"' : 'style="padding:6px; font-size:0.85rem;"'}>
                            </td>
                            <td>${actionsCell}</td>
                        `;
                        approvalsBody.appendChild(tr);
                    });

                    // Approve/Reject button hooks
                    document.querySelectorAll('.btn-action-approve').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = parseInt(e.currentTarget.getAttribute('data-id'));
                            const comment = document.getElementById(`admin-comment-input-${id}`).value;
                            processLeaveWorkflow(id, 'Approved', comment);
                        });
                    });

                    document.querySelectorAll('.btn-action-reject').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = parseInt(e.currentTarget.getAttribute('data-id'));
                            const comment = document.getElementById(`admin-comment-input-${id}`).value;
                            processLeaveWorkflow(id, 'Rejected', comment);
                        });
                    });
                }
            }
        } else if (adminApprovalsPanel) {
            adminApprovalsPanel.classList.add('d-none');
        }
    }

    function processLeaveWorkflow(id, newStatus, comment) {
        const leave = DB.leaves.find(l => l.id === id);
        if (!leave) return;

        leave.status = newStatus;
        leave.adminComment = comment || (newStatus === 'Approved' ? 'Approved by Admin.' : 'Rejected by Admin.');
        saveDB('leaves');

        DB.activities.push({
            id: DB.activities.length + 1,
            email: leave.email,
            text: `Leave request for ${leave.startDate} status changed to: ${newStatus}`,
            timestamp: new Date().toISOString()
        });
        saveDB('activities');

        showToast(`Leave request ${newStatus} successfully!`, 'success');
        renderLeaves();
    }

    // Interactive Leaves Calendar Setup
    let currentCalendarDate = new Date(2026, 6, 4);
    let selectStart = null;
    let selectEnd = null;

    function generateLeavesCalendar(year, month) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const calTitle = document.getElementById('leaves-calendar-title');
        if (calTitle) calTitle.textContent = `${monthNames[month]} ${year}`;

        const grid = document.getElementById('leaves-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Offsets
        for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day empty';
            grid.appendChild(cell);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            cell.innerHTML = `<span>${day}</span>`;

            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            const log = DB.attendance.find(l => l.email === targetUser.email && l.date === dateStr);
            const leave = DB.leaves.find(l => l.email === targetUser.email && l.status === 'Approved' && dateStr >= l.startDate && dateStr <= l.endDate);

            // Markers
            if (log) {
                const marker = document.createElement('div');
                marker.className = `calendar-day-marker marker-${log.status.toLowerCase().replace('-', '')}`;
                cell.appendChild(marker);
            } else if (leave) {
                const marker = document.createElement('div');
                marker.className = 'calendar-day-marker marker-leave';
                cell.appendChild(marker);
            } else {
                const dayOfWeek = new Date(year, month, day).getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && dateStr < '2026-07-04') {
                    const marker = document.createElement('div');
                    marker.className = 'calendar-day-marker marker-absent';
                    cell.appendChild(marker);
                }
            }

            // Highlights range
            if (selectStart === dateStr) {
                cell.classList.add('selected-start');
            } else if (selectEnd === dateStr) {
                cell.classList.add('selected-end');
            } else if (selectStart && selectEnd && dateStr > selectStart && dateStr < selectEnd) {
                cell.classList.add('selected-in-range');
            }

            // Click listener
            cell.addEventListener('click', () => {
                if (currentUser.email !== targetUser.email) {
                    showToast('You can only select leave dates on your own profile.', 'warning');
                    return;
                }

                if (!selectStart || (selectStart && selectEnd)) {
                    selectStart = dateStr;
                    selectEnd = null;
                    showToast(`Start date set: ${dateStr}. Now select the end date.`, 'info');
                } else {
                    if (dateStr < selectStart) {
                        selectStart = dateStr;
                        showToast(`Start date updated: ${dateStr}.`, 'info');
                    } else {
                        selectEnd = dateStr;
                        showToast(`Date range selected: ${selectStart} to ${selectEnd}`, 'success');
                    }
                }

                const startInput = document.getElementById('leave-start-date');
                const endInput = document.getElementById('leave-end-date');
                if (startInput) startInput.value = selectStart;
                if (endInput) endInput.value = selectEnd || '';

                generateLeavesCalendar(year, month);
            });

            grid.appendChild(cell);
        }
    }

    const prevBtn = document.getElementById('btn-leaves-prev-month');
    const nextBtn = document.getElementById('btn-leaves-next-month');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            generateLeavesCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            generateLeavesCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
        });
    }

    generateLeavesCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    renderLeaves();
});
