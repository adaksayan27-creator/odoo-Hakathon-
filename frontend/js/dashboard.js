// Employee Dashboard Controller
document.addEventListener('DOMContentLoaded', () => {
    // 1. Guard check
    checkAuth('Employee');
    initLayout('dashboard');

    const currentUser = getCurrentUser();
    let timerInterval = null;

    // Render Stats
    function renderStats() {
        // Remaining leaves
        const userLeaves = DB.leaves.filter(l => l.email === currentUser.email && l.status === 'Approved');
        const totalTaken = userLeaves.reduce((acc, l) => acc + l.days, 0);
        document.getElementById('emp-dash-leaves-val').textContent = `${Math.max(0, 15 - totalTaken)} Days`;

        // Hours logged
        const logs = DB.attendance.filter(l => l.email === currentUser.email);
        let totalSecs = 0;
        logs.forEach(log => {
            if (log.totalHours) {
                const parts = log.totalHours.split(':');
                totalSecs += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            }
        });
        document.getElementById('emp-dash-hours-val').textContent = `${Math.round(totalSecs / 3600)} hrs`;

        // Salary
        const payroll = DB.payroll[currentUser.email] || { basic: 0, hra: 0, bonus: 0, deductions: 0 };
        const net = payroll.basic + payroll.hra + payroll.bonus - payroll.deductions;
        document.getElementById('emp-dash-salary-val').textContent = `$${net.toLocaleString()}`;

        // Pending
        const pending = DB.leaves.filter(l => l.email === currentUser.email && l.status === 'Pending').length;
        document.getElementById('emp-dash-approvals-val').textContent = `${pending} Request${pending === 1 ? '' : 's'}`;
    }

    // Attendance Clock Timer
    function runClock() {
        const update = () => {
            const checkInKey = `check_in_time_${currentUser.email}`;
            const checkInTimeStr = localStorage.getItem(checkInKey);
            const timerEl = document.getElementById('active-timer-display');

            if (checkInTimeStr && timerEl) {
                const checkInTime = new Date(checkInTimeStr);
                const now = new Date();
                const diffMs = now - checkInTime;

                const hrs = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                const secs = Math.floor((diffMs % 60000) / 1000);

                const format = (n) => n.toString().padStart(2, '0');
                timerEl.textContent = `${format(hrs)}:${format(mins)}:${format(secs)}`;
            } else if (timerEl) {
                timerEl.textContent = '00:00:00';
            }
        };

        if (timerInterval) clearInterval(timerInterval);
        update();
        timerInterval = setInterval(update, 1000);
    }

    function renderClockWidget() {
        const todayStr = new Date(2026, 6, 4).toISOString().split('T')[0]; // Mock date
        const todayLog = DB.attendance.find(l => l.email === currentUser.email && l.date === todayStr);

        const btn = document.getElementById('btn-clock-toggle');
        const badge = document.getElementById('active-status-badge');
        const checkInTimeStr = localStorage.getItem(`check_in_time_${currentUser.email}`);

        if (checkInTimeStr) {
            btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Check Out';
            btn.className = 'btn btn-secondary';
            badge.textContent = 'Currently Checked In';
            badge.className = 'attendance-status-badge status-badge-present';
            runClock();
        } else if (todayLog) {
            btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Day Completed';
            btn.className = 'btn btn-secondary';
            btn.disabled = true;
            badge.textContent = todayLog.status;
            badge.className = `attendance-status-badge status-badge-${todayLog.status.toLowerCase().replace('-', '')}`;
        } else {
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Check In';
            btn.className = 'btn btn-accent';
            btn.disabled = false;
            badge.textContent = 'Not Checked In';
            badge.className = 'attendance-status-badge status-badge-absent';
        }
    }

    // Toggle Attendance Punch
    const toggleBtn = document.getElementById('btn-clock-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const checkInKey = `check_in_time_${currentUser.email}`;
            const checkInTimeStr = localStorage.getItem(checkInKey);
            const todayStr = new Date(2026, 6, 4).toISOString().split('T')[0];

            if (!checkInTimeStr) {
                // Punch In
                const now = new Date();
                localStorage.setItem(checkInKey, now.toISOString());

                DB.activities.push({
                    id: DB.activities.length + 1,
                    email: currentUser.email,
                    text: `Checked in on Jul 4th at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    timestamp: now.toISOString()
                });
                saveDB('activities');

                showToast('Successfully Checked In!', 'success');
                renderClockWidget();
            } else {
                // Punch Out
                const checkInTime = new Date(checkInTimeStr);
                const now = new Date();
                localStorage.removeItem(checkInKey);

                const diffMs = now - checkInTime;
                const hrs = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                const secs = Math.floor((diffMs % 60000) / 1000);

                const format = (n) => n.toString().padStart(2, '0');
                const checkInVal = checkInTime.toLocaleTimeString([], { hour12: false });
                const checkOutVal = now.toLocaleTimeString([], { hour12: false });
                const duration = `${format(hrs)}:${format(mins)}:${format(secs)}`;

                let status = 'Present';
                if (diffMs < 4 * 3600000) status = 'Half-day';

                DB.attendance.push({
                    id: DB.attendance.length + 1,
                    email: currentUser.email,
                    date: todayStr,
                    checkIn: checkInVal,
                    checkOut: checkOutVal,
                    totalHours: duration,
                    status: status
                });
                saveDB('attendance');

                DB.activities.push({
                    id: DB.activities.length + 1,
                    email: currentUser.email,
                    text: `Checked out on Jul 4th at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Worked: ${hrs}h ${mins}m)`,
                    timestamp: now.toISOString()
                });
                saveDB('activities');

                if (timerInterval) clearInterval(timerInterval);

                showToast(`Checked Out. Status: ${status}`, 'success');
                renderClockWidget();
                renderStats();
                renderActivities();
            }
        });
    }

    // Activities List
    function renderActivities() {
        const feed = document.getElementById('employee-activity-feed');
        if (!feed) return;
        feed.innerHTML = '';

        const userActs = DB.activities.filter(a => a.email === currentUser.email).reverse().slice(0, 5);
        if (userActs.length === 0) {
            feed.innerHTML = '<li class="activity-desc text-muted">No recent activity logs.</li>';
        } else {
            userActs.forEach(act => {
                const li = document.createElement('li');
                li.className = 'activity-item';
                const time = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                li.innerHTML = `
                    <div class="activity-time">${time}</div>
                    <div class="activity-desc">${act.text}</div>
                `;
                feed.appendChild(li);
            });
        }
    }

    renderStats();
    renderClockWidget();
    renderActivities();
});
