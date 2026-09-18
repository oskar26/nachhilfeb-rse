import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../api');
const destDir = path.resolve(__dirname, '../dist/api');

if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, destDir, {
        recursive: true,
        // Niemals lokale Credentials deployen (Server-Datei bleibt Server-Sache)
        filter: (src) => !src.endsWith('db_credentials.php'),
    });
    console.log('✓ API successfully copied to dist/api (ohne db_credentials.php)');
}
