import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Request, Response } from 'express';
import PostsModel, { Post } from '../models/posts';
import BaseController from './baseController';

class PostsController extends BaseController<Post> {
    constructor() {
        super(PostsModel);
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