import connectDB from '../src/config/db';
import Application from '../src/models/Application';
import { processApplication } from '../src/services/processor';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function reprocessStuck() {
    try {
        await connectDB();
        console.log("Connected to MongoDB.");

        // Forcing test on specific ID
        const targetId = "694dcb5976fd3b846633c0dd";
        console.log(`Forcing reprocessing of App ID: ${targetId}`);
        await processApplication(targetId);

        console.log("Reprocessing complete.");
        setTimeout(async () => {
            await mongoose.disconnect();
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error("Error reprocessing:", error);
        process.exit(1);
    }
}

reprocessStuck();
