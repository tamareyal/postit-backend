import { MongoFilterSanitizerError, sanitizeMongoFilter } from '../../utils/mongoFilterSanitizer';

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

    test('handles empty or null filters', () => {
        expect(sanitizeMongoFilter({})).toEqual({});
        expect(() => sanitizeMongoFilter(null)).toThrow();
    });

    test('accepts valid date range queries', () => {
        const filter = {
            createdAt: { $gte: '2024-01-01', $lte: '2024-12-31' }
        };
        const sanitized = sanitizeMongoFilter(filter);
        expect(sanitized).toEqual(filter);
    });

    test('rejects deeply nested unauthorized operators', () => {
        const malicious = {
            $or: [
                { title: 'safe' },
                { content: { $regex: '.*', $options: 'i' } },
                { some_field: { $gt: 10, $where: 'sleep(5000)' } }
            ]
        };
        expect(() => sanitizeMongoFilter(malicious)).toThrow();
    });

    test('rejects prototype pollution attempts', () => {
        expect(() => sanitizeMongoFilter({
            __proto__: { polluted: true }
        })).toThrow(MongoFilterSanitizerError);
    });

    test('rejects nested prototype pollution', () => {
        expect(() => sanitizeMongoFilter({
            title: {
                __proto__: { hacked: true }
            }
        })).toThrow(MongoFilterSanitizerError);
    });

    test('sanitizes arrays correctly', () => {
        const filter = sanitizeMongoFilter({
            likes: { $in: ['a', 'b', 'c'] }
        });

        expect(filter).toEqual({
            likes: { $in: ['a', 'b', 'c'] }
        });
    });
});
