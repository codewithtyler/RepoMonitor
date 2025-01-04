import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filePath) {
  console.log(`Running migration: ${path.basename(filePath)}`);
  const migrationSQL = fs.readFileSync(filePath, 'utf8');

  // Split the migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Execute each statement
  for (const statement of statements) {
    console.log('Executing migration statement...');
    try {
      const { error } = await supabase.rpc('exec', { sql: statement + ';' });
      if (error) throw error;
    } catch (error) {
      console.error('Error executing statement:', error);
      throw error;
    }
  }
}

async function runMigrations() {
  try {
    // Get all SQL files in the migrations directory
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort(); // This will sort them by name, which is why we use numbered prefixes

    // Run each migration in order
    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file);
      await runMigration(filePath);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();