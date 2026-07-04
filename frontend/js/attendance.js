// Attendance Section Controller
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initLayout('attendance');

    const currentUser = getCurrentUser();
    const targetEmail = getViewedEmployee();
    const targetUser = DB.users[targetEmail];

    let currentCalendarDate = new Date(2026, 6, 4); // Starting base matching mock database
    let timerInterval = null;

    if (!targetUser) return;

    // Timer functions
    function runClock() {
        const update = () => {
            const checkInKey = `check_in_time_${targetUser.email}`;
            const checkInTimeStr = localStorage.getItem(checkInKey);
            const timerEl = document.getElementById('attendance-section-timer');

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

    function renderPunchCard() {
        const todayStr = '2026-07-04';
        const todayLog = DB.attendance.find(l => l.email === targetUser.email && l.date === todayStr);

        const secTimer = document.getElementById('attendance-section-timer');
        const secStatus = document.getElementById('attendance-section-status');
        const secBtn = document.getElementById('btn-attendance-section-toggle');

        const punchInLabel = document.getElementById('attendance-punch-in-label');
        const punchOutLabel = document.getElementById('attendance-punch-out-label');
        const statusLabel = document.getElementById('attendance-status-label');

        // Only allow clock actions for matching profile user
        if (currentUser.email !== targetUser.email) {
            if (secBtn) {
                secBtn.disabled = true;
                secBtn.textContent = 'View-Only Mode';
            }
        }

        const checkInTimeStr = localStorage.getItem(`check_in_time_${targetUser.email}`);

        if (checkInTimeStr) {
            if (secBtn) {
                secBtn.textContent = 'Check Out';
                secBtn.className = 'btn btn-secondary';
            }
            if (secStatus) {
                secStatus.textContent = 'Currently Checked In';
                secStatus.className = 'attendance-status-badge status-badge-present';
            }
            if (punchInLabel) punchInLabel.textContent = new Date(checkInTimeStr).toLocaleTimeString([], { hour12: false });
            if (punchOutLabel) punchOutLabel.textContent = '--:--';
            if (statusLabel) statusLabel.textContent = 'Working...';
            runClock();
        } else if (todayLog) {
            if (secBtn) {
                secBtn.textContent = 'Day Completed';
                secBtn.disabled = true;
                secBtn.className = 'btn btn-secondary';
            }
            if (secStatus) {
                secStatus.textContent = todayLog.status;
                secStatus.className = `attendance-status-badge status-badge-${todayLog.status.toLowerCase().replace('-', '')}`;
            }
            if (punchInLabel) punchInLabel.textContent = todayLog.checkIn;
            if (punchOutLabel) punchOutLabel.textContent = todayLog.checkOut;
            if (statusLabel) statusLabel.textContent = todayLog.status;
            if (secTimer) secTimer.textContent = todayLog.totalHours;
        } else {
            if (secBtn && currentUser.email === targetUser.email) {
                secBtn.textContent = 'Check In';
                secBtn.className = 'btn btn-accent';
                secBtn.disabled = false;
            }
            if (secStatus) {
                secStatus.textContent = 'Not Checked In';
                secStatus.className = 'attendance-status-badge status-badge-absent';
            }
            if (punchInLabel) punchInLabel.textContent = '--:--';
            if (punchOutLabel) punchOutLabel.textContent = '--:--';
            if (statusLabel) statusLabel.textContent = 'Absent';
            if (secTimer) secTimer.textContent = '00:00:00';
        }
    }

    // Toggle button punch card listener
    const btnToggle = document.getElementById('btn-attendance-section-toggle');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const checkInKey = `check_in_time_${currentUser.email}`;
            const checkInTimeStr = localStorage.getItem(checkInKey);
            const todayStr = '2026-07-04';

            if (!checkInTimeStr) {
                const now = new Date();
                localStorage.setItem(checkInKey, now.toISOString());

                DB.activities.push({
                    id: DB.activities.length + 1,
                    email: currentUser.email,
                    text: `Checked in on Jul 4th at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    timestamp: now.toISOString()
                });
                saveDB('activities');

                showToast('Checked in successfully!', 'success');
                window.location.reload();
            } else {
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

                showToast(`Checked out. Status: ${status}`, 'success');
                window.location.reload();
            }
        });
    }

    let currentView = 'month';

    // View toggler setup
    const toggleButtons = document.querySelectorAll('#attendance-view-toggle button');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleButtons.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.style.background = 'var(--primary-color)';
            e.currentTarget.style.color = '#ffffff';
            
            currentView = e.currentTarget.getAttribute('data-view');
            renderAttendanceView();
        });
    });

    // Unified Attendance View Renderer
    function renderAttendanceView() {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const dateVal = currentCalendarDate.getDate();
        
        const calTitle = document.getElementById('attendance-calendar-title');
        const grid = document.getElementById('attendance-calendar-grid');
        const weekdaysHeader = document.querySelector('.calendar-weekdays');
        
        if (!grid) return;
        grid.innerHTML = '';
        
        if (currentView === 'month') {
            if (weekdaysHeader) weekdaysHeader.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            if (calTitle) calTitle.textContent = `${monthNames[month]} ${year}`;
            
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
                
                if (log) {
                    const marker = document.createElement('div');
                    marker.className = `calendar-day-marker marker-${log.status.toLowerCase().replace('-', '')}`;
                    cell.appendChild(marker);
                    cell.title = `Worked: ${log.totalHours} (${log.status})`;
                } else if (leave) {
                    const marker = document.createElement('div');
                    marker.className = 'calendar-day-marker marker-leave';
                    cell.appendChild(marker);
                    cell.title = `${leave.type} Leave Approved`;
                } else {
                    const dayOfWeek = new Date(year, month, day).getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6 && dateStr < '2026-07-04') {
                        const marker = document.createElement('div');
                        marker.className = 'calendar-day-marker marker-absent';
                        cell.appendChild(marker);
                        cell.title = 'Absent';
                    }
                }
                
                cell.addEventListener('click', () => {
                    currentCalendarDate = new Date(year, month, day);
                    const dayBtn = document.querySelector('#attendance-view-toggle button[data-view="day"]');
                    if (dayBtn) dayBtn.click();
                });
                
                grid.appendChild(cell);
            }
        } 
        else if (currentView === 'week') {
            if (weekdaysHeader) weekdaysHeader.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
            
            const startOfWeek = new Date(currentCalendarDate);
            startOfWeek.setDate(currentCalendarDate.getDate() - currentCalendarDate.getDay());
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const formatDateShort = (d) => `${d.getMonth()+1}/${d.getDate()}`;
            if (calTitle) calTitle.textContent = `Week: ${formatDateShort(startOfWeek)} - ${formatDateShort(endOfWeek)} (${year})`;
            
            for (let i = 0; i < 7; i++) {
                const currentDay = new Date(startOfWeek);
                currentDay.setDate(startOfWeek.getDate() + i);
                
                const cell = document.createElement('div');
                cell.className = 'calendar-day';
                cell.style.aspectRatio = '0.95';
                cell.style.display = 'flex';
                cell.style.flexDirection = 'column';
                cell.style.justifyContent = 'space-between';
                cell.innerHTML = `<span style="font-weight:700; color:var(--text-muted); font-size:0.75rem;">${formatDateShort(currentDay)}</span>`;
                
                const dateStr = `${currentDay.getFullYear()}-${(currentDay.getMonth() + 1).toString().padStart(2, '0')}-${currentDay.getDate().toString().padStart(2, '0')}`;
                const log = DB.attendance.find(l => l.email === targetUser.email && l.date === dateStr);
                const leave = DB.leaves.find(l => l.email === targetUser.email && l.status === 'Approved' && dateStr >= l.startDate && dateStr <= l.endDate);
                
                const statusText = document.createElement('span');
                statusText.style.fontSize = '0.75rem';
                statusText.style.fontWeight = 'bold';
                statusText.style.textAlign = 'center';
                statusText.style.marginTop = 'auto';
                statusText.style.marginBottom = 'auto';
                
                if (log) {
                    statusText.textContent = log.status;
                    statusText.style.color = log.status === 'Present' ? 'var(--color-success)' : 'var(--color-warning)';
                    const times = document.createElement('span');
                    times.style.fontSize = '0.65rem';
                    times.style.color = 'var(--text-muted)';
                    times.style.textAlign = 'center';
                    times.textContent = `${log.checkIn} - ${log.checkOut || 'Working'}`;
                    cell.appendChild(statusText);
                    cell.appendChild(times);
                } else if (leave) {
                    statusText.textContent = `${leave.type} Leave`;
                    statusText.style.color = 'var(--color-leave)';
                    cell.appendChild(statusText);
                } else {
                    const dayOfWeek = currentDay.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        statusText.textContent = 'Weekend';
                        statusText.style.color = 'var(--text-muted)';
                    } else if (dateStr < '2026-07-04') {
                        statusText.textContent = 'Absent';
                        statusText.style.color = 'var(--color-danger)';
                    } else {
                        statusText.textContent = 'Scheduled';
                        statusText.style.color = 'var(--text-muted)';
                    }
                    cell.appendChild(statusText);
                }
                
                cell.addEventListener('click', () => {
                    currentCalendarDate = currentDay;
                    const dayBtn = document.querySelector('#attendance-view-toggle button[data-view="day"]');
                    if (dayBtn) dayBtn.click();
                });
                
                grid.appendChild(cell);
            }
        } 
        else if (currentView === 'day') {
            if (weekdaysHeader) weekdaysHeader.style.display = 'none';
            grid.style.gridTemplateColumns = '1fr';
            
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedDate = `${dayNames[currentCalendarDate.getDay()]}, ${monthNames[month]} ${dateVal}, ${year}`;
            
            if (calTitle) calTitle.textContent = formattedDate;
            
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dateVal.toString().padStart(2, '0')}`;
            const log = DB.attendance.find(l => l.email === targetUser.email && l.date === dateStr);
            const leave = DB.leaves.find(l => l.email === targetUser.email && l.status === 'Approved' && dateStr >= l.startDate && dateStr <= l.endDate);
            
            const detailCard = document.createElement('div');
            detailCard.className = 'dashboard-card';
            detailCard.style.margin = '0';
            detailCard.style.boxShadow = 'none';
            detailCard.style.background = 'var(--bg-app)';
            detailCard.style.border = '1px solid var(--border-color)';
            
            let htmlContent = '';
            
            if (log) {
                htmlContent = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                        <h4 style="margin:0; font-size:1.1rem; color:var(--primary-color);">Workday Details</h4>
                        <span class="attendance-status-badge status-badge-${log.status.toLowerCase().replace('-', '')}">${log.status}</span>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-label">Check-In Time</span>
                            <span class="details-value" style="font-weight:700;">${log.checkIn}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">Check-Out Time</span>
                            <span class="details-value" style="font-weight:700;">${log.checkOut || '--:--'}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">Total Duration</span>
                            <span class="details-value" style="font-weight:700; color:var(--primary-color);">${log.totalHours || 'Working'}</span>
                        </div>
                    </div>
                `;
            } else if (leave) {
                htmlContent = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                        <h4 style="margin:0; font-size:1.1rem; color:var(--color-leave);">Leave Approved</h4>
                        <span class="attendance-status-badge status-badge-approved" style="background:var(--color-leave); color:#fff;">Time-Off</span>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-label">Leave Type</span>
                            <span class="details-value">${leave.type} Leave</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">Duration</span>
                            <span class="details-value">${leave.startDate} to ${leave.endDate} (${leave.days} day(s))</span>
                        </div>
                        <div class="details-row">
                            <span class="details-label">Remarks</span>
                            <span class="details-value">${leave.remarks || 'No remarks provided.'}</span>
                        </div>
                    </div>
                `;
            } else {
                const dayOfWeek = currentCalendarDate.getDay();
                let statusVal = 'Scheduled Workday';
                let badgeClass = 'status-badge-absent';
                let statusColor = 'var(--text-muted)';
                
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    statusVal = 'Weekend Rest';
                    badgeClass = 'status-badge-absent';
                } else if (dateStr < '2026-07-04') {
                    statusVal = 'Absent (No Punch Record)';
                    badgeClass = 'status-badge-absent';
                    statusColor = 'var(--color-danger)';
                }
                
                htmlContent = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                        <h4 style="margin:0; font-size:1.1rem; color:var(--text-muted);">${statusVal}</h4>
                        <span class="attendance-status-badge ${badgeClass}">${dayOfWeek === 0 || dayOfWeek === 6 ? 'Off' : 'Absent'}</span>
                    </div>
                    <p class="auth-subtitle">No punch logs were created for this date.</p>
                `;
            }
            
            detailCard.innerHTML = htmlContent;
            grid.appendChild(detailCard);
        }
    }

    // Prev/Next calendar navigators
    const prevBtn = document.getElementById('btn-prev-month');
    const nextBtn = document.getElementById('btn-next-month');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentView === 'month') {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            } else if (currentView === 'week') {
                currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
            } else if (currentView === 'day') {
                currentCalendarDate.setDate(currentCalendarDate.getDate() - 1);
            }
            renderAttendanceView();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentView === 'month') {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            } else if (currentView === 'week') {
                currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
            } else if (currentView === 'day') {
                currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
            }
            renderAttendanceView();
        });
    }

    // Render list table
    function renderHistory() {
        const tbody = document.getElementById('attendance-history-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const userLogs = DB.attendance.filter(l => l.email === targetUser.email).reverse();
        if (userLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;" class="text-muted">No attendance logs found.</td></tr>';
        } else {
            userLogs.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${log.date}</td>
                    <td>${log.checkIn}</td>
                    <td>${log.checkOut || '--:--'}</td>
                    <td>${log.totalHours || '--:--'}</td>
                    <td><span class="attendance-status-badge status-badge-${log.status.toLowerCase().replace('-', '')}">${log.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    renderPunchCard();
    renderAttendanceView();
    renderHistory();
});
