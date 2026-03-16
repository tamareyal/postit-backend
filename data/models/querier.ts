import crypto from "crypto";
import { Model } from "mongoose";

type QuerySession<T> = {
	modelName: string;
	filter: Record<string, unknown>;
	limit: number;
	updatedAt: number;
};

type StartSessionOptions = {
	filter: Record<string, unknown>;
	limit?: number;
};

type NextPageOptions = {
	queryHash: string;
	cursor?: string;
};

type PageResult<T> = {
	data: T[];
	nextCursor: Date | null;
	queryHash: string;
};

export class QuerierError extends Error {
	statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
	}
}

class Querier<T> {
	private static readonly DEFAULT_LIMIT = 10;
	private static readonly MAX_LIMIT = 100;
	private static readonly QUERY_TTL_MS = 1000 * 60 * 60 * 24;
	private static readonly sessions = new Map<string, QuerySession<unknown>>();

	private model: Model<T>;

	constructor(model: Model<T>) {
		this.model = model;
	}

	async startSession(options: StartSessionOptions): Promise<PageResult<T>> {
		Querier.cleanupExpiredSessions();

		const normalizedLimit = this.normalizeLimit(options.limit);
		const filter = { ...options.filter };
		const queryHash = this.generateQueryHash();

		const session: QuerySession<T> = {
			modelName: this.model.modelName,
			filter,
			limit: normalizedLimit,
			updatedAt: Date.now()
		};
		Querier.sessions.set(queryHash, session as QuerySession<unknown>);

		return this.fetchPage(queryHash, session);
	}

	async getNextPage(options: NextPageOptions): Promise<PageResult<T>> {
		Querier.cleanupExpiredSessions();

		const session = this.getSessionByHash(options.queryHash);
		const cursor = this.parseCursor(options.cursor);

		session.updatedAt = Date.now();
		return this.fetchPage(options.queryHash, session, cursor);
	}

	getSessionByHash(queryHash: string): QuerySession<T> {
		const stored = Querier.sessions.get(queryHash);
		if (!stored || stored.modelName !== this.model.modelName) {
			throw new QuerierError(400, "Invalid queryHash");
		}

		return stored as QuerySession<T>;
	}

	private async fetchPage(queryHash: string, session: QuerySession<T>, cursor?: Date): Promise<PageResult<T>> {
		let filter: Record<string, unknown>;
		if (cursor) {
			filter = {
				$and: [
					session.filter,
					{ createdAt: { $lt: cursor } }
				]
			};
		} else {
			filter = { ...session.filter };
		}

		const data = await this.model
			.find(filter)
			.sort({ createdAt: -1 })
			.limit(session.limit);

		const nextCursor = data.length > 0
			? (data[data.length - 1] as unknown as { createdAt: Date }).createdAt
			: null;

		return {
			data,
			nextCursor,
			queryHash
		};
	}

	private parseCursor(cursor: string | undefined): Date | undefined {
		if (!cursor) {
			return undefined;
		}

		const parsed = new Date(cursor);
		if (isNaN(parsed.getTime())) {
			throw new QuerierError(400, "Invalid lastCreatedAt value");
		}

		return parsed;
	}

	private normalizeLimit(limit?: number): number {
		if (limit === undefined || Number.isNaN(limit) || limit <= 0) {
			return Querier.DEFAULT_LIMIT;
		}

		return Math.min(limit, Querier.MAX_LIMIT);
	}

	private generateQueryHash(): string {
		let queryHash = "";
		do {
			const randomString = `${crypto.randomUUID()}-${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
			queryHash = crypto
				.createHash("sha256")
				.update(randomString)
				.digest("hex");
		} while (Querier.sessions.has(queryHash));

		return queryHash;
	}

	private static cleanupExpiredSessions() {
		const now = Date.now();
		for (const [hash, session] of Querier.sessions.entries()) {
			if (now - session.updatedAt > Querier.QUERY_TTL_MS) {
				Querier.sessions.delete(hash);
			}
		}
	}
}

export default Querier;
