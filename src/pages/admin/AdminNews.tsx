import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Megaphone, Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
    const [creating, setCreating] = useState(false);
    const [tableMissing, setTableMissing] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [icon, setIcon] = useState('📢');

    const icons = ['📢', '🧪', '🎉', '🌟', 'ℹ️', '🚨', '📚', '🏆'];

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        setTableMissing(false);
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

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
            const { data: userData } = await supabase.auth.getUser();
            const adminId = userData.user?.id;

            const { error } = await supabase
                .from('announcements')
                .insert({
                    title: title.trim(),
                    body: body.trim(),
                    icon: icon
                });

            if (error) throw error;

            toast.success('Neuigkeit erfolgreich erstellt!');
            setTitle('');
            setBody('');
            setIcon('📢');
            fetchAnnouncements();

            // Log this action to the Audit Log if it exists
            if (adminId) {
                await supabase.from('admin_audit_log').insert({
                    admin_id: adminId,
                    action: 'create_announcement',
                    target_type: 'announcement',
                    details: { title: title.trim() }
                });
            }
        } catch (error: any) {
            console.error('Error creating announcement:', error);
            toast.error('Erstellen fehlgeschlagen: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Möchtest du diese Neuigkeit wirklich löschen?')) return;

        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Neuigkeit gelöscht.');
            fetchAnnouncements();

            // Log this action
            const { data: userData } = await supabase.auth.getUser();
            const adminId = userData.user?.id;
            if (adminId) {
                await supabase.from('admin_audit_log').insert({
                    admin_id: adminId,
                    action: 'delete_announcement',
                    target_type: 'announcement',
                    target_id: id,
                    details: {}
                });
            }
        } catch (error: any) {
            console.error('Error deleting announcement:', error);
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    if (tableMissing) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Megaphone className="text-primary-hover" size={24} />
                    <h2 className="text-2xl font-black">News & Infos verwalten</h2>
                </div>
                <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-3xl flex gap-4 items-start">
                    <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                    <div className="space-y-2">
                        <h4 className="font-bold text-amber-900 dark:text-amber-400">Datenbank-Tabelle fehlt</h4>
                        <p className="text-sm text-amber-800 dark:text-amber-500 leading-relaxed">
                            Die Tabelle <code>announcements</code> existiert noch nicht in deiner Supabase-Datenbank.
                            Bitte führe den entsprechenden Abschnitt in der Datei <code>supabase/migration_v2_update.sql</code> im Supabase SQL Editor aus, um Neuigkeiten verwalten zu können.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Megaphone className="text-primary-hover" size={24} />
                    <h2 className="text-2xl font-black">News & Infos verwalten</h2>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                    Gesamt: <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{announcements.length} Einträge</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creation Form */}
                <Card className="lg:col-span-1 border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-3xl">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-bold text-lg mb-2">Neuigkeit hinzufügen</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Titel</label>
                                <input
                                    type="text"
                                    placeholder="z.B. Sommerferien-Börse aktiv!"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Beschreibung</label>
                                <textarea
                                    placeholder="Worum geht es in dieser Ankündigung?"
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows={4}
                                    className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500 ml-1 block mb-1">Icon auswählen</label>
                                <div className="flex flex-wrap gap-2">
                                    {icons.map(item => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setIcon(item)}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all ${
                                                icon === item
                                                    ? 'border-primary bg-primary/10 scale-110'
                                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 rounded-xl font-bold mt-4"
                                disabled={creating}
                            >
                                <Plus size={16} className="mr-1.5" />
                                {creating ? 'Erstelle...' : 'Veröffentlichen'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List of announcements */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-lg">Aktuelle Mitteilungen</h3>
                    
                    {loading ? (
                        <div className="py-12 text-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 mt-2 text-sm font-medium">Lade Einträge...</p>
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-gray-400 italic text-sm">
                            Noch keine Mitteilungen erstellt.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map((item) => (
                                <Card key={item.id} className="border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden hover:shadow-sm transition-all duration-200">
                                    <CardContent className="p-5 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xl shrink-0 mt-0.5">
                                            {item.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <h4 className="font-bold text-base text-gray-900 dark:text-white leading-snug">{item.title}</h4>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 -mt-1"
                                                    title="Löschen"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap">{item.body}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-3">
                                                <Calendar size={11} />
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
        </div>
    );
}
