"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authHandler_1 = require("./handlers/authHandler");
const tenantHandler_1 = require("./handlers/tenantHandler");
const courseHandler_1 = require("./handlers/courseHandler");
const assignmentHandler_1 = require("./handlers/assignmentHandler");
const examHandler_1 = require("./handlers/examHandler");
const sessionHandler_1 = require("./handlers/sessionHandler");
const noteHandler_1 = require("./handlers/noteHandler");
const analyticsHandler_1 = require("./handlers/analyticsHandler");
const tenantAuth_1 = require("./middleware/tenantAuth");
const dynamoService_1 = require("./services/dynamoService");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
// Request logger for CloudWatch / console
exports.app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${Date.now() - start}ms`);
    });
    next();
});
// Health check
exports.app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'StudyFlow API', timestamp: new Date().toISOString() });
});
// Reset demo database endpoint (helpful for demos and testing tenant isolation)
exports.app.post('/api/dev/reset-db', async (req, res) => {
    await dynamoService_1.DynamoService.resetLocalStore();
    res.status(200).json({ message: 'Database reset to initial demo state.' });
});
// ==========================================
// 1. PUBLIC AUTH ROUTES (No tenant required)
// ==========================================
exports.app.post('/api/auth/signup', authHandler_1.AuthHandler.signup);
exports.app.post('/api/auth/login', authHandler_1.AuthHandler.login);
exports.app.post('/api/auth/forgot-password', authHandler_1.AuthHandler.forgotPassword);
// ==========================================
// 2. PROTECTED PROFILE & TENANT LIST ROUTES
// ==========================================
exports.app.get('/api/auth/profile', tenantAuth_1.enforceTenantAuth, authHandler_1.AuthHandler.getProfile);
exports.app.put('/api/auth/profile', tenantAuth_1.enforceTenantAuth, authHandler_1.AuthHandler.updateProfile);
exports.app.get('/api/tenants', tenantAuth_1.enforceTenantAuth, tenantHandler_1.TenantHandler.listUserTenants);
exports.app.post('/api/tenants', tenantAuth_1.enforceTenantAuth, tenantHandler_1.TenantHandler.createTenant);
exports.app.get('/api/tenants/current', tenantAuth_1.enforceTenantAuth, tenantHandler_1.TenantHandler.getCurrentTenant);
exports.app.put('/api/tenants/current', tenantAuth_1.enforceTenantAuth, tenantHandler_1.TenantHandler.updateCurrentTenant);
exports.app.post('/api/tenants/members', tenantAuth_1.enforceTenantAuth, tenantHandler_1.TenantHandler.inviteMember);
// ==========================================
// 3. DASHBOARD & ANALYTICS OVERVIEW
// ==========================================
exports.app.get('/api/analytics', tenantAuth_1.enforceTenantAuth, analyticsHandler_1.AnalyticsHandler.getDashboardOverview);
// ==========================================
// 4. COURSES MANAGEMENT
// ==========================================
exports.app.get('/api/courses', tenantAuth_1.enforceTenantAuth, courseHandler_1.CourseHandler.listCourses);
exports.app.get('/api/courses/:id', tenantAuth_1.enforceTenantAuth, courseHandler_1.CourseHandler.getCourseDetails);
exports.app.post('/api/courses', tenantAuth_1.enforceTenantAuth, courseHandler_1.CourseHandler.createCourse);
exports.app.put('/api/courses/:id', tenantAuth_1.enforceTenantAuth, courseHandler_1.CourseHandler.updateCourse);
exports.app.delete('/api/courses/:id', tenantAuth_1.enforceTenantAuth, courseHandler_1.CourseHandler.deleteCourse);
// ==========================================
// 5. ASSIGNMENTS MANAGEMENT
// ==========================================
exports.app.get('/api/assignments', tenantAuth_1.enforceTenantAuth, assignmentHandler_1.AssignmentHandler.listAssignments);
exports.app.post('/api/assignments', tenantAuth_1.enforceTenantAuth, assignmentHandler_1.AssignmentHandler.createAssignment);
exports.app.put('/api/assignments/:id', tenantAuth_1.enforceTenantAuth, assignmentHandler_1.AssignmentHandler.updateAssignment);
exports.app.patch('/api/assignments/:id/status', tenantAuth_1.enforceTenantAuth, assignmentHandler_1.AssignmentHandler.patchStatus);
exports.app.delete('/api/assignments/:id', tenantAuth_1.enforceTenantAuth, assignmentHandler_1.AssignmentHandler.deleteAssignment);
// ==========================================
// 6. EXAMS MANAGEMENT
// ==========================================
exports.app.get('/api/exams', tenantAuth_1.enforceTenantAuth, examHandler_1.ExamHandler.listExams);
exports.app.post('/api/exams', tenantAuth_1.enforceTenantAuth, examHandler_1.ExamHandler.createExam);
exports.app.put('/api/exams/:id', tenantAuth_1.enforceTenantAuth, examHandler_1.ExamHandler.updateExam);
exports.app.delete('/api/exams/:id', tenantAuth_1.enforceTenantAuth, examHandler_1.ExamHandler.deleteExam);
// ==========================================
// 7. STUDY SESSIONS & POMODORO TRACKER
// ==========================================
exports.app.get('/api/sessions', tenantAuth_1.enforceTenantAuth, sessionHandler_1.SessionHandler.listSessions);
exports.app.post('/api/sessions', tenantAuth_1.enforceTenantAuth, sessionHandler_1.SessionHandler.logSession);
exports.app.get('/api/sessions/weekly-stats', tenantAuth_1.enforceTenantAuth, sessionHandler_1.SessionHandler.getWeeklyStats);
// ==========================================
// 8. NOTES & ATTACHMENTS
// ==========================================
exports.app.get('/api/notes', tenantAuth_1.enforceTenantAuth, noteHandler_1.NoteHandler.listNotes);
exports.app.get('/api/notes/:id', tenantAuth_1.enforceTenantAuth, noteHandler_1.NoteHandler.getNote);
exports.app.post('/api/notes', tenantAuth_1.enforceTenantAuth, noteHandler_1.NoteHandler.createNote);
exports.app.put('/api/notes/:id', tenantAuth_1.enforceTenantAuth, noteHandler_1.NoteHandler.updateNote);
exports.app.delete('/api/notes/:id', tenantAuth_1.enforceTenantAuth, noteHandler_1.NoteHandler.deleteNote);
exports.app.post('/api/notes/presigned-upload', tenantAuth_1.enforceTenantAuth, noteHandler_1.NoteHandler.getPresignedUploadUrl);
