import Application from '../src/models/Application';
import connectDB from '../src/config/db';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function simulateUpload() {
    try {
        await connectDB();
        console.log("Connected to MongoDB.");

        // Create a dummy PDF buffer
        const dummyPdfBuffer = Buffer.from("%PDF-1.4\n%... Dummy PDF Content ...");

        console.log("Inserting dummy application...");
        const app = await Application.create({
            jobId: new mongoose.Types.ObjectId("6769c9b147d159196c888fc9") as any, // Updated to real Job ID from screenshot
            userId: "test_user_123",
            applicantName: "Test Candidate",
            applicantEmail: "test@example.com",
            resumeData: dummyPdfBuffer,
            status: "received"
        });

        console.log(`Application created with ID: ${app._id}`);
        console.log("Worker should pick this up now...");

        setTimeout(async () => {
            await mongoose.disconnect();
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error("Simulation failed:", error);
        process.exit(1);
    }
}

simulateUpload();
