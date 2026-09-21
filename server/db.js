import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Create a .env file from .env.example and paste your Neon connection string.');
}

export const sql = neon(process.env.DATABASE_URL);
