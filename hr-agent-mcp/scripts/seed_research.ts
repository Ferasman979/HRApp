import connectDB from '../src/config/db';
import Application from '../src/models/Application';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_ID = "694dcb5976fd3b846633c0dd";

async function seedResearch() {
    try {
        await connectDB();
        console.log("Connected to MongoDB.");

        const app = await Application.findById(TARGET_ID);
        if (!app) {
            console.error("App not found!");
            process.exit(1);
        }

        console.log(`Seeding data for App: ${app._id}`);

        // Inject dummy links for testing Agent 2
        app.extractedLinks = [
            { type: 'github', url: 'https://github.com/torvalds' }, // Valid
            { type: 'portfolio', url: 'https://example.com/nonexistent-portfolio-123' } // Dead link
        ];
        app.researchStatus = 'pending';

        await app.save();

        console.log("Seeding complete. Links added. Status set to PENDING.");

        setTimeout(async () => {
            await mongoose.disconnect();
            process.exit(0);
        }, 1000);

    } catch (error) {
        console.error("Error seeding:", error);
        process.exit(1);
    }
}

seedResearch();
