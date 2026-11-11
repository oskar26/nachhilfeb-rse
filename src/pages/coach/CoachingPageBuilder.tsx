import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Spinner } from '../../components/ui/spinner';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import {
    CoachingView,
    FALLBACK,
    createCoachingTextBlock,
    createDefaultCoachingBlock,
    createDefaultCoachingDocument,
    documentToLegacy,
    parseCoachingDocument,
    type CoachingBenefitsBlock,
    type CoachingBlock,
    type CoachingBlockType,
    type CoachingContactBlock,
    type CoachingDocument,
    type CoachingHeaderBlock,
    type CoachingListItem,
    type CoachingPosterBlock,
    type CoachingRulesBlock,
    type CoachingScheduleDay,
    type CoachingScheduleRow,
    type CoachingStepsBlock,
    type CoachingSupportBlock,
    type CoachingTextBlock,
} from '../Coaching';

const textareaCls = 'w-full rounded-xl border border-input bg-transparent p-3 text-sm text-foreground shadow-soft transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

const BUILTIN_BLOCKS: Array<{ type: Exclude<CoachingBlockType, 'text'>; label: string; description: string }> = [
    { type: 'poster', label: 'Plakat', description: 'Termin, Raum, Kontakt und Anmeldung' },
    { type: 'steps', label: 'Ablauf', description: 'Coach-Schritte und Verifizierung' },
    { type: 'benefits', label: 'Nutzen', description: 'Beispiele, warum das Coaching hilft' },
    { type: 'rules', label: 'Fairness-Regeln', description: 'Regelüberschriften und Texte' },
    { type: 'contact', label: 'Kontakt', description: 'Fragen, E-Mail und Eltern-Leitfaden' },
    { type: 'support', label: 'Förderunterricht', description: 'Anmeldung, Stundenplan und Lerncoaching – wird auch auf der Startseite angezeigt' },
];

const BLOCK_LABELS: Record<CoachingBlockType, string> = {
    poster: 'Plakat',
    steps: 'Ablauf',
    benefits: 'Nutzen',
    rules: 'Fairness-Regeln',
    contact: 'Kontakt',
    support: 'Förderunterricht',
    text: 'Textabschnitt',
};

function editorId(prefix: string): string {
    const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${random}`;
}

function blockTitle(block: CoachingBlock): string {
    return block.title;
}

function EditorField({
    id,
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label htmlFor={id} className="ml-1 text-xs font-medium text-muted-foreground">{label}</Label>
            <Input id={id} type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
        </div>
    );
}

function EditorTextarea({
    id,
    label,
    value,
    onChange,
    rows = 4,
    placeholder,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    placeholder?: string;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label htmlFor={id} className="ml-1 text-xs font-medium text-muted-foreground">{label}</Label>
            <Textarea id={id} value={value} rows={rows} placeholder={placeholder} onChange={event => onChange(event.target.value)} className={textareaCls} />
        </div>
    );
}

function OrderControls({
    name,
    index,
    total,
    onMove,
    onDelete,
}: {
    name: string;
    index: number;
    total: number;
    onMove: (direction: -1 | 1) => void;
    onDelete: () => void;
}) {
    return (
        <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`${name} nach oben`} title="Nach oben" className="h-11 w-11 rounded-xl">
                <ArrowUp size={17} />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`${name} nach unten`} title="Nach unten" className="h-11 w-11 rounded-xl">
                <ArrowDown size={17} />
            </Button>
            <Button type="button" variant="destructive" size="icon" onClick={onDelete} aria-label={`${name} löschen`} title="Löschen" className="h-11 w-11 rounded-xl">
                <Trash2 size={17} />
            </Button>
        </div>
    );
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    return next;
}

function ListItemsEditor({
    idPrefix,
    items,
    onChange,
    addLabel,
    titleLabel = 'Titel',
    bodyLabel = 'Text',
    bodyRows = 4,
}: {
    idPrefix: string;
    items: CoachingListItem[];
    onChange: (items: CoachingListItem[]) => void;
    addLabel: string;
    titleLabel?: string;
    bodyLabel?: string;
    bodyRows?: number;
}) {
    const updateItem = (id: string, patch: Partial<CoachingListItem>) => {
        onChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
    };

    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-muted-foreground">Eintrag {index + 1}</span>
                        <OrderControls
                            name={`Eintrag ${index + 1}`}
                            index={index}
                            total={items.length}
                            onMove={direction => onChange(moveItem(items, index, direction))}
                            onDelete={() => onChange(items.filter(candidate => candidate.id !== item.id))}
                        />
                    </div>
                    <div className="space-y-3">
                        <EditorField id={`${idPrefix}-${item.id}-title`} label={titleLabel} value={item.title} onChange={value => updateItem(item.id, { title: value })} />
                        <EditorTextarea id={`${idPrefix}-${item.id}-body`} label={bodyLabel} value={item.body} onChange={value => updateItem(item.id, { body: value })} rows={bodyRows} />
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => onChange([...items, { id: editorId('item'), title: 'Neuer Eintrag', body: '' }])} className="min-h-11 w-full rounded-xl font-semibold">
                <Plus size={16} /> {addLabel}
            </Button>
        </div>
    );
}

function ParagraphsEditor({ paragraphs, onChange }: { paragraphs: string[]; onChange: (paragraphs: string[]) => void }) {
    return (
        <div className="space-y-3">
            {paragraphs.map((paragraph, index) => (
                <div key={`paragraph-${index}`} className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-muted-foreground">Absatz {index + 1}</span>
                        <OrderControls
                            name={`Absatz ${index + 1}`}
                            index={index}
                            total={paragraphs.length}
                            onMove={direction => onChange(moveItem(paragraphs, index, direction))}
                            onDelete={() => onChange(paragraphs.filter((_, paragraphIndex) => paragraphIndex !== index))}
                        />
                    </div>
                    <EditorTextarea id={`support-paragraph-${index}`} label="Absatztext" value={paragraph} onChange={value => onChange(paragraphs.map((current, paragraphIndex) => paragraphIndex === index ? value : current))} rows={4} />
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => onChange([...paragraphs, ''])} className="min-h-11 w-full rounded-xl font-semibold">
                <Plus size={16} /> Absatz hinzufügen
            </Button>
        </div>
    );
}

function ScheduleEditor({ block, onChange }: { block: CoachingSupportBlock; onChange: (block: CoachingSupportBlock) => void }) {
    const resizeRows = (days: CoachingScheduleDay[], rows: CoachingScheduleRow[]) => rows.map(row => {
        const cells = row.cells.slice(0, days.length);
        while (cells.length < days.length) cells.push({ id: editorId('cell'), text: '' });
        return { ...row, cells };
    });

    const setDays = (days: CoachingScheduleDay[]) => onChange({ ...block, days, rows: resizeRows(days, block.rows) });

    const addDay = () => {
        const day: CoachingScheduleDay = { id: editorId('day'), label: 'Neuer Tag' };
        setDays([...block.days, day]);
    };

    const updateDay = (id: string, label: string) => setDays(block.days.map(day => day.id === id ? { ...day, label } : day));

    const moveDay = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= block.days.length) return;
        const days = moveItem(block.days, index, direction);
        const rows = block.rows.map(row => {
            const cells = moveItem(row.cells, index, direction);
            return { ...row, cells };
        });
        onChange({ ...block, days, rows });
    };

    const deleteDay = (id: string) => {
        const index = block.days.findIndex(day => day.id === id);
        if (index < 0) return;
        setDays(block.days.filter(day => day.id !== id));
    };

    const addRow = () => {
        const row: CoachingScheduleRow = {
            id: editorId('schedule-row'),
            cells: block.days.map(() => ({ id: editorId('cell'), text: '' })),
        };
        onChange({ ...block, rows: [...block.rows, row] });
    };

    const updateRow = (id: string, updater: (row: CoachingScheduleRow) => CoachingScheduleRow) => {
        onChange({ ...block, rows: block.rows.map(row => row.id === id ? updater(row) : row) });
    };

    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-foreground">Tage</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addDay} className="min-h-11 rounded-xl font-semibold">
                        <Plus size={15} /> Tag
                    </Button>
                </div>
                {block.days.map((day, index) => (
                    <div key={day.id} className="rounded-xl border border-border bg-muted/40 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-muted-foreground">Spalte {index + 1}</span>
                            <OrderControls name={`Tag ${index + 1}`} index={index} total={block.days.length} onMove={direction => moveDay(index, direction)} onDelete={() => deleteDay(day.id)} />
                        </div>
                        <EditorField id={`schedule-day-${day.id}`} label="Tagesname" value={day.label} onChange={value => updateDay(day.id, value)} />
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-foreground">Stundenplan</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={block.days.length === 0} className="min-h-11 rounded-xl font-semibold">
                        <Plus size={15} /> Zeile
                    </Button>
                </div>
                {block.rows.map((row, rowIndex) => (
                    <div key={row.id} className="rounded-xl border border-border bg-muted/40 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-muted-foreground">Zeile {rowIndex + 1}</span>
                            <OrderControls
                                name={`Stundenplanzeile ${rowIndex + 1}`}
                                index={rowIndex}
                                total={block.rows.length}
                                onMove={direction => onChange({ ...block, rows: moveItem(block.rows, rowIndex, direction) })}
                                onDelete={() => onChange({ ...block, rows: block.rows.filter(candidate => candidate.id !== row.id) })}
                            />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {block.days.map((day, cellIndex) => {
                                const cell = row.cells[cellIndex];
                                if (!cell) return null;
                                return (
                                    <EditorField
                                        key={cell.id}
                                        id={`schedule-${row.id}-${day.id}`}
                                        label={day.label || `Spalte ${cellIndex + 1}`}
                                        value={cell.text}
                                        onChange={value => updateRow(row.id, current => ({
                                            ...current,
                                            cells: current.cells.map(candidate => candidate.id === cell.id ? { ...candidate, text: value } : candidate),
                                        }))}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BlockFrame({
    block,
    index,
    total,
    onMove,
    onDelete,
    children,
}: {
    block: CoachingBlock;
    index: number;
    total: number;
    onMove: (direction: -1 | 1) => void;
    onDelete: () => void;
    children: ReactNode;
}) {
    return (
        <details id={`editor-${block.id}`} className="group scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card shadow-soft open:shadow-card">
            <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-muted-foreground">{BLOCK_LABELS[block.type]}</span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">{blockTitle(block) || 'Ohne Titel'}</span>
                </span>
                <ChevronDown size={20} className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-border p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Inhalt, Reihenfolge und Löschen</p>
                    <OrderControls name={BLOCK_LABELS[block.type]} index={index} total={total} onMove={onMove} onDelete={onDelete} />
                </div>
                <div className="space-y-5">{children}</div>
            </div>
        </details>
    );
}

function HeaderEditor({ header, onUpdate, onDelete }: { header: CoachingHeaderBlock; onUpdate: (header: CoachingHeaderBlock) => void; onDelete: () => void }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Seitenkopf</p>
                    <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">{header.title || 'Ohne Titel'}</h3>
                </div>
                <Button type="button" variant="destructive" size="icon" onClick={onDelete} aria-label="Seitenkopf löschen" title="Löschen" className="h-11 w-11 rounded-xl">
                    <Trash2 size={17} />
                </Button>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
                <EditorField id="page-header-title" label="Seitentitel" value={header.title} onChange={value => onUpdate({ ...header, title: value })} />
                <EditorTextarea id="page-header-intro" label="Einleitung" value={header.intro} onChange={value => onUpdate({ ...header, intro: value })} rows={6} />
            </div>
        </section>
    );
}

export default function CoachingPageBuilder() {
    const [draft, setDraft] = useState<CoachingDocument | null>(null);
    const [savedJson, setSavedJson] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [saving, setSaving] = useState(false);

    const setDocument = (document: CoachingDocument, saved = false) => {
        setDraft(document);
        if (saved) setSavedJson(JSON.stringify(document));
    };

    const mutate = (updater: (document: CoachingDocument) => CoachingDocument) => {
        setDraft(current => current ? updater(current) : current);
    };

    useEffect(() => {
        let active = true;
        void (async () => {
            try {
                const response = await api.coach.getCoachingPage();
                if (response.error) throw new Error(response.error.message || 'Laden fehlgeschlagen');
                if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
                    throw new Error('Die API-Antwort enthält keine gültigen Coaching-Inhalte.');
                }
                const data = response.data as Record<string, unknown>;
                const hasLegacyContent = Object.keys(FALLBACK).some(key => typeof data[key] === 'string');
                const hasStructuredContent = typeof data.content_json === 'string' && data.content_json.trim().length > 0;
                if (!hasLegacyContent && !hasStructuredContent) {
                    throw new Error('Die API-Antwort enthält keine gespeicherten Coaching-Inhalte.');
                }
                const nextDraft = parseCoachingDocument(data);
                if (!active) return;
                setDraft(nextDraft);
                setSavedJson(JSON.stringify(nextDraft));
            } catch (error: unknown) {
                if (!active) return;
                const message = error instanceof Error ? error.message : 'Fehler';
                setDraft(null);
                setSavedJson('');
                setLoadError(message);
                toast.error('Coaching-Inhalte konnten nicht geladen werden: ' + message);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [reloadKey]);

    const updateBlock = (id: string, next: CoachingBlock) => {
        mutate(document => ({
            ...document,
            blocks: document.blocks.map(block => block.id === id ? next : block),
        }));
    };

    const moveBlock = (index: number, direction: -1 | 1) => {
        triggerHaptic('selection');
        mutate(document => ({ ...document, blocks: moveItem(document.blocks, index, direction) }));
    };

    const deleteBlock = (block: CoachingBlock) => {
        triggerHaptic('medium');
        mutate(document => ({ ...document, blocks: document.blocks.filter(candidate => candidate.id !== block.id) }));
        toast(`${BLOCK_LABELS[block.type]} wurde aus der Vorschau entfernt. Speichern übernimmt die Änderung.`);
    };

    const addBlock = (type: CoachingBlockType) => {
        triggerHaptic('selection');
        const block = type === 'text' ? createCoachingTextBlock() : createDefaultCoachingBlock(type);
        mutate(document => ({ ...document, blocks: [...document.blocks, block] }));
        window.setTimeout(() => document.getElementById(`editor-${block.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    };

    const handleSave = async () => {
        if (!draft || saving) return;
        triggerHaptic('medium');
        const contentJson = JSON.stringify(draft);
        setSaving(true);
        try {
            const response = await api.coach.updateCoachingPage({
                ...documentToLegacy(draft),
                content_json: contentJson,
            });
            if (response.error) throw new Error(response.error.message || 'Speichern fehlgeschlagen');
            setSavedJson(contentJson);
            toast.success('Coaching-Inhalte gespeichert.');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Fehler';
            toast.error('Speichern fehlgeschlagen: ' + message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        triggerHaptic('medium');
        setDocument(createDefaultCoachingDocument());
        toast.success('Standardinhalte in der Vorschau wiederhergestellt. Speichern übernimmt die Änderung.');
    };

    const handlePreviewClickCapture = (event: MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest?.('a');
        if (anchor) {
            event.preventDefault();
            toast('Vorschau: Links sind deaktiviert');
        }
    };

    if (loading && draft === null) {
        return (
            <div className="py-20 text-center">
                <Spinner className="mx-auto mb-3 size-6 text-brand-ink dark:text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Coaching-Inhalte werden geladen …</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <h2 className="text-lg font-semibold text-destructive">Coaching-Inhalte konnten nicht geladen werden</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-foreground/80">Die gespeicherten Inhalte wurden nicht verändert. Bitte lade sie erneut, bevor du bearbeitest oder speicherst.</p>
                <p className="mt-2 break-words text-xs text-muted-foreground">{loadError}</p>
                <Button type="button" variant="outline" onClick={() => { setLoading(true); setLoadError(''); setReloadKey(current => current + 1); }} className="mt-4 min-h-11 rounded-xl font-semibold">
                    <RotateCcw size={16} aria-hidden /> Erneut laden
                </Button>
            </div>
        );
    }

    if (!draft) return null;
    const dirty = JSON.stringify(draft) !== savedJson;

    const renderBlockEditor = (block: CoachingBlock, index: number): ReactNode => {
        const frame = (children: ReactNode) => (
            <BlockFrame
                key={block.id}
                block={block}
                index={index}
                total={draft.blocks.length}
                onMove={direction => moveBlock(index, direction)}
                onDelete={() => deleteBlock(block)}
            >
                {children}
            </BlockFrame>
        );

        if (block.type === 'poster') {
            const poster: CoachingPosterBlock = block;
            return frame(
                <div className="grid gap-4 sm:grid-cols-2">
                    <EditorField id={`${poster.id}-stamp`} label="Stempel" value={poster.stamp} onChange={value => updateBlock(poster.id, { ...poster, stamp: value })} />
                    <EditorField id={`${poster.id}-title`} label="Hauptitel" value={poster.title} onChange={value => updateBlock(poster.id, { ...poster, title: value })} />
                    <EditorField id={`${poster.id}-time`} label="Uhrzeit / Wochentag" value={poster.time} onChange={value => updateBlock(poster.id, { ...poster, time: value })} />
                    <EditorField id={`${poster.id}-room`} label="Raum / Treffpunkt" value={poster.room} onChange={value => updateBlock(poster.id, { ...poster, room: value })} />
                    <div className="sm:col-span-2"><EditorField id={`${poster.id}-contact`} label="Kontaktzeile" value={poster.contactText} onChange={value => updateBlock(poster.id, { ...poster, contactText: value })} /></div>
                    <EditorField id={`${poster.id}-email`} label="E-Mail-Adresse" type="email" value={poster.email} onChange={value => updateBlock(poster.id, { ...poster, email: value })} />
                    <EditorField id={`${poster.id}-subject`} label="Betreff der Anmeldung" value={poster.mailSubject} onChange={value => updateBlock(poster.id, { ...poster, mailSubject: value })} />
                    <EditorField id={`${poster.id}-cta`} label="Text des Anmelde-Buttons" value={poster.ctaLabel} onChange={value => updateBlock(poster.id, { ...poster, ctaLabel: value })} />
                    <EditorField id={`${poster.id}-hint`} label="Hinweis neben dem Button" value={poster.hint} onChange={value => updateBlock(poster.id, { ...poster, hint: value })} />
                </div>
            );
        }

        if (block.type === 'steps') {
            const steps: CoachingStepsBlock = block;
            return frame(
                <>
                    <EditorField id={`${steps.id}-title`} label="Überschrift" value={steps.title} onChange={value => updateBlock(steps.id, { ...steps, title: value })} />
                    <div>
                        <h4 className="mb-3 text-sm font-semibold text-foreground">Coach werden</h4>
                        <ListItemsEditor idPrefix={`${steps.id}-step`} items={steps.items} onChange={items => updateBlock(steps.id, { ...steps, items })} addLabel="Schritt hinzufügen" />
                    </div>
                    <EditorTextarea id={`${steps.id}-note`} label="Hinweis unter den Schritten" value={steps.note} onChange={value => updateBlock(steps.id, { ...steps, note: value })} rows={4} />
                    <div className="space-y-4 border-t border-border pt-5 ">
                        <EditorField id={`${steps.id}-verification-title`} label="Überschrift der Verifizierung" value={steps.verificationTitle} onChange={value => updateBlock(steps.id, { ...steps, verificationTitle: value })} />
                        <div>
                            <h4 className="mb-3 text-sm font-semibold text-foreground">Verifizierung in der App</h4>
                            <ListItemsEditor idPrefix={`${steps.id}-verify`} items={steps.verificationItems} onChange={verificationItems => updateBlock(steps.id, { ...steps, verificationItems })} addLabel="Verifizierungsschritt hinzufügen" bodyRows={3} />
                        </div>
                    </div>
                </>
            );
        }

        if (block.type === 'benefits') {
            const benefits: CoachingBenefitsBlock = block;
            return frame(
                <>
                    <EditorField id={`${benefits.id}-title`} label="Überschrift" value={benefits.title} onChange={value => updateBlock(benefits.id, { ...benefits, title: value })} />
                    <ListItemsEditor idPrefix={`${benefits.id}-benefit`} items={benefits.items} onChange={items => updateBlock(benefits.id, { ...benefits, items })} addLabel="Nutzen hinzufügen" bodyRows={3} />
                </>
            );
        }

        if (block.type === 'rules') {
            const rules: CoachingRulesBlock = block;
            return frame(
                <>
                    <EditorField id={`${rules.id}-title`} label="Überschrift" value={rules.title} onChange={value => updateBlock(rules.id, { ...rules, title: value })} />
                    <ListItemsEditor idPrefix={`${rules.id}-rule`} items={rules.items} onChange={items => updateBlock(rules.id, { ...rules, items })} addLabel="Regel hinzufügen" />
                </>
            );
        }

        if (block.type === 'contact') {
            const contact: CoachingContactBlock = block;
            return frame(
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><EditorField id={`${contact.id}-title`} label="Überschrift" value={contact.title} onChange={value => updateBlock(contact.id, { ...contact, title: value })} /></div>
                    <div className="sm:col-span-2"><EditorTextarea id={`${contact.id}-text`} label="Kontakttext" value={contact.text} onChange={value => updateBlock(contact.id, { ...contact, text: value })} rows={4} /></div>
                    <div className="sm:col-span-2"><EditorField id={`${contact.id}-email`} label="E-Mail-Adresse" type="email" value={contact.email} onChange={value => updateBlock(contact.id, { ...contact, email: value })} /></div>
                    <EditorField id={`${contact.id}-parent-text`} label="Text für Elternbereich" value={contact.parentText} onChange={value => updateBlock(contact.id, { ...contact, parentText: value })} />
                    <EditorField id={`${contact.id}-parent-label`} label="Linktext" value={contact.parentLinkLabel} onChange={value => updateBlock(contact.id, { ...contact, parentLinkLabel: value })} />
                    <div className="sm:col-span-2"><EditorField id={`${contact.id}-parent-path`} label="Linkziel (interner Pfad)" value={contact.parentLinkPath} onChange={value => updateBlock(contact.id, { ...contact, parentLinkPath: value })} placeholder="/eltern-leitfaden" /></div>
                </div>
            );
        }

        if (block.type === 'support') {
            const support: CoachingSupportBlock = block;
            return frame(
                <div className="space-y-5">
                    <EditorField id={`${support.id}-title`} label="Überschrift" value={support.title} onChange={value => updateBlock(support.id, { ...support, title: value })} />
                    <div>
                        <h4 className="mb-3 text-sm font-semibold text-foreground">Beschreibung</h4>
                        <ParagraphsEditor paragraphs={support.paragraphs} onChange={paragraphs => updateBlock(support.id, { ...support, paragraphs })} />
                    </div>
                    <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 ">
                        <EditorField id={`${support.id}-registration-text`} label="Text vor Anmeldungs-E-Mail" value={support.registrationText} onChange={value => updateBlock(support.id, { ...support, registrationText: value })} />
                        <EditorField id={`${support.id}-registration-email`} label="Anmeldungs-E-Mail" type="email" value={support.registrationEmail} onChange={value => updateBlock(support.id, { ...support, registrationEmail: value })} />
                    </div>
                    <div className="border-t border-border pt-5 ">
                        <h4 className="mb-3 text-sm font-semibold text-foreground">Stundenplan</h4>
                        <ScheduleEditor block={support} onChange={next => updateBlock(support.id, next)} />
                    </div>
                    <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 ">
                        <EditorTextarea id={`${support.id}-learn-text`} label="Text zum Lerncoaching" value={support.learnCoachingText} onChange={value => updateBlock(support.id, { ...support, learnCoachingText: value })} rows={5} />
                        <EditorField id={`${support.id}-learn-email`} label="Lerncoaching-E-Mail" type="email" value={support.learnCoachingEmail} onChange={value => updateBlock(support.id, { ...support, learnCoachingEmail: value })} />
                    </div>
                </div>
            );
        }

        const text: CoachingTextBlock = block;
        return frame(
            <>
                <EditorField id={`${text.id}-title`} label="Überschrift" value={text.title} onChange={value => updateBlock(text.id, { ...text, title: value })} />
                <EditorTextarea id={`${text.id}-body`} label="Text" value={text.body} onChange={value => updateBlock(text.id, { ...text, body: value })} rows={8} />
            </>
        );
    };

    return (
        <div className="min-w-0">
            <div className="sticky top-2 z-30 rounded-2xl border border-border bg-card/95 p-3 shadow-card backdrop-blur sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-foreground">Coaching-Inhalte</h2>
                        <p role="status" className={cn('mt-0.5 flex items-center gap-1.5 text-xs font-medium', dirty ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
                            {dirty ? <span className="size-2 rounded-full bg-amber-500" aria-hidden /> : <Check size={16} aria-hidden />}
                            {dirty ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" variant="outline" onClick={handleReset} className="min-h-11 rounded-xl font-semibold">
                            <RotateCcw size={16} aria-hidden /> Auf Standard zurücksetzen
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={saving} isLoading={saving} className="min-h-11 rounded-xl font-semibold">
                            {saving ? 'Speichern …' : 'Inhalte speichern'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(400px,0.85fr)] 2xl:gap-6">
                <div className="min-w-0 space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                        <h3 className="text-base font-semibold text-foreground">Texte und Kontaktdaten</h3>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Alle Inhalte der Coaching-Seite sind hier bearbeitbar. Blöcke lassen sich hinzufügen, umsortieren oder löschen; das bestehende Design bleibt unverändert.</p>
                    </div>

                    {draft.header ? (
                        <HeaderEditor
                            header={draft.header}
                            onUpdate={header => mutate(document => ({ ...document, header }))}
                            onDelete={() => {
                                mutate(document => ({ ...document, header: null }));
                                toast('Seitenkopf wurde entfernt. Speichern übernimmt die Änderung.');
                            }}
                        />
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center">
                            <p className="text-sm font-semibold text-foreground">Der Seitenkopf ist gelöscht.</p>
                            <Button type="button" variant="outline" onClick={() => mutate(document => ({ ...document, header: { id: 'header', type: 'header', title: 'Coaching-AG am FWG', intro: '' } }))} className="mt-3 min-h-11 rounded-xl font-semibold">
                                <Plus size={16} aria-hidden /> Seitenkopf hinzufügen
                            </Button>
                        </div>
                    )}

                    {draft.blocks.length > 0 ? draft.blocks.map(renderBlockEditor) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
                            <h3 className="text-base font-semibold text-foreground">Noch keine Inhaltsblöcke</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Füge unten einen Standardblock oder einen eigenen Textabschnitt hinzu.</p>
                        </div>
                    )}

                    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                        <h3 className="text-base font-semibold text-foreground">Block hinzufügen</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Gelöschte Standardblöcke können jederzeit wieder hinzugefügt werden.</p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {BUILTIN_BLOCKS.map(candidate => {
                                const exists = draft.blocks.some(block => block.type === candidate.type);
                                return (
                                    <Button
                                        key={candidate.type}
                                        type="button"
                                        variant="outline"
                                        disabled={exists}
                                        onClick={() => addBlock(candidate.type)}
                                        className="min-h-14 justify-start rounded-xl px-4 text-left"
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold">{candidate.label}</span>
                                            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{exists ? 'Bereits vorhanden' : candidate.description}</span>
                                        </span>
                                    </Button>
                                );
                            })}
                            <Button type="button" variant="outline" onClick={() => addBlock('text')} className="min-h-14 justify-start rounded-xl px-4 text-left">
                                <span>
                                    <span className="block text-sm font-semibold">Eigener Textabschnitt</span>
                                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Freier Titel und Freitext</span>
                                </span>
                            </Button>
                        </div>
                    </section>
                </div>

                <aside className="min-w-0 xl:sticky xl:top-24">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-foreground">Live-Vorschau</h3>
                        <span className="text-xs text-muted-foreground">Links sind deaktiviert</span>
                    </div>
                    <div onClickCapture={handlePreviewClickCapture} className="max-h-[calc(100vh-8rem)] overflow-auto rounded-2xl border border-border bg-muted/40 shadow-soft">
                        <CoachingView document={draft} preview />
                    </div>
                </aside>
            </div>
        </div>
    );
}
