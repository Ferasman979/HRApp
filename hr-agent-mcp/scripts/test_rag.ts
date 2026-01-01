import * as dotenv from 'dotenv';
dotenv.config();
import { extractData } from '../src/tools/extractData';

async function main() {
    console.log("Starting RAG Verification Test...");

    // 1. Create a dummy resume (Markdown)
    const dummyResume = `
# John Doe
Software Engineer
San Francisco, CA | john@example.com

## Summary
Experienced Full Stack Developer with 8 years of experience building scalable web applications. Expert in TypeScript, Node.js, and React.

## Technical Skills
- **Languages**: TypeScript, JavaScript, Python, Go
- **Frontend**: React, Next.js, TailwindCSS, Redux
- **Backend**: Node.js, Express, NestJS, Django
- **Database**: PostgreSQL, MongoDB, Redis
- **DevOps**: Docker, Kubernetes, AWS (EC2, S3, Lambda), Terraform

## Experience

### Senior Software Engineer - TechCorp
*Jan 2020 - Present*
- Led a team of 5 engineers to rebuild the core billing engine, reducing processing time by 40%.
- Designed and implemented a microservices architecture using Node.js and gRPC.
- Migrated legacy infrastructure to AWS using Terraform, cutting hosting costs by 20%.
- Mentored 3 junior developers who were subsequently promoted to mid-level roles.

### Software Engineer - StartUp Inc
*Jun 2016 - Dec 2019*
- Developed a real-time chat application using Socket.io and React, serving 10k daily active users.
- Optimized database queries in PostgreSQL, improving query performance by 50%.
- Implemented CI/CD pipelines using Jenkins and Docker.

## Education
B.S. Computer Science - University of Technology (2012-2016)

## Projects
- **Open Source Contributor - React Library**: Contributed 5 components to a popular UI library used by 50k+ developers.
- **Personal Portfolio**: Built a Next.js portfolio site deployed on Vercel with perfect Lighthouse scores.
`;

    try {
        console.log("\n--- Testing Extraction ---");
        const start = Date.now();
        const result = await extractData(dummyResume);
        const end = Date.now();
        console.log(`\nExtraction completed in ${(end - start) / 1000} seconds.`);

        console.log("\n--- Extracted Data ---");
        console.log(JSON.stringify(result, null, 2));

        // Basic Validation
        console.log("\n--- Validation ---");
        const skillsLowerCase = result.skills.map(s => s.toLowerCase());
        if (skillsLowerCase.includes("typescript") && skillsLowerCase.includes("react")) {
            console.log("✅ Skills extraction verified.");
        } else {
            console.error("❌ Skills extraction failed.");
        }

        if (result.evidence.length > 0) {
            console.log(`✅ Evidence extraction verified (${result.evidence.length} items).`);
        } else {
            console.error("❌ Evidence extraction failed.");
        }

        if (result.years_experience_estimate.value >= 8) {
            console.log(`✅ Experience estimate verified (${result.years_experience_estimate.value} years).`);
        } else {
            console.error("❌ Experience estimate failed.");
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

main();
