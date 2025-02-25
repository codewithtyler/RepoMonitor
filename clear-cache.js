// Simple script to clear Vite cache
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Delete the .vite cache directory
const viteCache = path.join(__dirname, 'node_modules', '.vite');
if (fs.existsSync(viteCache)) {
    console.log('Removing Vite cache directory...');
    fs.rmSync(viteCache, { recursive: true, force: true });
}

// Delete any potential env.mjs files
const findEnvMjsFiles = () => {
    try {
        const result = execSync('dir /s /b env.mjs', { encoding: 'utf8' });
        return result.split('\n').filter(Boolean);
    } catch (error) {
        return [];
    }
};

const envMjsFiles = findEnvMjsFiles();
if (envMjsFiles.length > 0) {
    console.log('Found env.mjs files:');
    envMjsFiles.forEach(file => {
        console.log(`Removing ${file}...`);
        fs.unlinkSync(file);
    });
}

console.log('Cache cleared. Now run "npm run dev" to start the development server.');
