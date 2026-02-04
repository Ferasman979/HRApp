const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
});

console.log("Testing connection to:", process.env.DATABASE_URL.replace(/:[^:]+@/, ':****@')); // Hide password

client.connect()
    .then(() => {
        console.log("✅ Successfully connected to Supabase!");
        return client.end();
    })
    .catch(err => {
        console.error("❌ Connection failed:");
        console.error("Code:", err.code);
        console.error("Message:", err.message);
        console.error("Detail:", err.message); // pg errors often imply cause in message
        process.exit(1);
    });
