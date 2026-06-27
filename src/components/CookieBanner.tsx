import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck } from 'lucide-react';

export function CookieBanner() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            const timer = setTimeout(() => setShow(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem('cookie_consent', 'accepted');
        setShow(false);
    };

    const decline = () => {
        localStorage.setItem('cookie_consent', 'essential_only');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] animate-in slide-in-from-bottom-5 duration-500">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row gap-4 items-start border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5 w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                        <Cookie size={20} className="text-primary-hover" />
                    </div>
                    <div className="flex-1 text-sm">
                        <p className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                            <ShieldCheck size={15} className="text-green-500" /> Datenschutz & Cookies
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                            Wir verwenden ausschließlich <strong>technisch notwendige Cookies</strong> für deine Anmeldung und App-Einstellungen (z.B. Dark Mode). Es findet kein Tracking durch Drittanbieter statt. Mehr dazu in unserer{' '}
                            <Link to="/datenschutz" className="underline font-semibold hover:text-primary-hover" onClick={decline}>
                                Datenschutzerklärung
                            </Link>.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 sm:flex-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs rounded-full"
                        onClick={decline}
                    >
                        Nur Notwendige
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 sm:flex-none font-bold shadow-lg text-xs rounded-full"
                        onClick={accept}
                    >
                        Verstanden ✓
                    </Button>
                </div>
            </div>
        </div>
    );
}
