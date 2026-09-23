import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck } from 'lucide-react';

const NOTICE_KEY = 'cookie_notice_seen';

export function CookieBanner() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        let seen: string | null = null;
        try {
            seen = localStorage.getItem(NOTICE_KEY) ?? localStorage.getItem('cookie_consent');
        } catch {
            seen = null;
        }
        if (!seen) {
            const timer = setTimeout(() => setShow(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismiss = () => {
        try {
            localStorage.setItem(NOTICE_KEY, 'true');
        } catch {
            /* ignore */
        }
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] animate-in slide-in-from-bottom-5 duration-500">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row gap-4 items-start border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5 w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                        <Cookie size={20} className="text-primary-hover" aria-hidden="true" />
                    </div>
                    <div className="flex-1 text-sm">
                        <p className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                            <ShieldCheck size={15} className="text-green-500" aria-hidden="true" /> Datenschutz & Cookies
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                            Nur zur Info: Wir speichern <strong>technisch Notwendiges</strong> in deinem Browser (Anmeldung, Einstellungen wie Dark Mode). Zusätzlich zählen wir anonym auf unserem Server, welche Seiten aufgerufen werden – <strong>ohne IP-Adresse und ohne Drittanbieter</strong>. Mehr dazu in unserer{' '}
                            <Link to="/datenschutz" className="underline font-semibold hover:text-primary-hover">
                                Datenschutzerklärung
                            </Link>{' '}
                            und den <Link to="/cookies" className="underline font-semibold hover:text-primary-hover">Cookie-Hinweisen</Link>.
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 w-full sm:w-auto">
                    <Button
                        size="sm"
                        className="flex-1 sm:flex-none font-bold shadow-lg text-xs rounded-full"
                        onClick={dismiss}
                    >
                        Verstanden
                    </Button>
                </div>
            </div>
        </div>
    );
}
