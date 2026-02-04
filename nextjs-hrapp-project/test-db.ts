
import dotenv from 'dotenv';
dotenv.config();

console.log("Environment loaded.");
console.log("DATABASE_URL length:", process.env.DATABASE_URL?.length);
console.log("DATABASE_URL starts with:", process.env.DATABASE_URL?.substring(0, 15));

import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dns from 'dns';

const connectionString = `${process.env.DATABASE_URL}`

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error']
})

async function main() {
    const host = "aws-0-ca-central-1.pooler.supabase.com";
    console.log(`Resolving ${host}...`);
    try {
        const addresses = await dns.promises.resolve4(host);
        console.log("Resolved IPv4:", addresses);
    } catch (e) {
        console.error("DNS Resolve failed:", e);
    }

    try {
        console.log("Connecting to Prisma...");
        await prisma.$connect();
        console.log("Connected successfully!");
        const count = await prisma.employee.count();
        console.log(`Employee count: ${count}`);
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
