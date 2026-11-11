import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Megaphone, Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';
import NewsIcon, { NEWS_ICONS } from '../../components/NewsIcon';
import { toast } from 'sonner';

interface Announcement {
    id: string;
    title: string;
    body: string;
    icon: string;
    created_at: string;
}

export default function AdminNews() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [tableMissing, setTableMissing] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [icon, setIcon] = useState('megaphone');

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        setTableMissing(false);
        setLoadError(null);
        try {
            const { data, error } = await api.news.list();

            if (error) {
                if (error.code === '42P01') {
                    setTableMissing(true);
                    return;
                }
                throw error;
            }
            setAnnouncements(data || []);
        } catch (error: any) {
            console.error('Error fetching announcements:', error);
            setLoadError('Neuigkeiten konnten nicht geladen werden.');
            toast.error('Neuigkeiten konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            toast.error('Bitte Titel und Beschreibung ausfüllen.');
            return;
        }

        setCreating(true);
        try {
            // Payload bewusst unverändert (body/icon); news.php erwartet "content" – das Fehlerbild bleibt identisch zu vorher.
            const { error } = await api.news.create({
                title: title.trim(),
                body: body.trim(),
                icon: icon
            } as any);

            if (error) throw error;

            toast.success('Neuigkeit erfolgreich erstellt!');
            setTitle('');
            setBody('');
            setIcon('megaphone');
            fetchAnnouncements();
        } catch (error: any) {
            console.error('Error creating announcement:', error);
            toast.error('Erstellen fehlgeschlagen: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await api.news.delete(id);

            if (error) throw error;

            toast.success('Neuigkeit gelöscht.');
            fetchAnnouncements();
        } catch (error: any) {
            console.error('Error deleting announcement:', error);
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    if (tableMissing) {
        return (
            <div className="space-y-6 p-1">
                <div className="flex items-center gap-2">
                    <Megaphone className="text-brand-ink dark:text-primary" size={24} aria-hidden />
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">News & Infos verwalten</h2>
                </div>
                <Alert>
                    <AlertCircle className="text-amber-600 dark:text-amber-400" aria-hidden />
                    <AlertTitle>Datenbank-Tabelle fehlt</AlertTitle>
                    <AlertDescription>
                        Die Tabelle <code>announcements</code> ist auf dem Server derzeit nicht verfügbar.
                        Bitte wende dich an die technische Administration, damit Neuigkeiten wieder verwaltet werden können.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <Megaphone className="text-brand-ink dark:text-primary" size={24} aria-hidden />
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">News & Infos verwalten</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    Gesamt: <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-semibold tabular-nums text-foreground">{announcements.length} Einträge</span>
                </p>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Neuigkeiten nicht verfügbar</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-3">
                        <span>{loadError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={fetchAnnouncements}>
                            Erneut laden
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3 2xl:gap-8">
                {/* Creation Form */}
                <Card className="shadow-soft 2xl:col-span-1">
                    <CardContent className="space-y-4 p-4 sm:p-6">
                        <h3 className="text-lg font-semibold">Neuigkeit hinzufügen</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="news-title" className="text-sm font-medium">Titel</Label>
                                <Input
                                    id="news-title"
                                    type="text"
                                    placeholder="z.B. Sommerferien-Börse aktiv!"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="news-body" className="text-sm font-medium">Beschreibung</Label>
                                <Textarea
                                    id="news-body"
                                    placeholder="Worum geht es in dieser Ankündigung?"
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="block text-sm font-medium">Symbol auswählen</Label>
                                <div className="flex flex-wrap gap-2">
                                    {NEWS_ICONS.map(({ name, label, Icon }) => (
                                        <Button variant="unstyled" size="unstyled"
                                            key={name}
                                            type="button"
                                            title={label}
                                            aria-label={label}
                                            aria-pressed={icon === name}
                                            onClick={() => setIcon(name)}
                                            className={`grid size-11 place-items-center rounded-xl border transition-colors ${
                                                icon === name
                                                    ? 'border-primary/40 bg-primary/15 text-brand-ink dark:text-primary'
                                                    : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                            }`}
                                        >
                                            <Icon size={20} aria-hidden />
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 h-11 w-full"
                                disabled={creating}
                            >
                                <Plus size={16} className="mr-1.5" aria-hidden />
                                {creating ? 'Erstelle...' : 'Veröffentlichen'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List of announcements */}
                <div className="space-y-4 2xl:col-span-2">
                    <h3 className="text-lg font-semibold">Aktuelle Mitteilungen</h3>

                    {loadError ? null : loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
                            <Spinner className="size-6 text-brand-ink dark:text-primary" />
                            <p className="text-sm text-muted-foreground">Lade Einträge...</p>
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
                            Noch keine Mitteilungen erstellt.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {announcements.map((item) => (
                                <Card key={item.id} className="shadow-soft">
                                    <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                                            <NewsIcon value={item.icon} size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <h4 className="break-words text-base font-semibold leading-snug text-foreground">{item.title}</h4>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => setPendingDeleteId(item.id)}
                                                    className="h-11 w-11 shrink-0"
                                                    title="Löschen"
                                                    aria-label="Neuigkeit löschen"
                                                >
                                                    <Trash2 size={16} aria-hidden />
                                                </Button>
                                            </div>
                                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                                            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                                <Calendar size={16} aria-hidden />
                                                <span>
                                                    {new Date(item.created_at).toLocaleDateString('de-DE', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AlertDialog
                open={pendingDeleteId !== null}
                onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Neuigkeit löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Mitteilung wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (pendingDeleteId) void handleDelete(pendingDeleteId);
                                setPendingDeleteId(null);
                            }}
                        >
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
