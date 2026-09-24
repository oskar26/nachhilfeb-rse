import {
    Megaphone,
    MessageSquare,
    Star,
    Heart,
    Pencil,
    FileText,
    UserX,
    ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { VerifiedPill } from '../ui/VerifiedPill';
import { Avatar } from './ChildSwitcher';
import { KpiTile } from './shared';
import type { ChildView } from './types';

/**
 * Steckbrief des aktiven Kindes: Identität, KPI-Kacheln, Schnellaktionen und
 * der Fuß zum Aufheben der Verknüpfung. Bleibt beim Scrollen kleben.
 */
export function ChildHeroCard({
    child,
    onEditProfile,
    onConsent,
    onUnlink
}: {
    child: ChildView;
    onEditProfile: () => void;
    onConsent: () => void;
    onUnlink: () => void;
}) {
    const navigate = useNavigate();
    const p = child.profile;
    const name = p.display_name || p.full_name || 'Kind';
    const stats = p.stats;
    const gradeText = p.class_letter ? `Klasse ${p.grade_level}${p.class_letter}` : p.grade_level ? `Klassenstufe ${p.grade_level}` : 'Klassenstufe offen';

    return (
        <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-soft dark:border-gray-800/80 dark:bg-gray-900">
                <div
                    className="h-20 w-full"
                    style={{ background: p.banner_color || 'linear-gradient(135deg,#FACC15 0%,#EAB308 100%)' }}
                    aria-hidden
                />
                <div className="-mt-10 px-5 pb-5">
                    <Avatar url={p.avatar_url} name={name} size="lg" className="ring-4 ring-white dark:ring-gray-900" />
                    <h2 className="mt-3 font-display uppercase leading-none tracking-tight text-xl text-gray-950 dark:text-gray-50">
                        {name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{gradeText}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {p.is_verified && <VerifiedPill />}
                        {p.average_rating > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                <Star size={11} className="fill-current" aria-hidden />
                                <span className="font-mono tabular-nums">{p.average_rating.toFixed(1)}</span>
                                <span className="opacity-70">/ 5</span>
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            Verknüpft seit {child.linkedAt ? new Date(child.linkedAt).toLocaleDateString('de-DE') : '–'}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <KpiTile icon={Megaphone} label="Anzeigen" value={stats.ads_count} />
                        <KpiTile icon={MessageSquare} label="Anfragen" value={stats.requests_count} />
                        <KpiTile icon={Star} label="Bewertungen" value={stats.reviews_count} />
                        <KpiTile icon={Heart} label="Merkliste" value={stats.favorites_count} />
                    </div>
                </div>

                <div className="space-y-2 border-t border-gray-100 p-4 dark:border-gray-800">
                    <Button
                        variant="primary"
                        size="sm"
                        className="w-full justify-start rounded-xl font-bold"
                        onClick={() => navigate('/create-ad', { state: { childId: p.id } })}
                    >
                        <Megaphone size={16} aria-hidden /> Anzeige fürs Kind erstellen
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start rounded-xl font-bold"
                        onClick={onEditProfile}
                    >
                        <Pencil size={16} aria-hidden /> Kind-Profil bearbeiten
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start rounded-xl font-bold"
                        onClick={onConsent}
                    >
                        <FileText size={16} aria-hidden /> Einverständnis (PDF)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start rounded-xl font-bold text-gray-500"
                        onClick={() => navigate(`/profile/${p.id}`)}
                    >
                        <ExternalLink size={16} aria-hidden /> Öffentliches Profil ansehen
                    </Button>
                </div>

                <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={onUnlink}
                    >
                        <UserX size={15} aria-hidden /> Verknüpfung aufheben
                    </Button>
                </div>
            </div>
        </aside>
    );
}
