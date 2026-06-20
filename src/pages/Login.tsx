import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { toast } from 'react-hot-toast';
import { useTheme } from '../components/ThemeProvider';
import { Sun, Moon, GraduationCap, CheckCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefinedGradeSelector } from '../components/RefinedGradeSelector';

const RATE_LIMIT_KEY = 'fwg_auth_attempts';
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 15 * 60 * 1000; // 15 Minutes

interface RateLimitData {
    attempts: number;
    blockedUntil: number;
}

export default function Login() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'login' | 'register'>('login');

    // General Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Registration Specific States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [grade, setGrade] = useState('');
    const [letter, setLetter] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [inviteCode, setInviteCode] = useState('');

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
        let data: RateLimitData = { attempts: 0, blockedUntil: 0 };
        
        if (dataStr) {
            data = JSON.parse(dataStr);
        }

        data.attempts += 1;
        if (data.attempts >= MAX_ATTEMPTS) {
            data.blockedUntil = Date.now() + COOLDOWN_MS;
            setIsBlocked(true);
            toast.error("Zu viele Fehlversuche. Du wurdest für 15 Minuten gesperrt.");
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
            toast.error(`Bitte warte noch ${timeLeft} Sekunden.`);
            return;
        }
        
        if (mode === 'register' && !acceptedTerms) {
            toast.error("Bitte stimme den Nutzungsbedingungen zu.");
            return;
        }

        if (mode === 'register') {
            if (!firstName || !lastName || !birthDate) {
                toast.error("Bitte fülle alle Pflichtfelder (Name, Nachname, Geburtsdatum) aus.");
                return;
            }
        }

        setIsLoading(true);
        setError(null);

        if (mode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Login Fehler:', error);
                incrementAttempts();
                if (error.message.includes("Invalid login credentials")) {
                    setError("Ungültige Zugangsdaten. E-Mail oder Passwort falsch.");
                } else {
                    setError("Beim Login ist ein unerwarteter Fehler aufgetreten: " + error.message);
                }
            } else {
                clearAttempts();
                navigate('/');
            }
        } else {
            // Register Mode
            if (password.length < 8) {
                toast.error("Dein Passwort muss mindestens 8 Zeichen haben.");
                setIsLoading(false);
                return;
            }

            // Optional: If invite code is provided, verify it first before registering
            if (inviteCode.trim()) {
                const { data: codeCheck, error: codeErr } = await supabase
                    .from('invite_codes')
                    .select('*')
                    .eq('code', inviteCode.trim())
                    .eq('is_used', false)
                    .single();

                if (codeErr || !codeCheck) {
                    toast.error("Ungültiger oder abgelaufener SV-Code.");
                    setIsLoading(false);
                    return;
                }

                // Check expiry
                if (codeCheck.expires_at && new Date(codeCheck.expires_at) < new Date()) {
                    toast.error("Dieser SV-Code ist leider abgelaufen.");
                    setIsLoading(false);
                    return;
                }
            }

            // 1. Perform Supabase Sign Up
            const displayName = `${firstName} ${lastName.charAt(0)}.`;
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: `${firstName} ${lastName}`,
                    }
                }
            });

            if (signUpErr) {
                console.error('Registrierung Fehler:', signUpErr);
                if (signUpErr.message.includes("already registered") || signUpErr.message.includes("already been registered")) {
                    toast.error("Diese E-Mail ist bereits registriert. Versuche dich einzuloggen.");
                } else {
                    toast.error("Registrierungsfehler: " + signUpErr.message);
                }
                setIsLoading(false);
                return;
            }

            const newUser = signUpData.user;
            if (newUser) {
                // 2. Update profile with custom registration fields
                const { error: profileErr } = await supabase
                    .from('profiles')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        display_name: displayName,
                        grade_level: grade || null,
                        class_letter: letter || null,
                        birth_date: birthDate,
                        onboarding_complete: true // Set to true since we fill it here
                    })
                    .eq('id', newUser.id);

                if (profileErr) {
                    console.error('Fehler beim Aktualisieren des Profils:', profileErr);
                }

                // 3. Redeem SV Code if provided
                if (inviteCode.trim()) {
                    const { data: redeemResult, error: redeemErr } = await supabase.rpc('redeem_invite_code', {
                        code_val: inviteCode.trim(),
                        target_user_id: newUser.id
                    });

                    if (redeemErr || redeemResult === 'invalid') {
                        toast.error("Konto erstellt, aber der SV-Code konnte nicht eingelöst werden. Bitte wende dich an die SV.");
                    } else {
                        toast.success(`SV-Code erfolgreich eingelöst! Dein Account wurde als '${redeemResult}' freigeschaltet.`);
                    }
                }

                if (!signUpData.session) {
                    toast.success("Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
                    setMode('login');
                } else {
                    toast.success("Registrierung erfolgreich!");
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
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) {
            toast.error("Fehler: " + error.message);
        } else {
            toast.success("E-Mail zum Zurücksetzen des Passworts wurde gesendet!");
        }
        setIsLoading(false);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {/* Left Side - Branding (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-hover to-[#d4ff33] opacity-50" />
                
                {/* Decorative circles */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-black/10 blur-3xl" />

                <div className="relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 text-gray-900 font-bold text-2xl tracking-tight"
                    >
                        <div className="bg-gray-900 text-primary p-2 rounded-xl">
                            <GraduationCap size={28} />
                        </div>
                        Nachhilfebörse
                    </motion.div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-extrabold text-gray-900 leading-tight mb-6"
                    >
                        Gemeinsam lernen,<br />besser werden.
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-gray-800 font-medium mb-8"
                    >
                        Finde Nachhilfe oder biete dein Wissen an. Exklusiv für Schülerinnen, Schüler und Eltern des Friedrich-Wilhelms-Gymnasiums.
                    </motion.p>
                    
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center gap-3 text-gray-800 font-medium">
                            <CheckCircle size={20} className="text-gray-900" /> Von der SV organisiert
                        </div>
                        <div className="flex items-center gap-3 text-gray-800 font-medium">
                            <CheckCircle size={20} className="text-gray-900" /> Sicher und verifiziert
                        </div>
                        <div className="flex items-center gap-3 text-gray-800 font-medium">
                            <CheckCircle size={20} className="text-gray-900" /> Elternverknüpfung integriert
                        </div>
                    </motion.div>
                </div>
                
                <div className="relative z-10 text-sm font-bold text-gray-800">
                    FWG Köln © {new Date().getFullYear()}
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto max-h-screen">
                <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md my-auto relative z-10"
                >
                    <div className="lg:hidden flex flex-col items-center mb-6 text-center">
                        <div className="bg-primary text-gray-900 p-3 rounded-2xl mb-2 shadow-lg shadow-primary/20">
                            <GraduationCap size={32} />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Nachhilfebörse</h1>
                        <p className="text-gray-500 mt-1">Friedrich-Wilhelms-Gymnasium</p>
                    </div>

                    <Card className="border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 ring-1 ring-gray-200/50 dark:ring-gray-800/50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 overflow-hidden">
                        <div className="flex w-full border-b border-gray-100 dark:border-gray-800">
                            <button 
                                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'login' ? 'text-primary border-b-2 border-primary bg-primary/5 dark:bg-primary/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                onClick={() => { setMode('login'); setError(null); }}
                            >
                                Anmelden
                            </button>
                            <button 
                                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'register' ? 'text-primary border-b-2 border-primary bg-primary/5 dark:bg-primary/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                onClick={() => { setMode('register'); setError(null); }}
                            >
                                Registrieren
                            </button>
                        </div>

                        <CardHeader className="pt-6">
                            <CardTitle className="text-2xl">
                                {mode === 'login' ? 'Willkommen zurück' : 'Account erstellen'}
                            </CardTitle>
                            <CardDescription>
                                {mode === 'login' 
                                    ? 'Melde dich mit deinen Zugangsdaten an.' 
                                    : 'Fülle das Formular aus, um dich zu registrieren.'}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                            {isBlocked && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 flex items-start gap-2">
                                    <ShieldAlert size={16} className="mt-0.5" />
                                    <div>
                                        <p className="font-bold">Anmeldung vorübergehend gesperrt</p>
                                        <p>Bitte warte noch {timeLeft} Sekunden, bevor du es erneut versuchst.</p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 flex items-start gap-2">
                                    <span>⚠️</span> <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-4">
                                {mode === 'register' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Vorname *</label>
                                                <Input
                                                    placeholder="Max"
                                                    value={firstName}
                                                    onChange={e => setFirstName(e.target.value)}
                                                    required
                                                    className="h-10 rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nachname *</label>
                                                <Input
                                                    placeholder="Mustermann"
                                                    value={lastName}
                                                    onChange={e => setLastName(e.target.value)}
                                                    required
                                                    className="h-10 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1">Klasse/Stufe</label>
                                            <RefinedGradeSelector
                                                grade={grade}
                                                letter={letter}
                                                onChange={(g, l) => { setGrade(g); setLetter(l); }}
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1">Geburtsdatum *</label>
                                            <Input
                                                type="date"
                                                value={birthDate}
                                                onChange={e => setBirthDate(e.target.value)}
                                                required
                                                className="h-10 rounded-xl text-gray-700 dark:text-gray-300"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1 flex justify-between">
                                                <span>SV-Einmalcode</span>
                                                <span className="text-[10px] text-primary lowercase font-semibold">sofort verifiziert</span>
                                            </label>
                                            <Input
                                                placeholder="SV-XXXX-XXXX-XXXX"
                                                value={inviteCode}
                                                onChange={e => setInviteCode(e.target.value)}
                                                className="h-10 rounded-xl border-dashed"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">E-Mail Adresse</label>
                                    <Input
                                        type="email"
                                        placeholder="schueler@fwg.de"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-12 rounded-xl bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Passwort</label>
                                        {mode === 'login' && (
                                            <button type="button" onClick={handleResetPassword} className="text-xs text-primary font-bold hover:underline">Passwort vergessen?</button>
                                        )}
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-12 rounded-xl bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 transition-colors"
                                    />
                                </div>

                                {mode === 'register' && (
                                    <div className="flex items-start gap-3 mt-4 p-3 bg-gray-50 dark:bg-gray-950/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <input 
                                            type="checkbox" 
                                            id="terms" 
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            className="mt-1 w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                        />
                                        <label htmlFor="terms" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed">
                                            Ich stimme den <Link to="/nutzungsbedingungen" className="text-primary font-bold hover:underline" target="_blank">Nutzungsbedingungen</Link> und der <Link to="/datenschutz" className="text-primary font-bold hover:underline" target="_blank">Datenschutzerklärung</Link> zu.
                                        </label>
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    className="w-full h-12 rounded-xl font-bold text-[15px] mt-6 shadow-md shadow-primary/20" 
                                    disabled={isLoading || isBlocked}
                                >
                                    {isLoading ? 'Bitte warten...' : (mode === 'login' ? 'Einloggen' : 'Registrieren & Beitreten')}
                                </Button>
                            </form>
                        </CardContent>
                        {mode === 'register' && (
                            <CardFooter className="bg-gray-50 dark:bg-gray-900/50 py-4 px-6 mt-4 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-[11px] text-gray-500 text-center w-full leading-relaxed">
                                    Ohne SV-Code wird dein Account als "ausstehend" registriert und muss von einem SV-Mitglied vor Ort freigeschaltet werden.
                                </p>
                            </CardFooter>
                        )}
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
