import express from 'express';
import cors from 'cors';
import { AuthHandler } from './handlers/authHandler';
import { TenantHandler } from './handlers/tenantHandler';
import { CourseHandler } from './handlers/courseHandler';
import { AssignmentHandler } from './handlers/assignmentHandler';
import { ExamHandler } from './handlers/examHandler';
import { SessionHandler } from './handlers/sessionHandler';
import { NoteHandler } from './handlers/noteHandler';
import { AnalyticsHandler } from './handlers/analyticsHandler';
import { enforceTenantAuth } from './middleware/tenantAuth';
import { DynamoService } from './services/dynamoService';

export const app = express();

app.use(cors());
app.use(express.json());

// Request logger for CloudWatch / console
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${Date.now() - start}ms`
    );
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'StudyFlow API', timestamp: new Date().toISOString() });
});

// Reset demo database endpoint (helpful for demos and testing tenant isolation)
app.post('/api/dev/reset-db', async (req, res) => {
  await DynamoService.resetLocalStore();
  res.status(200).json({ message: 'Database reset to initial demo state.' });
});

// ==========================================
// 1. PUBLIC AUTH ROUTES (No tenant required)
// ==========================================
app.post('/api/auth/signup', AuthHandler.signup);
app.post('/api/auth/login', AuthHandler.login);
app.post('/api/auth/forgot-password', AuthHandler.forgotPassword);

// ==========================================
// 2. PROTECTED PROFILE & TENANT LIST ROUTES
// ==========================================
app.get('/api/auth/profile', enforceTenantAuth as any, AuthHandler.getProfile);
app.put('/api/auth/profile', enforceTenantAuth as any, AuthHandler.updateProfile);

app.get('/api/tenants', enforceTenantAuth as any, TenantHandler.listUserTenants as any);
app.post('/api/tenants', enforceTenantAuth as any, TenantHandler.createTenant as any);
app.get('/api/tenants/current', enforceTenantAuth as any, TenantHandler.getCurrentTenant as any);
app.put('/api/tenants/current', enforceTenantAuth as any, TenantHandler.updateCurrentTenant as any);
app.post('/api/tenants/members', enforceTenantAuth as any, TenantHandler.inviteMember as any);

// ==========================================
// 3. DASHBOARD & ANALYTICS OVERVIEW
// ==========================================
app.get('/api/analytics', enforceTenantAuth as any, AnalyticsHandler.getDashboardOverview as any);

// ==========================================
// 4. COURSES MANAGEMENT
// ==========================================
app.get('/api/courses', enforceTenantAuth as any, CourseHandler.listCourses as any);
app.get('/api/courses/:id', enforceTenantAuth as any, CourseHandler.getCourseDetails as any);
app.post('/api/courses', enforceTenantAuth as any, CourseHandler.createCourse as any);
app.put('/api/courses/:id', enforceTenantAuth as any, CourseHandler.updateCourse as any);
app.delete('/api/courses/:id', enforceTenantAuth as any, CourseHandler.deleteCourse as any);

// ==========================================
// 5. ASSIGNMENTS MANAGEMENT
// ==========================================
app.get('/api/assignments', enforceTenantAuth as any, AssignmentHandler.listAssignments as any);
app.post('/api/assignments', enforceTenantAuth as any, AssignmentHandler.createAssignment as any);
app.put('/api/assignments/:id', enforceTenantAuth as any, AssignmentHandler.updateAssignment as any);
app.patch('/api/assignments/:id/status', enforceTenantAuth as any, AssignmentHandler.patchStatus as any);
app.delete('/api/assignments/:id', enforceTenantAuth as any, AssignmentHandler.deleteAssignment as any);

// ==========================================
// 6. EXAMS MANAGEMENT
// ==========================================
app.get('/api/exams', enforceTenantAuth as any, ExamHandler.listExams as any);
app.post('/api/exams', enforceTenantAuth as any, ExamHandler.createExam as any);
app.put('/api/exams/:id', enforceTenantAuth as any, ExamHandler.updateExam as any);
app.delete('/api/exams/:id', enforceTenantAuth as any, ExamHandler.deleteExam as any);

// ==========================================
// 7. STUDY SESSIONS & POMODORO TRACKER
// ==========================================
app.get('/api/sessions', enforceTenantAuth as any, SessionHandler.listSessions as any);
app.post('/api/sessions', enforceTenantAuth as any, SessionHandler.logSession as any);
app.get('/api/sessions/weekly-stats', enforceTenantAuth as any, SessionHandler.getWeeklyStats as any);

// ==========================================
// 8. NOTES & ATTACHMENTS
// ==========================================
app.get('/api/notes', enforceTenantAuth as any, NoteHandler.listNotes as any);
app.get('/api/notes/:id', enforceTenantAuth as any, NoteHandler.getNote as any);
app.post('/api/notes', enforceTenantAuth as any, NoteHandler.createNote as any);
app.put('/api/notes/:id', enforceTenantAuth as any, NoteHandler.updateNote as any);
app.delete('/api/notes/:id', enforceTenantAuth as any, NoteHandler.deleteNote as any);
app.post('/api/notes/presigned-upload', enforceTenantAuth as any, NoteHandler.getPresignedUploadUrl as any);
