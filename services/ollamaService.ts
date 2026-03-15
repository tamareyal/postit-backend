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
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 8000
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
        try{
            const response = await this.api.post('/api/generate', {
                model: this.config.model,
                stream: false,  
                messages: [
                    { role: 'system', content: this.getSystemPrompt() },
                    { role: 'user', content: query }
                ],
                format: 'json'
            });

            const rawContent = response.data?.message?.content;
            const parsed = JSON.parse(rawContent);

            if (!parsed || typeof parsed !== "object" || !parsed.filter) {
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
    return `
    You convert natural language search queries into MongoDB filter JSON.

    Return ONLY valid JSON using this exact schema:

    {
    "filter": <MongoDB filter object>
    }

    Allowed fields:
    title, content, sender_id, likes, createdAt

    Allowed operators:
    $eq, $ne, $gt, $gte, $lt, $lte, $in, $regex, $options, $and, $or

    Rules:
    - Do NOT return explanations
    - Do NOT return markdown
    - Output must be valid JSON
    - The top-level object MUST contain only "filter"

    Example:

    User: posts about cats

    Output:

    {
    "filter": {
        "title": {
        "$regex": "cats",
        "$options": "i"
        }
    }
    }
    `;    }
}

export default new OllamaService();
