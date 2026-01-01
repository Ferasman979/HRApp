import { LlamaParse } from 'llama-parse';
import dotenv from 'dotenv';

dotenv.config();

export async function parseResume(pdfBuffer: Buffer, fileName: string = 'resume.pdf'): Promise<string> {
    const apiKey = process.env.LLAMA_PARSE_API_KEY;
    if (!apiKey) {
        throw new Error('LLAMA_PARSE_API_KEY is not defined in environment variables');
    }

    try {
        const parser = new LlamaParse({ apiKey: apiKey });

        // Create a Blob from the buffer (Node.js 18+ supports global Blob)
        const blob = new Blob([pdfBuffer as any], { type: 'application/pdf' });

        const result = await parser.parseFile(blob);
        return result.markdown;

    } catch (error) {
        console.error('Error parsing resume with LlamaParse:', error);
        throw error;
    }
}
