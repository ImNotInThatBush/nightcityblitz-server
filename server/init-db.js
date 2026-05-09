require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        await client.connect();
        console.log("Connected to Neon DB successfully.");

        // Create ncb_users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS ncb_users (
                id SERIAL PRIMARY KEY,
                nickname VARCHAR(50) UNIQUE NOT NULL,
                auth_token VARCHAR(255) UNIQUE NOT NULL,
                is_banned BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Table 'ncb_users' created or already exists.");

        // Create ncb_stats table
        await client.query(`
            CREATE TABLE IF NOT EXISTS ncb_stats (
                user_id INTEGER PRIMARY KEY REFERENCES ncb_users(id) ON DELETE CASCADE,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                ram_used INTEGER DEFAULT 0,
                rating INTEGER DEFAULT 1000
            );
        `);
        console.log("Table 'ncb_stats' created or already exists.");

        // Create a dummy user to test
        const dummyToken = 'admin_secret_token_123';
        await client.query(`
            INSERT INTO ncb_users (nickname, auth_token) 
            VALUES ('V', $1) 
            ON CONFLICT (nickname) DO NOTHING;
        `, [dummyToken]);
        
        const res = await client.query(`SELECT id FROM ncb_users WHERE nickname = 'V'`);
        if (res.rows.length > 0) {
            const userId = res.rows[0].id;
            await client.query(`
                INSERT INTO ncb_stats (user_id, wins, losses, ram_used) 
                VALUES ($1, 99, 0, 50) 
                ON CONFLICT (user_id) DO NOTHING;
            `, [userId]);
            console.log("Dummy user 'V' created with test stats.");
        }

        console.log("Database initialization completed successfully.");
    } catch (error) {
        console.error("Error initializing database:", error);
    } finally {
        await client.end();
    }
}

initDB();
