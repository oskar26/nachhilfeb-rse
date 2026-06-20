import { useState, useEffect } from 'react';
import { Button } from './ui/Button';

export function CookieBanner() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            // Slight delay so it doesn't instantly jump
            const timer = setTimeout(() => setShow(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem('cookie_consent', 'accepted');
        setShow(false);
    };

    const decline = () => {
        // Just hide it, maybe disable tracking if we had any
        localStorage.setItem('cookie_consent', 'declined');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] animate-in slide-in-from-bottom-5 duration-500">
            <div className="max-w-4xl mx-auto bg-gray-900 dark:bg-gray-800 text-white p-5 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-6 items-center border border-gray-700">
                <div className="flex-1 text-sm text-gray-300">
                    <p className="font-bold text-white mb-1">🍪 Wir nutzen essentiell Cookies</p>
                    <p>
                        Die Nachhilfebörse verwendet Cookies (bzw. Local Storage) ausschließlich für essenzielle Funktionen, 
                        wie deine Sitzung (Login) und Layout-Einstellungen (Dark Mode). Es findet kein Tracking von Drittanbietern statt.
                    </p>
                </div>
                <div className="flex gap-3 shrink-0 w-full sm:w-auto">
                    <Button variant="ghost" className="flex-1 sm:flex-none text-gray-400 hover:text-white" onClick={decline}>Ablehnen</Button>
                    <Button className="flex-1 sm:flex-none font-bold shadow-lg" onClick={accept}>Alles klar</Button>
                </div>
            </div>
        </div>
    );
}
