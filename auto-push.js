const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const p = spawn('npx', ['drizzle-kit', 'push'], { 
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
});

p.stdout.on('data', data => {
  const output = data.toString();
  process.stdout.write(output);
  
  if (output.includes('Is rate_limits table created or renamed from another table?')) {
    console.log('--- DETECTED PROMPT, SENDING ENTER ---');
    p.stdin.write('\n');
  }
});

p.stderr.on('data', data => {
  process.stderr.write(data.toString());
});

p.on('close', code => {
  console.log(`Process exited with code ${code}`);
});
