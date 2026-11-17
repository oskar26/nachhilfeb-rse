import { useState, useEffect } from 'react';
import { Button } from './ui/button';
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
        <div
            role="region"
            aria-label="Datenschutzhinweis"
            className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-40 animate-in slide-in-from-bottom-5 px-4 duration-500 md:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        >
            <div className="mx-auto flex max-h-[calc(100dvh-9rem)] max-w-3xl flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card p-4 text-card-foreground shadow-overlay sm:flex-row sm:items-start sm:gap-4 sm:p-5">
                <div className="flex flex-1 items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Cookie size={20} className="text-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="mb-1 flex items-center gap-2 font-bold text-foreground">
                            <ShieldCheck size={16} className="text-foreground" aria-hidden="true" /> Datenschutz und Cookies
                        </p>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                            Wir speichern <strong className="text-foreground">ausschließlich technisch Notwendiges</strong> im Browser (Anmeldung, Einstellungen wie Dark Mode). Optionale Kategorien gibt es nicht; eine Auswahl ist nicht nötig.
                            <span className="hidden sm:inline"> Zusätzlich zählen wir anonym ohne IP-Adresse, welche Seiten aufgerufen werden und welche „Beliebt“-Fächer in der Übersicht angetippt werden. Bei angemeldeten Konten wird die Konto-Kennung pseudonym mitgezählt.</span>{' '}
                            <strong className="text-foreground">Externe Anbieter setzen wir nicht ein.</strong> Mehr dazu in unserer{' '}
                            <Link to="/datenschutz" className="font-semibold text-foreground underline underline-offset-2 hover:no-underline">
                                Datenschutzerklärung
                            </Link>{' '}
                            und den <Link to="/cookies" className="font-semibold text-foreground underline underline-offset-2 hover:no-underline">Cookie-Hinweisen</Link>.
                        </p>
                    </div>
                </div>
                <div className="flex w-full shrink-0 sm:w-auto">
                    <Button
                        className="h-11 min-h-11 flex-1 rounded-full text-sm font-bold sm:flex-none"
                        onClick={dismiss}
                    >
                        Verstanden
                    </Button>
                </div>
            </div>
        </div>
    );
}
