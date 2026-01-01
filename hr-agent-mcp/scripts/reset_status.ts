import connectDB from '../src/config/db';
import Application from '../src/models/Application';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_ID = "694dcb5976fd3b846633c0dd";

async function resetStatus() {
    try {
        await connectDB();
        console.log("Connected to MongoDB.");

        const app = await Application.findById(TARGET_ID);
        if (!app) {
            console.error("App not found!");
            process.exit(1);
        }

        console.log(`Resetting status for App: ${app._id}`);

        // ONLY reset the status, do not overwrite extractedLinks
        app.researchStatus = 'pending';
        // Clear previous results to avoid confusion
        app.researchResults = [];

        await app.save();

        console.log("Reset complete. Research Status set to PENDING. Previous results cleared.");

        setTimeout(async () => {
            await mongoose.disconnect();
            process.exit(0);
        }, 1000);

    } catch (error) {
        console.error("Error resetting:", error);
        process.exit(1);
    }
}

resetStatus();
