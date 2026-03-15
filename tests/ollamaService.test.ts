
import { OllamaService, OllamaServiceError } from '../services/ollamaService';
import axios from 'axios';
jest.mock('axios');

describe('OllamaService', () => {
    test('parses a valid JSON filter response', async () => {
        (axios.create as jest.Mock).mockReturnValue({
            post: jest.fn().mockResolvedValue({
                data: { message: { content: '{"title":{"$regex":"travel","$options":"i"}}' } }
            })
        });
        const service = new OllamaService();
        await expect(service.buildSearchFilter('posts about travel')).resolves.toEqual({
            title: { $regex: 'travel', $options: 'i' }
        });
    });
    test('parses fenced JSON filter responses', async () => {
        (axios.create as jest.Mock).mockReturnValue({
            post: jest.fn().mockResolvedValue({
                data: { message: { content: '{"content":{"$regex":"cats","$options":"i"}}' } }
            })
        });
        const service = new OllamaService();
        await expect(service.buildSearchFilter('posts about cats')).resolves.toEqual({
            content: { $regex: 'cats', $options: 'i' }
        });
    });
    test('throws when Ollama returns invalid content', async () => {
        (axios.create as jest.Mock).mockReturnValue({
            post: jest.fn().mockResolvedValue({
                data: { message: { content: 'not-json' } }
            })
        });
        const service = new OllamaService();
        await expect(service.buildSearchFilter('posts about cats')).rejects.toThrow(OllamaServiceError);
    });
});
