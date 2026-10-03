import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/tenantAuth';
import { DynamoService } from '../services/dynamoService';
import { Note } from '../types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const isAWS = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.USE_REAL_AWS === 'true');
const BUCKET_NAME = process.env.ATTACHMENTS_BUCKET || 'studyflow-notes-bucket';

export const NoteHandler = {
  // List notes for tenant
  async listNotes(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const { courseId, tag } = req.query;

      let items = (await DynamoService.queryTenantItems(tenantId, 'NOTE#')) as unknown as Note[];

      if (courseId) {
        items = items.filter(n => n.courseId === courseId);
      }
      if (tag) {
        items = items.filter(n => n.tags?.includes(tag as string));
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return res.status(200).json({ notes: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get single note
  async getNote(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const noteId = req.params.id;

      const item = await DynamoService.getItem(`TENANT#${tenantId}`, `NOTE#${noteId}`);
      if (!item) {
        return res.status(404).json({ error: 'Note not found in this workspace.' });
      }

      return res.status(200).json({ note: item });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Create note
  async createNote(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const {
        courseId,
        title,
        content = '',
        tags = [],
        attachmentUrl,
        attachmentName,
      } = req.body;

      if (!courseId || !title) {
        return res.status(400).json({ error: 'courseId and title are required.' });
      }

      const noteId = `note_${Date.now()}`;
      const now = new Date().toISOString();

      const newNote: Note = {
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

      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: `NOTE#${noteId}`,
        type: 'note',
        ...newNote,
      });

      return res.status(201).json({
        message: 'Note created successfully',
        note: newNote,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Update note
  async updateNote(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const noteId = req.params.id;

      const existing = (await DynamoService.getItem(`TENANT#${tenantId}`, `NOTE#${noteId}`)) as unknown as Note | null;
      if (!existing) {
        return res.status(404).json({ error: 'Note not found.' });
      }

      const { title, content, tags, courseId, attachmentUrl, attachmentName } = req.body;

      const updated: Note = {
        ...existing,
        title: title ?? existing.title,
        content: content ?? existing.content,
        tags: tags ?? existing.tags,
        courseId: courseId ?? existing.courseId,
        attachmentUrl: attachmentUrl ?? existing.attachmentUrl,
        attachmentName: attachmentName ?? existing.attachmentName,
        updatedAt: new Date().toISOString(),
      };

      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: `NOTE#${noteId}`,
        type: 'note',
        ...updated,
      });

      return res.status(200).json({
        message: 'Note updated successfully',
        note: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Delete note
  async deleteNote(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const noteId = req.params.id;

      await DynamoService.deleteItem(`TENANT#${tenantId}`, `NOTE#${noteId}`);
      return res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Generate S3 presigned upload URL
  async getPresignedUploadUrl(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant!.tenantId;
      const { fileName, contentType } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
      }

      const key = `tenants/${tenantId}/notes/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      if (isAWS) {
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          ContentType: contentType || 'application/octet-stream',
        });
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
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
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },
};
