import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/tenantAuth';
import { DynamoService } from '../services/dynamoService';
import { Course } from '../types';

export const CourseHandler = {
  // List all courses in the tenant
  async listCourses(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const items = await DynamoService.queryTenantItems(tenantId, 'COURSE#');
      return res.status(200).json({ courses: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get a single course with all associated child resources
  async getCourseDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const courseId = req.params.id;

      const courseItem = await DynamoService.getItem(`TENANT#${tenantId}`, `COURSE#${courseId}`);
      if (!courseItem) {
        return res.status(404).json({ error: 'Course not found in this workspace.' });
      }

      // Query all tenant items to aggregate course-specific resources
      const [allAssignments, allExams, allNotes, allSessions] = await Promise.all([
        DynamoService.queryTenantItems(tenantId, 'ASSIGNMENT#'),
        DynamoService.queryTenantItems(tenantId, 'EXAM#'),
        DynamoService.queryTenantItems(tenantId, 'NOTE#'),
        DynamoService.queryTenantItems(tenantId, 'SESSION#'),
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
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Create course (owner only)
  async createCourse(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user!.role !== 'owner') {
        return res.status(403).json({ error: 'Only tenant owners can create courses.' });
      }

      const tenantId = req.tenant!.tenantId;
      const {
        courseName,
        courseCode,
        instructor,
        description,
        color = '#3b82f6',
        targetGrade = 'A',
        progress = 0,
      } = req.body;

      if (!courseName || !courseCode) {
        return res.status(400).json({ error: 'Course name and course code are required.' });
      }

      const courseId = `course_${Date.now()}`;
      const now = new Date().toISOString();

      const newCourse: Course = {
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

      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: `COURSE#${courseId}`,
        type: 'course',
        ...newCourse,
      });

      return res.status(201).json({
        message: 'Course created successfully',
        course: newCourse,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Update course (owner only)
  async updateCourse(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user!.role !== 'owner') {
        return res.status(403).json({ error: 'Only tenant owners can update courses.' });
      }

      const tenantId = req.tenant!.tenantId;
      const courseId = req.params.id;

      const existing = await DynamoService.getItem(`TENANT#${tenantId}`, `COURSE#${courseId}`);
      if (!existing) {
        return res.status(404).json({ error: 'Course not found in this workspace.' });
      }

      const {
        courseName,
        courseCode,
        instructor,
        description,
        color,
        targetGrade,
        progress,
      } = req.body;

      const updatedCourse: Course = {
        ...(existing as unknown as Course),
        courseName: courseName ?? existing.courseName,
        courseCode: courseCode ?? existing.courseCode,
        instructor: instructor ?? existing.instructor,
        description: description ?? existing.description,
        color: color ?? existing.color,
        targetGrade: targetGrade ?? existing.targetGrade,
        progress: progress !== undefined ? Number(progress) : existing.progress,
        updatedAt: new Date().toISOString(),
      };

      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: `COURSE#${courseId}`,
        type: 'course',
        ...updatedCourse,
      });

      return res.status(200).json({
        message: 'Course updated successfully',
        course: updatedCourse,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Delete course (owner only)
  async deleteCourse(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user!.role !== 'owner') {
        return res.status(403).json({ error: 'Only tenant owners can delete courses.' });
      }

      const tenantId = req.tenant!.tenantId;
      const courseId = req.params.id;

      await DynamoService.deleteItem(`TENANT#${tenantId}`, `COURSE#${courseId}`);

      return res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },
};
