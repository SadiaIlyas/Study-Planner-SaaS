"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentHandler = void 0;
const dynamoService_1 = require("../services/dynamoService");
exports.AssignmentHandler = {
    // List assignments in the active tenant with optional status/course filters
    async listAssignments(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const { status, courseId } = req.query;
            let items = (await dynamoService_1.DynamoService.queryTenantItems(tenantId, 'ASSIGNMENT#'));
            if (status) {
                items = items.filter(a => a.status === status);
            }
            if (courseId) {
                items = items.filter(a => a.courseId === courseId);
            }
            // Sort by due date ascending
            items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            return res.status(200).json({ assignments: items });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Create assignment
    async createAssignment(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const { courseId, title, description = '', dueDate, dueTime = '23:59', priority = 'medium', status = 'todo', weight = 0, grade = 0, } = req.body;
            if (!courseId || !title || !dueDate) {
                return res.status(400).json({ error: 'courseId, title, and dueDate are required.' });
            }
            const assignmentId = `asg_${Date.now()}`;
            const now = new Date().toISOString();
            const newAssignment = {
                assignmentId,
                tenantId,
                courseId,
                title,
                description,
                dueDate,
                dueTime,
                priority,
                status,
                weight: Number(weight) || 0,
                grade: Number(grade) || 0,
                createdBy: req.user.userId,
                createdAt: now,
                updatedAt: now,
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: `ASSIGNMENT#${assignmentId}`,
                type: 'assignment',
                ...newAssignment,
            });
            return res.status(201).json({
                message: 'Assignment created successfully',
                assignment: newAssignment,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Update assignment
    async updateAssignment(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const assignmentId = req.params.id;
            const existing = (await dynamoService_1.DynamoService.getItem(`TENANT#${tenantId}`, `ASSIGNMENT#${assignmentId}`));
            if (!existing) {
                return res.status(404).json({ error: 'Assignment not found in this workspace.' });
            }
            // Member can update their own tasks or status; Owner can update all
            if (req.user.role !== 'owner' && existing.createdBy !== req.user.userId) {
                return res.status(403).json({ error: 'Permission denied to edit this assignment.' });
            }
            const { title, description, dueDate, dueTime, priority, status, weight, grade, courseId, } = req.body;
            const updated = {
                ...existing,
                title: title ?? existing.title,
                description: description ?? existing.description,
                dueDate: dueDate ?? existing.dueDate,
                dueTime: dueTime ?? existing.dueTime,
                priority: priority ?? existing.priority,
                status: status ?? existing.status,
                weight: weight !== undefined ? Number(weight) : existing.weight,
                grade: grade !== undefined ? Number(grade) : existing.grade,
                courseId: courseId ?? existing.courseId,
                updatedAt: new Date().toISOString(),
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: `ASSIGNMENT#${assignmentId}`,
                type: 'assignment',
                ...updated,
            });
            return res.status(200).json({
                message: 'Assignment updated successfully',
                assignment: updated,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Patch status (quick toggle)
    async patchStatus(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const assignmentId = req.params.id;
            const { status } = req.body;
            if (!status || !['todo', 'in_progress', 'completed'].includes(status)) {
                return res.status(400).json({ error: 'Valid status is required (todo, in_progress, completed)' });
            }
            const existing = (await dynamoService_1.DynamoService.getItem(`TENANT#${tenantId}`, `ASSIGNMENT#${assignmentId}`));
            if (!existing) {
                return res.status(404).json({ error: 'Assignment not found.' });
            }
            existing.status = status;
            existing.updatedAt = new Date().toISOString();
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: `ASSIGNMENT#${assignmentId}`,
                type: 'assignment',
                ...existing,
            });
            return res.status(200).json({
                message: 'Status updated',
                assignment: existing,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Delete assignment
    async deleteAssignment(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const assignmentId = req.params.id;
            const existing = await dynamoService_1.DynamoService.getItem(`TENANT#${tenantId}`, `ASSIGNMENT#${assignmentId}`);
            if (!existing) {
                return res.status(404).json({ error: 'Assignment not found.' });
            }
            if (req.user.role !== 'owner' && existing.createdBy !== req.user.userId) {
                return res.status(403).json({ error: 'Permission denied to delete this assignment.' });
            }
            await dynamoService_1.DynamoService.deleteItem(`TENANT#${tenantId}`, `ASSIGNMENT#${assignmentId}`);
            return res.status(200).json({ message: 'Assignment deleted successfully' });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
};
