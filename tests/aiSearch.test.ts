import request from 'supertest';
import { expressApp, testUser } from '../jest.setup';
import { get } from 'mongoose';

describe('Posts search API (real LLM)', () => {
    test('search returns correct filter using actual LLM', async () => {
        const createdPost = await request(expressApp)
            .post('/api/posts')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                title: 'Alps Hiking',
                content: 'Amazing hiking in the Alps'
            });
        expect(createdPost.status).toBe(201);

        const response = await request(expressApp)
            .post('/api/posts/search')
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                query: 'posts about hiking in the Alps',
                debug: true
            });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0]._id).toBe(createdPost.body._id);

        // // Verify LLM filter was valid
        // expect(response.body.mongoFilter).toHaveProperty('$or');
    });
});