import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IRequest } from '../utils/request-interface';
import { Response } from 'express';
import { 
    getAnnouncements, 
    getAnnouncementByID, 
    createAnnouncement, 
    updateAnnouncement 
} from '../routes/announcement';

const { mockAnnouncement } = vi.hoisted(() => {
    return { 
        mockAnnouncement: {
            _id: 'announcement123',
            topic: 'Test Topic',
            content: 'Test Content',
            timestamp: new Date(),
            save: vi.fn(),
            toObject: function () { return { ...this }; }
        }
    };
});

// Mock dependencies
vi.mock('../mongoose/schemas/announcement', () => {
    const AnnouncementMock = vi.fn(function (data: any) {
        return {
            ...data,
            save: vi.fn().mockResolvedValue(true),
            _id: 'new_id'
        };
    });
    
    // Mock static methods
    (AnnouncementMock as any).find = vi.fn().mockReturnThis();
    (AnnouncementMock as any).sort = vi.fn().mockResolvedValue([mockAnnouncement]);
    (AnnouncementMock as any).findById = vi.fn().mockResolvedValue(mockAnnouncement);

    return {
        Announcement: AnnouncementMock
    };
});

// Mock express-validator
vi.mock('express-validator', () => ({
    checkSchema: vi.fn((schema) => (req: any, res: any, next: any) => next()),
    validationResult: vi.fn(() => ({
        isEmpty: () => true,
        array: () => []
    }))
}));

import { Announcement } from '../mongoose/schemas/announcement';
// Need to re-import validationResult to mock it differently in tests if needed
import { validationResult } from 'express-validator';

describe('Announcement API', () => {
    let req: Partial<IRequest>;
    let res: Partial<Response>;
    let json: any;
    let status: any;
    let send: any;

    beforeEach(() => {
        json = vi.fn();
        send = vi.fn();
        status = vi.fn().mockReturnValue({ json, send });
        res = {
            status,
            json,
            send
        };
        req = {};
        vi.clearAllMocks();
    });

    describe('GET /api/announcement', () => {
        it('should return all announcements sorted by timestamp', async () => {
            await getAnnouncements(req as IRequest, res as Response);

            expect(Announcement.find).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith([mockAnnouncement]);
        });
    });

    describe('GET /api/announcement/:id', () => {
        it('should return announcement by ID', async () => {
            req.params = { id: 'announcement123' };
            await getAnnouncementByID(req as IRequest, res as Response);

            expect(Announcement.findById).toHaveBeenCalledWith('announcement123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(mockAnnouncement);
        });

        it('should return 404 if announcement not found', async () => {
            req.params = { id: 'notfound' };
            (Announcement.findById as any).mockResolvedValueOnce(null);

            await getAnnouncementByID(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ error: 'Announcement not found' });
        });
    });

    describe('POST /api/announcement', () => {
        it('should create a new announcement', async () => {
            req.body = {
                topic: 'New Topic',
                content: 'New Content'
            };

            await createAnnouncement(req as IRequest, res as Response);

            expect(Announcement).toHaveBeenCalledWith(expect.objectContaining({
                topic: 'New Topic',
                content: 'New Content'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should return 400 if validation fails', async () => {
            (validationResult as any).mockReturnValueOnce({
                isEmpty: () => false,
                array: () => [{ msg: 'Invalid value' }]
            });

            await createAnnouncement(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ errors: [{ msg: 'Invalid value' }] });
        });
    });

    describe('PUT /api/announcement/:id', () => {
        it('should update an existing announcement', async () => {
            req.params = { id: 'announcement123' };
            req.body = {
                topic: 'Updated Topic'
            };

            const mockVerifyAnnouncement = {
                ...mockAnnouncement,
                save: vi.fn(),
                topic: 'Old Topic' // Initial state
            };
            (Announcement.findById as any).mockResolvedValueOnce(mockVerifyAnnouncement);

            await updateAnnouncement(req as IRequest, res as Response);

            expect(Announcement.findById).toHaveBeenCalledWith('announcement123');
            expect(mockVerifyAnnouncement.topic).toBe('Updated Topic');
            expect(mockVerifyAnnouncement.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if announcement to update not found', async () => {
            req.params = { id: 'notfound' };
            (Announcement.findById as any).mockResolvedValueOnce(null);

            await updateAnnouncement(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
