import { Request, Response } from 'express';
import { Model } from 'mongoose';
import Querier, { QuerierError } from '../data/models/querier';

// BaseController for basic CRUD operations can be extended\overwritten by specific controllers
class BaseController<T> {
    model: Model<T>;
    querier: Querier<T>;

    constructor(model: Model<T>) {
        this.model = model;
        this.querier = new Querier<T>(model);
    }

    getAll = async (req: Request, res: Response) => {
        const filter = req.query;
        try {
            const data = await this.model.find(filter);
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    };

    getById = async (req: Request, res: Response) => {
        const id = req.params.id;
        try {
            const data = await this.model.findById(id);
            if (!data) {
                return res.status(404).json({ message: "Resource not found" });
            }
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    };

    // For many controllers this might need to be overwritten to add specific logic
    // such as data verification, hashing passwords, etc to the given body.
    update = async (req: Request, res: Response) => {
        const id = req.params.id;
        const body = req.body;
        try {
            const data = await this.model.findByIdAndUpdate(id, body, { new: true });
            if (!data) {
                return res.status(404).json({ message: "Resource not found" });
            }
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    };

    delete = async (req: Request, res: Response) => {
        const id = req.params.id;
        try {
            const data = await this.model.findByIdAndDelete(id);
            if (!data) {
                return res.status(404).json({ message: "Resource not found" });
            }
            return res.status(200).json({ message: "Deleted successfully" });
        } catch (error) {
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    };

    getNextPage = async (req: Request, res: Response) => {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        const lastCreatedAt = req.query.lastCreatedAt as string | undefined;
        const queryHash = req.query.queryHash as string | undefined;
        let cursor: Date | undefined;

        const filter: Record<string, unknown> = {};
        if (lastCreatedAt) {
            cursor = new Date(lastCreatedAt);
            if (isNaN(cursor.getTime())) {
                return res.status(400).json({ message: "Invalid lastCreatedAt value" });
            }
            filter.createdAt = { $lt: cursor };
        }

        try {
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

            const page = await this.querier.startSession({
                filter,
                limit
            });
            return res.status(200).json(page);
        } catch (error) {
            if (error instanceof QuerierError) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            return res.status(500).json({ message: error instanceof Error ? error.message : "Error" });
        }
    };
}

export default BaseController;