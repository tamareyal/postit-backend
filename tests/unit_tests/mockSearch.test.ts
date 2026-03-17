import ollamaService from '../../services/ollamaService';
import request from 'supertest';
import { expressApp, testUser } from '../../jest.setup';

describe('Posts search API', () => {
    let buildSearchFilterSpy: jest.SpyInstance;

    beforeEach(() => {
        buildSearchFilterSpy = jest.spyOn(ollamaService, 'buildSearchFilter');
    });

    afterEach(() => {
        buildSearchFilterSpy.mockRestore();
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

        buildSearchFilterSpy.mockResolvedValue({
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


    test('returns 500 when the LLM service fails', async () => {
        buildSearchFilterSpy.mockRejectedValue(new Error('Ollama unavailable'));
        const response = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ query: 'find travel posts' });
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Ollama unavailable');
    });


    test('returns 400 when the LLM returns a dangerous filter', async () => {
        buildSearchFilterSpy.mockResolvedValue({
            $where: 'this.title.includes("cats")'
        });
        const response = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ query: 'posts about cats' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Unsupported Mongo operator');
    });
    

    test('rejects unauthenticated search requests', async () => {
        const res = await request(expressApp)
            .post('/api/posts/search')
            .send({ query: 'cats' });

        expect(res.status).toBe(401);
    });

    test('returns multiple matching posts', async () => {
        await request(expressApp)
            .post('/api/posts')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ title: 'Cats', content: 'Cats are cute' });

        await request(expressApp)
            .post('/api/posts')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ title: 'Cats again', content: 'More cats' });

        buildSearchFilterSpy.mockResolvedValue({
            title: { $regex: 'cats', $options: 'i' }
        });

        const res = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ query: 'cats' });

        expect(res.body.data.length).toBe(2);
    });
    

    test('respects search result limit', async () => {
        for (let i = 0; i < 5; i++) {
            await request(expressApp)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testUser.accessToken}`)
                .send({
                    title: `Post ${i}`,
                    content: 'limit test'
                });
        }

        buildSearchFilterSpy.mockResolvedValue({
            content: { $regex: 'limit', $options: 'i' }
        });

        const res = await request(expressApp)
            .post('/api/posts/search?limit=2')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                query: 'limit'
            });

        expect(res.body.data.length).toBe(2);
    });

});