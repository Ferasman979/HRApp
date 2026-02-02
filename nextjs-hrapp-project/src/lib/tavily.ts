export async function searchTavily(query: string) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        console.warn("TAVILY_API_KEY is missing. Returning mock data.");
        // Mock data for development
        return [
            {
                title: `Mock Grant for: ${query}`,
                url: "https://example.com/grant",
                content: "This is a mock grant opportunity based on your search query. Please configure Tavily API Key to get real results.",
                score: 0.9
            }
        ];
    }

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: "advanced",
                include_answer: true,
                max_results: 5
            })
        });

        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error("Tavily search failed:", error);
        throw error;
    }
}
