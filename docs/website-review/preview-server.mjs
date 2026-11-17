/*
 * Lokale Vorschau für docs/website-review/PREVIEW.md.
 *
 * Warum nicht `vite preview`? Die echte API unter /api sendet keinen
 * CORS-Header. Vite preview kann nicht proxien, deshalb liefert diese Datei
 * den Produktions-Build aus und leitet /api an nachhilfe-sv.de weiter — so
 * zeigt die Vorschau dieselben Live-Kennzahlen wie die echte Seite.
 *
 * Start: node docs/website-review/preview-server.mjs [port]
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const port = Number(process.argv[2] || 5190);
const API_HOST = 'nachhilfe-sv.de';
const MIME = {
    '.css': 'text/css; charset=utf-8',
    '.data': 'application/octet-stream',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
    console.error(`Kein Build gefunden: ${root} — zuerst "npm run build".`);
    process.exit(1);
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname.startsWith('/api/')) {
        const upstream = https.request(
            {
                hostname: API_HOST,
                path: url.pathname + url.search,
                method: req.method,
                headers: { ...req.headers, host: API_HOST },
            },
            (answer) => {
                res.writeHead(answer.statusCode ?? 502, answer.headers);
                answer.pipe(res);
            },
        );
        upstream.on('error', () => {
            res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('API nicht erreichbar');
        });
        req.pipe(upstream);
        return;
    }

    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    let file = path.resolve(root, `.${rel}`);
    if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(root, 'index.html');
    }

    res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') {
        res.end();
        return;
    }
    fs.createReadStream(file).pipe(res);
});

server.listen(port, () => {
    console.log(`Vorschau: http://localhost:${port}/#/welcome (API → ${API_HOST})`);
});
