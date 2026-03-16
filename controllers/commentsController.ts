import CommentsModel, { Comment } from '../models/comments';
import BaseController from './baseController';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { QuerierError } from '../data/models/querier';
import PostModel from '../models/posts';

class CommentsController extends BaseController<Comment> {
    constructor() {
        super(CommentsModel);
    }
    
    getByPostId = async (req: Request<{ postId: string }>, res: Response) => {
        const { postId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid postId' });
        }

        const limitQuery = req.query.limit as string | undefined;
        const lastCreatedAt = req.query.lastCreatedAt as string | undefined;
        const queryHash = (req.query.queryHash as string | undefined) ?? (req.query.hash as string | undefined);
        const hasPaginationParams = limitQuery !== undefined || lastCreatedAt !== undefined || queryHash !== undefined;
        let cursor: Date | undefined;

        if (lastCreatedAt) {
            cursor = new Date(lastCreatedAt);
            if (isNaN(cursor.getTime())) {
                return res.status(400).json({ message: "Invalid lastCreatedAt value" });
            }
        }

        try {
            if (hasPaginationParams) {
                if (queryHash) {
                    const page = await this.querier.getNextPage({
                        queryHash,
                        cursor: lastCreatedAt
                    });
                    return res.status(200).json(page);
                }

                const filter: Record<string, unknown> = {
                    post_id: new mongoose.Types.ObjectId(postId)
                };

                if (cursor) {
                    filter.createdAt = { $lt: cursor };
                }

                const limit = Math.min(parseInt(limitQuery as string) || 10, 100);
                const page = await this.querier.startSession({ filter, limit });
                return res.status(200).json(page);
            }

            const data = await CommentsModel.find({ post_id: new mongoose.Types.ObjectId(postId) });
            return res.status(200).json(data);
        } catch (error) {
            if (error instanceof QuerierError) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    }

    create = async (req: AuthenticatedRequest, res: Response) => {
        const body = req.body;
        const senderId = req.userId;

        if (body.sender_id) {
            return res.status(400).json({ message: 'sender_id cannot be set manually' });
        }

        body.sender_id = senderId;

        if (!body || !body.post_id || !body.message) {
            return res.status(400).json({ message: "post_id and message are required" });
        }

        try {
            const data = await this.model.create(body);
            // Atomically increment commentsCount for the post
            await PostModel.updateOne(
                { _id: body.post_id },
                { $inc: { commentsCount: 1 } }
            );
            return res.status(201).json(data);
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response) => {
        const id = req.params.id;
        try {
            // Find the comment to get its post_id
            const comment = await this.model.findById(id);
            if (!comment) {
                return res.status(404).json({ message: "Resource not found" });
            }
            // Delete the comment
            await this.model.findByIdAndDelete(id);
            // Atomically decrement commentsCount for the post
            await PostModel.updateOne(
                { _id: comment.post_id },
                { $inc: { commentsCount: -1 } }
            );
            return res.status(200).json({ message: "Deleted successfully" });
        } catch (error) {
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    }
}

export default new CommentsController();