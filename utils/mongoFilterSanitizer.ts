const DEFAULT_ALLOWED_FIELDS = [
    'title',
    'content',
    'sender_id',
    'likes',
    'createdAt',
    'updatedAt'
] as const;

const ALLOWED_OPERATORS = new Set([
    '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
    '$in', '$nin', '$all', '$size', '$exists',
    '$regex', '$options', '$and', '$or', '$not', '$elemMatch'
]);

const MAX_DEPTH = 10;

export class MongoFilterSanitizerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MongoFilterError';
    }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const isSafePrimitive = (value: unknown): boolean => {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
};

// recursize sanitizer
const sanitizeValue = (
    value: unknown,
    allowedFields: Set<string>,
    depth: number
): unknown => {
    if (depth > MAX_DEPTH) {
        throw new MongoFilterSanitizerError('Search filter is too deeply nested');
    }
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item, allowedFields, depth + 1));
    }
    if (isSafePrimitive(value)) {
        return value;
    }
    if (!isPlainObject(value)) {
        throw new MongoFilterSanitizerError('Search filter contains unsupported values');
    }
    return sanitizeObject(value, allowedFields, depth + 1);
};

const sanitizeObject = (
    value: Record<string, unknown>,
    allowedFields: Set<string>,
    depth: number
): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new MongoFilterSanitizerError('Search filter contains forbidden keys');
        }
        if (key.startsWith('$')) {
            if (!ALLOWED_OPERATORS.has(key)) {
                throw new MongoFilterSanitizerError(`Unsupported Mongo operator: ${key}`);
            }
            sanitized[key] = sanitizeValue(nestedValue, allowedFields, depth);
            continue;
        }
        if (!allowedFields.has(key)) {
            throw new MongoFilterSanitizerError(`Unsupported field in search filter: ${key}`);
        }
        sanitized[key] = sanitizeValue(nestedValue, allowedFields, depth);
    }
    return sanitized;
};

export const sanitizeMongoFilter = (
    filter: unknown,
    allowedFields: readonly string[] = DEFAULT_ALLOWED_FIELDS
): Record<string, unknown> => {
    if (!isPlainObject(filter)) {
        throw new MongoFilterSanitizerError('Search filter must be a JSON object');
    }
    return sanitizeObject(filter, new Set(allowedFields), 0);
};

export { DEFAULT_ALLOWED_FIELDS };
