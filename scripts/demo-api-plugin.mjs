import { handleApi } from './capture-screenshots.mjs';

/**
 * Dev-only mock API for browsing the app without a real login.
 * Serves the same fictional data as scripts/capture-screenshots.mjs.
 */
export function demoApiPlugin() {
    return {
        name: 'fwg-demo-api',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (!req.url || !req.url.startsWith('/api/')) {
                    next();
                    return;
                }

                try {
                    const url = new URL(req.url, 'http://127.0.0.1');

                    // The screenshot mock predates the conversation-summary
                    // endpoint; supply the shape the Chats page validates.
                    if (url.pathname.endsWith('/api/messages.php') && url.searchParams.get('conversations') === '1') {
                        const conversations = [
                            {
                                request_id: 'req-1',
                                status: 'accepted',
                                ad_title: 'Mathe-Nachhilfe mit Geduld',
                                ad_short_description: 'Ich erkläre Ableitungen und Analysis ruhig und Schritt für Schritt.',
                                ad_subjects: ['mathematik'],
                                other_user_id: 'u-mia',
                                display_name: 'Mia S.',
                                avatar_url: null,
                                avatar_type: null,
                                grade_level: '9',
                                last_message: 'Hallo Lena, wäre ein Termin am Dienstag um 15:30 im SV-Raum frei?',
                                last_message_at: '2026-11-17T15:30:00.000Z',
                                last_message_sender_id: 'u-mia',
                                unread_count: 2,
                                request_created_at: '2026-11-16T10:00:00.000Z',
                            },
                            {
                                request_id: 'req-2',
                                status: 'pending',
                                ad_title: 'Englisch bis Klasse 10',
                                ad_short_description: 'Grammatik, Vokabeln und Textanalyse ohne Druck.',
                                ad_subjects: ['englisch'],
                                other_user_id: 'u-jonas',
                                display_name: 'Jonas B.',
                                avatar_url: null,
                                avatar_type: null,
                                grade_level: '9',
                                last_message: 'Danke, ich melde mich morgen noch einmal.',
                                last_message_at: '2026-11-15T09:12:00.000Z',
                                last_message_sender_id: 'u-lena',
                                unread_count: 0,
                                request_created_at: '2026-11-14T08:00:00.000Z',
                            },
                        ];
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-store');
                        res.end(JSON.stringify(conversations));
                        return;
                    }

                    const result = handleApi(url, req.method || 'GET');
                    res.statusCode = result.status;
                    res.setHeader('Content-Type', result.contentType);
                    res.setHeader('Cache-Control', 'no-store');
                    res.end(result.body);
                } catch (error) {
                    console.error('[demo-api]', error);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: false, error: 'Demo API failed' }));
                }
            });
        },
    };
}
