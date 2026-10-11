import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

// Seiten, die auch ohne Verifizierung erreichbar bleiben:
// Profil & Einstellungen enthalten die nötigen Schritte/Infos.
const STUDENT_ALLOWED = ['/profile', '/settings'];

type Gate = 'unverified';

const GATE_CONTENT: Record<Gate, {
    icon: typeof ShieldCheck;
    title: string;
    text: string;
    cta: string;
    target: string;
}> = {
    unverified: {
        icon: ShieldCheck,
        title: 'Verifizierung erforderlich',
        text: 'Du musst dich erst verifizieren, um Anzeigen zu durchsuchen, Anfragen zu senden oder zu chatten. Die Verifizierung erfolgt persönlich im SV-Raum.',
        cta: 'Zum Profil',
        target: '/profile',
    },
};

/**
 * AccessGuard (D5): zentrale Zugriffs-Weiche innerhalb der App-Shell.
 * Verifizierte Nutzer sehen alle Seiten; alle anderen bekommen eine klare
 * Gate-Karte statt stiller Fehler (das Backend prüft parallel mit
 * require_verified() und liefert 403-Codes).
 */
export default function AccessGuard({ children }: { children: React.ReactNode }) {
    const { profile, isVerified, isAdmin, isCoachAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [deniedCode, setDeniedCode] = useState<Gate | null>(null);

    // Belt-and-Braces: Antwortet das Backend mit 403 (not_verified),
    // obwohl der Client-State noch „ok“ sagt, greift das Gate trotzdem (Event aus api.ts).
    useEffect(() => {
        const onDenied = (event: Event) => {
            const code = (event as CustomEvent<{ code?: string }>).detail?.code;
            if (code === 'not_verified') setDeniedCode('unverified');
        };
        window.addEventListener('fwg:access-denied', onDenied);
        return () => window.removeEventListener('fwg:access-denied', onDenied);
    }, []);

    // Gate freigeben, sobald der serverseitige Zustand passt (nach Verifizierung).
    useEffect(() => {
        if (deniedCode === 'unverified' && isVerified) setDeniedCode(null);
    }, [deniedCode, isVerified]);

    const isStaff = isAdmin || isCoachAdmin;
    const gate: Gate | null = isStaff || !profile
        ? null
        : (isVerified ? null : 'unverified');
    const activeGate = deniedCode || gate;

    if (activeGate) {
        const allowed = STUDENT_ALLOWED;
        if (allowed.some(p => location.pathname.startsWith(p))) {
            return <>{children}</>;
        }

        const content = GATE_CONTENT[activeGate];
        const Icon = content.icon;
        return (
            <div
                role="alert"
                className="flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8 mx-auto max-w-xl"
            >
                <div className="w-20 h-20 mb-6 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                    <Icon size={36} className="text-amber-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">{content.title}</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">{content.text}</p>
                <Button onClick={() => navigate(content.target)} className="rounded-full shadow-md">
                    {content.cta}
                </Button>
            </div>
        );
    }

    return <>{children}</>;
}
