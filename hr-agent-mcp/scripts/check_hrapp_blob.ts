import connectDB from '../src/config/db';
import Application from '../src/models/Application';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_ID = "694dcb5976fd3b846633c0dd";

async function checkHrappBlob() {
    try {
        await connectDB(); // Now uses 'hrapp'
        console.log("Connected to MongoDB (hrapp).");

        const app = await Application.findById(TARGET_ID);
        if (!app) {
            console.error("App NOT found in hrapp!");
            process.exit(1);
        }

        console.log(`App Found: ${app._id}`);
        console.log(`Name: ${app.applicantName}`);

        if (app.resumeData) {
            console.log(`resumeData is present.`);
            console.log(`Length: ${app.resumeData.length}`);
        } else {
            console.error("resumeData is MISSING in hrapp.");
        }

        setTimeout(async () => {
            await mongoose.disconnect();
            process.exit(0);
        }, 1000);

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkHrappBlob();
