
FROM node:20-slim

# Install system dependencies including those for Puppeteer
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Skip Puppeteer's internal generic Chromium download (we use system chrome or specific version if needed)
# But common issue: puppeteer script hangs.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies (clean install)
RUN npm ci

# Copy source
COPY . .

# BAKING THE MODEL: Run the download script during build time
ENV XENOVA_CACHE_DIR=/app/.cache
# Use a timeout to fail fast if it hangs, or continue
RUN npx ts-node scripts/download_model.ts || echo "Model download failed or skipped, will download at runtime"

# Default command
CMD ["npm", "run", "worker"]

EXPOSE 3000

