const ALLOWED_TAGS = new Set([
    'P', 'BR', 'B', 'I', 'EM', 'STRONG', 'U', 'S', 'STRIKE',
    'UL', 'OL', 'LI', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'IMG', 'HR'
]);

const ALLOWED_ATTRS = new Set([
    'style', 'href', 'target', 'src', 'alt', 'title'
]);

export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
    if (!dirtyHtml || typeof dirtyHtml !== 'string') {
        return '';
    }

    try {
        const doc = new DOMParser().parseFromString(dirtyHtml, 'text/html');

        function cleanNode(node: Node) {
            for (const child of Array.from(node.childNodes)) {
                if (child.nodeType !== Node.ELEMENT_NODE) {
                    if (child.nodeType !== Node.TEXT_NODE) child.remove();
                    continue;
                }

                const el = child as HTMLElement;
                const tagName = el.tagName.toUpperCase();
                if (el.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
                    ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE'].includes(tagName)) {
                    el.remove();
                    continue;
                }

                cleanNode(el);
                if (!ALLOWED_TAGS.has(tagName)) {
                    el.replaceWith(...Array.from(el.childNodes));
                    continue;
                }

                for (const attr of Array.from(el.attributes)) {
                    const name = attr.name.toLowerCase();
                    if (!ALLOWED_ATTRS.has(name)) {
                        el.removeAttribute(attr.name);
                        continue;
                    }

                    if (name === 'href' || name === 'src') {
                        const value = attr.value.trim();
                        // href: http(s)/mailto/tel ok; img-src: nur https + eingebaute Rasterbilder (kein http → Mixed-Content/Tracking)
                        const protocols = name === 'href' ? ['https:', 'http:', 'mailto:', 'tel:'] : ['https:'];
                        const rasterImage = name === 'src' && /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value);
                        let safe = false;
                        try {
                            safe = protocols.includes(new URL(value, window.location.origin).protocol);
                        } catch {
                            safe = false;
                        }
                        if ((name === 'href' && tagName !== 'A') || (name === 'src' && tagName !== 'IMG') || (!safe && !rasterImage)) {
                            el.removeAttribute(attr.name);
                        }
                    }

                    if (name === 'style') {
                        const color = el.style.color;
                        const align = el.style.textAlign;
                        el.removeAttribute('style');
                        if (/^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i.test(color)) {
                            el.style.color = color;
                        }
                        if (['left', 'center', 'right', 'justify', 'start', 'end'].includes(align)) {
                            el.style.textAlign = align;
                        }
                    }
                }

                if (tagName === 'A' && el.getAttribute('target')?.toLowerCase() === '_blank') {
                    el.setAttribute('rel', 'noopener noreferrer');
                } else {
                    el.removeAttribute('target');
                }
                if (tagName === 'IMG') el.setAttribute('referrerpolicy', 'no-referrer');
            }
        }

        cleanNode(doc.body);
        return doc.body.innerHTML;
    } catch {
        return dirtyHtml
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
