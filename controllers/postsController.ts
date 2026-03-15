import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Request, Response } from 'express';
import PostsModel, { Post } from '../models/posts';
import BaseController from './baseController';
import ollamaService, { OllamaServiceError } from '../services/ollamaService';
import { MongoFilterSanitizerError, sanitizeMongoFilter } from '../utils/mongoFilterSanitizer';

class PostsController extends BaseController<Post> {
    constructor() {
        super(PostsModel);
    }

    search = async (req: AuthenticatedRequest, res: Response) => {
        const { query, limit, debug } = req.body as {
            query?: string;
            limit?: number | string;
            debug?: boolean;
        };

        if (typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({ message: 'query is required' });
        }

        const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

        try {
            const llmFilter = await ollamaService.buildSearchFilter(query);
            const safeFilter = sanitizeMongoFilter(llmFilter);

            const page = await this.querier.startSession({
                filter: safeFilter,
                limit: parsedLimit
            });
            return res.status(200).json({
                ...page,
                ...(debug || process.env.NODE_ENV !== 'production' ? { mongoFilter: safeFilter } : {})
            });

        } catch (error) {
            if (error instanceof MongoFilterSanitizerError) {
                return res.status(400).json({ message: error.message });
            }
            if (error instanceof OllamaServiceError) {
                return res.status(503).json({ message: error.message });
            }
            return res.status(500).json({ message: error instanceof Error ? error.message : 'Error' });
        }
    }

    create = async (req: AuthenticatedRequest, res: Response) => {
        const body = req.body;
        const senderId = req.userId;

        if (body.sender_id) {
            return res.status(400).json({ message: 'sender_id cannot be set manually' });
        }

        body.sender_id = senderId;

        if (!body || !body.title || !body.content) {
            return res.status(400).json({ message: "title and content are required" });
        }

        try {
            const data = await this.model.create(body);
            return res.status(201).json(data);
        } catch (error) {
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });

        }
    }

    like = async (req: AuthenticatedRequest, res: Response) => {
        const postId = req.params.id;
        const userId = req.userId;

        try {
            const post = await this.model.findById(postId);
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            const alreadyLiked = post.likes.some(id => id.toString() === userId);

            if (alreadyLiked) {
                post.likes = post.likes.filter(id => id.toString() !== userId) as typeof post.likes;
            } else {
                post.likes.push(userId as unknown as typeof post.likes[0]);
            }

            await post.save();
            return res.status(200).json({ likes: post.likes.length });
        } catch (error) {
            return res.status(500).json({ message: error instanceof Error ? error.message : 'Error' });
        }
    }

}

export default new PostsController();