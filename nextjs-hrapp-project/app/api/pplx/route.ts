import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            console.error("Error: GROQ_API_KEY is not defined in environment variables.");
            return NextResponse.json(
                { message: "Server configuration error: API Key missing" },
                { status: 500 }
            );
        }

        const groq = new Groq({ apiKey });
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json(
                { message: "Message is required" },
                { status: 400 }
            );
        }

        console.log("Processing message with Groq (Llama 3)...");

        const systemPrompt = `
      You are an expert HR Assistant. Extract the job description and requirements for the ideal candidate from the input text.
      
      STRICTLY follow this JSON schema for the output:
      {
        "type": "object",
        "properties": {
          "job_name": { "type": "string", "description": "The professional title of the job role." },
          "description": { "type": "string", "description": "A concise, formal description of the job role, responsibilities, and team context." },
          "requirements": { "type": "array", "items": { "type": "string" }, "description": "A bulleted list of essential and desirable skills." }
        },
        "required": ["job_name", "description", "requirements"]
      }

      Just return the raw JSON string. Do not wrap it in markdown code blocks.
    `;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `INPUT:\n${message}` }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const text = completion.choices[0]?.message?.content || "{}";
            console.log("Groq Response:", text);

            let jobData;
            try {
                const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                jobData = JSON.parse(cleanText);
            } catch (e) {
                console.error("Failed to parse Groq response:", text);
                return NextResponse.json({ message: "Failed to parse job data from AI" }, { status: 500 });
            }

            const jobId = Date.now().toString();
            const createdAt = new Date().toISOString();

            const newEntry = {
                id: jobId,
                createdAt: createdAt,
                ...jobData,
            };

            return NextResponse.json({ success: true, data: newEntry });

        } catch (error: any) {
            console.error("Groq API Error:", error);
            return NextResponse.json(
                { message: error.message || "Error calling Groq API" },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("API Error Detail:", error);
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
