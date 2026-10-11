// Karten-Modul „Anfragen" für den Social-Strom: eingehende und ausgehende
// Anfrage-Karten plus Skelett. Reine Darstellung – Daten und Aktionen
// kommen über Props aus useSocialStream (Social.tsx ist der einzige Importeur).

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle,
    XCircle,
    Phone,
    Mail,
    Star,
    MessageSquare,
    ExternalLink,
    GraduationCap,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomContactsList } from '../components/CustomContacts';
import {
    gradeLabel,
    requestStatusMeta,
    type AdRequestItem,
    type RequestPerson,
} from '../components/social/stream';
import {
    StreamCardShell,
    StatusChip,
    TypeChip,
} from '../components/social/StreamChips';

interface RequestCardActions {
    onStatus: (id: string, status: 'accepted' | 'rejected') => Promise<void> | void;
    onComplete: (req: AdRequestItem) => void;
}

/** Eingehende Anfrage: oberste Priorität, solange der Status offen ist. */
export function IncomingRequestCard({ req, onStatus, onComplete }: { req: AdRequestItem } & RequestCardActions) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const statusMeta = requestStatusMeta(req.status);

    const act = async (status: 'accepted' | 'rejected') => {
        setBusy(true);
        try {
            await onStatus(req.id, status);
        } finally {
            setBusy(false);
        }
    };

    return (
        <StreamCardShell>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <TypeChip label="Anfrage · Eingehend" dotClass="bg-primary" icon={MessageSquare} />
                <StatusChip label={statusMeta.label} dotClass={statusMeta.dotClass} />
            </div>

            <div className="mt-3 flex items-start gap-3">
                <Avatar person={req.requester} />
                <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">
                        {req.requester?.display_name || 'Unbekannt'}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <GraduationCap size={13} aria-hidden /> {gradeLabel(req.requester?.grade_level)}
                    </p>
                </div>
            </div>

            {req.ads?.id && <AdLink ad={req.ads} navigate={navigate} />}
            {req.message && <MessageQuote message={req.message} />}

            {req.status === 'pending' && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                        onClick={() => void act('accepted')}
                        disabled={busy}
                        isLoading={busy}
                        className="h-11 flex-1 rounded-full bg-primary px-4 text-sm font-bold text-black"
                    >
                        <CheckCircle size={16} /> Akzeptieren
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => void act('rejected')}
                        disabled={busy}
                        className="h-11 flex-1 rounded-full border-gray-200 bg-white px-4 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-gray-700 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/20"
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
                        <Button
                            className="h-11 flex-1 rounded-full bg-primary px-4 text-sm font-bold text-black"
                            onClick={() => navigate(`/chat/${req.id}`)}
                        >
                            <MessageSquare size={16} /> Chat öffnen
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 flex-1 rounded-full border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-900"
                            onClick={() => onComplete(req)}
                        >
                            <Star size={16} /> Bewerten
                        </Button>
                    </div>
                </div>
            )}
        </StreamCardShell>
    );
}

/** Ausgehende Anfrage: warte auf Antwort – oder Chat, sobald akzeptiert. */
export function OutgoingRequestCard({ req, onComplete }: { req: AdRequestItem } & Pick<RequestCardActions, 'onComplete'>) {
    const navigate = useNavigate();
    const statusMeta = requestStatusMeta(req.status);

    return (
        <StreamCardShell>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <TypeChip label="Anfrage · Ausgehend" dotClass="bg-blue-500" icon={MessageSquare} />
                <StatusChip label={statusMeta.label} dotClass={statusMeta.dotClass} />
            </div>

            <div className="mt-3 flex items-start gap-3">
                <Avatar person={req.owner} />
                <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">
                        Anfrage an {req.owner?.display_name || 'Unbekannt'}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <GraduationCap size={13} aria-hidden /> {gradeLabel(req.owner?.grade_level)}
                    </p>
                </div>
            </div>

            {req.ads?.id && <AdLink ad={req.ads} navigate={navigate} />}
            {req.message && <MessageQuote message={req.message} />}

            {req.status === 'pending' && (
                <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Warte auf Antwort – du bekommst Bescheid, sobald reagiert wird.
                </p>
            )}
            {req.status === 'rejected' && (
                <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
                    Anfrage wurde abgelehnt. Im Feed findest du weitere passende Anzeigen.
                </p>
            )}
            {req.status === 'accepted' && (
                <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800 dark:bg-green-950/30 dark:text-green-300">
                        <CheckCircle size={16} className="shrink-0" aria-hidden /> Kontakt freigeschaltet!
                    </div>
                    <ContactChips person={req.owner} />
                    <CustomContactsList contacts={req.owner?.settings?.custom_contacts} />
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            className="h-11 flex-1 rounded-full bg-primary px-4 text-sm font-bold text-black"
                            onClick={() => navigate(`/chat/${req.id}`)}
                        >
                            <MessageSquare size={16} /> Chat öffnen
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 flex-1 rounded-full border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-900"
                            onClick={() => onComplete(req)}
                        >
                            <Star size={16} /> Bewerten
                        </Button>
                    </div>
                </div>
            )}
        </StreamCardShell>
    );
}

/** Skelett in Karten-Form – verhindert das Aufblitzen des Leerzustands beim Laden. */
export function RequestSkeleton() {
    return (
        <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="h-6 w-36 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-6 w-24 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
            <div className="mt-3 flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                </div>
            </div>
            <div className="mt-4 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            <div className="mt-4 flex gap-2">
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                <div className="h-11 flex-1 rounded-full bg-gray-100 dark:bg-gray-800/70" />
            </div>
        </div>
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

function AdLink({ ad, navigate }: { ad: { id?: string; short_description?: string | null }; navigate: (to: string) => void }) {
    if (!ad.id) return null;
    return (
        <div className="mt-2">
            <p className="truncate px-1 text-xs text-gray-500 dark:text-gray-400">für „{ad.short_description || 'Anzeige'}“</p>
            <button
                type="button"
                onClick={() => navigate(`/ad/${ad.id}`)}
                className="mt-1 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-bold text-gray-600 transition-colors hover:border-primary hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-primary dark:hover:text-gray-100 dark:focus-visible:ring-primary"
            >
                <span>Anzeige ansehen</span>
                <ExternalLink size={13} className="shrink-0" aria-hidden />
            </button>
        </div>
    );
}

/** Nachricht als helle Zitat-Box mit kurzem gelbem Akzentstrich (Signatur). */
function MessageQuote({ message }: { message: string }) {
    return (
        <figure className="mt-3 max-w-[65ch] rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/40">
            <span className="mb-2 block h-1 w-10 rounded-full bg-primary" aria-hidden />
            <blockquote className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                „{message}“
            </blockquote>
        </figure>
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
