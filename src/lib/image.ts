export const AD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const AD_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);

/**
 * Clientseitige Vorprüfung für Anzeigenbilder. Der Server prüft zusätzlich
 * den echten MIME-Type und die Bildstruktur. `image/jpg` wird als
 * JPEG-Schreibweise toleriert; die Serverantwort normalisiert ihn danach.
 */
export function adImageFileProblem(file: File): string | null {
    const type = file.type.trim().toLowerCase();
    const extensionLooksValid = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!AD_IMAGE_MIME_TYPES.has(type) && !(type === '' && extensionLooksValid)) {
        return 'Nur JPEG, PNG oder WebP sind erlaubt.';
    }
    if (file.size > AD_IMAGE_MAX_BYTES) {
        return 'Das Bild ist zu groß (max. 5 MB).';
    }
    if (file.size <= 0) {
        return 'Die Datei ist leer.';
    }
    return null;
}

export async function compressImage(file: File, maxWidth = 300, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Convert to WebP Base64
                resolve(canvas.toDataURL('image/webp', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
