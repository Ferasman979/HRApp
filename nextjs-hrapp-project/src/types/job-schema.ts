// src/types/job-schema.ts
export const JobSchema = {
    type: "object",
    properties: {
        job_name: {
            type: "string",
            description: "The professional title of the job role."
        },
        description: {
            type: "string",
            description: "A concise, formal description of the job role, responsibilities, and team context."
        },
        requirements: {
            type: "array",
            items: { type: "string" },
            description: "A bulleted list of essential and desirable skills, qualifications, and experience."
        }
    },
    required: ["job_name", "description", "requirements"]
};
