"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsHandler = void 0;
const dynamoService_1 = require("../services/dynamoService");
exports.AnalyticsHandler = {
    async getDashboardOverview(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const [courses, assignments, exams, sessions] = await Promise.all([
                (await dynamoService_1.DynamoService.queryTenantItems(tenantId, 'COURSE#')),
                (await dynamoService_1.DynamoService.queryTenantItems(tenantId, 'ASSIGNMENT#')),
                (await dynamoService_1.DynamoService.queryTenantItems(tenantId, 'EXAM#')),
                (await dynamoService_1.DynamoService.queryTenantItems(tenantId, 'SESSION#')),
            ]);
            // 1. Stats calculation
            const pendingAssignments = assignments.filter(a => a.status !== 'completed').length;
            const upcomingExams = exams.filter(e => e.status !== 'completed').length;
            // 2. Weekly study hours calculation
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const today = new Date();
            const weeklyData = [];
            let totalWeekMinutes = 0;
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayLabel = dayNames[d.getDay()];
                const dayMinutes = sessions
                    .filter(s => s.date === dateStr)
                    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
                totalWeekMinutes += dayMinutes;
                weeklyData.push({
                    day: dayLabel,
                    date: dateStr,
                    hours: Number((dayMinutes / 60).toFixed(1)),
                });
            }
            const studyHoursThisWeek = Number((totalWeekMinutes / 60).toFixed(1));
            // 3. Today's Tasks
            // Match course info to each assignment
            const courseMap = new Map(courses.map(c => [c.courseId, c]));
            const enrichedAssignments = assignments.map(a => ({
                ...a,
                courseName: courseMap.get(a.courseId)?.courseName || 'Unknown Course',
                courseCode: courseMap.get(a.courseId)?.courseCode || '',
                courseColor: courseMap.get(a.courseId)?.color || '#3b82f6',
            }));
            // Top tasks: pending assignments sorted by due date
            const todayTasks = enrichedAssignments
                .filter(a => a.status !== 'completed')
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5);
            // 4. Upcoming Exams
            const enrichedExams = exams
                .filter(e => e.status !== 'completed')
                .map(e => {
                const diffDays = Math.ceil((new Date(e.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return {
                    ...e,
                    courseName: courseMap.get(e.courseId)?.courseName || 'Unknown Course',
                    courseCode: courseMap.get(e.courseId)?.courseCode || '',
                    courseColor: courseMap.get(e.courseId)?.color || '#8b5cf6',
                    daysRemaining: diffDays,
                };
            })
                .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
                .slice(0, 4);
            // 5. Course Progress Overview
            const courseProgressList = courses.map(c => ({
                courseId: c.courseId,
                courseName: c.courseName,
                courseCode: c.courseCode,
                instructor: c.instructor,
                color: c.color,
                targetGrade: c.targetGrade,
                progress: c.progress,
            }));
            return res.status(200).json({
                statistics: {
                    totalCourses: courses.length,
                    pendingAssignments,
                    upcomingExams,
                    studyHoursThisWeek,
                },
                todayTasks,
                upcomingExams: enrichedExams,
                weeklyStudyHours: weeklyData,
                courseProgress: courseProgressList,
                userRole: req.user.role,
                tenant: req.tenant,
            });
        }
        catch (error) {
            console.error('Analytics overview error:', error);
            return res.status(500).json({ error: error.message });
        }
    },
};
