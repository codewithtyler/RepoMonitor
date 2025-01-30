import * as fs from 'fs';
import * as path from 'path';

const EXCLUDED_DIRS = ['node_modules', 'dist', '.git', 'scripts'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function shouldProcessDirectory(dirPath: string): boolean {
    const basename = path.basename(dirPath);
    return !EXCLUDED_DIRS.includes(basename);
}

function processFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file already imports logger
    const hasLoggerImport = content.includes("import { logger }");

    // Replace console.log/error/warn with logger
    let updatedContent = content
        .replace(/console\.log\(/g, 'logger.info(')
        .replace(/console\.error\(/g, 'logger.error(')
        .replace(/console\.warn\(/g, 'logger.warn(')
        .replace(/console\.debug\(/g, 'logger.debug(');

    // Add logger import if needed
    if (!hasLoggerImport && (
        updatedContent.includes('logger.info(') ||
        updatedContent.includes('logger.error(') ||
        updatedContent.includes('logger.warn(') ||
        updatedContent.includes('logger.debug(')
    )) {
        updatedContent = `import { logger } from '@/lib/utils/logger';\n${updatedContent}`;
    }

    // Write back to file if changes were made
    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent);
        console.log(`Updated logging in: ${filePath}`);
    }
}

function walkDir(dir: string) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && shouldProcessDirectory(filePath)) {
            walkDir(filePath);
        } else if (stat.isFile() && FILE_EXTENSIONS.includes(path.extname(file))) {
            processFile(filePath);
        }
    });
}

// Start processing from src directory
walkDir('src');
