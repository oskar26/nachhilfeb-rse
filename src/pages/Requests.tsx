import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { TabBar } from '../components/ui/TabBar';
import { CheckCircle, XCircle, Phone, Mail, Star, Inbox, Search, MessageSquare, EyeOff, type LucideIcon } from 'lucide-react';
import { RatingDialog } from '../components/RatingDialog';
import { CustomContactsList } from '../components/CustomContacts';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../lib/utils';
import { getHiddenChatIds, unhideChatId } from './Chat';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function Requests() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [incoming, setIncoming] = useState<any[]>([]);
    const [outgoing, setOutgoing] = useState<any[]>([]);
    const [stats, setStats] = useState({ incoming: 0, outgoing: 0 });
    const [loading, setLoading] = useState(true);
    // Auf diesem Gerät verborgene Chats (siehe Chat.tsx) – Anfragen bleiben bestehen, nur die Liste wird aufgeräumt.
    const [hiddenIds, setHiddenIds] = useState<string[]>(() => getHiddenChatIds());
    const visibleIncoming = incoming.filter(r => !hiddenIds.includes(r.id));
    const visibleOutgoing = outgoing.filter(r => !hiddenIds.includes(r.id));
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

    const unhideAll = () => {
        hiddenIds.forEach(unhideChatId);
        setHiddenIds([]);
    };


    // Rating State
    const [ratingOpen, setRatingOpen] = useState(false);
    const [ratingUser, setRatingUser] = useState<any>(null);
    const [ratingAdId, setRatingAdId] = useState<string | null>(null);

    const fetchRequests = async () => {

        // Incoming: I am the owner
        // We select the requester profile with settings
        const { data: inc } = await supabase
            .from('ad_requests')
            .select('*, requester:requester_id(id, display_name, grade_level, is_verified, avatar_url, phone_number, email, settings), ads(id, short_description)')
            .eq('owner_id', user?.id)
            .order('created_at', { ascending: false });

        // Outgoing: I am the requester
        // We select the owner profile with settings
        const { data: out } = await supabase
            .from('ad_requests')
            .select('*, owner:owner_id(id, display_name, phone_number, email, settings), ads(id, short_description)')
            .eq('requester_id', user?.id)
            .order('created_at', { ascending: false });

        if (inc) setIncoming(inc);
        if (out) setOutgoing(out);
        const hid = getHiddenChatIds();
        setStats({ incoming: (inc || []).filter(r => r.status === 'pending' && !hid.includes(r.id)).length || 0, outgoing: 0 });
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchRequests();
    }, [user]);

    const handleStatus = async (id: string, status: 'accepted' | 'rejected') => {
        await supabase.from('ad_requests').update({ status }).eq('id', id);
        fetchRequests();
    };

    const handleComplete = (req: any) => {
        // Open Rating Dialog for the OTHER person
        if (req.requester_id === user?.id) {
            setRatingUser(req.owner);
        } else {
            setRatingUser(req.requester);
        }
        setRatingAdId(req.ads?.id);
        setRatingOpen(true);
    };

    const onRatingSubmit = async () => {
        setRatingOpen(false);
        // Optional: Refresh requests or mark as completely done logic
    }

    if (!user) {
        return (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                Bitte einloggen.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {hiddenIds.length > 0 && (
                <button
                    type="button"
                    onClick={unhideAll}
                    className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-4 text-xs font-bold text-gray-500 transition-colors hover:border-primary hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <EyeOff size={14} aria-hidden /> Verborgene Chats einblenden
                    <span className="rounded-full bg-gray-950 px-2 py-0.5 font-mono text-[10px] font-black tabular-nums text-primary dark:bg-black">{hiddenIds.length}</span>
                </button>
            )}
            <TabBar
                ariaLabel="Anfragen"
                items={[
                    { key: 'incoming', label: 'Eingang', count: stats.incoming },
                    { key: 'outgoing', label: 'Gesendet' }
                ]}
                value={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'incoming' && (
                <div className="space-y-4">
                    {loading && (
                        <div className="space-y-4" role="status" aria-label="Anfragen werden geladen">
                            <RequestSkeleton />
                            <RequestSkeleton />
                        </div>
                    )}
                    {!loading && visibleIncoming.length === 0 && (
                        <EmptyState
                            icon={Inbox}
                            title="Posteingang ist leer"
                            text="Du hast noch keine Anfragen zu deinen Anzeigen erhalten. Sobald jemand Interesse hat, taucht die Anfrage hier auf!"
                            action={
                                <Button className="h-11 rounded-full bg-primary px-6 font-black text-gray-950 hover:bg-primary-hover" onClick={() => navigate('/create-ad')}>
                                    Anzeige erstellen
                                </Button>
                            }
                        />
                    )}
                    {!loading && visibleIncoming.map((req, index) => (
                        <RequestShell key={req.id} index={index} reduceMotion={reduceMotion}>
                            <header className="flex items-start justify-between gap-3 px-5 pt-5">
                                <div className="min-w-0">
                                    <h3 className="truncate font-display text-lg uppercase leading-none tracking-tight text-gray-950 dark:text-gray-50">
                                        {req.requester?.display_name || 'Unbekannt'}
                                    </h3>
                                    <p className="mt-2 truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                        für „{req.ads?.short_description}“
                                    </p>
                                </div>
                                <StatusBadge status={req.status} />
                            </header>
                            <span className="mx-5 mt-3 block h-1 w-10 rounded-full bg-primary" aria-hidden />
                            <div className="space-y-4 px-5 pb-5 pt-4">
                                {req.message && (
                                    <blockquote className="poster-grain relative overflow-hidden rounded-2xl bg-gray-950 px-4 py-3 text-sm italic text-gray-100 dark:bg-black">
                                        <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
                                        „{req.message}“
                                    </blockquote>
                                )}

                                {req.status === 'pending' && (
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button onClick={() => handleStatus(req.id, 'accepted')} className="h-11 flex-1 rounded-full bg-green-600 font-black text-white hover:bg-green-700">
                                            <CheckCircle size={16} className="mr-2" /> Akzeptieren
                                        </Button>
                                        <Button onClick={() => handleStatus(req.id, 'rejected')} variant="outline" className="h-11 flex-1 rounded-full border-gray-300 font-bold text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/20">
                                            <XCircle size={16} className="mr-2" /> Ablehnen
                                        </Button>
                                    </div>
                                )}

                                {req.status === 'accepted' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {req.requester?.phone_number && req.requester?.settings?.phone_visible ? (
                                                <div className="poster-grain flex min-w-0 items-center gap-2 rounded-2xl bg-gray-950 px-3.5 py-2.5 text-sm font-semibold text-white dark:bg-black">
                                                    <Phone size={15} className="shrink-0 text-primary" aria-hidden />
                                                    <span className="truncate font-mono tabular-nums">{req.requester.phone_number}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-3.5 py-2.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                    <Phone size={14} className="shrink-0" aria-hidden /> Telefonnummer privat
                                                </div>
                                            )}
                                            {req.requester?.email && req.requester?.settings?.email_visible ? (
                                                <div className="poster-grain flex min-w-0 items-center gap-2 rounded-2xl bg-gray-950 px-3.5 py-2.5 text-sm font-semibold text-white dark:bg-black">
                                                    <Mail size={15} className="shrink-0 text-primary" aria-hidden />
                                                    <span className="truncate font-mono">{req.requester.email}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-3.5 py-2.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                    <Mail size={14} className="shrink-0" aria-hidden /> E-Mail privat
                                                </div>
                                            )}
                                        </div>
                                        <CustomContactsList contacts={req.requester?.settings?.custom_contacts} />
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Button variant="outline" size="sm" className="h-10 flex-1 rounded-full font-bold" onClick={() => navigate(`/chat/${req.id}`)}>
                                                <MessageSquare size={14} className="mr-2" /> Chat
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-10 flex-1 rounded-full font-bold" onClick={() => handleComplete(req)}>
                                                <Star size={14} className="mr-2" /> Bewerten
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </RequestShell>
                    ))}
                </div>
            )}

            {activeTab === 'outgoing' && (
                <div className="space-y-4">
                    {loading && (
                        <div className="space-y-4" role="status" aria-label="Anfragen werden geladen">
                            <RequestSkeleton />
                        </div>
                    )}
                    {!loading && visibleOutgoing.length === 0 && (
                        <EmptyState
                            icon={Search}
                            title="Keine laufenden Anfragen"
                            text="Du hast noch keine offenen Anfragen an andere Personen gestellt. Schau dich im Feed um und finde den perfekten Nachhilfe-Partner!"
                            action={
                                <Button className="h-11 rounded-full bg-primary px-6 font-black text-gray-950 hover:bg-primary-hover" onClick={() => navigate('/')}>
                                    Anzeigen stöbern
                                </Button>
                            }
                        />
                    )}
                    {!loading && visibleOutgoing.map((req, index) => (
                        <RequestShell key={req.id} index={index} reduceMotion={reduceMotion}>
                            <header className="flex items-start justify-between gap-3 px-5 pt-5">
                                <div className="min-w-0">
                                    <h3 className="truncate font-display text-lg uppercase leading-none tracking-tight text-gray-950 dark:text-gray-50">
                                        Anfrage an {req.owner?.display_name || 'User'}
                                    </h3>
                                    <p className="mt-2 truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                        für „{req.ads?.short_description}“
                                    </p>
                                </div>
                                <StatusBadge status={req.status} />
                            </header>
                            <span className="mx-5 mt-3 block h-1 w-10 rounded-full bg-primary" aria-hidden />
                            <div className="space-y-4 px-5 pb-5 pt-4">
                                {req.status === 'pending' && (
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Warte auf Antwort...</p>
                                )}

                                {req.status === 'rejected' && (
                                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Anfrage wurde abgelehnt.</p>
                                )}

                                {req.status === 'accepted' && (
                                    <div className="space-y-3">
                                        <div className="poster-grain relative overflow-hidden rounded-2xl bg-gray-950 px-4 py-3 dark:bg-black">
                                            <span className="absolute left-0 top-0 h-1 w-10 bg-primary" aria-hidden />
                                            <p className="text-sm font-bold text-white">Kontakt freigeschaltet!</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            {req.owner?.phone_number && req.owner?.settings?.phone_visible ? (
                                                <div className="poster-grain flex min-w-0 items-center gap-2 rounded-2xl bg-gray-950 px-3.5 py-2.5 text-sm font-semibold text-white dark:bg-black">
                                                    <Phone size={15} className="shrink-0 text-primary" aria-hidden />
                                                    <span className="truncate font-mono tabular-nums">{req.owner.phone_number}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-3.5 py-2.5 text-xs font-semibold italic text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                    <Phone size={14} className="shrink-0" aria-hidden /> Telefonnummer privat
                                                </div>
                                            )}
                                            {req.owner?.email && req.owner?.settings?.email_visible ? (
                                                <div className="poster-grain flex min-w-0 items-center gap-2 rounded-2xl bg-gray-950 px-3.5 py-2.5 text-sm font-semibold text-white dark:bg-black">
                                                    <Mail size={15} className="shrink-0 text-primary" aria-hidden />
                                                    <span className="truncate font-mono">{req.owner.email}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-3.5 py-2.5 text-xs font-semibold italic text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                    <Mail size={14} className="shrink-0" aria-hidden /> E-Mail privat
                                                </div>
                                            )}
                                        </div>
                                        <CustomContactsList contacts={req.owner?.settings?.custom_contacts} />
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Button variant="outline" size="sm" className="h-10 flex-1 rounded-full font-bold" onClick={() => navigate(`/chat/${req.id}`)}>
                                                <MessageSquare size={14} className="mr-2" /> Chat
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-10 flex-1 rounded-full font-bold" onClick={() => handleComplete(req)}>
                                                <Star size={14} className="mr-2" /> Bewerten
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </RequestShell>
                    ))}
                </div>
            )}

            <RatingDialog
                open={ratingOpen}
                onOpenChange={setRatingOpen}
                targetUser={ratingUser}
                adId={ratingAdId}
                onSuccess={onRatingSubmit}
            />
        </div>
    );
}

/** Poster-Kartusche: weißes Papier, 1px Kante, weicher Schatten, gestaffelter Eintritt. */
function RequestShell({ children, index, reduceMotion }: { children: ReactNode; index: number; reduceMotion: boolean | null }) {
    return (
        <motion.article
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.3) }}
            className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
            {children}
        </motion.article>
    );
}

/** Gestempelte Hinweis-Karte: Stempel-Ring, „Leer“-Stempel, gelber Akzentstreifen. */
function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action: ReactNode }) {
    const reduceMotion = useReducedMotion();
    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="relative overflow-hidden rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-12 text-center shadow-soft dark:border-gray-700 dark:bg-gray-900/70 sm:py-14"
        >
            <span className="stamp-ring mx-auto grid h-16 w-16 -rotate-6 place-items-center rounded-full text-gray-400 dark:text-gray-500" aria-hidden>
                <Icon size={26} />
            </span>
            <span className="mt-5 inline-block -rotate-3 rounded-lg border-2 border-dashed border-gray-300 px-3 py-1 font-display text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:border-gray-700 dark:text-gray-500">
                Leer
            </span>
            <h3 className="mt-4 font-display text-xl uppercase tracking-tight text-gray-950 dark:text-gray-50">{title}</h3>
            <span className="mx-auto mt-3 block h-1 w-10 rounded-full bg-primary" aria-hidden />
            <p className="mx-auto mt-3 max-w-sm text-sm text-gray-500 dark:text-gray-400">{text}</p>
            <div className="mt-6 flex justify-center">{action}</div>
        </motion.div>
    );
}

/** Skelett in Kartuschen-Form – verhindert das Aufblitzen des Empty-States beim Laden. */
function RequestSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200/80 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="h-4 w-2/5 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-3/5 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                </div>
                <div className="h-6 w-24 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 h-1 w-10 rounded-full bg-primary/40" />
            <div className="mt-4 space-y-2.5">
                <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 flex gap-2">
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}

/** Status als schwarzer Chip mit farbigem Punkt (Gelb = offen). */
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, { dot: string; label: string }> = {
        pending: { dot: 'bg-primary', label: 'Ausstehend' },
        accepted: { dot: 'bg-green-400', label: 'Akzeptiert' },
        rejected: { dot: 'bg-red-400', label: 'Abgelehnt' },
        completed: { dot: 'bg-gray-400', label: 'Erledigt' }
    };
    const meta = styles[status] ?? styles.pending;
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white ring-1 ring-white/10 dark:bg-black">
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
            {meta.label}
        </span>
    );
}
