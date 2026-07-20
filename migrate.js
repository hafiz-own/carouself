const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Adding total_words to users...');
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "total_words" integer DEFAULT 0 NOT NULL;`;
    
    console.log('Creating rate_limits table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "rate_limits" (
        "ip" varchar(255) PRIMARY KEY NOT NULL,
        "attempts" integer DEFAULT 1 NOT NULL,
        "first_attempt_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
