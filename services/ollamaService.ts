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

    async buildSearchFilter(query: string): Promise<Record<string, unknown>> {
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
            let parsed;
            try {
                parsed = JSON.parse(rawContent);
            } catch (err) {
                console.error('[OllamaService] Failed to parse content:', rawContent, err);
                throw new OllamaServiceError('Failed to parse LLM response as JSON');
            }   
            if (!parsed || typeof parsed !== "object" || !parsed.filter) {
                console.error('[OllamaService] Invalid LLM response schema:', parsed);
                throw new OllamaServiceError("Invalid LLM response schema");
            }
            return parsed.filter;
        }
        catch (error: any) {
            if (error instanceof OllamaServiceError) throw error;
            throw new OllamaServiceError(error.message || 'Failed to communicate with Ollama');
        }
    }

    private getSystemPrompt(): string {
        const date = new Date();
        const now = new Date().toISOString();
        console.log('Generating system prompt for date:', date.toISOString());
    return `
    Today is ${now}.

    You translate natural language search queries into MongoDB filter JSON.
    Structure: {"filter": <MongoDB filter>}
    Allowed fields: title, content, createdAt
    Allowed operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $regex, $options, $and, $or

    Rules:
    - ALWAYS search both "title" and "content" using the same query with $or for general topic queries.
    - Use $regex with $options: "i" for case-insensitive matching.
    - Fields: title, content, createdAt (date).
    - If the query refers to multiple conditions, combine them using $and.
    - Output must be valid JSON
    - No explanations
    - No markdown
    - Only return the JSON object
    `
    ;    
}
}

export default new OllamaService();