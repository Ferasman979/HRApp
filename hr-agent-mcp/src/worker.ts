```
import './tracing'; // Must be first
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db';
import Application from './models/Application';
import { processApplication } from './services/processor';
import { startMetricsServer } from './metrics';

dotenv.config();

// Start Metrics Server
startMetricsServer(9090);

async function startWorker() {
    console.log("Starting HR Agent Worker (MongoDB Streams)...");

    try {
        await connectDB();
        console.log("Connected to MongoDB.");

        const connection = mongoose.connection;
        if (!connection.db) {
            throw new Error("Database connection not established.");
        }

        console.log("Watching 'applications' collection for new inserts...");

        // WATCH for only 'insert' operations
        const changeStream = Application.watch([
            { $match: { operationType: 'insert' } }
        ]);

        changeStream.on('change', async (change) => {
            if (change.operationType === 'insert') {
                const docId = change.documentKey._id;
                console.log(`\n[Worker] New Application Detected: ${ docId } `);

                try {
                    // Trigger the processing pipeline
                    await processApplication(docId.toString());
                } catch (err) {
                    console.error(`[Worker] Failed to process application ${ docId }: `, err);
                }
            }
        });

        changeStream.on('error', (error) => {
            console.error("[Worker] Change Stream Error:", error);
        });

        // Keep process alive
        process.on('SIGINT', async () => {
            console.log("Shutting down worker...");
            await changeStream.close();
            await mongoose.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error("Worker failed to start:", error);
        process.exit(1);
    }
}

startWorker();
