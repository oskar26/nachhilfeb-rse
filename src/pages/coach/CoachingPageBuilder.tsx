import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import {
    CoachingView,
    DEFAULT_DESIGN,
    FALLBACK,
    parseCoachingDesign,
    type CoachingSectionId,
    type DesignConfig,
    type PosterBg,
} from '../Coaching';

const RULE_EDIT_SECTIONS = [
    { key: 's_badge', label: 'Abzeichen: Bedeutung' },
    { key: 's_school', label: 'Coaching an der Schule' },
    { key: 's_who', label: 'Wer kann Coach werden' },
    { key: 's_boost', label: 'Anzeigen oben: warum' },
    { key: 's_fair', label: 'Gleiche Chancen' },
    { key: 's_conduct', label: 'Verhalten als Coach' },
    { key: 's_revoke', label: 'Entzug und Widerspruch' },
];

const SECTION_LABELS: Record<CoachingSectionId, string> = {
    plakat: 'A: Plakat',
    ablauf: 'B: Ablauf',
    nutzen: 'C: Nutzen',
    regeln: 'D: Regeln',
    kontakt: 'E: Kontakt',
};

const POSTER_OPTIONS: Array<{ value: PosterBg; label: string; swatch: string }> = [
    { value: 'gelb', label: 'Gelb', swatch: 'bg-primary' },
    { value: 'schwarz', label: 'Schwarz', swatch: 'bg-gray-950' },
    { value: 'blau', label: 'Blau', swatch: 'bg-blue-700' },
];

const textareaCls =
    'w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-primary';

export default function CoachingPageBuilder() {
    const [draft, setDraft] = useState<Record<string, string> | null>(null);
    const [design, setDesign] = useState<DesignConfig>({
        sections: DEFAULT_DESIGN.sections.map(s => ({ ...s })),
        posterBg: DEFAULT_DESIGN.posterBg,
        regelnStil: DEFAULT_DESIGN.regelnStil,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;
        (async () => {
            setLoading(true);
            try {
                const res = await api.coach.getCoachingPage();
                if (res.error) throw new Error(res.error.message || 'Laden fehlgeschlagen');
                const data = ((res.data || {}) as Record<string, unknown>) as Record<string, string>;
                const { layout_json: rawLayout, ...rest } = data as Record<string, string> & { layout_json?: unknown };
                const texts: Record<string, string> = {};
                for (const [k, v] of Object.entries(rest)) {
                    if (typeof v === 'string') texts[k] = v;
                }
                setDraft({ ...FALLBACK, ...texts });
                setDesign(parseCoachingDesign(rawLayout));
                setDirty(false);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Fehler';
                toast.error('Coaching Seite konnte nicht geladen werden: ' + msg);
                setDraft({ ...FALLBACK });
                setDesign({
                    sections: DEFAULT_DESIGN.sections.map(s => ({ ...s })),
                    posterBg: DEFAULT_DESIGN.posterBg,
                    regelnStil: DEFAULT_DESIGN.regelnStil,
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const setText = (key: string, value: string) => {
        setDraft(prev => ({ ...(prev ?? FALLBACK), [key]: value }));
        setDirty(true);
    };

    const moveSection = (index: number, dir: -1 | 1) => {
        triggerHaptic('selection');
        setDesign(prev => {
            const next = prev.sections.map(s => ({ ...s }));
            const target = index + dir;
            if (target < 0 || target >= next.length) return prev;
            const tmp = next[index];
            next[index] = next[target];
            next[target] = tmp;
            return { ...prev, sections: next };
        });
        setDirty(true);
    };

    const toggleSection = (index: number) => {
        triggerHaptic('selection');
        setDesign(prev => {
            const next = prev.sections.map((s, i) => (i === index ? { ...s, visible: !s.visible } : { ...s }));
            return { ...prev, sections: next };
        });
        setDirty(true);
    };

    const handleSave = async () => {
        if (!draft || saving) return;
        triggerHaptic('medium');
        setSaving(true);
        try {
            const payload: Record<string, string> = { ...draft, layout_json: JSON.stringify(design) };
            const res = await api.coach.updateCoachingPage(payload);
            if (res.error) throw new Error(res.error.message || 'Speichern fehlgeschlagen');
            toast.success('Coaching Seite gespeichert.');
            setDirty(false);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Fehler';
            toast.error('Speichern fehlgeschlagen: ' + msg);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        triggerHaptic('medium');
        setDraft({ ...FALLBACK });
        setDesign({
            sections: DEFAULT_DESIGN.sections.map(s => ({ ...s })),
            posterBg: DEFAULT_DESIGN.posterBg,
            regelnStil: DEFAULT_DESIGN.regelnStil,
        });
        setDirty(true);
        toast.success('Vorschau zurückgesetzt. Speichern übernimmt die Änderung.');
    };

    const handlePreviewClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest?.('a');
        if (anchor) {
            e.preventDefault();
            toast('Vorschau: Links sind deaktiviert');
        }
    };

    if (loading && draft === null) {
        return (
            <div className="py-20 text-center">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Baukasten wird geladen...</p>
            </div>
        );
    }

    const previewContent: Record<string, string> = { ...FALLBACK, ...(draft ?? {}) };

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] items-start">
            <div className="max-w-md w-full space-y-4 min-w-0">
                <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Kopf und Kontakt</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Titel, Einleitung und Kontaktzeile der Seite.</p>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="seite-hero-title" className="text-xs font-bold uppercase text-gray-500 ml-1">Titel oben</label>
                            <Input
                                id="seite-hero-title"
                                value={draft?.hero_title ?? ''}
                                onChange={e => setText('hero_title', e.target.value)}
                                className="rounded-xl font-bold"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="seite-hero-subtitle" className="text-xs font-bold uppercase text-gray-500 ml-1">Einleitung</label>
                            <textarea
                                id="seite-hero-subtitle"
                                value={draft?.hero_subtitle ?? ''}
                                onChange={e => setText('hero_subtitle', e.target.value)}
                                rows={4}
                                className={textareaCls}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="seite-contact-text" className="text-xs font-bold uppercase text-gray-500 ml-1">Kontaktzeile</label>
                            <Input
                                id="seite-contact-text"
                                value={draft?.contact_text ?? ''}
                                onChange={e => setText('contact_text', e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                    <CardContent className="p-5 space-y-3">
                        <div className="space-y-1">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Die 7 Regeln</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Je Regel Titel plus Text. Leerzeile trennt Absaetze.</p>
                        </div>
                        {RULE_EDIT_SECTIONS.map(sec => (
                            <details key={sec.key} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                                <summary className="flex min-h-[44px] cursor-pointer items-center px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                    {sec.label}
                                </summary>
                                <div className="space-y-3 p-4 pt-0">
                                    <div className="space-y-1.5">
                                        <label htmlFor={`seite-${sec.key}-title`} className="text-[11px] font-bold uppercase text-gray-500 ml-1">Titel</label>
                                        <Input
                                            id={`seite-${sec.key}-title`}
                                            value={draft?.[`${sec.key}_title`] ?? ''}
                                            onChange={e => setText(`${sec.key}_title`, e.target.value)}
                                            className="rounded-xl font-bold bg-white dark:bg-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor={`seite-${sec.key}-body`} className="text-[11px] font-bold uppercase text-gray-500 ml-1">Text</label>
                                        <textarea
                                            id={`seite-${sec.key}-body`}
                                            value={draft?.[`${sec.key}_body`] ?? ''}
                                            onChange={e => setText(`${sec.key}_body`, e.target.value)}
                                            rows={4}
                                            className={cn(textareaCls, 'bg-white dark:bg-gray-900')}
                                        />
                                    </div>
                                </div>
                            </details>
                        ))}
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                    <CardContent className="p-5 space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Layout und Design</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reihenfolge, Sichtbarkeit, Plakatfarbe, Regelstil.</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-gray-500 ml-1" id="seite-sections-label">Sektionen</p>
                            <ul aria-labelledby="seite-sections-label" className="space-y-2">
                                {design.sections.map((sec, i) => (
                                    <li key={sec.id} className="flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 px-2 py-1.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => toggleSection(i)}
                                            aria-pressed={sec.visible}
                                            aria-label={`${SECTION_LABELS[sec.id]} ${sec.visible ? 'ausblenden' : 'einblenden'}`}
                                            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0"
                                        >
                                            {sec.visible ? <Eye size={18} /> : <EyeOff size={18} className="text-gray-400" />}
                                        </Button>
                                        <span className={cn('flex-1 text-sm font-bold truncate', !sec.visible && 'text-gray-400 line-through')}>
                                            {SECTION_LABELS[sec.id]}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => moveSection(i, -1)}
                                            disabled={i === 0}
                                            aria-label={`${SECTION_LABELS[sec.id]} nach oben`}
                                            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0"
                                        >
                                            <ArrowUp size={18} />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => moveSection(i, 1)}
                                            disabled={i === design.sections.length - 1}
                                            aria-label={`${SECTION_LABELS[sec.id]} nach unten`}
                                            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0"
                                        >
                                            <ArrowDown size={18} />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-gray-500 ml-1" id="seite-poster-label">Plakatfarbe</p>
                            <div role="radiogroup" aria-labelledby="seite-poster-label" className="flex gap-3">
                                {POSTER_OPTIONS.map(opt => {
                                    const selected = design.posterBg === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            aria-label={`Plakat ${opt.label}`}
                                            onClick={() => {
                                                triggerHaptic('selection');
                                                setDesign(prev => ({ ...prev, posterBg: opt.value }));
                                                setDirty(true);
                                            }}
                                            className={cn(
                                                'flex min-h-[44px] flex-1 flex-col items-center gap-1.5 rounded-2xl border p-2 cursor-pointer',
                                                selected
                                                    ? 'border-gray-900 dark:border-white ring-2 ring-[hsl(var(--ring))] dark:ring-primary'
                                                    : 'border-gray-200 dark:border-gray-800'
                                            )}
                                        >
                                            <span className={cn('h-11 w-11 rounded-xl border border-black/10', opt.swatch)} aria-hidden />
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-gray-500 ml-1" id="seite-regeln-label">Regelstil</p>
                            <div role="group" aria-labelledby="seite-regeln-label" className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 dark:bg-gray-800/60 p-1">
                                {[
                                    { value: 'liste' as const, label: 'Liste' },
                                    { value: 'aufklappbar' as const, label: 'Aufklappbar' },
                                ].map(opt => {
                                    const selected = design.regelnStil === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => {
                                                triggerHaptic('selection');
                                                setDesign(prev => ({ ...prev, regelnStil: opt.value }));
                                                setDirty(true);
                                            }}
                                            className={cn(
                                                'min-h-[44px] rounded-xl px-3 text-sm font-bold transition-all cursor-pointer',
                                                selected
                                                    ? 'bg-white dark:bg-gray-900 shadow-xs text-gray-900 dark:text-white'
                                                    : 'text-gray-500'
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="sticky bottom-0 z-10 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4 shadow-sm">
                    {dirty && (
                        <p role="status" className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            Ungespeicherte Änderungen
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="min-h-[44px] flex-1 rounded-full font-bold cursor-pointer"
                        >
                            <RotateCcw size={16} /> Zurücksetzen
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !draft}
                            isLoading={saving}
                            className="min-h-[44px] flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-black cursor-pointer"
                        >
                            {saving ? 'Speichern...' : 'Speichern'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="lg:sticky lg:top-4 min-w-0">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Live Vorschau</p>
                <div
                    onClickCapture={handlePreviewClickCapture}
                    className="max-h-[80vh] overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950"
                >
                    <CoachingView content={previewContent} design={design} />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Vorschau: Links sind ohne Funktion.</p>
            </div>
        </div>
    );
}
