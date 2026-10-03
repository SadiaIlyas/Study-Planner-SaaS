"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseHandler = void 0;
const dynamoService_1 = require("../services/dynamoService");
exports.CourseHandler = {
    // List all courses in the tenant
    async listCourses(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const items = await dynamoService_1.DynamoService.queryTenantItems(tenantId, 'COURSE#');
            return res.status(200).json({ courses: items });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Get a single course with all associated child resources
    async getCourseDetails(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const courseId = req.params.id;
            const courseItem = await dynamoService_1.DynamoService.getItem(`TENANT#${tenantId}`, `COURSE#${courseId}`);
            if (!courseItem) {
                return res.status(404).json({ error: 'Course not found in this workspace.' });
            }
            // Query all tenant items to aggregate course-specific resources
            const [allAssignments, allExams, allNotes, allSessions] = await Promise.all([
                dynamoService_1.DynamoService.queryTenantItems(tenantId, 'ASSIGNMENT#'),
                dynamoService_1.DynamoService.queryTenantItems(tenantId, 'EXAM#'),
                dynamoService_1.DynamoService.queryTenantItems(tenantId, 'NOTE#'),
                dynamoService_1.DynamoService.queryTenantItems(tenantId, 'SESSION#'),
            ]);
            const courseAssignments = allAssignments.filter(a => a.courseId === courseId);
            const courseExams = allExams.filter(e => e.courseId === courseId);
            const courseNotes = allNotes.filter(n => n.courseId === courseId);
            const courseSessions = allSessions.filter(s => s.courseId === courseId);
            const totalStudyMinutes = courseSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
            return res.status(200).json({
                course: courseItem,
                assignments: courseAssignments,
                exams: courseExams,
                notes: courseNotes,
                sessions: courseSessions,
                totalStudyHours: Number((totalStudyMinutes / 60).toFixed(1)),
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Create course (owner only)
    async createCourse(req, res) {
        try {
            if (req.user.role !== 'owner') {
                return res.status(403).json({ error: 'Only tenant owners can create courses.' });
            }
            const tenantId = req.tenant.tenantId;
            const { courseName, courseCode, instructor, description, color = '#3b82f6', targetGrade = 'A', progress = 0, } = req.body;
            if (!courseName || !courseCode) {
                return res.status(400).json({ error: 'Course name and course code are required.' });
            }
            const courseId = `course_${Date.now()}`;
            const now = new Date().toISOString();
            const newCourse = {
                courseId,
                tenantId,
                courseName,
                courseCode,
                instructor: instructor || '',
                description: description || '',
                color,
                targetGrade,
                progress: Number(progress) || 0,
                createdAt: now,
                updatedAt: now,
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: `COURSE#${courseId}`,
                type: 'course',
                ...newCourse,
            });
            return res.status(201).json({
                message: 'Course created successfully',
                course: newCourse,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Update course (owner only)
    async updateCourse(req, res) {
        try {
            if (req.user.role !== 'owner') {
                return res.status(403).json({ error: 'Only tenant owners can update courses.' });
            }
            const tenantId = req.tenant.tenantId;
            const courseId = req.params.id;
            const existing = await dynamoService_1.DynamoService.getItem(`TENANT#${tenantId}`, `COURSE#${courseId}`);
            if (!existing) {
                return res.status(404).json({ error: 'Course not found in this workspace.' });
            }
            const { courseName, courseCode, instructor, description, color, targetGrade, progress, } = req.body;
            const updatedCourse = {
                ...existing,
                courseName: courseName ?? existing.courseName,
                courseCode: courseCode ?? existing.courseCode,
                instructor: instructor ?? existing.instructor,
                description: description ?? existing.description,
                color: color ?? existing.color,
                targetGrade: targetGrade ?? existing.targetGrade,
                progress: progress !== undefined ? Number(progress) : existing.progress,
                updatedAt: new Date().toISOString(),
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: `COURSE#${courseId}`,
                type: 'course',
                ...updatedCourse,
            });
            return res.status(200).json({
                message: 'Course updated successfully',
                course: updatedCourse,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Delete course (owner only)
    async deleteCourse(req, res) {
        try {
            if (req.user.role !== 'owner') {
                return res.status(403).json({ error: 'Only tenant owners can delete courses.' });
            }
            const tenantId = req.tenant.tenantId;
            const courseId = req.params.id;
            await dynamoService_1.DynamoService.deleteItem(`TENANT#${tenantId}`, `COURSE#${courseId}`);
            return res.status(200).json({ message: 'Course deleted successfully' });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
};
