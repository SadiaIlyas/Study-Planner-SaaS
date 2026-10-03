import { DynamoService } from '../services/dynamoService';
import { Assignment, Exam } from '../types';

/**
 * AWS Lambda handler triggered on a daily schedule by Amazon EventBridge (cron(0 7 * * ? *))
 * It scans active tenants for tasks and exams due within 48 hours and prepares
 * or dispatches notification digests via Amazon SES.
 */
export const handler = async (event: any) => {
  console.log('EventBridge Scheduled Digest triggered:', JSON.stringify(event));

  try {
    // Demo tenant check
    const demoTenantId = 'tenant_demo_ahmad';
    const [assignments, exams] = await Promise.all([
      (await DynamoService.queryTenantItems(demoTenantId, 'ASSIGNMENT#')) as unknown as Assignment[],
      (await DynamoService.queryTenantItems(demoTenantId, 'EXAM#')) as unknown as Exam[],
    ]);

    const now = Date.now();
    const in48Hours = now + 48 * 3600 * 1000;

    const dueSoonAssignments = assignments.filter(a => {
      const due = new Date(a.dueDate).getTime();
      return a.status !== 'completed' && due >= now && due <= in48Hours;
    });

    const dueSoonExams = exams.filter(e => {
      const examTime = new Date(e.examDate).getTime();
      return e.status !== 'completed' && examTime >= now && examTime <= in48Hours;
    });

    console.log(`Found ${dueSoonAssignments.length} assignments and ${dueSoonExams.length} exams due within 48h.`);

    // In production with Amazon SES:
    // const ses = new SESClient({ region: 'us-east-1' });
    // await ses.send(new SendEmailCommand({ ... }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily study reminder processed successfully',
        dueSoonAssignmentsCount: dueSoonAssignments.length,
        dueSoonExamsCount: dueSoonExams.length,
      }),
    };
  } catch (error: any) {
    console.error('Error processing EventBridge daily digest:', error);
    throw error;
  }
};
