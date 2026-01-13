import { pipeline, env } from '@xenova/transformers';

// Configuration for local embeddings
// NODE.JS SETUP: Browser attributes must be false.
env.allowLocalModels = false; // "false" means it can fetch from Hub if not found. "true" forces local only? No, "false" allows remote.
env.useBrowserCache = false; // MUST be false in Node.js
env.cacheDir = './.cache'; // Save models here for persistence

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

let extractor: any = null;

export async function preloadModel() {
    if (!extractor) {
        console.log(`[ModelLoader] Initializing embedding model (${EMBEDDING_MODEL})...`);
        console.log(`[ModelLoader] This may take a few moments on first run, then it will use local cache.`);
        try {
            extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
                quantized: true, // Force use of quantized model to optimize speed and space
            });
            console.log("[ModelLoader] Embedding model loaded successfully.");
        } catch (error) {
            console.error("[ModelLoader] Failed to load embedding model:", error);
            throw error;
        }
    } else {
        console.log("[ModelLoader] Embedding model already loaded.");
    }
}

export async function getExtractor() {
    if (!extractor) {
        console.warn("[ModelLoader] Warning: getExtractor called before preload. Loading now...");
        await preloadModel();
    }
    return extractor;
}
