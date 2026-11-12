import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, MessageCircle, Clock, AlertTriangle } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useAuth } from '../context/AuthContext';
import { api, getStoredUser } from '../lib/api';
import { toast } from 'sonner';

interface BannedScreenProps {
    banReason?: string | null;
    banType?: 'temporary' | 'permanent' | null;
    bannedUntil?: string | null;
}

export default function BannedScreen({ banReason, banType, bannedUntil }: BannedScreenProps) {
    const { signOut } = useAuth();
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        if (banType !== 'temporary' || !bannedUntil) return;

        const updateCountdown = () => {
            const now = new Date();
            const end = new Date(bannedUntil);
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                setCountdown('Die Sperre ist abgelaufen. Bitte lade die Seite neu.');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            const parts: string[] = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            parts.push(`${seconds}s`);

            setCountdown(parts.join(' '));
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [banType, bannedUntil]);

    const handleLogout = async () => {
        await signOut();
        window.location.hash = '#/welcome';
        window.location.reload();
    };

    const handleSupportRequest = async () => {
        try {
            const user = getStoredUser();
            if (!user) return;

            const payload = {
                user_id: user.id,
                type: 'support',
                title: 'Einspruch gegen Kontosperre',
                description: `Nutzer ${user.email} legt Einspruch gegen seine Sperre ein.\nGrund der Sperre: ${banReason || 'Nicht angegeben'}\nTyp: ${banType || 'unbekannt'}`,
                device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            };
            await api.support.createTicket(payload);

            toast.success('Einspruch wurde eingereicht. Ein Admin wird sich melden.');
        } catch {
            toast.error('Fehler beim Einreichen. Bitte versuche es später erneut.');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
            <div className="w-full max-w-md space-y-5 rounded-xl border border-destructive/25 bg-card p-5 text-center shadow-overlay sm:p-6">
                <div className="flex justify-center">
                    <div className="grid size-16 place-items-center rounded-xl bg-destructive/10 text-destructive">
                        <ShieldAlert size={34} aria-hidden />
                    </div>
                </div>

                <div>
                    <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
                        Konto gesperrt
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground">
                        Dein Zugang zur FWG Nachhilfebörse wurde von der SV eingeschränkt.
                    </p>
                </div>

                <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-destructive">Grund der Sperre</p>
                            <p className="text-sm font-medium leading-relaxed text-foreground/80">
                                {banReason || 'Kein spezifischer Grund angegeben. Bitte kontaktiere die SV.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-destructive/20 pt-3">
                        <Clock size={16} className="shrink-0 text-destructive" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold text-destructive">
                                {banType === 'temporary' ? 'Vorübergehende Sperre' : 'Permanente Sperre'}
                            </p>
                            {banType === 'temporary' && bannedUntil ? (
                                <div className="space-y-0.5">
                                    <p className="text-xs text-muted-foreground">
                                        Bis: {new Date(bannedUntil).toLocaleString('de-DE', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })} Uhr
                                    </p>
                                    <p className="font-sans text-sm font-semibold tabular-nums text-foreground">
                                        {countdown}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Diese Sperre hat kein automatisches Ablaufdatum.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <Button variant="outline" onClick={handleSupportRequest} className="h-11 w-full gap-2 rounded-lg text-sm font-semibold">
                        <MessageCircle size={16} aria-hidden />
                        Einspruch einlegen
                    </Button>

                    <Button variant="ghost" onClick={handleLogout} className="h-11 w-full gap-2 rounded-lg text-sm font-semibold text-destructive hover:bg-destructive/10">
                        <LogOut size={16} aria-hidden />
                        Abmelden
                    </Button>
                </div>

                <div className="flex items-center justify-center gap-2 border-t border-border pt-4">
                    <Logo className="size-5 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground">
                        Nachhilfebörse FWG Köln · SV Administration
                    </p>
                </div>
            </div>
        </div>
    );
}
