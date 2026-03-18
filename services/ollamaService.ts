import axios from 'axios';


export class OllamaServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OllamaServiceError';
    }
}

type OllamaConfig = {
    baseUrl: string;
    model: string;
    timeoutMs: number;
};

const loadConfig = (): OllamaConfig => ({
    baseUrl: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, ''),
    model: process.env.OLLAMA_MODEL || 'llama3.1',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 120000
});


export class OllamaService {
    private readonly api;
    private readonly config: OllamaConfig;

    constructor() {
        this.config = loadConfig();
        this.api = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeoutMs,
        });
    }

    /** Returns post filter and optional user filter (for searching by author name). */
    async buildSearchFilter(query: string): Promise<{ filter: Record<string, unknown>; userFilter?: Record<string, unknown> }> {
        try {
            const response = await this.api.post('/api/chat', {
                model: this.config.model,
                stream: false,
                messages: [
                    { role: 'system', content: this.getSystemPrompt() },
                    { role: 'user', content: query }
                ],
                options: {
                    temperature: 0
                },
                format: 'json'
            });

            const rawContent = response.data?.message?.content;

            if (!rawContent) {
                console.error('[OllamaService] No content in response:', response.data);
            }
            let parsed: { filter?: Record<string, unknown>; userFilter?: Record<string, unknown> };
            try {
                parsed = JSON.parse(rawContent);
            } catch (err) {
                console.error('[OllamaService] Failed to parse content:', rawContent, err);
                throw new OllamaServiceError('Failed to parse LLM response as JSON');
            }
            if (!parsed || typeof parsed !== 'object' || !parsed.filter) {
                console.error('[OllamaService] Invalid LLM response schema:', parsed);
                throw new OllamaServiceError('Invalid LLM response schema');
            }
            return {
                filter: parsed.filter,
                userFilter: parsed.userFilter && typeof parsed.userFilter === 'object' ? parsed.userFilter : undefined
            };
        }
        catch (error: unknown) {
            if (error instanceof OllamaServiceError) throw error;
            throw new OllamaServiceError(error instanceof Error ? error.message : 'Failed to communicate with Ollama');
        }
    }

    private getSystemPrompt(): string {
        const now = new Date().toISOString();
        return `
Today is ${now}.

You translate natural language search queries into MongoDB filter JSON.

Output structure (always include "filter"; include "userFilter" only when the query mentions a person/author/username):
{"filter": <MongoDB filter for posts>, "userFilter": <optional MongoDB filter for users>}

POSTS filter ("filter"):
- Allowed fields: title, content, createdAt
- Always test both "title" and "content" for matches and wrap in $or.
- Use $regex with $options: "i" for case-insensitive matching.
- If the query refers to multiple conditions, combine with $and.

USERS filter ("userFilter") – only when the query mentions a person, author, or username:
- Allowed field: name (the user's display name).
- Use $regex with $options: "i" to match author/username mentions.
- Example: query "posts by John" -> "userFilter": {"name": {"$regex": "john", "$options": "i"}}
- Omit "userFilter" entirely if the query does not refer to a person or author.

Allowed operators (both filters): $eq, $ne, $gt, $gte, $lt, $lte, $in, $regex, $options, $and, $or

Output must be valid JSON. No explanations, no markdown, only the JSON object.
`;
    }
}

export default new OllamaService();