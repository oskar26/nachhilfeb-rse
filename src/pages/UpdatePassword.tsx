import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getStoredToken, getStoredUser } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/CardLegacy';
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

    useEffect(() => {
        // Falls ein Reset-Token übergeben wurde, muss der Nutzer nicht eingeloggt sein
        if (resetToken) return;

        // Früher getSession(): Es genügt der lokal gespeicherte Login
        // (Token + User) – ohne Reset-Token muss er vorhanden sein.
        if (!getStoredToken() || !getStoredUser()) {
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
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-950">
            <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-gray-900/5">
                <CardHeader>
                    <CardTitle>Neues Passwort erstellen</CardTitle>
                    <CardDescription>
                        Bitte gib dein neues Passwort zweimal ein, um es zu bestätigen.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Neues Passwort</Label>
                            <Input
                                type="password"
                                placeholder="Min. 8 Zeichen"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Passwort bestätigen</Label>
                            <Input
                                type="password"
                                placeholder="Passwort wiederholen"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                            {isLoading ? 'Wird gespeichert...' : 'Passwort aktualisieren'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
