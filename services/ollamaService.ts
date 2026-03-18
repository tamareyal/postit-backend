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
    apiKey?: string;
};

const loadConfig = (): OllamaConfig => ({
    baseUrl: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, ''),
    model: process.env.OLLAMA_MODEL || 'llama3.1',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 120000,
    apiKey: process.env.OLLAMA_API_KEY
});


export class OllamaService {
    private readonly api;
    private readonly config: OllamaConfig;

    constructor() {
        this.config = loadConfig();
        this.api = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeoutMs,
            headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : undefined
        });
    }

    async buildSearchFilter(query: string): Promise<{ filter: Record<string, unknown>; userFilter?: Record<string, unknown> }> {
        try {
            const prompt = `${this.getSystemPrompt().trim()}\n\nUser query:\n${query}\n`;
            const response = await this.api.post('/api/generate', {
                model: this.config.model,
                prompt,
                stream: false,
                options: { temperature: 0 }
            });

            const rawContent = response.data?.response;

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
- Only add free-text matching when the query contains topical keywords (not just time/author constraints).
- When you do add free-text matching, test both "title" and "content" for matches and wrap in $or.
- Use $regex with $options: "i" for case-insensitive matching.
- Normalize topical keywords before putting them into $regex:
  - Convert simple English plurals to singular (e.g. "trips" -> "trip", "stories" -> "story", "buses" -> "bus").
- If there are multiple topical keywords, search them separately:
  - Do NOT combine multiple keywords into a single regex like "trip.*bangkok".
  - Instead, require each keyword to match (combine with $and), and for each keyword use an $or across title/content.
  - Example for keywords ["trip", "bangkok"]:
    {"$and":[{"$or":[{"title":{"$regex":"trip","$options":"i"}},{"content":{"$regex":"trip","$options":"i"}}]},{"$or":[{"title":{"$regex":"bangkok","$options":"i"}},{"content":{"$regex":"bangkok","$options":"i"}}]}]}
- If the query refers to multiple conditions, combine with $and.
- If the query includes time constraints (e.g. "yesterday", "one day ago", "last week", specific dates), put those ONLY in createdAt range operators ($gte/$lt/etc).
- Do NOT include time phrases (e.g. "one day ago", "yesterday", "today", "last week") inside title/content $regex patterns.
- If the query is purely time-based (no topical keywords), omit the title/content $or entirely and return only the createdAt filter.

USERS filter ("userFilter") - only when the query mentions a person, author, or username:
- Allowed field: name (the user's display name).
- Use $regex with $options: "i" to match author/username mentions.
- Example: query "posts by John" -> "userFilter": {"name": {"$regex": "john", "$options": "i"}}
- Omit "userFilter" entirely if the query does not refer to a person or author.

Important JSON rules:
- Do NOT use Mongo Extended JSON wrappers like "$date" or "$oid".
- Dates must be plain ISO-8601 strings (e.g. "2024-01-01T00:00:00.000Z").

Allowed operators (both filters): $eq, $ne, $gt, $gte, $lt, $lte, $in, $regex, $options, $and, $or

Output must be valid JSON. No explanations, no markdown, only the JSON object.
`;
    }
}

export default new OllamaService();