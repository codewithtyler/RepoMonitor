import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function combineMigrations() {
  try {
    // Get all SQL files in the migrations directory, excluding combined-migrations.sql
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql') && file !== 'combined-migrations.sql')
      .sort(); // This will sort them by name

    let combinedSQL = '-- Combined migrations\n\n';

    // Combine each migration file
    for (const file of migrationFiles) {
      console.log(`Processing migration: ${file}`);
      const filePath = path.join(__dirname, file);
      const migrationSQL = fs.readFileSync(filePath, 'utf8');
      
      combinedSQL += `-- Migration: ${file}\n`;
      combinedSQL += migrationSQL;
      combinedSQL += '\n\n';
    }

    // Write the combined SQL to a file
    const outputPath = path.join(__dirname, 'combined-migrations.sql');
    fs.writeFileSync(outputPath, combinedSQL);
    console.log(`Combined migrations written to: ${outputPath}`);
  } catch (error) {
    console.error('Error combining migrations:', error);
    process.exit(1);
  }
}

combineMigrations(); 