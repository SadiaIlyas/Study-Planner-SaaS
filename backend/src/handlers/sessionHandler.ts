import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/tenantAuth';
import { DynamoService } from '../services/dynamoService';
import { StudySession } from '../types';

export const SessionHandler = {
  // List study sessions for the active tenant
  async listSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const items = (await DynamoService.queryTenantItems(tenantId, 'SESSION#')) as unknown as StudySession[];

      // Sort descending by date
      items.sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime());

      return res.status(200).json({ sessions: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Log a completed study session
  async logSession(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const { courseId, durationMinutes, date, notes = '' } = req.body;

      if (!courseId || !durationMinutes) {
        return res.status(400).json({ error: 'courseId and durationMinutes are required.' });
      }

      const sessionId = `sess_${Date.now()}`;
      const now = new Date().toISOString();

      const newSession: StudySession = {
        sessionId,
        tenantId,
        userId: req.user!.userId,
        courseId,
        durationMinutes: Number(durationMinutes),
        date: date || now.split('T')[0],
        notes,
        completedAt: now,
      };

      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: `SESSION#${sessionId}`,
        type: 'session',
        ...newSession,
      });

      return res.status(201).json({
        message: 'Study session logged successfully',
        session: newSession,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Calculate weekly stats
  async getWeeklyStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const sessions = (await DynamoService.queryTenantItems(tenantId, 'SESSION#')) as unknown as StudySession[];

      // Build array of last 7 days: [ { day: 'Mon', date: '...', hours: 2.5 } ]
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const weeklyData = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = dayNames[d.getDay()];

        const dayMinutes = sessions
          .filter(s => s.date === dateStr)
          .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

        weeklyData.push({
          day: dayLabel,
          date: dateStr,
          hours: Number((dayMinutes / 60).toFixed(1)),
        });
      }

      const totalWeekMinutes = weeklyData.reduce((acc, d) => acc + d.hours * 60, 0);

      return res.status(200).json({
        weeklyData,
        totalWeekHours: Number((totalWeekMinutes / 60).toFixed(1)),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },
};
