import connectDB from '../src/config/db';
import Application from '../src/models/Application';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_ID = "694dcb5976fd3b846633c0dd";

async function checkResults() {
    try {
        await connectDB();
        const app = await Application.findById(TARGET_ID);
        if (!app) {
            console.log("App not found");
            process.exit(1);
        }

        console.log(`\n--- App ID: ${app._id} ---`);
        console.log(`Research Status: ${app.researchStatus}`);
        console.log(`Extracted Links: ${app.extractedLinks?.length}`);

        if (app.researchResults && app.researchResults.length > 0) {
            console.log(`\nResearch Results (${app.researchResults.length}):`);
            app.researchResults.forEach((r, i) => {
                console.log(`\n[${i + 1}] URL: ${r.url}`);
                console.log(`    Status: ${r.status}`);
                console.log(`    Summary: ${r.summary}`);
            });
        } else {
            console.log("\nNo research results found.");
        }

        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkResults();
