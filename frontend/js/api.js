// Odoo HRMS Shared API and State Module

const DB = {};

// Synchronously load database state from Express backend server with a local storage fallback
try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/db', false); // Synchronous GET request
    xhr.send(null);
    if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        Object.assign(DB, data);
        // Clear stale localStorage user cache so ghost test-registered accounts never re-appear
        localStorage.removeItem('hrms_users');
        console.log('Successfully connected to HRMS backend server.');
    } else {
        throw new Error('Server returned status ' + xhr.status);
    }
} catch (e) {
    console.warn('Backend server offline or unreachable. Falling back to local storage...', e);
    Object.assign(DB, {
        users: JSON.parse(localStorage.getItem('hrms_users')) || {},
        attendance: JSON.parse(localStorage.getItem('hrms_attendance')) || [],
        leaves: JSON.parse(localStorage.getItem('hrms_leaves')) || [],
        payroll: JSON.parse(localStorage.getItem('hrms_payroll')) || {},
        notifications: JSON.parse(localStorage.getItem('hrms_notifications')) || [],
        activities: JSON.parse(localStorage.getItem('hrms_activities')) || []
    });
}

// Seeding Helper
function seedDatabase() {
    if (localStorage.getItem('hrms_seeded') || (DB.users && Object.keys(DB.users).length > 0)) return;

    const seedUsers = {
        'admin@company.com': {
            email: 'admin@company.com',
            password: 'Admin@123',
            employeeId: 'EMP-001',
            name: 'HR Officer Jane',
            role: 'Admin',
            address: '10 Odoo Way, Belgium',
            phone: '+32 2 123 4567',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
            jobTitle: 'HR Director',
            department: 'People Operations',
            joinDate: '2020-01-01',
            status: 'Active'
        },
        'employee@company.com': {
            email: 'employee@company.com',
            password: 'Employee@123',
            employeeId: 'EMP-1002',
            name: 'Sayan Roy',
            role: 'Employee',
            address: 'Kolkata, India',
            phone: '+91 98765 43210',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            jobTitle: 'Lead Software Engineer',
            department: 'Engineering',
            joinDate: '2023-04-15',
            status: 'Active'
        },
        'mark@company.com': {
            email: 'mark@company.com',
            password: 'Employee@123',
            employeeId: 'EMP-1003',
            name: 'Mark Peterson',
            role: 'Employee',
            address: 'San Francisco, USA',
            phone: '+1 415 555-8821',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
            jobTitle: 'UX/UI Designer',
            department: 'Product Design',
            joinDate: '2024-02-10',
            status: 'Active'
        }
    };

    const seedPayroll = {
        'employee@company.com': {
            email: 'employee@company.com',
            basic: 4800,
            hra: 1200,
            bonus: 600,
            deductions: 900
        },
        'mark@company.com': {
            email: 'mark@company.com',
            basic: 4000,
            hra: 1000,
            bonus: 400,
            deductions: 800
        }
    };

    const seedAttendance = [
        { id: 1, email: 'employee@company.com', date: '2026-07-01', checkIn: '09:02:15', checkOut: '18:05:40', totalHours: '09:03:25', status: 'Present' },
        { id: 2, email: 'employee@company.com', date: '2026-07-02', checkIn: '09:15:00', checkOut: '17:30:10', totalHours: '08:15:10', status: 'Present' },
        { id: 3, email: 'employee@company.com', date: '2026-07-03', checkIn: '08:58:30', checkOut: '13:02:15', totalHours: '04:03:45', status: 'Half-day' },
        { id: 4, email: 'mark@company.com', date: '2026-07-01', checkIn: '09:05:00', checkOut: '18:00:00', totalHours: '08:55:00', status: 'Present' },
        { id: 5, email: 'mark@company.com', date: '2026-07-02', checkIn: '09:10:00', checkOut: '18:15:00', totalHours: '09:05:00', status: 'Present' }
    ];

    const seedLeaves = [
        {
            id: 1,
            email: 'employee@company.com',
            employeeName: 'Sayan Roy',
            type: 'Sick',
            startDate: '2026-06-15',
            endDate: '2026-06-16',
            days: 2,
            status: 'Approved',
            remarks: 'Recovering from seasonal flu.',
            adminComment: 'Get well soon! Approved.'
        },
        {
            id: 2,
            email: 'employee@company.com',
            employeeName: 'Sayan Roy',
            type: 'Paid',
            startDate: '2026-07-10',
            endDate: '2026-07-12',
            days: 3,
            status: 'Pending',
            remarks: 'Family trip out of town.',
            adminComment: ''
        },
        {
            id: 3,
            email: 'mark@company.com',
            employeeName: 'Mark Peterson',
            type: 'Paid',
            startDate: '2026-07-15',
            endDate: '2026-07-16',
            days: 2,
            status: 'Pending',
            remarks: 'Personal urgent work.',
            adminComment: ''
        }
    ];

    const seedActivities = [
        { id: 1, email: 'employee@company.com', text: 'Checked in on Jul 3rd at 08:58 AM', timestamp: '2026-07-03T08:58:30Z' },
        { id: 2, email: 'employee@company.com', text: 'Submitted leave request for Jul 10th - 12th', timestamp: '2026-07-02T11:45:00Z' }
    ];

    localStorage.setItem('hrms_users', JSON.stringify(seedUsers));
    localStorage.setItem('hrms_payroll', JSON.stringify(seedPayroll));
    localStorage.setItem('hrms_attendance', JSON.stringify(seedAttendance));
    localStorage.setItem('hrms_leaves', JSON.stringify(seedLeaves));
    localStorage.setItem('hrms_activities', JSON.stringify(seedActivities));
    localStorage.setItem('hrms_seeded', 'true');

    Object.assign(DB, {
        users: seedUsers,
        payroll: seedPayroll,
        attendance: seedAttendance,
        leaves: seedLeaves,
        activities: seedActivities
    });
}

seedDatabase();

function saveDB(key) {
    // Always save to localStorage for local cache/fallback
    localStorage.setItem('hrms_' + key, JSON.stringify(DB[key]));

    // Send update to the backend server asynchronously
    fetch('/api/db/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key: key,
            data: DB[key]
        })
    })
    .then(response => {
        if (!response.ok) {
            console.error('Failed to save to backend server status:', response.status);
        }
    })
    .catch(err => {
        console.error('Error syncing data with backend server:', err);
    });
}

// Session Helpers
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('hrms_current_user')) || null;
}

function getViewedEmployee() {
    const user = getCurrentUser();
    if (!user) return null;
    
    if (user.role === 'Admin') {
        return localStorage.getItem('hrms_viewed_employee') || user.email;
    }
    return user.email;
}

function checkAuth(requireRole = null) {
    const user = getCurrentUser();
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    if (!user) {
        if (currentPath !== 'index.html' && currentPath !== 'register.html') {
            window.location.href = 'index.html';
        }
    } else {
        if (currentPath === 'index.html' || currentPath === 'register.html') {
            if (user.role === 'Admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else if (requireRole && user.role !== requireRole) {
            if (user.role === 'Employee') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'admin.html';
            }
        }
    }
}

// Toast alerts helper
function showToast(message, type = 'primary') {
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

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Inject Layout elements
function initLayout(activePageName) {
    const user = getCurrentUser();
    if (!user) return;

    // 1. Theme restoration
    const currentTheme = localStorage.getItem('hrms_theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark');
    }

    // 2. Sidebar Injection
    const sidebarPlaceholder = document.getElementById('app-sidebar');
    if (sidebarPlaceholder) {
        const isAdmin = user.role === 'Admin';
        sidebarPlaceholder.className = 'app-sidebar';
        sidebarPlaceholder.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-brand"><i class="fa-solid fa-cubes-stacked"></i>odoo<span>hrms</span></div>
                <button id="sidebar-close-btn" class="menu-toggle-btn" style="color: #ffffff;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="nav-section-title">Navigation</div>
            <ul class="sidebar-menu">
                <li id="menu-dashboard" class="menu-item ${activePageName === 'dashboard' ? 'active' : ''}">
                    <a href="dashboard.html" class="menu-link"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
                </li>
                ${isAdmin ? `
                <li id="menu-admin" class="menu-item ${activePageName === 'admin' ? 'active' : ''}">
                    <a href="admin.html" class="menu-link"><i class="fa-solid fa-people-roof"></i> Admin Registry</a>
                </li>` : ''}
                <li id="menu-profile" class="menu-item ${activePageName === 'profile' ? 'active' : ''}">
                    <a href="profile.html" class="menu-link"><i class="fa-solid fa-user-tie"></i> Profile</a>
                </li>
                <li id="menu-attendance" class="menu-item ${activePageName === 'attendance' ? 'active' : ''}">
                    <a href="attendance.html" class="menu-link"><i class="fa-solid fa-calendar-check"></i> Attendance</a>
                </li>
                <li id="menu-leave" class="menu-item ${activePageName === 'leave' ? 'active' : ''}">
                    <a href="leave.html" class="menu-link"><i class="fa-solid fa-business-time"></i> Leaves & Time-off</a>
                </li>
                <li id="menu-payroll" class="menu-item ${activePageName === 'payroll' ? 'active' : ''}">
                    <a href="payroll.html" class="menu-link"><i class="fa-solid fa-file-invoice-dollar"></i> Payroll</a>
                </li>
            </ul>
            <div class="sidebar-footer">
                <div class="user-snippet">
                    <img id="sidebar-user-avatar" class="user-avatar" src="${user.avatar}" alt="Avatar">
                    <div class="user-info-text">
                        <span id="sidebar-user-name" class="user-name-label">${user.name}</span>
                        <span id="sidebar-user-role" class="user-role-label">${user.role}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 3. Navbar/Header Injection
    const navPlaceholder = document.getElementById('app-navbar');
    if (navPlaceholder) {
        navPlaceholder.className = 'app-navbar';
        const pageTitles = {
            'dashboard': 'Employee Dashboard',
            'admin': 'HR Admin Control Board',
            'profile': 'Employee Profile Settings',
            'attendance': 'Time & Attendance Logs',
            'leave': 'Time-Off & Vacation Requests',
            'payroll': 'Payroll Payslip Calculations'
        };

        const titleText = pageTitles[activePageName] || 'HR Management Portal';
        const isAdmin = user.role === 'Admin';
        const viewedEmail = getViewedEmployee();

        navPlaceholder.innerHTML = `
            <div class="nav-left">
                <button id="sidebar-toggle-btn" class="menu-toggle-btn"><i class="fa-solid fa-bars"></i></button>
                <h1 class="nav-title">${titleText}</h1>
            </div>
            <div class="nav-right">
                <button id="theme-toggle-btn" class="theme-toggle-btn" title="Toggle Theme">
                    <i class="fa-solid ${currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
                </button>
                
                <button id="notifications-bell" class="notifications-bell" title="Alerts">
                    <i class="fa-solid fa-bell"></i>
                    <span id="notification-badge" class="notification-badge"></span>
                </button>

                <div id="notification-panel" class="notification-panel">
                    <div class="notif-header">
                        <span>Notifications</span>
                        <a href="#" id="clear-notifications" style="font-size: 0.75rem; color: var(--primary-color);">Clear all</a>
                    </div>
                    <div id="notifications-list">
                        <div class="notif-item">Welcome back to Odoo portal!</div>
                    </div>
                </div>

                ${isAdmin ? `
                <div id="admin-masquerade-wrapper" style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">View Mode:</span>
                    <select id="admin-employee-switcher" class="form-input" style="padding: 6px 12px; width: auto; font-size: 0.85rem;">
                        <!-- Options filled via JS -->
                    </select>
                </div>` : ''}

                <button id="btn-logout" class="btn" style="padding: 8px 16px; font-size: 0.85rem; width: auto;"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</button>
            </div>
        `;

        // Populate switcher options if Admin
        if (isAdmin) {
            const selectEl = document.getElementById('admin-employee-switcher');
            selectEl.innerHTML = '';
            // Only show non-Admin employees from the server DB (filters out ghost/test accounts)
            const validEmployees = Object.values(DB.users).filter(u => u.role !== 'Admin');
            validEmployees.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.email;
                opt.textContent = `${u.name} (${u.employeeId})`;
                if (u.email === viewedEmail) {
                    opt.selected = true;
                }
                selectEl.appendChild(opt);
            });

            selectEl.addEventListener('change', (e) => {
                localStorage.setItem('hrms_viewed_employee', e.target.value);
                // Refresh active page to load correct viewed employee data
                window.location.reload();
            });
        }
    }

    // 4. Attach common event handlers
    const sideToggle = document.getElementById('sidebar-toggle-btn');
    const sideClose = document.getElementById('sidebar-close-btn');
    const sidebarObj = document.getElementById('app-sidebar');

    if (sideToggle && sidebarObj) {
        sideToggle.addEventListener('click', () => sidebarObj.classList.add('mobile-open'));
    }
    if (sideClose && sidebarObj) {
        sideClose.addEventListener('click', () => sidebarObj.classList.remove('mobile-open'));
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('hrms_current_user');
            localStorage.removeItem('hrms_viewed_employee');
            window.location.href = 'index.html';
        });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            if (document.body.classList.contains('dark')) {
                document.body.classList.remove('dark');
                themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
                localStorage.setItem('hrms_theme', 'light');
                showToast('Switched to Light theme', 'info');
            } else {
                document.body.classList.add('dark');
                themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
                localStorage.setItem('hrms_theme', 'dark');
                showToast('Switched to Dark theme', 'info');
            }
        });
    }

    // Notifications panel toggle
    const bellBtn = document.getElementById('notifications-bell');
    const panel = document.getElementById('notification-panel');
    if (bellBtn && panel) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== bellBtn) {
                panel.classList.remove('active');
            }
        });

        document.getElementById('clear-notifications').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('notifications-list').innerHTML = '<div class="notif-item">No new notifications</div>';
            document.getElementById('notification-badge').style.display = 'none';
        });
    }
}
