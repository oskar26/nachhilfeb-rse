/**
 * Sanitize HTML strings using browser DOMParser.
 * Strips script tags, event handlers (onerror, onload, etc.),
 * dangerous protocols (javascript:, data:), and iframe/embed elements.
 */

const ALLOWED_TAGS = new Set([
    'P', 'BR', 'B', 'I', 'EM', 'STRONG', 'U', 'S', 'STRIKE',
    'UL', 'OL', 'LI', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'IMG', 'HR'
]);

const ALLOWED_ATTRS = new Set([
    'class', 'style', 'href', 'target', 'rel', 'src', 'alt', 'title'
]);

export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
    if (!dirtyHtml || typeof dirtyHtml !== 'string') {
        return '';
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(dirtyHtml, 'text/html');

        function cleanNode(node: Node) {
            const children = Array.from(node.childNodes);
            for (const child of children) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    const el = child as HTMLElement;
                    const tagName = el.tagName.toUpperCase();

                    // If tag is not in whitelist, replace element with its text content or remove it
                    if (!ALLOWED_TAGS.has(tagName)) {
                        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(tagName)) {
                            el.remove();
                        } else {
                            // Unwrap element, keeping child nodes
                            while (el.firstChild) {
                                el.parentNode?.insertBefore(el.firstChild, el);
                            }
                            el.remove();
                        }
                        continue;
                    }

                    // Clean attributes
                    const attrs = Array.from(el.attributes);
                    for (const attr of attrs) {
                        const attrName = attr.name.toLowerCase();

                        // Strip inline JS handlers (e.g. onerror, onclick)
                        if (attrName.startsWith('on')) {
                            el.removeAttribute(attr.name);
                            continue;
                        }

                        // Check attribute whitelist
                        if (!ALLOWED_ATTRS.has(attrName)) {
                            el.removeAttribute(attr.name);
                            continue;
                        }

                        // Sanitize URLs (href, src)
                        if (['href', 'src'].includes(attrName)) {
                            const val = attr.value.trim().toLowerCase();
                            if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html')) {
                                el.removeAttribute(attr.name);
                            }
                        }

                        // Sanitize target attribute
                        if (attrName === 'target' && el.getAttribute('target') === '_blank') {
                            el.setAttribute('rel', 'noopener noreferrer');
                        }
                    }

                    // Recurse into children
                    cleanNode(el);
                }
            }
        }

        cleanNode(doc.body);
        return doc.body.innerHTML;
    } catch (err) {
        console.error('Error sanitizing HTML:', err);
        // Fallback to basic text escaping
        return dirtyHtml
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
