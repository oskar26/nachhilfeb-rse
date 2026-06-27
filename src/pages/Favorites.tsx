import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { Trash2, Heart, Plus, Folder, Share2, FolderHeart, ArrowRight, ExternalLink, MoreVertical, ChevronDown } from 'lucide-react';
import { SubjectChip } from '../components/SubjectChip';
import ShareDialog from '../components/ShareDialog';
import { toast } from 'react-hot-toast';

interface Collection {
    id: string;
    name: string;
    color: string;
}

interface FavoriteAd {
    id: string;
    ad_id: string;
    collection_id: string | null;
    ads: {
        id: string;
        title: string;
        type: 'offer' | 'search';
        subjects: string[];
        grade_levels: string[];
        short_description: string;
        price_details: any;
        profiles?: {
            display_name: string;
            grade_level: string;
        }
    }
}

export default function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [favorites, setFavorites] = useState<FavoriteAd[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [activeCollectionId, setActiveCollectionId] = useState<string | 'all'>('all');
    const [loading, setLoading] = useState(true);

    // New Collection Dialog / States
    const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#FACC15');

    // Share Dialog States
    const [sharingAd, setSharingAd] = useState<{ id: string; title: string } | null>(null);

    // Move to Collection Dropdowns
    const [movingAdId, setMovingAdId] = useState<string | null>(null);

    const colors = ['#FACC15', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

    useEffect(() => {
        if (user) {
            fetchCollections();
            fetchFavorites();
        }
    }, [user]);

    const fetchCollections = async () => {
        try {
            const { data, error } = await supabase
                .from('favorite_collections')
                .select('*')
                .eq('user_id', user?.id)
                .order('name');
            if (!error && data) {
                setCollections(data);
            }
        } catch (err) {
            console.error('Error fetching collections:', err);
        }
    };

    const fetchFavorites = async () => {
        setLoading(true);
        try {
            // Fetch favorites joined with ads and profiles
            const { data, error } = await supabase
                .from('favorites')
                .select('*, ads(*)')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching favorites:', error);
                toast.error("Gespeicherte Anzeigen konnten nicht geladen werden.");
            } else if (data) {
                // Fetch profiles of ad owners manually to avoid deep nesting issues
                const adOwnerIds = Array.from(new Set(data.filter(f => f.ads).map(f => f.ads.user_id)));
                
                let profileMap = new Map();
                if (adOwnerIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, display_name, grade_level')
                        .in('id', adOwnerIds);
                    profileMap = new Map(profiles?.map(p => [p.id, p]));
                }

                const mapped: FavoriteAd[] = data.map((f: any) => ({
                    id: f.id,
                    ad_id: f.ad_id,
                    collection_id: f.collection_id,
                    ads: f.ads ? {
                        ...f.ads,
                        profiles: profileMap.get(f.ads.user_id)
                    } : null
                })).filter(f => f.ads !== null); // Filter deleted ads

                setFavorites(mapped);
            }
        } catch (err) {
            console.error('Catch error fetching favorites:', err);
        }
        setLoading(false);
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) {
            toast.error("Bitte gib einen Namen für die Sammlung ein.");
            return;
        }

        try {
            const { data, error } = await supabase
                .from('favorite_collections')
                .insert({
                    user_id: user?.id,
                    name: newCollectionName.trim(),
                    color: selectedColor
                })
                .select()
                .single();

            if (error) {
                toast.error("Sammlung konnte nicht erstellt werden.");
            } else if (data) {
                setCollections(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                setNewCollectionName('');
                setShowNewCollectionInput(false);
                toast.success(`Sammlung "${data.name}" erstellt!`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCollection = async (collectionId: string, name: string) => {
        if (!confirm(`Möchtest du die Sammlung "${name}" wirklich löschen? Die darin gespeicherten Anzeigen bleiben erhalten, werden aber in die Hauptliste verschoben.`)) {
            return;
        }

        try {
            // Delete collection record
            const { error } = await supabase
                .from('favorite_collections')
                .delete()
                .eq('id', collectionId);

            if (error) {
                toast.error("Fehler beim Löschen der Sammlung.");
            } else {
                // Update local state: move items in this collection to null (main list)
                setFavorites(prev => prev.map(f => f.collection_id === collectionId ? { ...f, collection_id: null } : f));
                setCollections(prev => prev.filter(c => c.id !== collectionId));
                if (activeCollectionId === collectionId) {
                    setActiveCollectionId('all');
                }
                toast.success(`Sammlung "${name}" gelöscht.`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveFavorite = async (adId: string) => {
        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user?.id)
                .eq('ad_id', adId);

            if (!error) {
                setFavorites(prev => prev.filter(f => f.ad_id !== adId));
                toast.success("Aus Merkliste entfernt");
            } else {
                toast.error("Fehler beim Entfernen.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleMoveToCollection = async (favId: string, colId: string | null) => {
        try {
            const { error } = await supabase
                .from('favorites')
                .update({ collection_id: colId })
                .eq('id', favId);

            if (!error) {
                setFavorites(prev => prev.map(f => f.id === favId ? { ...f, collection_id: colId } : f));
                setMovingAdId(null);
                toast.success("Anzeige verschoben!");
            } else {
                toast.error("Fehler beim Verschieben.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredFavorites = favorites.filter(f => {
        if (activeCollectionId === 'all') return true;
        return f.collection_id === activeCollectionId;
    });

    if (!user) return <div className="p-4 text-center py-20">Bitte logge dich ein, um deine Merkliste zu sehen.</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto pb-24">
            {/* Mobile: Collapsible Collections Panel */}
            <div className="md:hidden mb-4">
                <button
                    onClick={() => setShowNewCollectionInput(!showNewCollectionInput)}
                    className="w-full flex items-center justify-between bg-white dark:bg-gray-900 border dark:border-gray-800 p-4 rounded-2xl shadow-sm"
                >
                    <span className="font-bold text-sm">Sammlungen ({collections.length + 1})</span>
                    <ChevronDown size={16} className="text-gray-400" />
                </button>
                {/* Mobile horizontal scroll for collections */}
                <div className="flex gap-2 overflow-x-auto pb-2 mt-2 no-scrollbar">
                    <button
                        onClick={() => setActiveCollectionId('all')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${activeCollectionId === 'all' ? 'bg-primary text-black' : 'bg-white dark:bg-gray-900 border dark:border-gray-800 text-gray-600'}`}
                    >
                        <FolderHeart size={13} />
                        Alle ({favorites.length})
                    </button>
                    {collections.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveCollectionId(c.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${activeCollectionId === c.id ? 'bg-primary text-black' : 'bg-white dark:bg-gray-900 border dark:border-gray-800 text-gray-600'}`}
                        >
                            <Folder size={13} style={{ color: c.color }} />
                            {c.name}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowNewCollectionInput(!showNewCollectionInput)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0"
                    >
                        <Plus size={13} /> Neu
                    </button>
                </div>
                {showNewCollectionInput && (
                    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 p-3 rounded-2xl space-y-3 mt-2 animate-in slide-in-from-top-2">
                        <Input
                            placeholder="Sammlungsname..."
                            value={newCollectionName}
                            onChange={e => setNewCollectionName(e.target.value)}
                            className="h-8 text-xs"
                        />
                        <div className="flex gap-1 justify-center">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    className={`w-5 h-5 rounded-full border transition-transform ${selectedColor === c ? 'scale-125 border-black dark:border-white' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setSelectedColor(c)}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="w-full text-xs h-7" onClick={handleCreateCollection}>Erstellen</Button>
                            <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => setShowNewCollectionInput(false)}>Abbrechen</Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="md:grid md:grid-cols-[240px_1fr] gap-6">
            {/* Desktop Sidebar - Collections */}
            <div className="hidden md:block space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-sm uppercase tracking-wider text-gray-400">Sammlungen</h2>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-primary" 
                        onClick={() => setShowNewCollectionInput(!showNewCollectionInput)}
                    >
                        <Plus size={16} />
                    </Button>
                </div>

                {showNewCollectionInput && (
                    <div className="bg-white dark:bg-gray-900 border p-3 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                        <Input
                            placeholder="Name..."
                            value={newCollectionName}
                            onChange={e => setNewCollectionName(e.target.value)}
                            className="h-8 text-xs"
                        />
                        <div className="flex gap-1 justify-center">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    className={`w-5 h-5 rounded-full border transition-transform ${selectedColor === c ? 'scale-125 border-black dark:border-white' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setSelectedColor(c)}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="w-full text-xs h-7" onClick={handleCreateCollection}>Erstellen</Button>
                            <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => setShowNewCollectionInput(false)}>Abbrechen</Button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setActiveCollectionId('all')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all w-full text-left ${activeCollectionId === 'all' ? 'bg-primary text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                    >
                        <FolderHeart size={16} />
                        <span>Alle Gespeicherten</span>
                        <span className="ml-auto text-xs bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full">{favorites.length}</span>
                    </button>

                    {collections.map(c => {
                        const count = favorites.filter(f => f.collection_id === c.id).length;
                        return (
                            <div key={c.id} className="group flex items-center w-full justify-between">
                                <button
                                    onClick={() => setActiveCollectionId(c.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left flex-1 ${activeCollectionId === c.id ? 'bg-primary text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                                >
                                    <Folder size={16} style={{ color: c.color }} fill={c.color + '40'} />
                                    <span className="truncate max-w-[120px]">{c.name}</span>
                                    <span className="ml-auto text-xs bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full">{count}</span>
                                </button>
                                <button 
                                    onClick={() => handleDeleteCollection(c.id, c.name)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 p-1.5 transition-opacity"
                                    title="Sammlung löschen"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Area - Saved Ads */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {activeCollectionId === 'all' ? (
                            <>Merkliste</>
                        ) : (
                            <>
                                <Folder size={24} style={{ color: collections.find(c => c.id === activeCollectionId)?.color }} />
                                {collections.find(c => c.id === activeCollectionId)?.name}
                            </>
                        )}
                    </h1>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">Lade gespeicherte Anzeigen...</div>
                ) : filteredFavorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                        <div className="w-20 h-20 mb-6 rounded-full bg-gray-50 dark:bg-gray-850 flex items-center justify-center">
                            <Heart size={36} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Hier ist noch nichts</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                            {activeCollectionId === 'all' 
                                ? 'Füge Angebote aus dem Feed hinzu, indem du auf das Herz-Symbol klickst.' 
                                : 'In dieser Sammlung befinden sich aktuell keine Anzeigen. Verschiebe Anzeigen hierhin.'}
                        </p>
                        <Button onClick={() => navigate('/')} className="rounded-full shadow-md">Jetzt stöbern</Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredFavorites.map((fav) => {
                            const ad = fav.ads;
                            return (
                                <Card
                                    key={fav.id}
                                    className="overflow-hidden hover:shadow-md transition-shadow relative group border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70"
                                >
                                    <CardHeader className="p-4 bg-gray-50/30 dark:bg-gray-850/30 border-b border-gray-100 dark:border-gray-800 flex flex-row justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg">{ad.profiles?.display_name || 'Unbekannt'}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ad.type === 'offer' ? 'bg-primary/20 text-primary-hover dark:text-primary' : 'bg-secondary/20 text-secondary'}`}>
                                                    {ad.type === 'offer' ? 'Biete' : 'Suche'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-550 mt-0.5 font-medium">
                                                Klasse {ad.profiles?.grade_level || '?'}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Share Button */}
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-gray-400 hover:text-primary rounded-xl"
                                                onClick={(e) => { e.stopPropagation(); setSharingAd({ id: ad.id, title: ad.title }); }}
                                                title="Anzeige teilen"
                                            >
                                                <Share2 size={15} />
                                            </Button>

                                            {/* Folder Move Dropdown Trigger */}
                                            <div className="relative">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-gray-400 hover:text-primary rounded-xl"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMovingAdId(movingAdId === fav.id ? null : fav.id);
                                                    }}
                                                    title="In Sammlung verschieben"
                                                >
                                                    <Folder size={15} />
                                                </Button>

                                                {movingAdId === fav.id && (
                                                    <div className="absolute right-0 top-9 bg-white dark:bg-gray-950 border dark:border-gray-800 rounded-2xl shadow-xl p-2 w-48 z-30 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <p className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1">Verschieben nach...</p>
                                                        <button
                                                            className="w-full text-left text-xs px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 font-semibold flex items-center gap-1.5"
                                                            onClick={(e) => { e.stopPropagation(); handleMoveToCollection(fav.id, null); }}
                                                        >
                                                            <FolderHeart size={12} /> Hauptliste
                                                        </button>
                                                        {collections.map(c => (
                                                            <button
                                                                key={c.id}
                                                                className="w-full text-left text-xs px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 font-semibold flex items-center gap-1.5"
                                                                onClick={(e) => { e.stopPropagation(); handleMoveToCollection(fav.id, c.id); }}
                                                            >
                                                                <Folder size={12} style={{ color: c.color }} /> {c.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete Heart Button */}
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl" 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(ad.id); }}
                                                title="Aus Merkliste entfernen"
                                            >
                                                <Trash2 size={15} />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 flex flex-col gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            {ad.subjects.map((s: any) => <SubjectChip key={s} subject={s} />)}
                                        </div>
                                        <p className="text-sm line-clamp-2 text-gray-700 dark:text-gray-300">{ad.short_description}</p>
                                        
                                        <div className="flex justify-between items-center mt-2 border-t pt-3 border-gray-150 dark:border-gray-800">
                                            <span className="text-sm font-bold">
                                                {ad.price_details?.mode === 'free' ? 'Kostenlos' : (ad.price_details?.mode === 'vb' ? 'VB' : `${ad.price_details?.value}€ / Std`)}
                                            </span>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="text-xs h-8 text-primary font-bold hover:underline gap-1 rounded-xl"
                                                onClick={() => navigate(`/ad/${ad.id}`)}
                                            >
                                                <span>Ansehen</span>
                                                <ExternalLink size={12} />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Share Dialog */}
            {sharingAd && (
                <ShareDialog
                    adId={sharingAd.id}
                    adTitle={sharingAd.title}
                    isOpen={sharingAd !== null}
                    onClose={() => setSharingAd(null)}
                />
            )}
        </div>
    );
}
