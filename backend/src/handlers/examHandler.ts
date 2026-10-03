import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/tenantAuth';
import { DynamoService } from '../services/dynamoService';
import { Exam } from '../types';

export const ExamHandler = {
  // List exams in tenant with days remaining
  async listExams(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const items = (await DynamoService.queryTenantItems(tenantId, 'EXAM#')) as unknown as Exam[];

      const enriched = items.map(exam => {
        const examTimeMs = new Date(exam.examDate).getTime();
        const diffDays = Math.ceil((examTimeMs - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          ...exam,
          daysRemaining: diffDays,
        };
      });

      // Sort by exam date ascending
      enriched.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

      return res.status(200).json({ exams: enriched });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Create exam
  async createExam(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const {
        courseId,
        examName,
        examDate,
        examTime = '09:00 AM',
        location = '',
        weight = 25,
        targetGrade = 'A',
        notes = '',
        status = 'upcoming',
      } = req.body;

      if (!courseId || !examName || !examDate) {
        return res.status(400).json({ error: 'courseId, examName, and examDate are required.' });
      }

      const examId = `exam_${Date.now()}`;
      const now = new Date().toISOString();

      const newExam: Exam = {
        examId,
        tenantId,
        courseId,
        examName,
        examDate,
        examTime,
        location,
        weight: Number(weight) || 0,
        targetGrade,
        notes,
        status,
        createdAt: now,
        updatedAt: now,
      };

      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: `EXAM#${examId}`,
        type: 'exam',
        ...newExam,
      });

      return res.status(201).json({
        message: 'Exam created successfully',
        exam: newExam,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Update exam
  async updateExam(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const examId = req.params.id;

      const existing = (await DynamoService.getItem(`TENANT#${tenantId}`, `EXAM#${examId}`)) as unknown as Exam | null;
      if (!existing) {
        return res.status(404).json({ error: 'Exam not found in this workspace.' });
      }

      const {
        examName,
        examDate,
        examTime,
        location,
        weight,
        targetGrade,
        notes,
        status,
        courseId,
      } = req.body;

      const updated: Exam = {
        ...existing,
        examName: examName ?? existing.examName,
        examDate: examDate ?? existing.examDate,
        examTime: examTime ?? existing.examTime,
        location: location ?? existing.location,
        weight: weight !== undefined ? Number(weight) : existing.weight,
        targetGrade: targetGrade ?? existing.targetGrade,
        notes: notes ?? existing.notes,
        status: status ?? existing.status,
        courseId: courseId ?? existing.courseId,
        updatedAt: new Date().toISOString(),
      };

      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: `EXAM#${examId}`,
        type: 'exam',
        ...updated,
      });

      return res.status(200).json({
        message: 'Exam updated successfully',
        exam: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Delete exam
  async deleteExam(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user!.role !== 'owner') {
        return res.status(403).json({ error: 'Only tenant owners can delete exams.' });
      }

      const tenantId = req.tenant!.tenantId;
      const examId = req.params.id;

      await DynamoService.deleteItem(`TENANT#${tenantId}`, `EXAM#${examId}`);
      return res.status(200).json({ message: 'Exam deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },
};
