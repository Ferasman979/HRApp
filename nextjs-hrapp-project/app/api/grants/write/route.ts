import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { message: "Server configuration error: API Key missing" },
                { status: 500 }
            );
        }

        const groq = new Groq({ apiKey });
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { message: "Prompt is required" },
                { status: 400 }
            );
        }

        const systemPrompt = `
      You are an expert Grant Writer and Documentation Specialist. 
      Your goal is to help preparing documentation to apply for grants based on company data.
      
      Output should be a professional, well-structured grant application letter or proposal draft.
      Format the output as Markdown.
      Do not return JSON. Return the document text directly.
    `;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
        });

        const text = completion.choices[0]?.message?.content || "Failed to generate.";

        return NextResponse.json({ success: true, text });

    } catch (error: any) {
        console.error("Grant Writer API Error:", error);
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
