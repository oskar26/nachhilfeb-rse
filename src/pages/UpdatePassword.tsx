import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { toast } from 'react-hot-toast';

export default function UpdatePassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Supabase hash handling is done automatically by the client when redirected from email.
        // We just need to check if there is a session.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error("Ungültiger oder abgelaufener Link.");
                navigate('/login');
            }
        });
    }, [navigate]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 6) {
            toast.error("Das Passwort muss mindestens 6 Zeichen lang sein.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Die Passwörter stimmen nicht überein.");
            return;
        }

        setIsLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            toast.error("Fehler beim Aktualisieren: " + error.message);
        } else {
            toast.success("Dein Passwort wurde erfolgreich aktualisiert!");
            navigate('/settings');
        }

        setIsLoading(false);
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
                            <label className="text-sm font-medium">Neues Passwort</label>
                            <Input
                                type="password"
                                placeholder="Min. 6 Zeichen"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Passwort bestätigen</label>
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
