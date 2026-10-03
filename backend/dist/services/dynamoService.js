"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const TABLE_NAME = process.env.TABLE_NAME || 'StudyFlow-Data';
const isAWS = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.USE_REAL_AWS === 'true');
let docClient = null;
if (isAWS) {
    const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
}
// Local mock store for local development or demo purposes
class LocalDynamoStore {
    filePath;
    items = new Map();
    constructor() {
        this.filePath = path_1.default.join(process.cwd(), 'local-dynamodb-store.json');
        this.load();
    }
    getKey(pk, sk) {
        return `${pk}###${sk}`;
    }
    load() {
        try {
            if (fs_1.default.existsSync(this.filePath)) {
                const raw = fs_1.default.readFileSync(this.filePath, 'utf-8');
                const list = JSON.parse(raw);
                for (const item of list) {
                    this.items.set(this.getKey(item.PK, item.SK), item);
                }
            }
            else {
                this.seedInitialData();
            }
        }
        catch {
            this.seedInitialData();
        }
    }
    save() {
        try {
            const list = Array.from(this.items.values());
            fs_1.default.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('Failed to persist local store', e);
        }
    }
    seedInitialData() {
        const seedTime = new Date().toISOString();
        const demoItems = [
            // Tenant 1: Individual Demo Student
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'METADATA',
                type: 'tenant',
                tenantId: 'tenant_demo_ahmad',
                tenantName: "Ahmad's Study Space",
                tenantType: 'individual',
                ownerId: 'user_ahmad_001',
                ownerEmail: 'ahmad@example.com',
                members: [
                    {
                        userId: 'user_ahmad_001',
                        email: 'ahmad@example.com',
                        name: 'Ahmad Khan',
                        role: 'owner',
                        joinedAt: seedTime,
                    },
                ],
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            // User Tenant Mapping in GSI1
            {
                PK: 'USER#user_ahmad_001',
                SK: 'TENANT#tenant_demo_ahmad',
                GSI1PK: 'USER#user_ahmad_001',
                GSI1SK: 'TENANT#tenant_demo_ahmad',
                type: 'user_tenant_membership',
                userId: 'user_ahmad_001',
                tenantId: 'tenant_demo_ahmad',
                tenantName: "Ahmad's Study Space",
                role: 'owner',
            },
            // Courses for Ahmad
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'COURSE#course_cs201',
                type: 'course',
                courseId: 'course_cs201',
                tenantId: 'tenant_demo_ahmad',
                courseName: 'Data Structures & Algorithms',
                courseCode: 'CS-201',
                instructor: 'Dr. Ahmed Farooq',
                description: 'Binary trees, graphs, dynamic programming, and complexity analysis.',
                color: '#3b82f6',
                targetGrade: 'A',
                progress: 72,
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'COURSE#course_math301',
                type: 'course',
                courseId: 'course_math301',
                tenantId: 'tenant_demo_ahmad',
                courseName: 'Linear Algebra & Vector Calculus',
                courseCode: 'MATH-301',
                instructor: 'Prof. Sarah Jenkins',
                description: 'Eigenvalues, vector spaces, orthogonal transformations, matrix decomposition.',
                color: '#8b5cf6',
                targetGrade: 'A-',
                progress: 85,
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'COURSE#course_swe405',
                type: 'course',
                courseId: 'course_swe405',
                tenantId: 'tenant_demo_ahmad',
                courseName: 'Cloud Architecture & Serverless',
                courseCode: 'SWE-405',
                instructor: 'Dr. Marcus Vance',
                description: 'Microservices, AWS Lambda, DynamoDB single-table patterns, event-driven design.',
                color: '#10b981',
                targetGrade: 'A+',
                progress: 90,
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            // Assignments for Ahmad
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'ASSIGNMENT#asg_01',
                type: 'assignment',
                assignmentId: 'asg_01',
                tenantId: 'tenant_demo_ahmad',
                courseId: 'course_cs201',
                title: 'Red-Black Tree Self-Balancing Implementation',
                description: 'Implement insertion and rotation operations with unit tests.',
                dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
                dueTime: '23:59',
                priority: 'high',
                status: 'in_progress',
                weight: 15,
                grade: 0,
                createdBy: 'user_ahmad_001',
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'ASSIGNMENT#asg_02',
                type: 'assignment',
                assignmentId: 'asg_02',
                tenantId: 'tenant_demo_ahmad',
                courseId: 'course_swe405',
                title: 'Cognito JWT Authorizer & SAM Architecture Template',
                description: 'Configure least privilege IAM policies and DynamoDB single table indexes.',
                dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
                dueTime: '17:00',
                priority: 'medium',
                status: 'todo',
                weight: 20,
                grade: 0,
                createdBy: 'user_ahmad_001',
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'ASSIGNMENT#asg_03',
                type: 'assignment',
                assignmentId: 'asg_03',
                tenantId: 'tenant_demo_ahmad',
                courseId: 'course_math301',
                title: 'Eigenvalue Spectral Theorem Problem Set',
                description: 'Problems 4.1 to 4.12 on symmetric matrices and diagonalization.',
                dueDate: new Date(Date.now() - 86400000).toISOString(),
                dueTime: '12:00',
                priority: 'high',
                status: 'completed',
                weight: 10,
                grade: 95,
                createdBy: 'user_ahmad_001',
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            // Exams for Ahmad
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'EXAM#exam_01',
                type: 'exam',
                examId: 'exam_01',
                tenantId: 'tenant_demo_ahmad',
                courseId: 'course_cs201',
                examName: 'Midterm: Graph Algorithms & Dynamic Programming',
                examDate: new Date(Date.now() + 86400000 * 5).toISOString(),
                examTime: '10:00 AM',
                location: 'Hall 4B, Science Complex',
                weight: 30,
                targetGrade: 'A',
                notes: 'Covers Dijkstra, Bellman-Ford, Floyd-Warshall, Knapsack, and LCS.',
                status: 'upcoming',
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'EXAM#exam_02',
                type: 'exam',
                examId: 'exam_02',
                tenantId: 'tenant_demo_ahmad',
                courseId: 'course_swe405',
                examName: 'Serverless System Design & AWS Evaluation',
                examDate: new Date(Date.now() + 86400000 * 12).toISOString(),
                examTime: '02:00 PM',
                location: 'Lab 204',
                weight: 35,
                targetGrade: 'A+',
                notes: 'Comprehensive exam on serverless cold starts, idempotency, and multi-tenant DB.',
                status: 'upcoming',
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            // Study Sessions for Ahmad (this week)
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: `SESSION#sess_01`,
                type: 'session',
                sessionId: 'sess_01',
                tenantId: 'tenant_demo_ahmad',
                userId: 'user_ahmad_001',
                courseId: 'course_cs201',
                durationMinutes: 120,
                date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
                notes: 'Deep dive into graph traversals and cycle detection.',
                completedAt: seedTime,
            },
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: `SESSION#sess_02`,
                type: 'session',
                sessionId: 'sess_02',
                tenantId: 'tenant_demo_ahmad',
                userId: 'user_ahmad_001',
                courseId: 'course_swe405',
                durationMinutes: 90,
                date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
                notes: 'Practiced DynamoDB GSI overloading and partition key distribution.',
                completedAt: seedTime,
            },
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: `SESSION#sess_03`,
                type: 'session',
                sessionId: 'sess_03',
                tenantId: 'tenant_demo_ahmad',
                userId: 'user_ahmad_001',
                courseId: 'course_math301',
                durationMinutes: 75,
                date: new Date().toISOString().split('T')[0],
                notes: 'Orthogonal projections and Gram-Schmidt process review.',
                completedAt: seedTime,
            },
            // Notes for Ahmad
            {
                PK: 'TENANT#tenant_demo_ahmad',
                SK: 'NOTE#note_01',
                type: 'note',
                noteId: 'note_01',
                tenantId: 'tenant_demo_ahmad',
                courseId: 'course_cs201',
                title: 'Master Theorem & Recurrence Relations Cheatsheet',
                content: '# Master Theorem Cheatsheet\n\nFor divide and conquer recurrences: `T(n) = aT(n/b) + f(n)`\n\n1. If `f(n) = O(n^(log_b(a) - e))`, then `T(n) = Theta(n^(log_b(a)))`\n2. If `f(n) = Theta(n^(log_b(a)))`, then `T(n) = Theta(n^(log_b(a)) * log n)`\n3. If `f(n) = Omega(n^(log_b(a) + e))`, then `T(n) = Theta(f(n))`\n\n### Key Takeaways\n- Compare `f(n)` with `n^(log_b a)`.\n- Case 2 is the most common in merge sort and binary search.',
                tags: ['Algorithms', 'Complexity', 'Exam Prep'],
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            // Tenant 2: Study Group Tenant (Strict Isolation Proof!)
            {
                PK: 'TENANT#tenant_demo_group',
                SK: 'METADATA',
                type: 'tenant',
                tenantId: 'tenant_demo_group',
                tenantName: 'CS Honors Study Circle',
                tenantType: 'study_group',
                ownerId: 'user_ahmad_001',
                ownerEmail: 'ahmad@example.com',
                members: [
                    {
                        userId: 'user_ahmad_001',
                        email: 'ahmad@example.com',
                        name: 'Ahmad Khan',
                        role: 'owner',
                        joinedAt: seedTime,
                    },
                    {
                        userId: 'user_priya_002',
                        email: 'priya@example.com',
                        name: 'Priya Sharma',
                        role: 'member',
                        joinedAt: seedTime,
                    },
                    {
                        userId: 'user_david_003',
                        email: 'david@example.com',
                        name: 'David Miller',
                        role: 'member',
                        joinedAt: seedTime,
                    },
                ],
                createdAt: seedTime,
                updatedAt: seedTime,
            },
            {
                PK: 'USER#user_ahmad_001',
                SK: 'TENANT#tenant_demo_group',
                GSI1PK: 'USER#user_ahmad_001',
                GSI1SK: 'TENANT#tenant_demo_group',
                type: 'user_tenant_membership',
                userId: 'user_ahmad_001',
                tenantId: 'tenant_demo_group',
                tenantName: 'CS Honors Study Circle',
                role: 'owner',
            },
            // Group Course
            {
                PK: 'TENANT#tenant_demo_group',
                SK: 'COURSE#course_grp_advai',
                type: 'course',
                courseId: 'course_grp_advai',
                tenantId: 'tenant_demo_group',
                courseName: 'Advanced Machine Learning & LLM Systems',
                courseCode: 'AI-502',
                instructor: 'Prof. Helen Chen',
                description: 'Collaborative group study space for Transformer architectures and fine-tuning.',
                color: '#f59e0b',
                targetGrade: 'A',
                progress: 60,
                createdAt: seedTime,
                updatedAt: seedTime,
            },
        ];
        for (const item of demoItems) {
            this.items.set(this.getKey(item.PK, item.SK), item);
        }
        this.save();
    }
    async getItem(pk, sk) {
        const item = this.items.get(this.getKey(pk, sk));
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async putItem(item) {
        this.items.set(this.getKey(item.PK, item.SK), JSON.parse(JSON.stringify(item)));
        this.save();
    }
    async deleteItem(pk, sk) {
        this.items.delete(this.getKey(pk, sk));
        this.save();
    }
    async queryByPK(pk, skPrefix) {
        const results = [];
        for (const [key, item] of this.items.entries()) {
            if (item.PK === pk) {
                if (!skPrefix || item.SK.startsWith(skPrefix)) {
                    results.push(JSON.parse(JSON.stringify(item)));
                }
            }
        }
        return results;
    }
    async queryGSI1(gsi1pk) {
        const results = [];
        for (const item of this.items.values()) {
            if (item.GSI1PK === gsi1pk) {
                results.push(JSON.parse(JSON.stringify(item)));
            }
        }
        return results;
    }
}
const localStore = new LocalDynamoStore();
// DynamoDB Operations with strict tenant isolation guarantees
exports.DynamoService = {
    async getItem(pk, sk) {
        if (isAWS && docClient) {
            const res = await docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: TABLE_NAME,
                Key: { PK: pk, SK: sk },
            }));
            return res.Item || null;
        }
        return localStore.getItem(pk, sk);
    },
    async putItem(item) {
        if (isAWS && docClient) {
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: TABLE_NAME,
                Item: item,
            }));
            return;
        }
        await localStore.putItem(item);
    },
    async deleteItem(pk, sk) {
        if (isAWS && docClient) {
            await docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: pk, SK: sk },
            }));
            return;
        }
        await localStore.deleteItem(pk, sk);
    },
    async queryTenantItems(tenantId, itemTypePrefix) {
        // ENFORCE STRICT TENANT ISOLATION:
        // Partition key is locked to TENANT#<tenantId>
        const pk = `TENANT#${tenantId}`;
        if (isAWS && docClient) {
            const keyCondition = itemTypePrefix
                ? 'PK = :pk AND begins_with(SK, :skPrefix)'
                : 'PK = :pk';
            const expressionValues = { ':pk': pk };
            if (itemTypePrefix) {
                expressionValues[':skPrefix'] = itemTypePrefix;
            }
            const res = await docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: keyCondition,
                ExpressionAttributeValues: expressionValues,
            }));
            return res.Items || [];
        }
        return localStore.queryByPK(pk, itemTypePrefix);
    },
    async getUserTenants(userId) {
        const gsi1pk = `USER#${userId}`;
        if (isAWS && docClient) {
            const res = await docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :userPk',
                ExpressionAttributeValues: { ':userPk': gsi1pk },
            }));
            return res.Items || [];
        }
        return localStore.queryGSI1(gsi1pk);
    },
    async resetLocalStore() {
        localStore.seedInitialData();
    }
};
