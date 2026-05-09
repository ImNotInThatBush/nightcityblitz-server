require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => client.query("DELETE FROM ncb_users WHERE nickname ILIKE 'imnotinthatbush'"))
    .then(() => {
        console.log('Deleted Admin from DB');
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
