import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';

// Subpages
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import AdminChat from './AdminChat';
import AdminCodes from './AdminCodes';
import AdminAuditLog from './AdminAuditLog';
import AdminNews from './AdminNews';

import AdminAnalytics from './AdminAnalytics';

export default function SVDashboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';

    const handleOpenChat = (u1: string, u2: string, rId: string) => {
        setSearchParams({
            tab: 'chat',
            userId1: u1,
            userId2: u2,
            reportId: rId
        });
    };

    switch (activeTab) {
        case 'overview':
            return <AdminOverview />;
        case 'users':
            return <AdminUsers />;
        case 'reports':
            return <AdminReports onOpenChat={handleOpenChat} />;
        case 'chat':
            return (
                <AdminChat
                    userId1={searchParams.get('userId1')}
                    userId2={searchParams.get('userId2')}
                    reportId={searchParams.get('reportId')}
                    onBack={() => setSearchParams({ tab: 'reports' })}
                />
            );
        case 'codes':
            return <AdminCodes />;
        case 'auditlog':
            return <AdminAuditLog />;
        case 'news':
            return <AdminNews />;
        case 'ads':
            return <AdManagement />;
        case 'analytics':
            return <AdminAnalytics />;
        default:
            return <AdminOverview />;
    }
}

// Embedded Ads Management Sub-component
function AdManagement() {
    const [ads, setAds] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setLoading(true);
        try {
            const { data: adsData, error: adsError } = await supabase
                .from('ads')
                .select('*')
                .order('created_at', { ascending: false });

            if (adsError) throw adsError;

            if (adsData && adsData.length > 0) {
                const userIds = Array.from(new Set(adsData.map(a => a.user_id)));
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, display_name')
                    .in('id', userIds);

                const profileMap = new Map(profilesData?.map(p => [p.id, p]));
                const joinedAds = adsData.map(ad => ({
                    ...ad,
                    profiles: profileMap.get(ad.user_id)
                }));
                setAds(joinedAds);
            } else {
                setAds([]);
            }
        } catch (err) {
            console.error(err);
            toast.error('Anzeigen konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const deleteAd = async (id: string) => {
        if (!confirm('Anzeige endgültig löschen?')) return;
        try {
            const { error } = await supabase.from('ads').delete().eq('id', id);
            if (error) throw error;
            toast.success('Anzeige gelöscht');
            fetchAds();
            
            // Audit Log
            await supabase.from('admin_audit_log').insert({
                admin_id: (await supabase.auth.getUser()).data.user?.id,
                action: 'delete_ad',
                target_type: 'ad',
                target_id: id,
                details: {}
            });
        } catch (error: any) {
            toast.error('Löschen fehlgeschlagen: ' + error.message);
        }
    };

    const toggleHide = async (id: string, current: boolean) => {
        try {
            const { error } = await supabase.from('ads').update({ is_hidden: !current }).eq('id', id);
            if (error) throw error;
            toast.success(current ? 'Anzeige eingeblendet' : 'Anzeige versteckt');
            fetchAds();
            
            // Audit Log
            await supabase.from('admin_audit_log').insert({
                admin_id: (await supabase.auth.getUser()).data.user?.id,
                action: current ? 'show_ad' : 'hide_ad',
                target_type: 'ad',
                target_id: id,
                details: {}
            });
        } catch (error: any) {
            toast.error('Aktion fehlgeschlagen: ' + error.message);
        }
    };

    const filteredAds = ads.filter(ad =>
        (ad.short_description?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (ad.profiles?.display_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Anzeigen suchen nach Beschreibung, Name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 rounded-2xl"
                    />
                </div>
                <div className="text-sm text-gray-500 font-medium">
                    Gesamt: <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{ads.length} Anzeigen</span>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 font-medium">Lade Anzeigen...</p>
                </div>
            ) : filteredAds.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl text-gray-400 dark:border-gray-800 italic">
                    Keine Anzeigen gefunden.
                </div>
            ) : (
                <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="divide-y dark:divide-gray-800">
                            {filteredAds.map(ad => (
                                <div key={ad.id} className={cn(
                                    'p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors',
                                    ad.is_hidden && 'bg-gray-100/50 dark:bg-gray-950/50'
                                )}>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                                ad.type === 'offer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            )}>
                                                {ad.type === 'offer' ? 'Bietet' : 'Sucht'}
                                            </span>
                                            <span className="font-bold">{ad.short_description}</span>
                                            {ad.is_hidden && <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase">Versteckt</span>}
                                            {ad.boosted && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase">Geboostet 🍌</span>}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Von <span className="font-semibold">{ad.profiles?.display_name || `${ad.profiles?.first_name || ''} ${ad.profiles?.last_name || ''}`}</span> • {new Date(ad.created_at).toLocaleDateString('de-DE')}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="rounded-xl border-gray-200" onClick={() => toggleHide(ad.id, ad.is_hidden)}>
                                            {ad.is_hidden ? 'Einblenden' : 'Verstecken'}
                                        </Button>
                                        <Button size="icon" variant="destructive" className="h-9 w-9 rounded-xl" onClick={() => deleteAd(ad.id)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
