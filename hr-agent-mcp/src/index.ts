import connectDB from './config/db';
import { fetchResume } from './tools/fetchResume';
import { parseResume } from './tools/parseResume';
import { extractData } from './tools/extractData';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: ts-node src/index.ts <applicationId>');
        process.exit(1);
    }

    const applicationId = args[0];

    try {
        console.log('Connecting to DB...');
        await connectDB();

        console.log(`Fetching resume for application: ${applicationId}...`);
        const { resumeBuffer, jobId } = await fetchResume(applicationId);
        console.log(`Resume fetched. Size: ${resumeBuffer.length} bytes`);

        console.log('Parsing PDF with LlamaParse...');
        const resumeText = await parseResume(resumeBuffer);
        console.log('Resume parsed successfully.');
        console.log('--- Preview (First 500 chars) ---');
        console.log(resumeText.substring(0, 500));
        console.log('---------------------------------');

        console.log('Extracting data with Groq (Llama 3)...');
        const data = await extractData(resumeText, jobId);

        console.log('\n--- Extracted Data (JSON) ---');
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
