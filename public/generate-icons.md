# PWA Icon Generation

This file explains how to generate the required PWA icon PNGs.

## Required Files

- `public/pwa-192x192.png` (192×192 px)
- `public/pwa-512x512.png` (512×512 px)
- `public/apple-touch-icon.png` (180×180 px)
- `public/favicon.ico`

## Option A — Using the SVG source + sharp (recommended)

1. Create `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="120" fill="#6366f1"/>
  <text x="256" y="340" font-family="system-ui, sans-serif"
    font-size="300" font-weight="700" text-anchor="middle" fill="white">N</text>
</svg>
```

2. Install `sharp-cli` and convert:

```bash
npx sharp-cli --input public/icon.svg --output public/pwa-192x192.png resize 192
npx sharp-cli --input public/icon.svg --output public/pwa-512x512.png resize 512
npx sharp-cli --input public/icon.svg --output public/apple-touch-icon.png resize 180
```

## Option B — Using Inkscape (if installed)

```bash
inkscape public/icon.svg -w 192 -h 192 -o public/pwa-192x192.png
inkscape public/icon.svg -w 512 -h 512 -o public/pwa-512x512.png
inkscape public/icon.svg -w 180 -h 180 -o public/apple-touch-icon.png
```

## Option C — Online tools

Upload the SVG above to https://realfavicongenerator.net/ or https://maskable.app/editor
and download the generated PNG files.
