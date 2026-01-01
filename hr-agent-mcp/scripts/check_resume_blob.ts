import connectDB from '../src/config/db';
import Application from '../src/models/Application';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_ID = "694dcb5976fd3b846633c0dd";

async function checkResumeBlob() {
    try {
        await connectDB();
        console.log("Connected to MongoDB.");

        const app = await Application.findById(TARGET_ID);
        if (!app) {
            console.error("App NOT found!");
            process.exit(1);
        }

        console.log(`App Found: ${app._id}`);
        console.log(`Name: ${app.applicantName}`);

        if (app.resumeData) {
            console.log(`resumeData is present.`);
            console.log(`resumeData Type: ${typeof app.resumeData}`);
            // Check if it's a Buffer
            if (Buffer.isBuffer(app.resumeData)) {
                console.log(`resumeData Buffer Length: ${app.resumeData.length} bytes`);
            } else {
                console.log(`resumeData is NOT a Buffer (it might be encoded or null). Value:`, app.resumeData);
            }
        } else {
            console.error("resumeData is MISSING or NULL/UNDEFINED.");
        }

        if (app.resumeContentType) {
            console.log(`Content-Type: ${app.resumeContentType}`);
        } else {
            console.log(`Content-Type is MISSING.`);
        }

        setTimeout(async () => {
            await mongoose.disconnect();
            process.exit(0);
        }, 1000);

    } catch (error) {
        console.error("Error checking blob:", error);
        process.exit(1);
    }
}

checkResumeBlob();
