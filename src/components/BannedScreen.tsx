import { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, MessageCircle, Clock, AlertTriangle } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

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
                setCountdown('Sperre abgelaufen – bitte lade die Seite neu.');
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('support_tickets').insert({
                user_id: user.id,
                type: 'support',
                title: 'Einspruch gegen Account-Sperre',
                description: `Nutzer ${user.email} legt Einspruch gegen seine Sperre ein.\nGrund der Sperre: ${banReason || 'Nicht angegeben'}\nTyp: ${banType || 'unbekannt'}`,
                device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            });

            toast.success('Einspruch wurde eingereicht. Ein Admin wird sich melden.');
        } catch (err) {
            toast.error('Fehler beim Einreichen. Bitte versuche es später erneut.');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-red-950 via-gray-950 to-gray-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Logo */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center border border-red-500/30">
                        <ShieldAlert size={42} className="text-red-400" />
                    </div>
                </div>

                {/* Title */}
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                        Account gesperrt
                    </h1>
                    <p className="text-red-300/80 text-sm font-medium">
                        Dein Zugang zur FWG Nachhilfebörse wurde von der SV eingeschränkt.
                    </p>
                </div>

                {/* Reason Card */}
                <div className="bg-red-900/30 border border-red-800/40 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-red-300 uppercase tracking-wider">Grund der Sperre</p>
                            <p className="text-sm text-red-200/90 font-medium leading-relaxed">
                                {banReason || 'Kein spezifischer Grund angegeben. Bitte kontaktiere die SV.'}
                            </p>
                        </div>
                    </div>

                    {/* Ban Type & Duration */}
                    <div className="flex items-center gap-3 pt-2 border-t border-red-800/30">
                        <Clock size={16} className="text-red-400 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-red-300 uppercase tracking-wider">
                                {banType === 'temporary' ? 'Temporäre Sperre' : 'Permanente Sperre'}
                            </p>
                            {banType === 'temporary' && bannedUntil ? (
                                <div className="space-y-0.5">
                                    <p className="text-xs text-red-200/70">
                                        Bis: {new Date(bannedUntil).toLocaleString('de-DE', { 
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit' 
                                        })} Uhr
                                    </p>
                                    <p className="text-sm font-mono text-red-200 font-bold">
                                        ⏱ {countdown}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-red-200/70">
                                    Diese Sperre hat kein automatisches Ablaufdatum.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                    <button
                        onClick={handleSupportRequest}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                    >
                        <MessageCircle size={16} />
                        Einspruch einlegen / Support kontaktieren
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-600/30 hover:bg-red-600/40 text-red-200 border border-red-600/30 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                    >
                        <LogOut size={16} />
                        Abmelden
                    </button>
                </div>

                {/* Footer */}
                <div className="pt-4 flex items-center justify-center gap-2">
                    <Logo className="w-5 h-5 text-red-400/50" />
                    <p className="text-[11px] text-red-400/50 font-medium">
                        Nachhilfebörse FWG Köln · SV Administration
                    </p>
                </div>
            </div>
        </div>
    );
}
