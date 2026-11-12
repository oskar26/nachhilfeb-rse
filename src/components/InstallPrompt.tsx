import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Logo } from './ui/Logo';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

const DISMISSED_KEY = 'installPromptDismissed';
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isDismissed(): boolean {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (!raw) return false;
        const ts = parseInt(raw, 10);
        return Date.now() - ts < DISMISS_DURATION_MS;
    } catch {
        return false;
    }
}

    // beforeinstallprompt kann feuern, bevor die Komponente gemountet ist (z. B. vor dem Login).
    // Deshalb das Event auf Modulebene puffern und an aktive Abonnenten weiterreichen.
    let earlyInstallPrompt: BeforeInstallPromptEvent | null = null;
    const installPromptSubscribers = new Set<(e: BeforeInstallPromptEvent) => void>();

    if (typeof window !== 'undefined') {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            if (installPromptSubscribers.size === 0) {
                earlyInstallPrompt = promptEvent;
            } else {
                installPromptSubscribers.forEach((notify) => notify(promptEvent));
            }
        });
    }

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [show, setShow] = useState(false);
    const [ios] = useState(() => isIOS());

    useEffect(() => {
        if (isStandalone() || isDismissed()) return;

        if (ios) {
            // Show iOS instructions after 3s
            const timer = setTimeout(() => setShow(true), 3000);
            return () => clearTimeout(timer);
        }

        let timer: number | undefined;
        const receivePrompt = (e: BeforeInstallPromptEvent) => {
            setDeferredPrompt(e);
            timer = window.setTimeout(() => setShow(true), 3000);
        };

        installPromptSubscribers.add(receivePrompt);
        // Ein Event, das vor dem Mount eingetroffen ist (z. B. vor dem Login), jetzt nachziehen.
        if (earlyInstallPrompt) {
            const pending = earlyInstallPrompt;
            earlyInstallPrompt = null;
            receivePrompt(pending);
        }

        return () => {
            installPromptSubscribers.delete(receivePrompt);
            if (timer !== undefined) clearTimeout(timer);
        };
    }, [ios]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
            setShow(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        try {
            localStorage.setItem(DISMISSED_KEY, Date.now().toString());
        } catch { /* noop */ }
        setShow(false);
    };

    if (!show) return null;

    // ── iOS instructions ──────────────────────────────────────────
    if (ios) {
        return (
            <div className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-30 animate-in slide-in-from-bottom-4 duration-300 md:hidden">
                <div className="relative rounded-xl border border-border bg-card/95 p-5 shadow-overlay backdrop-blur-xl">
                    <Button variant="unstyled" size="unstyled" type="submit"
                        onClick={handleDismiss}
                        aria-label="Installationshinweis schließen"
                        className="absolute right-3 top-3 grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </Button>

                    <div className="flex items-start gap-4">
                        <Logo className="size-10 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                Nachhilfebörse als App installieren
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Tippe auf den{' '}
                                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                    <Share size={12} /> Teilen-Button
                                </span>{' '}
                                und dann <strong>"Zum Home-Bildschirm"</strong>
                            </p>
                        </div>
                    </div>

                    {/* Arrow pointing down towards Safari bar */}
                    <div className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b border-r border-border bg-card [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
                </div>
            </div>
        );
    }

    // ── Mobile bottom sheet (Render-Helper, keine Komponente: stabile Identität) ──
    const renderMobileSheet = () => (
        <div className="fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-30 animate-in slide-in-from-bottom-full duration-300 md:hidden">
            <div className="rounded-xl border border-border bg-card/95 px-5 pt-4 pb-5 shadow-overlay backdrop-blur-2xl">
                {/* Drag handle */}
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

                <div className="flex items-center gap-4 mb-4">
                    <Logo className="size-12 shrink-0 text-primary" />
                    <div>
                        <p className="text-base font-semibold leading-tight text-foreground">
                            Nachhilfebörse als App installieren
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            Schneller Zugriff, Offline-Funktionen, Benachrichtigungen
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 mt-5">
                    <Button variant="unstyled" size="unstyled" type="submit"
                        onClick={handleDismiss}
                        className="h-11 flex-1 rounded-lg border border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                        Später
                    </Button>
                    <Button variant="unstyled" size="unstyled" type="submit"
                        onClick={handleInstall}
                        className="h-11 flex-[2] gap-2 rounded-lg text-sm font-semibold"
                    >
                        <Download size={16} />
                        Installieren
                    </Button>
                </div>
            </div>
        </div>
    );

    // ── Desktop top banner (Render-Helper, keine Komponente: stabile Identität) ──
    const renderDesktopBanner = () => (
        <div className="fixed left-1/2 top-4 z-30 hidden w-full max-w-lg -translate-x-1/2 px-4 animate-in slide-in-from-top-4 duration-300 md:block">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card/95 p-4 shadow-overlay backdrop-blur-2xl">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
                    N
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                        Nachhilfebörse als App installieren
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        Schneller Zugriff &amp; Offline-Funktionen
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="unstyled" size="unstyled" type="submit"
                        onClick={handleInstall}
                        className="h-11 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                    >
                        <Download size={13} /> Installieren
                    </Button>
                    <Button variant="unstyled" size="unstyled" type="submit"
                        onClick={handleDismiss}
                        aria-label="Installationshinweis schließen"
                        className="grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {renderMobileSheet()}
            {renderDesktopBanner()}
        </>
    );
}
