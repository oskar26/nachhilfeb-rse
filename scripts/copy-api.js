import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../api');
const destDir = path.resolve(__dirname, '../dist/api');

if (fs.existsSync(srcDir)) {
    // NIE deployen:
    //  - db_credentials.php : lokale Zugangsdaten (bleiben Server-Sache)
    //  - diag.php           : unauthentifizierter Diagnose-Endpunkt, der Infrastruktur-Infos
    //                         ausgibt und Probe-Schreibzugriffe auf die Datenbank macht.
    //                         Nur für die lokale Fehlersuche gedacht.
    const NEVER_DEPLOY = ['db_credentials.php', 'diag.php'];
    fs.cpSync(srcDir, destDir, {
        recursive: true,
        filter: (src) => !NEVER_DEPLOY.some((f) => src.endsWith(f)),
    });
    console.log('✓ API successfully copied to dist/api (ohne db_credentials.php, ohne diag.php)');
}

// Uploads liegen außerhalb des SPA-Builds, brauchen aber dieselbe
// Apache-Schutzdatei. Nur die .htaccess ins Artefakt kopieren, niemals
// hochgeladene Nutzerbilder aus dem lokalen Arbeitsstand.
const uploadsHtaccess = path.resolve(__dirname, '../uploads/ads/.htaccess');
const distUploadsDir = path.resolve(__dirname, '../dist/uploads/ads');
if (fs.existsSync(uploadsHtaccess)) {
    fs.mkdirSync(distUploadsDir, { recursive: true });
    fs.copyFileSync(uploadsHtaccess, path.join(distUploadsDir, '.htaccess'));
    console.log('✓ uploads/ads/.htaccess copied to dist/uploads/ads/.htaccess');
}
