// Dev-only: rendert docs/readme/banner.html zu docs/readme/banner.png.
// Benötigt: npm i --no-save playwright
// Vorher: python3 -m http.server 5195 --directory .
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage({
        viewport: { width: 1200, height: 440 },
        deviceScaleFactor: 2,
    });
    await page.goto('http://127.0.0.1:5195/docs/readme/banner.html', {
        waitUntil: 'networkidle',
    });
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
            Array.from(document.images).map((img) =>
                img.complete
                    ? Promise.resolve()
                    : new Promise((resolve) => {
                        img.addEventListener('load', resolve, { once: true });
                        img.addEventListener('error', resolve, { once: true });
                    }),
            ),
        );
    });
    await page.screenshot({
        path: 'docs/readme/banner.png',
        clip: { x: 0, y: 0, width: 1200, height: 440 },
        animations: 'disabled',
    });
    const info = await page.evaluate(() => ({
        font: getComputedStyle(document.body).fontFamily,
        images: Array.from(document.images).map((img) => ({
            src: img.getAttribute('src'),
            complete: img.complete,
            width: img.naturalWidth,
            height: img.naturalHeight,
        })),
    }));
    console.log(JSON.stringify(info, null, 2));
} finally {
    await browser.close();
}
