"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteHandler = void 0;
const dynamoService_1 = require("../services/dynamoService");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const isAWS = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.USE_REAL_AWS === 'true');
const BUCKET_NAME = process.env.ATTACHMENTS_BUCKET || 'studyflow-notes-bucket';
exports.NoteHandler = {
    // List notes for tenant
    async listNotes(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const { courseId, tag } = req.query;
            let items = (await dynamoService_1.DynamoService.queryTenantItems(tenantId, 'NOTE#'));
            if (courseId) {
                items = items.filter(n => n.courseId === courseId);
            }
            if (tag) {
                items = items.filter(n => n.tags?.includes(tag));
            }
            // Sort newest first
            items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            return res.status(200).json({ notes: items });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Get single note
    async getNote(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const noteId = req.params.id;
            const item = await dynamoService_1.DynamoService.getItem(`TENANT#${tenantId}`, `NOTE#${noteId}`);
            if (!item) {
                return res.status(404).json({ error: 'Note not found in this workspace.' });
            }
            return res.status(200).json({ note: item });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Create note
    async createNote(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const { courseId, title, content = '', tags = [], attachmentUrl, attachmentName, } = req.body;
            if (!courseId || !title) {
                return res.status(400).json({ error: 'courseId and title are required.' });
            }
            const noteId = `note_${Date.now()}`;
            const now = new Date().toISOString();
            const newNote = {
                noteId,
                tenantId,
                courseId,
                title,
                content,
                tags: Array.isArray(tags) ? tags : [],
                attachmentUrl,
                attachmentName,
                createdAt: now,
                updatedAt: now,
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: `NOTE#${noteId}`,
                type: 'note',
                ...newNote,
            });
            return res.status(201).json({
                message: 'Note created successfully',
                note: newNote,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Update note
    async updateNote(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const noteId = req.params.id;
            const existing = (await dynamoService_1.DynamoService.getItem(`TENANT#${tenantId}`, `NOTE#${noteId}`));
            if (!existing) {
                return res.status(404).json({ error: 'Note not found.' });
            }
            const { title, content, tags, courseId, attachmentUrl, attachmentName } = req.body;
            const updated = {
                ...existing,
                title: title ?? existing.title,
                content: content ?? existing.content,
                tags: tags ?? existing.tags,
                courseId: courseId ?? existing.courseId,
                attachmentUrl: attachmentUrl ?? existing.attachmentUrl,
                attachmentName: attachmentName ?? existing.attachmentName,
                updatedAt: new Date().toISOString(),
            };
            await dynamoService_1.DynamoService.putItem({
                PK: `TENANT#${tenantId}`,
                SK: `NOTE#${noteId}`,
                type: 'note',
                ...updated,
            });
            return res.status(200).json({
                message: 'Note updated successfully',
                note: updated,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Delete note
    async deleteNote(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const noteId = req.params.id;
            await dynamoService_1.DynamoService.deleteItem(`TENANT#${tenantId}`, `NOTE#${noteId}`);
            return res.status(200).json({ message: 'Note deleted successfully' });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    // Generate S3 presigned upload URL
    async getPresignedUploadUrl(req, res) {
        try {
            const tenantId = req.tenant.tenantId;
            const { fileName, contentType } = req.body;
            if (!fileName) {
                return res.status(400).json({ error: 'fileName is required' });
            }
            const key = `tenants/${tenantId}/notes/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            if (isAWS) {
                const s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                    ContentType: contentType || 'application/octet-stream',
                });
                const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 3600 });
                const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
                return res.status(200).json({
                    uploadUrl,
                    fileUrl,
                    key,
                });
            }
            // Mock presigned URL for local development
            return res.status(200).json({
                uploadUrl: `http://localhost:4000/api/mock-upload/${key}`,
                fileUrl: `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800`,
                key,
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
};
