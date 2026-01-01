import puppeteer from 'puppeteer';

export interface ScrapedPage {
    url: string;
    title: string;
    description: string;
    content: string; // Truncated body text
    screenshot?: Buffer;
    error?: string;
}

export async function scrapeUrl(url: string): Promise<ScrapedPage> {
    // Normalize URL
    url = url.trim();
    if (!url) {
        return { url, title: "Error", description: "", content: "", error: "Empty URL provided" };
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    console.log(`[Browser] Visiting: ${url}`);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ]
        });
        const page = await browser.newPage();

        // 1. Set User-Agent & Headers (Look Human)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });

        // 2. Resource Blocking (Speed up & Avoid Bloat)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 3. Robust Navigation (Fail Fast, Don't Wait for Analytics)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const title = await page.title();

        // Extract Meta Description
        const description = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.getAttribute('content') || '' : '';
        });

        // Extract and clean body text
        const content = await page.evaluate(() => {
            return document.body.innerText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n')
                .substring(0, 5000); // Limit to 5000 chars
        });

        return {
            url,
            title,
            description,
            content
        };

    } catch (error: any) {
        console.error(`[Browser] Error scraping ${url}:`, error.message);
        return {
            url,
            title: "Error",
            description: "",
            content: "",
            error: error.message
        };
    } finally {
        if (browser) await browser.close();
    }
}
