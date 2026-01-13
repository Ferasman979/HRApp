

declare var process: any;
import { preloadModel } from '../src/services/modelLoader';

// Force Cache Directory for Build (requires @types/node or cast)
// @ts-ignore
process.env.XENOVA_CACHE_DIR = './.cache';


console.log("Pre-downloading embedding model for Docker image...");
preloadModel().then(() => {
    console.log("Model downloaded successfully.");
    process.exit(0);
}).catch((err) => {
    console.error("Failed to download model:", err);
    process.exit(1);
});
