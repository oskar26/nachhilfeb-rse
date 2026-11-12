import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getStoredToken, getStoredUser } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';

export default function UpdatePassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Token aus URL oder Hash auslesen
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const resetToken = searchParams.get('token') || hashParams.get('token');
    const warnedRef = useRef(false);

    useEffect(() => {
        // Falls ein Reset-Token übergeben wurde, muss der Nutzer nicht eingeloggt sein
        if (resetToken) return;

        // Früher getSession(): Es genügt der lokal gespeicherte Login
        // (Token + User) – ohne Reset-Token muss er vorhanden sein.
        if (!getStoredToken() || !getStoredUser()) {
            if (warnedRef.current) return;
            warnedRef.current = true;
            toast.error("Ungültiger oder abgelaufener Link.");
            navigate('/login');
        }
    }, [navigate, resetToken]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Die Passwörter stimmen nicht überein.");
            return;
        }

        setIsLoading(true);

        try {
            let error = null;
            if (resetToken) {
                const res = await api.auth.updatePassword(password, resetToken);
                error = res.error;
            } else {
                const res = await api.auth.updatePassword(password);
                error = res.error;
            }

            if (error) {
                toast.error('Das Passwort konnte nicht geändert werden. Bitte versuche es erneut.');
            } else {
                toast.success('Passwort geändert.');
                navigate('/login');
            }
        } catch {
            toast.error('Das Passwort konnte nicht geändert werden. Bitte versuche es erneut.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-foreground">
            <Card className="w-full max-w-md border-border bg-card">
                <CardHeader className="space-y-1.5">
                    <CardTitle className="text-xl font-semibold">Neues Passwort erstellen</CardTitle>
                    <CardDescription>
                        Bitte gib dein neues Passwort zweimal ein, um es zu bestätigen.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-password" className="text-sm font-medium">Neues Passwort</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="Min. 8 Zeichen"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-password" className="text-sm font-medium">Passwort bestätigen</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="Passwort wiederholen"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full font-semibold" disabled={isLoading} isLoading={isLoading}>
                            {isLoading ? 'Wird gespeichert…' : 'Passwort aktualisieren'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
