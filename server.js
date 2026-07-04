const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Helper to load database
function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        seedDB();
    }
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading db.json, re-seeding...', e);
        return seedDB();
    }
}

// Helper to save database
function saveDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving db.json', e);
        return false;
    }
}

// Seeder function
function seedDB() {
    const seedData = {
        users: {
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
        },
        payroll: {
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
        },
        attendance: [
            { id: 1, email: 'employee@company.com', date: '2026-07-01', checkIn: '09:02:15', checkOut: '18:05:40', totalHours: '09:03:25', status: 'Present' },
            { id: 2, email: 'employee@company.com', date: '2026-07-02', checkIn: '09:15:00', checkOut: '17:30:10', totalHours: '08:15:10', status: 'Present' },
            { id: 3, email: 'employee@company.com', date: '2026-07-03', checkIn: '08:58:30', checkOut: '13:02:15', totalHours: '04:03:45', status: 'Half-day' },
            { id: 4, email: 'mark@company.com', date: '2026-07-01', checkIn: '09:05:00', checkOut: '18:00:00', totalHours: '08:55:00', status: 'Present' },
            { id: 5, email: 'mark@company.com', date: '2026-07-02', checkIn: '09:10:00', checkOut: '18:15:00', totalHours: '09:05:00', status: 'Present' }
        ],
        leaves: [
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
        ],
        activities: [
            { id: 1, email: 'employee@company.com', text: 'Checked in on Jul 3rd at 08:58 AM', timestamp: '2026-07-03T08:58:30Z' },
            { id: 2, email: 'employee@company.com', text: 'Submitted leave request for Jul 10th - 12th', timestamp: '2026-07-02T11:45:00Z' }
        ],
        notifications: [],
    };
    saveDB(seedData);
    return seedData;
}

// API: Get complete database
app.get('/api/db', (req, res) => {
    try {
        const db = loadDB();
        res.json(db);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read database state.' });
    }
});

// API: Save database key
app.post('/api/db/save', (req, res) => {
    const { key, data } = req.body;
    
    if (!key || !data) {
        return res.status(400).json({ error: 'Key and data parameters are required.' });
    }

    const validKeys = ['users', 'attendance', 'leaves', 'payroll', 'activities', 'notifications'];
    if (!validKeys.includes(key)) {
        return res.status(400).json({ error: `Invalid database key: ${key}` });
    }

    try {
        const db = loadDB();
        db[key] = data;
        if (saveDB(db)) {
            res.json({ success: true, message: `Synced database key "${key}" successfully.` });
        } else {
            res.status(500).json({ error: 'Failed to write data to disk.' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to update database state.' });
    }
});

// Serve frontend routing fallback
app.use((req, res, next) => {
    // If requesting an API or file with extension, don't serve index.html
    if (req.path.startsWith('/api') || req.path.includes('.')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Odoo HRMS Backend Server successfully running!`);
    console.log(`  Local URL: http://localhost:${PORT}`);
    console.log(`  Database File: ${DB_PATH}`);
    console.log(`==================================================`);
});
