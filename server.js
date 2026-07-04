const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'frontend')));

// ==================== EMAIL TRANSPORTER ====================
// Uses Ethereal (fake SMTP) for demo. In production, replace with real SMTP config.
let emailTransporter = null;
let etherealAccount = null;

async function initMailer() {
    try {
        etherealAccount = await nodemailer.createTestAccount();
        emailTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: etherealAccount.user,
                pass: etherealAccount.pass
            }
        });
        console.log('✅ Email service ready. Ethereal preview: https://ethereal.email');
        console.log(`   Inbox user: ${etherealAccount.user}`);
    } catch (err) {
        console.warn('⚠️  Email service failed to initialize:', err.message);
    }
}

// ==================== DATABASE HELPERS ====================
function loadDB() {
    if (!fs.existsSync(DB_PATH)) seedDB();
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading db.json, re-seeding...', e);
        return seedDB();
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving db.json', e);
        return false;
    }
}

// ==================== SEEDER ====================
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
                id: 1, email: 'employee@company.com', employeeName: 'Sayan Roy',
                type: 'Sick', startDate: '2026-06-15', endDate: '2026-06-16',
                days: 2, status: 'Approved', remarks: 'Recovering from seasonal flu.',
                adminComment: 'Get well soon! Approved.'
            },
            {
                id: 2, email: 'employee@company.com', employeeName: 'Sayan Roy',
                type: 'Paid', startDate: '2026-07-10', endDate: '2026-07-12',
                days: 3, status: 'Pending', remarks: 'Family trip out of town.', adminComment: ''
            },
            {
                id: 3, email: 'mark@company.com', employeeName: 'Mark Peterson',
                type: 'Paid', startDate: '2026-07-15', endDate: '2026-07-16',
                days: 2, status: 'Pending', remarks: 'Personal urgent work.', adminComment: ''
            }
        ],
        activities: [
            { id: 1, email: 'employee@company.com', text: 'Checked in on Jul 3rd at 08:58 AM', timestamp: '2026-07-03T08:58:30Z' },
            { id: 2, email: 'employee@company.com', text: 'Submitted leave request for Jul 10th - 12th', timestamp: '2026-07-02T11:45:00Z' }
        ],
        notifications: [],
        emailLog: []
    };
    saveDB(seedData);
    return seedData;
}

// ==================== EMAIL SENDER ====================
async function sendEmail({ to, toName, subject, html }) {
    const db = loadDB();

    // Log all emails to db.json for frontend display
    const logEntry = {
        id: (db.emailLog || []).length + 1,
        to,
        toName,
        subject,
        preview: html.replace(/<[^>]*>/g, '').substring(0, 120) + '...',
        sentAt: new Date().toISOString(),
        previewUrl: null
    };

    if (emailTransporter) {
        try {
            const info = await emailTransporter.sendMail({
                from: '"Odoo HRMS <noreply@odoohrms.com>"',
                to: `"${toName}" <${to}>`,
                subject,
                html
            });
            logEntry.previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`📧 Email sent to ${to}: ${nodemailer.getTestMessageUrl(info)}`);
        } catch (err) {
            console.warn('Email send error:', err.message);
        }
    }

    db.emailLog = db.emailLog || [];
    db.emailLog.unshift(logEntry);
    if (db.emailLog.length > 50) db.emailLog = db.emailLog.slice(0, 50);
    saveDB(db);

    return logEntry;
}

// ==================== API ROUTES ====================

// Get entire database
app.get('/api/db', (req, res) => {
    try {
        res.json(loadDB());
    } catch (e) {
        res.status(500).json({ error: 'Failed to read database.' });
    }
});

// Save a database key
app.post('/api/db/save', (req, res) => {
    const { key, data } = req.body;
    if (!key || data === undefined) return res.status(400).json({ error: 'Key and data required.' });

    const validKeys = ['users', 'attendance', 'leaves', 'payroll', 'activities', 'notifications', 'emailLog'];
    if (!validKeys.includes(key)) return res.status(400).json({ error: `Invalid key: ${key}` });

    try {
        const db = loadDB();
        db[key] = data;
        saveDB(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save data.' });
    }
});

// Delete an employee completely (admin only)
app.delete('/api/admin/employee/:email', (req, res) => {
    const { email } = req.params;
    try {
        const db = loadDB();

        if (!db.users[email]) return res.status(404).json({ error: 'Employee not found.' });
        if (db.users[email].role === 'Admin') return res.status(403).json({ error: 'Cannot delete Admin accounts.' });

        // Remove user and all their data
        delete db.users[email];
        delete db.payroll[email];
        db.attendance = db.attendance.filter(a => a.email !== email);
        db.leaves = db.leaves.filter(l => l.email !== email);
        db.activities = db.activities.filter(a => a.email !== email);

        saveDB(db);
        console.log(`🗑️  Employee ${email} and all data deleted by Admin.`);
        res.json({ success: true, message: `Employee ${email} deleted.` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete employee.' });
    }
});

// Delete a single attendance record
app.delete('/api/admin/attendance/:id', (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const db = loadDB();
        const before = db.attendance.length;
        db.attendance = db.attendance.filter(a => a.id !== id);
        if (db.attendance.length === before) return res.status(404).json({ error: 'Record not found.' });
        saveDB(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete attendance record.' });
    }
});

// Delete a single leave record
app.delete('/api/admin/leave/:id', (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const db = loadDB();
        const before = db.leaves.length;
        db.leaves = db.leaves.filter(l => l.id !== id);
        if (db.leaves.length === before) return res.status(404).json({ error: 'Leave not found.' });
        saveDB(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete leave record.' });
    }
});

// Send email: leave approval/rejection
app.post('/api/email/leave-decision', async (req, res) => {
    const { leaveId, status, adminComment } = req.body;
    try {
        const db = loadDB();
        const leave = db.leaves.find(l => l.id === leaveId);
        if (!leave) return res.status(404).json({ error: 'Leave not found.' });

        const employee = db.users[leave.email];
        if (!employee) return res.status(404).json({ error: 'Employee not found.' });

        const color = status === 'Approved' ? '#22c55e' : '#ef4444';
        const icon = status === 'Approved' ? '✅' : '❌';

        const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
            <div style="background: linear-gradient(135deg, #875A7B, #5a3d7a); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 1.6rem;">odoo<span style="color: #d4b8cc;">hrms</span></h1>
                <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 0.95rem;">Human Resource Management System</p>
            </div>
            <div style="background: #fff; padding: 35px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <h2 style="color: #1f2937; font-size: 1.3rem; margin-top: 0;">${icon} Leave Request ${status}</h2>
                <p style="color: #6b7280;">Dear <strong>${employee.name}</strong>,</p>
                <p style="color: #6b7280;">Your leave request has been <strong style="color: ${color};">${status}</strong> by the HR Admin.</p>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 0.9rem;">Leave Type</td><td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${leave.type} Leave</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 0.9rem;">Duration</td><td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${leave.startDate} to ${leave.endDate} (${leave.days} day(s))</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 0.9rem;">Decision</td><td style="padding: 8px 0; font-weight: 700; color: ${color};">${status}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 0.9rem;">HR Comment</td><td style="padding: 8px 0; color: #1f2937;">${adminComment || 'No comment provided.'}</td></tr>
                    </table>
                </div>
                <p style="color: #6b7280; font-size: 0.9rem;">If you have any questions, please contact your HR manager.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #9ca3af; font-size: 0.8rem; text-align: center;">This is an automated notification from Odoo HRMS &bull; Do not reply to this email</p>
            </div>
        </div>`;

        const result = await sendEmail({
            to: leave.email,
            toName: employee.name,
            subject: `${icon} Leave Request ${status} — ${leave.type} Leave (${leave.startDate} to ${leave.endDate})`,
            html
        });

        res.json({ success: true, previewUrl: result.previewUrl, emailId: result.id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to send email.' });
    }
});

// Send email: payroll update
app.post('/api/email/payroll-update', async (req, res) => {
    const { employeeEmail, payroll } = req.body;
    try {
        const db = loadDB();
        const employee = db.users[employeeEmail];
        if (!employee) return res.status(404).json({ error: 'Employee not found.' });

        const net = payroll.basic + payroll.hra + payroll.bonus - payroll.deductions;

        const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
            <div style="background: linear-gradient(135deg, #875A7B, #5a3d7a); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 1.6rem;">odoo<span style="color: #d4b8cc;">hrms</span></h1>
                <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 0.95rem;">Payroll Management System</p>
            </div>
            <div style="background: #fff; padding: 35px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <h2 style="color: #1f2937; font-size: 1.3rem; margin-top: 0;">💰 Salary Structure Updated</h2>
                <p style="color: #6b7280;">Dear <strong>${employee.name}</strong>,</p>
                <p style="color: #6b7280;">Your salary structure has been updated by HR. Here is your updated compensation breakdown:</p>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Basic Salary</td><td style="padding: 10px 0; font-weight: 600; text-align: right; color: #1f2937;">$${payroll.basic.toLocaleString()}</td></tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">House Rent Allowance (HRA)</td><td style="padding: 10px 0; font-weight: 600; text-align: right; color: #1f2937;">$${payroll.hra.toLocaleString()}</td></tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Performance Bonus</td><td style="padding: 10px 0; font-weight: 600; text-align: right; color: #22c55e;">+$${payroll.bonus.toLocaleString()}</td></tr>
                        <tr style="border-bottom: 2px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Deductions (Tax)</td><td style="padding: 10px 0; font-weight: 600; text-align: right; color: #ef4444;">-$${payroll.deductions.toLocaleString()}</td></tr>
                        <tr><td style="padding: 12px 0; font-weight: 700; font-size: 1.1rem; color: #1f2937;">Net Monthly Salary</td><td style="padding: 12px 0; font-weight: 800; text-align: right; font-size: 1.1rem; color: #875A7B;">$${net.toLocaleString()}</td></tr>
                    </table>
                </div>
                <p style="color: #6b7280; font-size: 0.9rem;">This update is effective from the current payroll cycle. Contact HR for any queries.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #9ca3af; font-size: 0.8rem; text-align: center;">This is an automated notification from Odoo HRMS &bull; Do not reply to this email</p>
            </div>
        </div>`;

        const result = await sendEmail({
            to: employeeEmail,
            toName: employee.name,
            subject: `💰 Salary Structure Updated — Net Pay: $${net.toLocaleString()}`,
            html
        });

        res.json({ success: true, previewUrl: result.previewUrl, emailId: result.id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to send email.' });
    }
});

// Get email log
app.get('/api/email/log', (req, res) => {
    try {
        const db = loadDB();
        res.json(db.emailLog || []);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch email log.' });
    }
});

// ==================== FALLBACK ====================
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) return next();
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ==================== START SERVER ====================
app.listen(PORT, async () => {
    await initMailer();
    console.log(`==================================================`);
    console.log(`  Odoo HRMS Backend Server successfully running!`);
    console.log(`  Local URL: http://localhost:${PORT}`);
    console.log(`  Database File: ${DB_PATH}`);
    console.log(`==================================================`);
});
