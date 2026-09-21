import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { sql } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = await fs.readFile(path.join(__dirname, '../sql/schema.sql'), 'utf8');
const seed = await fs.readFile(path.join(__dirname, '../sql/seed.sql'), 'utf8');

// The Neon HTTP driver executes one SQL statement at a time here.
for (const statement of schema.split(';').map(x => x.trim()).filter(Boolean)) {
  await sql.query(statement);
}
for (const statement of seed.split(';').map(x => x.trim()).filter(Boolean)) {
  await sql.query(statement);
}

const hash = await bcrypt.hash('admin123', 10);
await sql`
  INSERT INTO users (name, email, password_hash, role, status)
  VALUES ('Administrator', 'admin@pharmaplus.local', ${hash}, 'Administrator', 'Active')
  ON CONFLICT (email) DO NOTHING
`;

console.log('Database schema created and demo admin ensured.');
console.log('Login: admin@pharmaplus.local / admin123');
