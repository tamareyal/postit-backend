jest.mock('../services/ollamaService', () => ({
    __esModule: true,
    default: {
        buildMongoFilter: jest.fn()
    },
    OllamaServiceError: class OllamaServiceError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'OllamaServiceError';
        }
    }
}));

import request from 'supertest';
import ollamaService from '../services/ollamaService';
import { expressApp, testUser } from '../jest.setup';

const mockedOllamaService = ollamaService as unknown as { buildMongoFilter: jest.Mock };

describe('Posts search API', () => {
    beforeEach(() => {
        mockedOllamaService.buildMongoFilter.mockReset();
    });
    test('searches posts using sanitized LLM filters', async () => {
        const createdPost = await request(expressApp)
            .post('/api/posts')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                title: 'Searchable Alpha',
                content: 'Post about hiking in the Alps'
            });
        expect(createdPost.status).toBe(201);
        mockedOllamaService.buildMongoFilter.mockResolvedValue({
            title: { $regex: 'Searchable Alpha', $options: 'i' }
        });
        const response = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                query: 'find the searchable alpha post',
                debug: true
            });
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]._id).toBe(createdPost.body._id);
        expect(response.body.mongoFilter).toEqual({
            title: { $regex: 'Searchable Alpha', $options: 'i' }
        });
    });
    test('returns 400 for empty queries', async () => {
        const response = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ query: '   ' });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('query is required');
    });
    test('returns 503 when the LLM service fails', async () => {
        mockedOllamaService.buildMongoFilter.mockRejectedValue(new Error('Ollama unavailable'));
        const response = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ query: 'find travel posts' });
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Ollama unavailable');
    });
    test('returns 400 when the LLM returns a dangerous filter', async () => {
        mockedOllamaService.buildMongoFilter.mockResolvedValue({
            $where: 'this.title.includes("cats")'
        });
        const response = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ query: 'posts about cats' });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Unsupported Mongo operator');
    });
});
