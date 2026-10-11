import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { TabBar } from '../components/ui/TabBar';
import { CheckCircle, XCircle, Phone, Mail, Star, Inbox, Search, MessageSquare, EyeOff, ExternalLink, GraduationCap } from 'lucide-react';
import { RatingDialog } from '../components/RatingDialog';
import { CustomContactsList, type CustomContact } from '../components/CustomContacts';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getHiddenChatIds, unhideChatId } from './Chat';
import { EmptyState } from '../components/social/EmptyState';

interface RequestPerson {
    id?: string;
    display_name?: string | null;
    grade_level?: string | null;
    is_verified?: boolean;
    avatar_url?: string | null;
    phone_number?: string | null;
    email?: string | null;
    settings?: {
        phone_visible?: boolean;
        email_visible?: boolean;
        custom_contacts?: CustomContact[] | null;
    } | null;
}

interface AdRequestItem {
    id: string;
    status: string;
    message?: string | null;
    created_at?: string;
    owner_id?: string;
    requester_id?: string;
    requester?: RequestPerson | null;
    owner?: RequestPerson | null;
    ads?: { id?: string; short_description?: string | null } | null;
}

function gradeLabel(grade?: string | null): string {
    if (!grade) return 'Klasse ?';
    return ['EF', 'Q1', 'Q2'].includes(grade) ? `Stufe ${grade}` : `Klasse ${grade}`;
}

export default function Requests() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [incoming, setIncoming] = useState<AdRequestItem[]>([]);
    const [outgoing, setOutgoing] = useState<AdRequestItem[]>([]);
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
    const [ratingUser, setRatingUser] = useState<RequestPerson | null>(null);
    const [ratingAdId, setRatingAdId] = useState<string | null>(null);

    const fetchRequests = async () => {
        // Incoming: I am the owner – with requester profile + settings
        const { data: inc } = await supabase
            .from('ad_requests')
            .select('*, requester:requester_id(id, display_name, grade_level, is_verified, avatar_url, phone_number, email, settings), ads(id, short_description)')
            .eq('owner_id', user?.id)
            .order('created_at', { ascending: false });

        // Outgoing: I am the requester – with owner profile + settings
        const { data: out } = await supabase
            .from('ad_requests')
            .select('*, owner:owner_id(id, display_name, phone_number, email, settings), ads(id, short_description)')
            .eq('requester_id', user?.id)
            .order('created_at', { ascending: false });

        if (inc) setIncoming(inc as AdRequestItem[]);
        if (out) setOutgoing(out as AdRequestItem[]);
        const hid = getHiddenChatIds();
        setStats({ incoming: (inc || []).filter((r: AdRequestItem) => r.status === 'pending' && !hid.includes(r.id)).length || 0, outgoing: 0 });
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchRequests();
    }, [user]);

    const handleStatus = async (id: string, status: 'accepted' | 'rejected') => {
        await supabase.from('ad_requests').update({ status }).eq('id', id);
        fetchRequests();
    };

    const handleComplete = (req: AdRequestItem) => {
        // Open Rating Dialog for the OTHER person
        if (req.requester_id === user?.id) {
            setRatingUser(req.owner ?? null);
        } else {
            setRatingUser(req.requester ?? null);
        }
        setRatingAdId(req.ads?.id ?? null);
        setRatingOpen(true);
    };

    const onRatingSubmit = async () => {
        setRatingOpen(false);
        // Optional: Refresh requests or mark as completely done logic
    };

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
                    className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-full border border-dashed border-gray-200 bg-white px-4 text-xs font-bold text-gray-500 transition-colors hover:border-primary hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <EyeOff size={14} aria-hidden /> Verborgene Chats einblenden
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black tabular-nums text-amber-950">{hiddenIds.length}</span>
                </button>
            )}
            <TabBar
                ariaLabel="Anfragen"
                items={[
                    { key: 'incoming', label: 'Eingang', count: stats.incoming },
                    { key: 'outgoing', label: 'Gesendet', count: visibleOutgoing.length }
                ]}
                value={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'incoming' && (
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    {loading && (
                        <>
                            <RequestSkeleton />
                            <RequestSkeleton />
                        </>
                    )}
                    {!loading && visibleIncoming.length === 0 && (
                        <div className="sm:col-span-2">
                            <EmptyState
                                icon={Inbox}
                                title="Posteingang ist leer"
                                text="Du hast noch keine Anfragen zu deinen Anzeigen erhalten. Sobald jemand Interesse hat, taucht die Anfrage hier auf!"
                                action={
                                    <Button className="h-11 rounded-full bg-primary px-6 font-bold text-black" onClick={() => navigate('/create-ad')}>
                                        Anzeige erstellen
                                    </Button>
                                }
                            />
                        </div>
                    )}
                    {!loading && visibleIncoming.map(req => (
                        <RequestCard key={req.id}>
                            <RequestHead person={req.requester} status={req.status} ad={req.ads} navigate={navigate} />
                            {req.message && <MessageQuote message={req.message} />}
                            {req.status === 'pending' && (
                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        onClick={() => handleStatus(req.id, 'accepted')}
                                        className="h-11 flex-1 rounded-full bg-green-700 font-bold text-white hover:bg-green-800"
                                    >
                                        <CheckCircle size={16} /> Akzeptieren
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleStatus(req.id, 'rejected')}
                                        className="h-11 flex-1 rounded-full border-gray-200 bg-white font-bold text-red-600 hover:bg-red-50 dark:border-gray-700 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/20"
                                    >
                                        <XCircle size={16} /> Ablehnen
                                    </Button>
                                </div>
                            )}
                            {req.status === 'accepted' && (
                                <div className="mt-4 space-y-3">
                                    <ContactChips person={req.requester} />
                                    <CustomContactsList contacts={req.requester?.settings?.custom_contacts} />
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button className="h-11 flex-1 rounded-full bg-primary font-bold text-black" onClick={() => navigate(`/chat/${req.id}`)}>
                                            <MessageSquare size={16} /> Chat
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-11 flex-1 rounded-full border-gray-200 bg-white font-bold dark:border-gray-700 dark:bg-gray-900"
                                            onClick={() => handleComplete(req)}
                                        >
                                            <Star size={16} /> Bewerten
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </RequestCard>
                    ))}
                </div>
            )}

            {activeTab === 'outgoing' && (
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    {loading && <RequestSkeleton />}
                    {!loading && visibleOutgoing.length === 0 && (
                        <div className="sm:col-span-2">
                            <EmptyState
                                icon={Search}
                                title="Keine laufenden Anfragen"
                                text="Du hast noch keine offenen Anfragen an andere Personen gestellt. Schau dich im Feed um und finde den perfekten Nachhilfe-Partner!"
                                action={
                                    <Button className="h-11 rounded-full bg-primary px-6 font-bold text-black" onClick={() => navigate('/')}>
                                        Anzeigen stöbern
                                    </Button>
                                }
                            />
                        </div>
                    )}
                    {!loading && visibleOutgoing.map(req => (
                        <RequestCard key={req.id}>
                            <RequestHead
                                person={req.owner}
                                status={req.status}
                                ad={req.ads}
                                navigate={navigate}
                                namePrefix="Anfrage an"
                            />
                            {req.message && <MessageQuote message={req.message} />}
                            {req.status === 'pending' && (
                                <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Warte auf Antwort…</p>
                            )}
                            {req.status === 'rejected' && (
                                <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">Anfrage wurde abgelehnt.</p>
                            )}
                            {req.status === 'accepted' && (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800 dark:bg-green-950/30 dark:text-green-300">
                                        <CheckCircle size={16} className="shrink-0" aria-hidden /> Kontakt freigeschaltet!
                                    </div>
                                    <ContactChips person={req.owner} />
                                    <CustomContactsList contacts={req.owner?.settings?.custom_contacts} />
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button className="h-11 flex-1 rounded-full bg-primary font-bold text-black" onClick={() => navigate(`/chat/${req.id}`)}>
                                            <MessageSquare size={16} /> Chat
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-11 flex-1 rounded-full border-gray-200 bg-white font-bold dark:border-gray-700 dark:bg-gray-900"
                                            onClick={() => handleComplete(req)}
                                        >
                                            <Star size={16} /> Bewerten
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </RequestCard>
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

/** Helle Anfrage-Karte im Feed-Stil: weiß, 1px graue Kante, weicher Schatten. */
function RequestCard({ children }: { children: ReactNode }) {
    return (
        <article className="flex min-w-0 flex-col rounded-3xl border border-gray-200 bg-white p-4 shadow-soft transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-5">
            {children}
        </article>
    );
}

/** Person (Avatar + Name + Klasse), Status-Chip und klickbarer Anzeigen-Bezug. */
function RequestHead({
    person,
    status,
    ad,
    navigate,
    namePrefix,
}: {
    person?: RequestPerson | null;
    status: string;
    ad?: { id?: string; short_description?: string | null } | null;
    navigate: (to: string) => void;
    namePrefix?: string;
}) {
    const name = person?.display_name || 'Unbekannt';
    return (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar person={person} />
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">
                            {namePrefix ? `${namePrefix} ${name}` : name}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <GraduationCap size={13} aria-hidden /> {gradeLabel(person?.grade_level)}
                        </p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>
            {ad?.id && (
                <button
                    type="button"
                    onClick={() => navigate(`/ad/${ad.id}`)}
                    className="mt-2 flex min-h-[44px] w-full items-center gap-1.5 rounded-2xl px-2 text-left text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:text-gray-400 dark:hover:bg-gray-800/40 dark:hover:text-gray-100 dark:focus-visible:ring-primary"
                    title="Anzeige ansehen"
                >
                    <span className="min-w-0 truncate">für „{ad.short_description || 'Anzeige'}“</span>
                    <ExternalLink size={13} className="shrink-0" aria-hidden />
                </button>
            )}
        </>
    );
}

function Avatar({ person }: { person?: RequestPerson | null }) {
    const initial = person?.display_name?.[0]?.toUpperCase() || '?';
    return person?.avatar_url ? (
        <img
            src={person.avatar_url}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
        />
    ) : (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300" aria-hidden>
            {initial}
        </div>
    );
}

/** Nachricht als helle Zitat-Box mit dünner gelber Kante links. */
function MessageQuote({ message }: { message: string }) {
    return (
        <blockquote className="mt-3 rounded-2xl border-l-[3px] border-primary bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
            „{message}“
        </blockquote>
    );
}

/** Telefon/E-Mail als dezente Chips – nur wenn vorhanden und freigegeben. */
function ContactChips({ person }: { person?: RequestPerson | null }) {
    const chips: ReactNode[] = [];
    if (person?.phone_number && person?.settings?.phone_visible) {
        chips.push(
            <span key="phone" className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Phone size={13} className="shrink-0 text-gray-400" aria-hidden />
                <span className="truncate font-mono tabular-nums">{person.phone_number}</span>
            </span>
        );
    }
    if (person?.email && person?.settings?.email_visible) {
        chips.push(
            <span key="mail" className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Mail size={13} className="shrink-0 text-gray-400" aria-hidden />
                <span className="truncate">{person.email}</span>
            </span>
        );
    }
    if (chips.length === 0) return null;
    return <div className="flex flex-wrap gap-2">{chips}</div>;
}

/** Skelett in Karten-Form – verhindert das Aufblitzen des Empty-States beim Laden. */
function RequestSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-2/5 rounded-full bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                    </div>
                </div>
                <div className="h-6 w-24 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-4 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            <div className="mt-4 flex gap-2">
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
    );
}

/** Status als heller Chip mit farbigem Punkt (gelb offen, grün akzeptiert, rot abgelehnt). */
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, { dot: string; label: string }> = {
        pending: { dot: 'bg-primary', label: 'Ausstehend' },
        accepted: { dot: 'bg-green-500', label: 'Akzeptiert' },
        rejected: { dot: 'bg-red-500', label: 'Abgelehnt' },
        completed: { dot: 'bg-gray-400', label: 'Erledigt' }
    };
    const meta = styles[status] ?? styles.pending;
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
            {meta.label}
        </span>
    );
}
