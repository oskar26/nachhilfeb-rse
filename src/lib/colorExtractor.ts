// Utility to extract dominant color from an avatar image or generate aesthetic random gradients

export const PRESET_GRADIENTS = [
    { name: 'FWG Gold', gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #fbbf24 100%)' },
    { name: 'Sunset Glow', gradient: 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)' },
    { name: 'Ocean Wave', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)' },
    { name: 'Cosmic Violet', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' },
    { name: 'Emerald Forest', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { name: 'Electric Indigo', gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
    { name: 'Aurora Teal', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0284c7 100%)' },
    { name: 'Berry Punch', gradient: 'linear-gradient(135deg, #d946ef 0%, #f43f5e 100%)' },
    { name: 'Amber Bronze', gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
    { name: 'Midnight Cyber', gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' },
];

export function getRandomGradient(seed?: string): string {
    if (seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % PRESET_GRADIENTS.length;
        return PRESET_GRADIENTS[index].gradient;
    }
    const randomIndex = Math.floor(Math.random() * PRESET_GRADIENTS.length);
    return PRESET_GRADIENTS[randomIndex].gradient;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export async function extractDominantGradient(imageUrl: string, fallbackSeed?: string): Promise<string> {
    if (!imageUrl || typeof window === 'undefined') {
        return getRandomGradient(fallbackSeed);
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(getRandomGradient(fallbackSeed || imageUrl));
                }

                const size = 32;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                const imgData = ctx.getImageData(0, 0, size, size).data;
                const hslBuckets: { h: number; s: number; l: number; score: number }[] = [];

                for (let i = 0; i < imgData.length; i += 4) {
                    const r = imgData[i];
                    const g = imgData[i + 1];
                    const b = imgData[i + 2];
                    const a = imgData[i + 3];

                    // Skip transparent or near-white / near-black pixels
                    if (a < 128) continue;
                    const [h, s, l] = rgbToHsl(r, g, b);

                    // Skip extreme grayscale or low saturation
                    if (l < 15 || l > 90 || s < 15) continue;

                    // Score pixels: prefer vibrant, saturated colors with medium lightness
                    const score = s * (1 - Math.abs(l - 50) / 50);
                    hslBuckets.push({ h, s, l, score });
                }

                if (hslBuckets.length === 0) {
                    return resolve(getRandomGradient(fallbackSeed || imageUrl));
                }

                // Pick highest scoring pixel or top cluster
                hslBuckets.sort((a, b) => b.score - a.score);
                const top = hslBuckets[0];

                const hue = top.h;
                const sat = Math.max(50, Math.min(85, top.s));
                const light1 = Math.max(30, Math.min(55, top.l - 10));
                const light2 = Math.min(75, Math.max(45, top.l + 10));
                const hue2 = (hue + 35) % 360;

                const gradient = `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${light1}%) 0%, hsl(${hue2}, ${sat}%, ${light2}%) 100%)`;
                resolve(gradient);
            } catch (err) {
                console.warn('Could not extract gradient from image canvas:', err);
                resolve(getRandomGradient(fallbackSeed || imageUrl));
            }
        };

        img.onerror = () => {
            resolve(getRandomGradient(fallbackSeed || imageUrl));
        };

        img.src = imageUrl;
    });
}
