import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Request, Response } from 'express';
import { QuerierError } from '../data/models/querier';
import PostsModel, { Post } from '../models/posts';
import BaseController from './baseController';
import ollamaService, { OllamaServiceError } from '../services/ollamaService';
import { MongoFilterSanitizerError, sanitizeMongoFilter } from '../utils/mongoFilterSanitizer';
import mongoose from 'mongoose';

class PostsController extends BaseController<Post> {
    constructor() {
        super(PostsModel);
    }

    search = async (req: AuthenticatedRequest, res: Response) => {

        const query = req.body.query as string | undefined;
        const limitQuery = req.query.limit as string | undefined;
        const lastCreatedAt = req.query.lastCreatedAt as string | undefined;
        const queryHash = (req.query.queryHash as string | undefined) ?? (req.query.hash as string | undefined);
        let cursor: Date | undefined;

        if (typeof query !== 'string' || !query.trim() ) {
            return res.status(400).json({ message: 'query is required' });
        }
        if (!query) {
            return res.status(400).json({ message: 'query is required' });
        }

        if (query.length > 500) {
            throw new OllamaServiceError("Query too long");
        }

        if (lastCreatedAt) {
            cursor = new Date(lastCreatedAt);
            if (isNaN(cursor.getTime())) {
                return res.status(400).json({ message: "Invalid lastCreatedAt value" });
            }
        }

        try {
            if (queryHash) {
                const page =  await this.querier.getNextPage({
                    queryHash,
                    cursor: lastCreatedAt
                });
                return res.status(200).json(page);
            } else {
                const parsedLimit = Math.min(Math.max(Number(limitQuery) || 10, 1), 100);
                const llmFilter = await ollamaService.buildSearchFilter(query?.toString() ?? '');
                const filter = sanitizeMongoFilter(llmFilter);


                const page = await this.querier.startSession({
                    filter: filter,
                    limit: parsedLimit
                });
                console.dir(filter, { depth: null });

                return res.status(200).json({
                    ...page,
                    ...(process.env.NODE_ENV !== 'production' ? { mongoFilter: filter } : {})
                });
            }

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

    getByUserId = async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.query.userId as string | undefined;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId' });
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
            const filter: Record<string, unknown> = {
                sender_id: new mongoose.Types.ObjectId(userId)
            };
            
            if (hasPaginationParams) {
                if (queryHash) {
                    if (!cursor) {
                        return res.status(400).json({ message: "lastCreatedAt is required when queryHash is provided" });
                    }
                    const page = await this.querier.getNextPage({
                        queryHash,
                        cursor: cursor.toISOString()
                    });
                    return res.status(200).json(page);
                }


                if (cursor) {
                    filter.createdAt = { $lt: cursor };
                }

                const limit = Math.min(parseInt(limitQuery as string) || 10, 100);
                const page = await this.querier.startSession({ filter, limit });
                return res.status(200).json(page);
            }

            const data = await PostsModel.find({ filter });
            return res.status(200).json(data);
        }
        
        catch (error) {
            if (error instanceof QuerierError) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    };

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