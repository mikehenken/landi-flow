import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const conn = process.env.PGURL;
if (!conn) {
  console.error('PGURL env required');
  process.exit(1);
}

const dir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();

let applied = 0;
for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  process.stdout.write(`Applying ${file}... `);
  try {
    await client.query(sql);
    console.log('OK');
    applied += 1;
  } catch (error) {
    console.log('FAIL');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    break;
  }
}

await client.end();
console.log(`Applied ${applied}/${files.length}`);
