import { MongoFilterSanitizerError, sanitizeMongoFilter } from '../utils/mongoFilterSanitizer';

describe('mongoFilterSanitizer', () => {
    test('accepts valid free-text regex filters', () => {
        const filter = sanitizeMongoFilter({
            $or: [
                { title: { $regex: 'cats', $options: 'i' } },
                { content: { $regex: 'cats', $options: 'i' } }
            ]
        });
        expect(filter).toEqual({
            $or: [
                { title: { $regex: 'cats', $options: 'i' } },
                { content: { $regex: 'cats', $options: 'i' } }
            ]
        });
    });

    test('rejects dangerous Mongo operators', () => {
        expect(() => sanitizeMongoFilter({
            $where: 'this.title.includes("cats")'
        })).toThrow(MongoFilterSanitizerError);
    });
    
    test('rejects unsupported fields', () => {
        expect(() => sanitizeMongoFilter({
            password: { $eq: 'secret' }
        })).toThrow('Unsupported field in search filter: password');
    });

    test('sanitizes nested logical operators', () => {
        const filter = sanitizeMongoFilter({
            $and: [
                { sender_id: '507f1f77bcf86cd799439011' },
                { likes: { $size: 2 } }
            ]
        });
        expect(filter).toEqual({
            $and: [
                { sender_id: '507f1f77bcf86cd799439011' },
                { likes: { $size: 2 } }
            ]
        });
    });
});
