import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

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

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [show, setShow] = useState(false);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        if (isStandalone() || isDismissed()) return;

        const ios = isIOS();
        setIos(ios);

        if (ios) {
            // Show iOS instructions after 3s
            const timer = setTimeout(() => setShow(true), 3000);
            return () => clearTimeout(timer);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            const timer = setTimeout(() => setShow(true), 3000);
            return () => clearTimeout(timer);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

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
            <div className="md:hidden fixed bottom-24 left-4 right-4 z-[200] animate-in slide-in-from-bottom-4 duration-300">
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 p-5">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            N
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                Nachhilfebörse als App installieren
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                Tippe auf den{' '}
                                <span className="inline-flex items-center gap-1 font-medium text-primary">
                                    <Share size={12} /> Teilen-Button
                                </span>{' '}
                                und dann <strong>"Zum Home-Bildschirm"</strong>
                            </p>
                        </div>
                    </div>

                    {/* Arrow pointing down towards Safari bar */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 dark:bg-gray-900/80 rotate-45 backdrop-blur-xl ring-1 ring-black/10 dark:ring-white/10 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
                </div>
            </div>
        );
    }

    // ── Mobile bottom sheet ───────────────────────────────────────
    const MobileSheet = () => (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[200] animate-in slide-in-from-bottom-full duration-400">
            <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-2xl rounded-t-[2rem] shadow-2xl ring-1 ring-black/10 dark:ring-white/10 px-6 pt-5 pb-8">
                {/* Drag handle */}
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />

                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                        N
                    </div>
                    <div>
                        <p className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                            Nachhilfebörse als App installieren
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            Schneller Zugriff, Offline-Funktionen, Push-Benachrichtigungen
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 mt-5">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Später
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-[2] py-3 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        <Download size={16} />
                        Installieren
                    </button>
                </div>
            </div>
        </div>
    );

    // ── Desktop top banner ────────────────────────────────────────
    const DesktopBanner = () => (
        <div className="hidden md:block fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300 max-w-lg w-full px-4">
            <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-2xl rounded-2xl shadow-xl ring-1 ring-black/10 dark:ring-white/10 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow">
                    N
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        Nachhilfebörse als App installieren
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Schneller Zugriff &amp; Offline-Funktionen
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleInstall}
                        className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                        <Download size={13} /> Installieren
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <MobileSheet />
            <DesktopBanner />
        </>
    );
}
