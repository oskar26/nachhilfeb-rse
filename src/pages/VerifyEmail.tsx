import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { Button } from '../components/ui/button';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';

export default function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState((location.state as any)?.email || '');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parentalPending, setParentalPending] = useState(false);
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

        if (res.data?.parental_consent_pending === true) {
            // E-Mail ist bestätigt, aber die Elternbestätigung fehlt noch.
            // Kein Token, daher weder navigieren noch die Seite neu laden.
            setParentalPending(true);
            setError(null);
            toast.success('E-Mail bestätigt. Elternbestätigung steht noch aus.');
            return;
        }

        if (res.data?.token) {
            toast.success('E-Mail bestätigt – willkommen bei der Nachhilfebörse!');
            navigate('/');
            window.location.reload();
            return;
        }

        setError('Die Bestätigung konnte nicht abgeschlossen werden. Bitte fordere einen neuen Code an und versuche es erneut.');
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
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-foreground">
            <div className="w-full max-w-md">
                <Card className="border-border bg-card">
                    <CardContent className="space-y-6 p-5 sm:p-6">
                        {parentalPending ? (
                            <div className="space-y-5 text-center">
                                <div className="mx-auto grid size-14 place-items-center rounded-xl bg-muted text-foreground">
                                    <MailCheck size={26} aria-hidden />
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-xl font-semibold text-foreground">E-Mail bestätigt</h1>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        Deine E-Mail-Adresse ist bestätigt. Ein Elternteil muss die Nutzung jetzt noch über den Link in der E-Mail bestätigen. Danach kannst du dich anmelden.
                                    </p>
                                </div>
                                <Button type="button" onClick={() => navigate('/login')} className="w-full">
                                    Zum Login
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2 text-center">
                                    <div className="mx-auto grid size-14 place-items-center rounded-xl bg-muted text-foreground">
                                        <MailCheck size={26} aria-hidden />
                                    </div>
                                    <h1 className="text-xl font-semibold text-foreground">E-Mail bestätigen</h1>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        Wir haben dir einen <strong className="text-foreground">6-stelligen Code</strong> per E-Mail geschickt.
                                        Gib ihn hier ein, um dein Konto freizuschalten. Nichts im Postfach? Schau auch im <strong className="text-foreground">Spam-Ordner</strong> nach.
                                    </p>
                                </div>

                                <form onSubmit={handleVerify} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="verify-email" className="text-sm font-medium">E-Mail-Adresse</Label>
                                        <Input
                                            id="verify-email"
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="E-Mail-Adresse"
                                            autoComplete="email"
                                            aria-invalid={Boolean(error)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Bestätigungs-Code</Label>
                                        <InputOTP
                                            maxLength={6}
                                            value={code}
                                            onChange={value => setCode(value.toUpperCase())}
                                            onComplete={value => handleVerify(undefined, value)}
                                            pattern="[0-9]*"
                                            inputMode="numeric"
                                            autoFocus
                                            aria-label="Bestätigungs-Code"
                                            aria-invalid={Boolean(error)}
                                        >
                                            <InputOTPGroup className="w-full justify-between gap-1.5 sm:justify-start sm:gap-2">
                                                {Array.from({ length: 6 }).map((_, index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-14 min-w-0 flex-1 border-2 border-input text-lg font-semibold sm:w-12 sm:flex-none"
                                                    />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>

                                    {error && (
                                        <p className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                                            {error}
                                        </p>
                                    )}

                                    <Button type="submit" disabled={isLoading} isLoading={isLoading} className="w-full">
                                        E-Mail bestätigen
                                    </Button>
                                </form>

                                <div className="text-center text-sm">
                                    <span className="text-muted-foreground">Kein Code angekommen? </span>
                                    <Button variant="unstyled" size="unstyled"
                                        type="button"
                                        onClick={handleResend}
                                        disabled={isLoading || cooldown > 0 || !email}
                                        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} aria-hidden />
                                        {cooldown > 0 ? `Neuer Code in ${cooldown}s` : 'Neuen Code senden'}
                                    </Button>
                                </div>

                                <div className="border-t border-border pt-4 text-center">
                                    <Link to="/login" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                                        <ArrowLeft size={14} aria-hidden /> Zurück zum Login
                                    </Link>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
