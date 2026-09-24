import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { OtpInput } from '../components/ui/OtpInput';
import { Button } from '../components/ui/Button';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';

export default function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState((location.state as any)?.email || '');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const handleVerify = async (e?: React.FormEvent, codeOverride?: string) => {
        e?.preventDefault();
        if (codeOverride !== undefined) setCode(codeOverride);
        const rawCode = (codeOverride ?? code).trim();
        if (!email || rawCode.length !== 6) {
            setError('Bitte gib deine E-Mail-Adresse und den 6-stelligen Code ein.');
            return;
        }
        setIsLoading(true);
        setError(null);
        const res = await api.auth.verifyEmail(email.trim(), rawCode);
        setIsLoading(false);
        if (res.error) {
            const msg = res.error.message || '';
            const status = (res.error as any)?.status;
            if (status === 429) {
                setError('Zu viele Fehlversuche. Bitte fordere einen neuen Code an.');
            } else if (msg.includes('abgelaufen')) {
                setError('Der Code ist abgelaufen. Bitte fordere einen neuen Code an.');
            } else {
                setError('Der Code stimmt nicht. Bitte prüfe die E-Mail (auch Spam-Ordner).');
            }
            return;
        }
        toast.success('E-Mail bestätigt – willkommen bei der Nachhilfebörse!');
        navigate('/');
        window.location.reload();
    };

    const handleResend = async () => {
        if (!email || cooldown > 0) return;
        setIsLoading(true);
        const res = await api.auth.resendCode(email.trim());
        setIsLoading(false);
        if (res.error) {
            toast.error('Konnte keinen neuen Code senden: ' + (res.error.message || 'Fehler'));
            return;
        }
        setCooldown(60);
        toast.success('Neuer Code versendet! Prüfe dein Postfach (und Spam).');
    };

    return (
        <div className="w-full max-w-md mx-auto px-4 py-10">
            <Card>
                <CardContent className="p-6 space-y-5">
                    <div className="text-center space-y-2">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <MailCheck size={24} />
                        </div>
                        <h1 className="text-xl font-bold">E-Mail bestätigen</h1>
                        <p className="text-sm text-gray-500">
                            Wir haben dir einen <strong>6-stelligen Code</strong> per E-Mail geschickt.
                            Gib ihn hier ein, um dein Konto freizuschalten. Nichts im Postfach? Schau auch im <strong>Spam-Ordner</strong> nach.
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">E-Mail-Adresse</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="E-Mail-Adresse"
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Bestätigungs-Code</label>
                            <OtpInput
                                value={code}
                                onChange={setCode}
                                onComplete={value => handleVerify(undefined, value)}
                                numeric
                                autoFocus
                                ariaLabel="Bestätigungs-Code"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-3">
                                {error}
                            </p>
                        )}

                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? 'Wird geprüft…' : 'E-Mail bestätigen'}
                        </Button>
                    </form>

                    <div className="text-center text-sm">
                        <span className="text-gray-500">Kein Code angekommen? </span>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={isLoading || cooldown > 0 || !email}
                            className="font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
                        >
                            <RefreshCw size={14} />
                            {cooldown > 0 ? `Neuer Code in ${cooldown}s` : 'Neuen Code senden'}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 inline-flex items-center gap-1">
                            <ArrowLeft size={14} /> Zurück zum Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
