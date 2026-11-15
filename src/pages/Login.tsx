import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from '../components/ui/card';
import { toast } from 'sonner';
import { useTheme } from '../components/ThemeProvider';
import { Sun, Moon, CheckCircle, ShieldAlert, Users } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { DISTANCE, m, PAGE_ENTER } from '../lib/motion';
import { RefinedGradeSelector } from '../components/RefinedGradeSelector';
import { Logo } from '../components/ui/Logo';

const RATE_LIMIT_KEY = 'fwg_auth_attempts';
// Fairer Schutz vor Passwort-Raten: 8 Fehlversuche innerhalb von 10 Minuten
// führen zu einer kurzen 5-Minuten-Pause. Server-Fehler und noch nicht
// bestätigte E-Mails zählen bewusst NICHT mit (siehe handleAuth).
const MAX_ATTEMPTS = 8;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 Minuten
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 Minuten

interface RateLimitData {
    attempts: number;
    firstAttemptAt: number;
    blockedUntil: number;
}

// Sekunden freundlich anzeigen ("5 Minuten" statt "300 Sekunden")
function formatWaitTime(totalSeconds: number): string {
    if (totalSeconds < 60) return `${totalSeconds} Sekunden`;
    const minutes = Math.ceil(totalSeconds / 60);
    return minutes === 1 ? '1 Minute' : `${minutes} Minuten`;
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();
    const reduceMotion = useReducedMotion();
    const [isLoading, setIsLoading] = useState(false);
    // Registrierungs-CTAs der Landing verlinken auf /login?mode=register.
    const [mode, setMode] = useState<'login' | 'register'>(() =>
        new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login'
    );

    // Hält den Tab auch bei reinen Hash-Navigationen (z. B. Zurück/Vorwärts
    // zwischen /login und /login?mode=register) synchron.
    useEffect(() => {
        const requested = new URLSearchParams(location.search).get('mode');
        setMode(requested === 'register' ? 'register' : 'login');
        setError(null);
        setParentalPending(false);
    }, [location.search]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [location.pathname, location.search]);

    // General Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parentalPending, setParentalPending] = useState(false);

    // Registration Specific States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [grade, setGrade] = useState('');
    const [letter, setLetter] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [parentalConsent, setParentalConsent] = useState(false);
    const [parentEmail, setParentEmail] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    const calculateAge = (dob: string) => {
        if (!dob) return 18;
        const birth = new Date(dob);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const isUnder16 = mode === 'register' && birthDate !== '' && calculateAge(birthDate) < 16;

    // Rate Limiting State
    const [isBlocked, setIsBlocked] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    // Rate Limiting Logic
    useEffect(() => {
        const checkRateLimit = () => {
            const dataStr = localStorage.getItem(RATE_LIMIT_KEY);
            if (dataStr) {
                const data: RateLimitData = JSON.parse(dataStr);
                const now = Date.now();
                if (data.blockedUntil > now) {
                    setIsBlocked(true);
                    setTimeLeft(Math.ceil((data.blockedUntil - now) / 1000));
                } else {
                    setIsBlocked(false);
                }
            }
        };

        checkRateLimit();
        const interval = setInterval(() => {
            const dataStr = localStorage.getItem(RATE_LIMIT_KEY);
            if (dataStr) {
                const data: RateLimitData = JSON.parse(dataStr);
                const now = Date.now();
                if (data.blockedUntil > now) {
                    setTimeLeft(Math.ceil((data.blockedUntil - now) / 1000));
                } else {
                    setIsBlocked(false);
                    clearInterval(interval);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isBlocked]);

    const incrementAttempts = () => {
        const dataStr = localStorage.getItem(RATE_LIMIT_KEY);
        const now = Date.now();
        let data: RateLimitData = { attempts: 0, firstAttemptAt: now, blockedUntil: 0 };

        if (dataStr) {
            try {
                data = { firstAttemptAt: now, ...JSON.parse(dataStr) };
            } catch {
                // Kaputte Daten verwerfen und neu starten
            }
        }

        // Zählfenster abgelaufen? Dann neu starten (alte Vertipper verjähren).
        if (now - data.firstAttemptAt > ATTEMPT_WINDOW_MS) {
            data = { attempts: 0, firstAttemptAt: now, blockedUntil: 0 };
        }

        data.attempts += 1;
        if (data.attempts >= MAX_ATTEMPTS) {
            data.blockedUntil = now + COOLDOWN_MS;
            setIsBlocked(true);
        }

        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    };

    const clearAttempts = () => {
        localStorage.removeItem(RATE_LIMIT_KEY);
        setIsBlocked(false);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isBlocked) {
            return;
        }

        setParentalPending(false);

        if (mode === 'register' && !acceptedTerms) {
            setError("Bitte stimme den Nutzungsbedingungen zu.");
            return;
        }

        if (mode === 'register') {
            if (!firstName || !lastName || !birthDate) {
                setError("Bitte fülle alle Pflichtfelder (Vorname, Nachname, Geburtsdatum) aus.");
                return;
            }
            if (isUnder16) {
                if (!parentalConsent) {
                    setError("Bitte bestätige, dass du mit deinen Erziehungsberechtigten über die Nutzung gesprochen hast.");
                    return;
                }
                if (parentEmail.trim() !== '' && !isValidEmail(parentEmail)) {
                    setError("Bitte gib eine gültige E-Mail-Adresse eines Erziehungsberechtigten an.");
                    return;
                }
            }
        }

        setIsLoading(true);
        setError(null);

        if (mode === 'login') {
            const { error } = await api.auth.login({
                email,
                password,
            });

            if (error) {
                console.error('Login Fehler:', error);
                const msg = error.message || '';
                const code = (error as any)?.details?.code || (error as any)?.code || '';
                if (code === 'parental_consent_pending' || msg.includes('Elternteil') || msg.includes('Erziehungsberechtigte')) {
                    // Kein Fehlversuch: Die Zugangsdaten sind korrekt, es fehlt
                    // nur die Bestätigung eines Elternteils. Daher nicht zählen.
                    setParentalPending(true);
                    setError(null);
                } else if (code === 'email_not_verified' || msg.includes("E-Mail-Adresse ist noch nicht bestätigt")) {
                    toast("Deine E-Mail ist noch nicht bestätigt. Bitte gib den Code aus der E-Mail ein.");
                    navigate('/verify-email', { state: { email } });
                } else if (error.status === 401 || msg.includes("Invalid login credentials") || msg.includes("Ungültige Zugangsdaten")) {
                    // Nur echte Fehlversuche (falsches Passwort) zählen — keine
                    // Server-Fehler und keine noch unbestätigten E-Mails.
                    incrementAttempts();
                    setError("Ungültige Zugangsdaten. E-Mail oder Passwort falsch.");
                } else {
                    setError("Beim Login ist ein unerwarteter Fehler aufgetreten: " + msg);
                }
            } else {
                clearAttempts();
                // Ersatz für das frühere Auth-EVENT 'SIGNED_IN': AuthContext lädt die Session neu.
                window.dispatchEvent(new Event('fwg:auth-changed'));
                navigate('/');
            }
        } else {
            // Register Mode
            if (password.length < 8) {
                setError("Dein Passwort muss mindestens 8 Zeichen haben.");
                setIsLoading(false);
                return;
            }

            // Optional: If invite code is provided, verify it first before registering
            if (inviteCode.trim()) {
                const { data: checkData, error: codeErr } = await api.codes.check(inviteCode.trim());
                // Shim-Mapping (check_invite_code): gültig nur bei {valid:true} ohne Fehler.
                const isValidCode = !codeErr && checkData?.valid === true;

                if (codeErr || !isValidCode) {
                    setError("Ungültiger oder abgelaufener Code.");
                    setIsLoading(false);
                    return;
                }
            }

            // 1. Registrierung über das native Backend
            const displayName = `${firstName} ${lastName.charAt(0)}.`;
            const { data: registerData, error: signUpErr } = await api.auth.register({
                email,
                password,
                firstName,
                lastName,
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                role: 'student',
                grade: grade || null,
                letter: letter || null,
                birthDate,
                parentalConsent: isUnder16 ? parentalConsent : true,
                parentEmail: isUnder16 ? parentEmail.trim() : null,
                inviteCode: inviteCode.trim(),
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        full_name: `${firstName} ${lastName}`,
                        role: 'student',
                        grade: grade || null,
                        letter: letter || null,
                        birthDate,
                        inviteCode: inviteCode.trim()
                    }
                }
            });

            if (signUpErr) {
                console.error('Registrierung Fehler:', signUpErr);
                if (signUpErr.message.includes("already registered") || signUpErr.message.includes("already been registered")) {
                    toast.error("Diese E-Mail ist bereits registriert. Melde dich an.");
                } else {
                    toast.error("Registrierungsfehler: " + signUpErr.message);
                }
                setIsLoading(false);
                return;
            }

            // Ergebnis auf die frühere Shim-Form bringen ({ user, session, mailSent, needsVerification }).
            const signUpData: any = {
                user: registerData?.user ?? null,
                session: registerData?.token ? { access_token: registerData.token, user: registerData.user } : null,
                mailSent: registerData?.mail_sent !== false,
                needsVerification: registerData?.needs_verification === true
            };
            if (signUpData.session) {
                // Ersatz für das frühere Auth-EVENT 'SIGNED_IN'.
                window.dispatchEvent(new Event('fwg:auth-changed'));
            }

            const newUser = signUpData.user;
            // Neuer Flow: E-Mail-Verifizierung per Code (Backend liefert needs_verification, kein Token)
            if ((signUpData as any).needsVerification && newUser) {
                if ((signUpData as any).mailSent === false) {
                    toast("Achtung: Die Bestätigungs-E-Mail konnte nicht versendet werden. Prüfe deinen Spam-Ordner oder melde dich bei info@nachhilfe-sv.de.", { duration: 8000 });
                } else {
                    toast.success("Konto erstellt. Wir haben dir einen Bestätigungs-Code per E-Mail geschickt.");
                }
                navigate('/verify-email', { state: { email } });
                setIsLoading(false);
                return;
            }
            if (newUser) {
                // 2. Update profile with custom registration fields
                const { error: profileErr } = await api.profiles.update({
                    first_name: firstName,
                    last_name: lastName,
                    display_name: displayName,
                    grade_level: grade || null,
                    class_letter: letter || null,
                    birth_date: birthDate,
                    onboarding_complete: true // Set to true since we fill it here
                }, newUser.id);

                if (profileErr) {
                    console.error('Fehler beim Aktualisieren des Profils:', profileErr);
                }

                // 3. Redeem SV Code if provided
                if (inviteCode.trim()) {
                    const { data: redeemData, error: redeemErr } = await api.codes.redeem(inviteCode.trim());
                    // Shim-Mapping (redeem_invite_code): Fehler → 'invalid', sonst Rolle (Fallback 'student').
                    const redeemResult = redeemErr ? 'invalid' : (redeemData?.role || 'student');

                    if (redeemErr || redeemResult === 'invalid') {
                        toast.error("Konto erstellt, aber der Code konnte nicht eingelöst werden. Bitte wende dich an die SV.");
                    } else {
                        toast.success(`Code eingelöst. Dein Konto wurde als '${redeemResult}' freigeschaltet.`);
                    }
                }

                if (!signUpData.session) {
                    toast.success("Konto erstellt. Bitte bestätige deine E-Mail-Adresse.");
                    setMode('login');
                } else {
                    toast.success("Konto erstellt.");
                    if ((signUpData as any).mailSent === false) {
                        toast("Hinweis: Die Willkommens-E-Mail konnte nicht versendet werden. Falls du keine E-Mails erhältst, melde dich bei info@nachhilfe-sv.de.", { duration: 8000 });
                    }
                    navigate('/');
                }
            } else {
                toast.error("Es konnte kein Benutzer erstellt werden.");
            }
        }
        setIsLoading(false);
    };

    const handleResetPassword = async () => {
        if (!email) {
            toast.error("Bitte gib deine E-Mail-Adresse ein, um das Passwort zurückzusetzen.");
            return;
        }
        setIsLoading(true);
        const { error } = await api.auth.resetPasswordRequest(email);
        if (error) {
            toast.error("Fehler: " + error.message);
        } else {
            toast.success("E-Mail zum Zurücksetzen des Passworts wurde gesendet.");
        }
        setIsLoading(false);
    };

    const credentialError = Boolean(error && /E-Mail|Passwort|Zugangsdaten/i.test(error));
    const cardAnim = reduceMotion ? {} : {
        initial: { opacity: 0, y: DISTANCE.enter },
        animate: { opacity: 1, y: 0 },
        transition: PAGE_ENTER,
    };

    return (
        <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground lg:flex-row">
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-50 h-11 w-11 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'}
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {/* Left Side - Branding (Hidden on Mobile) */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-muted p-12 text-foreground lg:flex">
                <div className="relative z-10">
                    <m.div
                        {...(reduceMotion ? {} : { initial: { opacity: 0, y: DISTANCE.enter }, animate: { opacity: 1, y: 0 } })}
                        className="flex items-center gap-3.5 text-3xl font-semibold tracking-tight"
                    >
                        <Logo className="h-12 w-12 shrink-0 text-primary" />
                        Nachhilfebörse
                    </m.div>
                </div>

                <div className="relative z-10 max-w-[95ch]">
                    <m.h1
                        {...(reduceMotion ? {} : { initial: { opacity: 0, y: DISTANCE.enter }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 } })}
                        className="mb-6 text-balance text-5xl font-semibold leading-tight"
                    >
                        Nachhilfe am FWG.
                    </m.h1>
                    <m.p
                        {...(reduceMotion ? {} : { initial: { opacity: 0, y: DISTANCE.enter }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2 } })}
                        className="mb-8 text-lg font-normal leading-relaxed text-muted-foreground"
                    >
                        Finde Nachhilfe oder biete dein Wissen an. Für Schülerinnen und Schüler des Friedrich-Wilhelm-Gymnasiums. Eltern nutzen das Konto ihres Kindes mit.
                    </m.p>

                    <m.div
                        {...(reduceMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.3 } })}
                        className="space-y-3"
                    >
                        <div className="flex items-center gap-3 font-medium">
                            <CheckCircle size={20} className="shrink-0" aria-hidden /> Von der SV organisiert
                        </div>
                        <div className="flex items-center gap-3 font-medium">
                            <CheckCircle size={20} className="shrink-0" aria-hidden /> Verifizierte Konten
                        </div>
                        <div className="flex items-center gap-3 font-medium">
                            <CheckCircle size={20} className="shrink-0" aria-hidden /> Von Schülern für Schüler
                        </div>
                    </m.div>
                </div>

                <div className="relative z-10 text-sm font-medium text-muted-foreground">
                    FWG Köln © {new Date().getFullYear()}
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="relative flex w-full items-center justify-center px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-8 sm:px-8 lg:w-1/2 lg:p-12">
                <m.div
                    {...cardAnim}
                    className="relative z-10 my-auto w-full max-w-md"
                >
                    <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                        <Logo className="mb-3 h-16 w-16 shrink-0 text-primary" />
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Nachhilfebörse</h1>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">Friedrich-Wilhelm-Gymnasium Köln</p>
                        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground" aria-label="Vertrauen auf einen Blick">
                            <li className="flex items-center gap-1.5"><CheckCircle size={16} className="shrink-0 text-muted-foreground" aria-hidden /> Von der SV organisiert</li>
                            <li className="flex items-center gap-1.5"><CheckCircle size={16} className="shrink-0 text-muted-foreground" aria-hidden /> Verifizierte Konten</li>
                            <li className="flex items-center gap-1.5"><CheckCircle size={16} className="shrink-0 text-muted-foreground" aria-hidden /> Nutzung kostenlos</li>
                        </ul>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="grid grid-cols-2 border-b border-border" role="group" aria-label="Anmeldung oder Registrierung">
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                aria-pressed={mode === 'login'}
                                className={`inline-flex min-h-12 items-center justify-center px-4 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                onClick={() => { setMode('login'); setError(null); setParentalPending(false); }}
                            >
                                Anmelden
                            </Button>
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                aria-pressed={mode === 'register'}
                                className={`inline-flex min-h-12 items-center justify-center border-l border-border px-4 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                onClick={() => { setMode('register'); setError(null); setParentalPending(false); }}
                            >
                                Registrieren
                            </Button>
                        </div>

                        <CardHeader className="gap-1 px-5 pb-4 pt-6 sm:px-6">
                            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                                {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
                            </h2>
                            <CardDescription>
                                {mode === 'login'
                                    ? 'Melde dich mit deinen Zugangsdaten an.'
                                    : 'Schritt 1 von 2. Danach bestätigst du deine E-Mail-Adresse.'}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-5 px-5 pb-6 pt-0 sm:px-6">
                            {isBlocked && (
                                <div role="alert" aria-live="assertive" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                    <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                                    <div>
                                        <p className="font-bold">Anmeldung vorübergehend gesperrt</p>
                                        <p>Bitte warte noch {formatWaitTime(timeLeft)}, bevor du es erneut versuchst.</p>
                                    </div>
                                </div>
                            )}

                            {parentalPending && (
                                <div role="status" aria-live="polite" className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                                    <ShieldAlert size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                                    <div>
                                        <p className="font-bold">Elternbestätigung steht noch aus</p>
                                        <p className="leading-relaxed">Deine E-Mail ist bestätigt. Ein Elternteil muss die Nutzung noch per E-Mail bestätigen. Bitte prüfe das Postfach deiner Eltern (auch Spam).</p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div role="alert" aria-live="assertive" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                    <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden /> <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-4" aria-busy={isLoading}>
                                {/* Invisible Honeypot Field for Anti-Spam */}
                                <Input
                                    type="text"
                                    name="website_hp_check"
                                    id="website_hp_check"
                                    className="hidden"
                                    tabIndex={-1}
                                    autoComplete="off"
                                />

                                {mode === 'register' && (
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-3">
                                            <Users size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                <strong className="text-foreground">Unsere Empfehlung:</strong> Sprich mit deinen Eltern über die Börse. In den Klassen 5 bis 7 empfehlen wir, das Konto gemeinsam zu betreuen. Ältere Schülerinnen und Schüler nutzen es meist selbstständig. Mehr im{' '}
                                                <Link to="/eltern-leitfaden" className="font-medium text-foreground underline underline-offset-2" target="_blank">Eltern-Leitfaden</Link>.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="first-name" className="text-sm font-medium text-foreground">Vorname *</Label>
                                                <Input
                                                    id="first-name"
                                                    name="given-name"
                                                    autoComplete="given-name"
                                                    placeholder="Max"
                                                    value={firstName}
                                                    onChange={e => setFirstName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="last-name" className="text-sm font-medium text-foreground">Nachname *</Label>
                                                <Input
                                                    id="last-name"
                                                    name="family-name"
                                                    autoComplete="family-name"
                                                    placeholder="Mustermann"
                                                    value={lastName}
                                                    onChange={e => setLastName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium text-foreground">Klasse/Stufe</Label>
                                            <RefinedGradeSelector
                                                grade={grade}
                                                letter={letter}
                                                onChange={(g, l) => { setGrade(g); setLetter(l); }}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="birth-date" className="text-sm font-medium text-foreground">Geburtsdatum *</Label>
                                            <Input
                                                id="birth-date"
                                                name="bday"
                                                autoComplete="bday"
                                                type="date"
                                                value={birthDate}
                                                onChange={e => setBirthDate(e.target.value)}
                                                required
                                            />
                                        </div>

                                        {isUnder16 && (
                                            <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
                                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                                    <ShieldAlert size={16} className="shrink-0 text-muted-foreground" aria-hidden /> Hinweis für Nutzer unter 16 Jahren (Art. 8 DSGVO)
                                                </div>
                                                <p className="text-xs leading-relaxed text-muted-foreground">
                                                    Da du unter 16 Jahre alt bist, brauchen wir die Zustimmung deiner Erziehungsberechtigten. Sprich die Anmeldung mit ihnen durch und zeig ihnen gern den <Link to="/eltern-leitfaden" className="font-medium text-foreground underline underline-offset-2" target="_blank">Eltern-Leitfaden</Link>.
                                                </p>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="parent-email" className="text-sm font-medium text-foreground">E-Mail eines Erziehungsberechtigten <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                                    <Input
                                                        id="parent-email"
                                                        name="parent-email"
                                                        type="email"
                                                        autoComplete="email"
                                                        placeholder="eltern@example.com"
                                                        value={parentEmail}
                                                        onChange={e => setParentEmail(e.target.value)}
                                                        aria-describedby="parent-email-hint"
                                                    />
                                                    <p id="parent-email-hint" className="text-xs leading-relaxed text-muted-foreground">
                                                        Wir schicken einen Bestätigungslink an diese Adresse. Ohne die Bestätigung kann das Konto nicht genutzt werden. Leer lassen, wenn die Konto-E-Mail-Adresse der Eltern genutzt wird.
                                                    </p>
                                                </div>
                                                <div className="flex items-start gap-2.5 pt-1">
                                                    <Checkbox
                                                        id="parentalConsent"
                                                        checked={parentalConsent}
                                                        onCheckedChange={(checked) => setParentalConsent(checked === true)}
                                                        className="mt-0.5 cursor-pointer"
                                                    />
                                                    <Label htmlFor="parentalConsent" className="cursor-pointer text-xs font-medium leading-relaxed text-foreground">
                                                        Ich habe mit meinen Erziehungsberechtigten über die Nutzung gesprochen. Sie bestätigen die Einwilligung per E-Mail. *
                                                    </Label>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label htmlFor="invite-code" className="text-sm font-medium text-foreground">
                                                Code <span className="font-normal text-muted-foreground">(optional)</span>
                                            </Label>
                                            <Input
                                                id="invite-code"
                                                name="invite-code"
                                                placeholder="SV-XXXX-XXXX-XXXX"
                                                value={inviteCode}
                                                onChange={e => setInviteCode(e.target.value)}
                                                aria-describedby="sv-code-hint"
                                            />
                                            <p id="sv-code-hint" className="text-xs leading-snug text-muted-foreground">
                                                Verifizierung im SV-Raum. Das SV-Team prüft, ob du das FWG besuchst.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="login-email" className="text-sm font-medium text-foreground">E-Mail-Adresse</Label>
                                    <Input
                                        id="login-email"
                                        name="email"
                                        autoComplete="email"
                                        type="email"
                                        placeholder="E-Mail-Adresse"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        aria-invalid={credentialError || undefined}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Passwort</Label>
                                        {mode === 'login' && (
                                            <Button variant="unstyled" size="unstyled" type="button" onClick={handleResetPassword} className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">Passwort vergessen?</Button>
                                        )}
                                    </div>
                                    <Input
                                        id="login-password"
                                        name="password"
                                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        aria-invalid={credentialError || undefined}
                                    />
                                </div>

                                {mode === 'register' && (
                                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-3">
                                        <Checkbox
                                            id="terms"
                                            checked={acceptedTerms}
                                            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                                            className="mt-0.5 cursor-pointer"
                                        />
                                        <Label htmlFor="terms" className="cursor-pointer text-xs leading-relaxed text-muted-foreground">
                                            Ich stimme den <Link to="/nutzungsbedingungen" className="font-medium text-foreground underline underline-offset-2" target="_blank">Nutzungsbedingungen</Link> und der <Link to="/datenschutz" className="font-medium text-foreground underline underline-offset-2" target="_blank">Datenschutzerklärung</Link> zu.
                                        </Label>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="mt-6 h-12 w-full text-base font-medium"
                                    disabled={isLoading || isBlocked}
                                    isLoading={isLoading}
                                >
                                    {isLoading ? 'Bitte warten...' : (mode === 'login' ? 'Anmelden' : 'Konto erstellen')}
                                </Button>
                            </form>
                        </CardContent>
                        {mode === 'register' && (
                            <CardFooter className="mt-6 flex flex-col border-t border-border bg-muted/50 px-5 py-4 sm:px-6">
                                <p className="inline-flex w-full items-start justify-center gap-1.5 text-center text-xs font-semibold leading-relaxed text-muted-foreground">
                                    <ShieldAlert size={16} className="mt-px shrink-0" aria-hidden /> <span><strong className="text-foreground">Hinweis:</strong> Neue Konten werden im SV-Raum verifiziert, bevor Anzeigen erstellt werden können.</span>
                                </p>
                            </CardFooter>
                        )}
                    </Card>
                </m.div>
            </div>
        </div>
    );
}
