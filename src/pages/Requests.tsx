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
import { Button } from '../components/ui/button';
import { CustomContactsList } from '../components/CustomContacts';
import { avatarTone } from '../lib/avatar';
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <Avatar person={req.requester} />
                    <h3 className="min-w-0 break-words text-base font-extrabold leading-tight text-foreground">
                        <span className="sr-only">Anfrage von </span>
                        {req.requester?.display_name || 'Unbekannt'}
                    </h3>
                </div>
                <div className="flex shrink-0 flex-row flex-wrap items-center gap-1 sm:flex-col sm:items-end lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-1.5">
                    <TypeChip label="Anfrage · Eingehend" dotClass="bg-primary" icon={MessageSquare} />
                    <StatusChip label={statusMeta.label} dotClass={statusMeta.dotClass} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-pastel-gray px-2.5 py-1 text-xs font-semibold text-pastel-gray-foreground">
                        <GraduationCap size={12} aria-hidden /> {gradeLabel(req.requester?.grade_level)}
                    </span>
                </div>
            </div>

            {req.message && <MessageQuote message={req.message} />}
            {req.ads?.id && <AdLink ad={req.ads} navigate={navigate} />}

            {req.status === 'pending' && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                        onClick={() => void act('accepted')}
                        disabled={busy}
                        isLoading={busy}
                        className="h-11 px-3 text-sm font-semibold"
                    >
                        <CheckCircle size={16} /> Annehmen
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => void act('rejected')}
                        disabled={busy}
                        className="h-11 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                    >
                        <XCircle size={16} /> Ablehnen
                    </Button>
                </div>
            )}

            {req.status === 'accepted' && (
                <div className="mt-4 space-y-3">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckCircle size={16} className="text-pastel-mint-foreground" aria-hidden /> Kontakt freigeschaltet.
                    </p>
                    <ContactChips person={req.requester} />
                    <CustomContactsList contacts={req.requester?.settings?.custom_contacts} />
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            className="h-11 px-3 text-sm font-semibold"
                            onClick={() => navigate(`/chat/${req.id}`)}
                        >
                            <MessageSquare size={16} /> Chat öffnen
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 px-3 text-sm font-semibold"
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <Avatar person={req.owner} />
                    <h3 className="min-w-0 break-words text-base font-extrabold leading-tight text-foreground">
                        <span className="sr-only">Anfrage an </span>
                        {req.owner?.display_name || 'Unbekannt'}
                    </h3>
                </div>
                <div className="flex shrink-0 flex-row flex-wrap items-center gap-1 sm:flex-col sm:items-end lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-1.5">
                    <TypeChip label="Anfrage · Ausgehend" dotClass="bg-muted-foreground" icon={MessageSquare} />
                    <StatusChip label={statusMeta.label} dotClass={statusMeta.dotClass} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-pastel-gray px-2.5 py-1 text-xs font-semibold text-pastel-gray-foreground">
                        <GraduationCap size={12} aria-hidden /> {gradeLabel(req.owner?.grade_level)}
                    </span>
                </div>
            </div>

            {req.message && <MessageQuote message={req.message} />}
            {req.ads?.id && <AdLink ad={req.ads} navigate={navigate} />}

            {req.status === 'pending' && (
                <p className="mt-4 text-sm font-semibold text-muted-foreground">
                    Warte auf Antwort. Du bekommst eine Nachricht, sobald die andere Person reagiert.
                </p>
            )}
            {req.status === 'rejected' && (
                <p className="mt-4 text-sm font-semibold text-destructive">
                    Anfrage wurde abgelehnt. In der Übersicht findest du weitere passende Anzeigen.
                </p>
            )}
            {req.status === 'accepted' && (
                <div className="mt-4 space-y-3">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckCircle size={16} className="text-pastel-mint-foreground" aria-hidden /> Kontakt freigeschaltet.
                    </p>
                    <ContactChips person={req.owner} />
                    <CustomContactsList contacts={req.owner?.settings?.custom_contacts} />
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            className="h-11 px-3 text-sm font-semibold"
                            onClick={() => navigate(`/chat/${req.id}`)}
                        >
                            <MessageSquare size={16} /> Chat öffnen
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 px-3 text-sm font-semibold"
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
        <div className="animate-pulse rounded-card bg-card p-4 shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="h-6 w-36 rounded-full bg-muted" />
                <div className="h-6 w-24 rounded-full bg-muted" />
            </div>
            <div className="mt-3 flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded-full bg-border" />
                    <div className="h-3 w-1/3 rounded-full bg-muted" />
                </div>
            </div>
            <div className="mt-4 h-12 rounded-2xl bg-muted" />
            <div className="mt-4 flex gap-2">
                <div className="h-11 flex-1 rounded-full bg-muted" />
                <div className="h-11 flex-1 rounded-full bg-muted" />
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
            className="size-9 shrink-0 rounded-full object-cover sm:size-11"
        />
    ) : (
        <div className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold sm:size-11 ${avatarTone(person?.display_name)}`} aria-hidden>
            {initial}
        </div>
    );
}

function AdLink({ ad, navigate }: { ad: { id?: string; title?: string | null; short_description?: string | null }; navigate: (to: string) => void }) {
    if (!ad.id) return null;
    return (
        <div className="mt-3">
            <p className="truncate text-xs text-muted-foreground">für „{ad.title || ad.short_description || 'Anzeige'}“</p>
            <Button variant="unstyled" size="unstyled"
                type="button"
                onClick={() => navigate(`/ad/${ad.id}`)}
                className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
            >
                <span>Anzeige ansehen</span>
                <ExternalLink size={14} className="shrink-0" aria-hidden />
            </Button>
        </div>
    );
}

/** Nachricht als helle Zitat-Box mit kurzem gelbem Akzentstrich (Signatur). */
function MessageQuote({ message }: { message: string }) {
    return (
        <figure className="mt-3 max-w-[65ch]">
            <blockquote className="text-sm leading-relaxed text-muted-foreground">
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
            <span key="phone" className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-pastel-blue px-3 py-1.5 text-xs font-semibold text-pastel-blue-foreground">
                <Phone size={13} className="shrink-0" aria-hidden />
                <span className="truncate font-sans tabular-nums">{person.phone_number}</span>
            </span>
        );
    }
    if (person?.email && person?.settings?.email_visible) {
        chips.push(
            <span key="mail" className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-pastel-mint px-3 py-1.5 text-xs font-semibold text-pastel-mint-foreground">
                <Mail size={13} className="shrink-0" aria-hidden />
                <span className="truncate">{person.email}</span>
            </span>
        );
    }
    if (chips.length === 0) return null;
    return <div className="flex flex-wrap gap-2">{chips}</div>;
}
