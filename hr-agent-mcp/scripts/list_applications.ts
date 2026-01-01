import connectDB from '../src/config/db';
import Application from '../src/models/Application';
import dotenv from 'dotenv';

dotenv.config();

async function listApplications() {
    try {
        await connectDB();
        const apps = await Application.find({}, 'applicantName jobId createdAt status researchStatus extractedLinks').sort({ createdAt: -1 }).limit(5);

        console.log('\n--- Recent Applications ---');
        if (apps.length === 0) {
            console.log('No applications found.');
        } else {
            apps.forEach(app => {
                const links = app.extractedLinks ? app.extractedLinks.length : 0;
                console.log(`ID: ${app._id} | Name: ${app.applicantName || 'Anonymous'} | Job: ${app.jobId} | Status: ${app.status} | Research: ${app.researchStatus} | Links: ${links}`);
            });
        }
        console.log('---------------------------\n');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listApplications();
