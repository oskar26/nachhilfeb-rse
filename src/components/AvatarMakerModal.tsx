import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Shapes, Type, PenTool, Upload, RotateCcw, Trash2, Check, Sparkles, X, BookOpen, Pencil, GraduationCap, FlaskConical, Calculator, Lightbulb, Brain, Backpack, NotebookPen, Laptop, Palette, Globe, Smile, Laugh, Rocket, Star, Flame, Zap, Heart, ThumbsUp, Trophy, Music, Gamepad2, Bike, Dumbbell, Guitar, Headphones, Target, Camera, Medal, Flag, Puzzle, Dices, Timer, Tent, type LucideIcon } from 'lucide-react';
import { compressImage } from '../lib/image';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

interface AvatarMakerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (avatarUrl: string) => void | boolean | Promise<boolean>;
    initialName?: string;
}

interface SymbolItem {
    name: string;
    label: string;
    Icon: LucideIcon;
}

const SYMBOL_CATEGORIES: { name: string; items: SymbolItem[] }[] = [
    {
        name: 'Schule & Lernen',
        items: [
            { name: 'BookOpen', label: 'Buch', Icon: BookOpen },
            { name: 'Pencil', label: 'Stift', Icon: Pencil },
            { name: 'GraduationCap', label: 'Abschluss-Hut', Icon: GraduationCap },
            { name: 'FlaskConical', label: 'Experiment', Icon: FlaskConical },
            { name: 'Calculator', label: 'Taschenrechner', Icon: Calculator },
            { name: 'Lightbulb', label: 'Idee', Icon: Lightbulb },
            { name: 'Brain', label: 'Kopf', Icon: Brain },
            { name: 'Backpack', label: 'Rucksack', Icon: Backpack },
            { name: 'NotebookPen', label: 'Heft', Icon: NotebookPen },
            { name: 'Laptop', label: 'Laptop', Icon: Laptop },
            { name: 'Palette', label: 'Kunst', Icon: Palette },
            { name: 'Globe', label: 'Welt', Icon: Globe },
        ]
    },
    {
        name: 'Vibes & Symbole',
        items: [
            { name: 'Smile', label: 'Lächeln', Icon: Smile },
            { name: 'Laugh', label: 'Lachen', Icon: Laugh },
            { name: 'Rocket', label: 'Rakete', Icon: Rocket },
            { name: 'Star', label: 'Stern', Icon: Star },
            { name: 'Flame', label: 'Flamme', Icon: Flame },
            { name: 'Sparkles', label: 'Funkeln', Icon: Sparkles },
            { name: 'Zap', label: 'Blitz', Icon: Zap },
            { name: 'Heart', label: 'Herz', Icon: Heart },
            { name: 'ThumbsUp', label: 'Daumen hoch', Icon: ThumbsUp },
            { name: 'Trophy', label: 'Pokal', Icon: Trophy },
            { name: 'Music', label: 'Musik', Icon: Music },
            { name: 'Gamepad2', label: 'Gaming', Icon: Gamepad2 },
        ]
    },
    {
        name: 'Sport & Hobbys',
        items: [
            { name: 'Bike', label: 'Fahrrad', Icon: Bike },
            { name: 'Dumbbell', label: 'Fitness', Icon: Dumbbell },
            { name: 'Guitar', label: 'Gitarre', Icon: Guitar },
            { name: 'Headphones', label: 'Kopfhörer', Icon: Headphones },
            { name: 'Target', label: 'Ziel', Icon: Target },
            { name: 'Camera', label: 'Kamera', Icon: Camera },
            { name: 'Medal', label: 'Medaille', Icon: Medal },
            { name: 'Flag', label: 'Flagge', Icon: Flag },
            { name: 'Puzzle', label: 'Puzzle', Icon: Puzzle },
            { name: 'Dices', label: 'Würfel', Icon: Dices },
            { name: 'Timer', label: 'Stoppuhr', Icon: Timer },
            { name: 'Tent', label: 'Zelten', Icon: Tent },
        ]
    }
];

const SYMBOL_MAP: Record<string, LucideIcon> = Object.fromEntries(
    SYMBOL_CATEGORIES.flatMap(cat => cat.items.map(item => [item.name, item.Icon]))
);

const BG_PALETTES = [
    '#facc15', // Gold
    '#38bdf8', // Sky
    '#4ade80', // Green
    '#f472b6', // Pink
    '#a78bfa', // Purple
    '#fb923c', // Orange
    '#2dd4bf', // Teal
    '#1e293b', // Dark Slate
];

const MONOGRAM_FONTS = [
    { label: 'Modern Sans', font: 'system-ui, -apple-system, sans-serif', weight: 'bold' },
    { label: 'Impact', font: 'Impact, sans-serif', weight: 'normal' },
    { label: 'Serif Elegant', font: 'Georgia, serif', weight: 'bold' },
    { label: 'Monospace', font: 'monospace', weight: 'bold' }
];

export default function AvatarMakerModal({ isOpen, onClose, onSave, initialName = '' }: AvatarMakerModalProps) {
    const [mode, setMode] = useState<'symbol' | 'text' | 'draw' | 'upload'>('symbol');

    // Symbol Tab State
    const [selectedSymbol, setSelectedSymbol] = useState('GraduationCap');
    const [symbolBg, setSymbolBg] = useState('#facc15');
    const symbolPreviewRef = useRef<HTMLSpanElement | null>(null);

    // Text Tab State
    const derivedInitials = initialName
        ? initialName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'FW';
    const [textInitials, setTextInitials] = useState(derivedInitials);
    const [textBg, setTextBg] = useState('#38bdf8');
    const [textColor, setTextColor] = useState('#ffffff');
    const [textFontIndex, setTextFontIndex] = useState(0);

    // Drawing Tab State
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(6);
    const [drawBg] = useState('#ffffff');
    const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

    // Upload Tab State
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    const initDrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill background
        ctx.fillStyle = drawBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setDrawHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    useEffect(() => {
        if (mode === 'draw') {
            initDrawCanvas();
        }
    }, [mode, drawBg]);

    // --- Drawing Handlers (Touch & Mouse) ---
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e && e.touches.length > 0) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY
            };
        } else if ('clientX' in e) {
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }
        return { x: 0, y: 0 };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { x, y } = getCoordinates(e);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.closePath();
        // Save history for undo
        const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setDrawHistory(prev => [...prev.slice(-15), state]);
    };

    const handleUndo = () => {
        if (drawHistory.length <= 1) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const newHistory = [...drawHistory];
        newHistory.pop(); // remove current state
        const prevState = newHistory[newHistory.length - 1];
        ctx.putImageData(prevState, 0, 0);
        setDrawHistory(newHistory);
        triggerHaptic('light');
    };

    const handleClearDraw = () => {
        initDrawCanvas();
        triggerHaptic('medium');
    };

    // --- Generate Final Output Image Data URL ---
    // Rendert das in der Vorschau angezeigte Lucide-SVG in das Avatar-Canvas.
    const renderSymbolToCanvas = (ctx: CanvasRenderingContext2D, size: number): Promise<void> => {
        const svgEl = symbolPreviewRef.current?.querySelector('svg');
        if (!svgEl) return Promise.reject(new Error('Symbol-Vorschau nicht gefunden'));
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', '160');
        clone.setAttribute('height', '160');
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, size / 2 - 80, size / 2 - 80, 160, 160);
                resolve();
            };
            img.onerror = () => reject(new Error('Symbol konnte nicht gezeichnet werden'));
            img.src = svgUrl;
        });
    };

    const generateAvatarUrl = async (): Promise<string | null> => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        if (mode === 'symbol') {
            // Background
            ctx.fillStyle = symbolBg;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Symbol (aus der Live-Vorschau übernommen)
            await renderSymbolToCanvas(ctx, size);
            return canvas.toDataURL('image/png');
        }

        if (mode === 'text') {
            // Background
            ctx.fillStyle = textBg;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Text
            const fontObj = MONOGRAM_FONTS[textFontIndex];
            ctx.fillStyle = textColor;
            ctx.font = `${fontObj.weight} 100px ${fontObj.font}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((textInitials || 'FW').toUpperCase(), size / 2, size / 2 + 6);
            return canvas.toDataURL('image/png');
        }

        if (mode === 'draw') {
            const drawCanvas = canvasRef.current;
            if (!drawCanvas) return null;
            // Draw into circular clipped canvas
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(drawCanvas, 0, 0, size, size);
            ctx.restore();
            return canvas.toDataURL('image/png');
        }

        if (mode === 'upload') {
            return uploadedUrl;
        }

        return null;
    };

    const handleSave = async () => {
        let url: string | null = null;
        try {
            url = await generateAvatarUrl();
        } catch {
            url = null;
        }
        if (!url) {
            toast.error("Bitte wähle oder erstelle ein Profilbild.");
            return;
        }
        triggerHaptic('success');
        // onSave meldet zurück, ob das Bild serverseitig gespeichert werden konnte;
        // den Erfolgs-Toast gibt es nur bei bestätigtem Speichern (Fehler meldet der Aufrufer).
        const saved = await onSave(url);
        if (saved !== false) {
            toast.success("Profilbild aktualisiert.");
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogContent showCloseButton={false} className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-lg">
                <DialogHeader className="relative border-b border-border p-5 pr-16 sm:p-6 sm:pb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-foreground" aria-hidden />
                        <DialogTitle className="text-base font-semibold">Profilbild erstellen</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Wähle ein Symbol, Initialen, zeichne selbst oder lade ein Foto hoch.
                    </DialogDescription>
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={onClose}
                        aria-label="Profilbild-Dialog schließen"
                        className="absolute right-2 top-2 grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X size={18} aria-hidden />
                    </Button>
                </DialogHeader>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 gap-1.5 border-b border-border bg-muted/40 p-2 sm:grid-cols-4">
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={() => { triggerHaptic('selection'); setMode('symbol'); }}
                        aria-pressed={mode === 'symbol'}
                        className={cn(
                            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                            mode === 'symbol' ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                        )}
                    >
                        <Shapes size={15} /> Symbol
                    </Button>
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={() => { triggerHaptic('selection'); setMode('text'); }}
                        aria-pressed={mode === 'text'}
                        className={cn(
                            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                            mode === 'text' ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                        )}
                    >
                        <Type size={15} /> Text / Initialen
                    </Button>
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={() => { triggerHaptic('selection'); setMode('draw'); }}
                        aria-pressed={mode === 'draw'}
                        className={cn(
                            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                            mode === 'draw' ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                        )}
                    >
                        <PenTool size={15} /> Zeichnen
                    </Button>
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={() => { triggerHaptic('selection'); setMode('upload'); }}
                        aria-pressed={mode === 'upload'}
                        className={cn(
                            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                            mode === 'upload' ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                        )}
                    >
                        <Upload size={15} /> Foto
                    </Button>
                </div>

                <div className="space-y-5 p-4 sm:p-6">
                    {/* Live Preview Bubble */}
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div
                            className="flex size-32 items-center justify-center overflow-hidden rounded-lg border-4 border-card bg-muted"
                            style={{
                                backgroundColor: mode === 'symbol' ? symbolBg : mode === 'text' ? textBg : undefined
                            }}
                        >
                            {mode === 'symbol' && (() => {
                                const SelectedIcon = SYMBOL_MAP[selectedSymbol] || GraduationCap;
                                return (
                                    <span ref={symbolPreviewRef} className="flex select-none items-center justify-center text-white">
                                        <SelectedIcon size={52} strokeWidth={1.8} />
                                    </span>
                                );
                            })()}
                            {mode === 'text' && (
                                <span
                                    className="select-none text-3xl font-semibold"
                                    style={{
                                        color: textColor,
                                        fontFamily: MONOGRAM_FONTS[textFontIndex].font
                                    }}
                                >
                                    {(textInitials || 'FW').toUpperCase()}
                                </span>
                            )}
                            {mode === 'draw' && (
                                <canvas
                                    ref={canvasRef}
                                    width={240}
                                    height={240}
                                    className="w-full h-full cursor-crosshair touch-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                            )}
                            {mode === 'upload' && (
                                uploadedUrl ? (
                                    <img src={uploadedUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Upload size={28} className="text-muted-foreground" />
                                )
                            )}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Vorschau</span>
                    </div>

                    {/* MODE 1: SYMBOL */}
                    {mode === 'symbol' && (
                        <div className="space-y-4">
                            {/* Color Selector */}
                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-foreground/80">Hintergrundfarbe</Label>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {BG_PALETTES.map(color => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={color}
                                            onClick={() => setSymbolBg(color)}
                                            aria-label={`Hintergrundfarbe ${color}`}
                                            aria-pressed={symbolBg === color}
                                            className={cn(
                                                "grid size-11 shrink-0 place-items-center rounded-lg border-2 transition-colors",
                                                symbolBg === color ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"
                                            )}
                                        >
                                            <span className="block size-7 rounded-lg border border-border" style={{ backgroundColor: color }} />
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Symbol List */}
                            <div className="space-y-3">
                                {SYMBOL_CATEGORIES.map(cat => (
                                    <div key={cat.name}>
                                        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{cat.name}</span>
                                        <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-border bg-muted/40 p-2 sm:grid-cols-6">
                                            {cat.items.map(({ name, label, Icon }) => (
                                                <Button variant="unstyled" size="unstyled" type="button"
                                                    key={name}
                                                    title={label}
                                                    aria-label={label}
                                                    aria-pressed={selectedSymbol === name}
                                                    onClick={() => {
                                                        triggerHaptic('light');
                                                        setSelectedSymbol(name);
                                                    }}
                                                    className={cn(
                                                        "grid size-11 select-none place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                                                        selectedSymbol === name && "border border-border bg-card text-foreground"
                                                    )}
                                                >
                                                    <Icon size={24} />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODE 2: TEXT / MONOGRAM */}
                    {mode === 'text' && (
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-foreground/80">Deine Initialen (max. 2 Buchstaben)</Label>
                                <Input
                                    type="text"
                                    maxLength={2}
                                    value={textInitials}
                                    onChange={(e) => setTextInitials(e.target.value.toUpperCase())}
                                    placeholder="z.B. MK"
                                    className="w-full text-center text-xl font-semibold"
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-foreground/80">Schriftstil</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {MONOGRAM_FONTS.map((font, idx) => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={font.label}
                                            onClick={() => setTextFontIndex(idx)}
                                            aria-pressed={textFontIndex === idx}
                                            className={cn(
                                                "min-h-11 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors",
                                                textFontIndex === idx
                                                    ? "border-primary bg-muted font-semibold text-foreground"
                                                    : "border-border hover:bg-muted"
                                            )}
                                        >
                                            {font.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-foreground/80">Hintergrundfarbe</Label>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {BG_PALETTES.map(color => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={color}
                                            onClick={() => setTextBg(color)}
                                            aria-label={`Hintergrundfarbe ${color}`}
                                            aria-pressed={textBg === color}
                                            className={cn(
                                                "grid size-11 shrink-0 place-items-center rounded-lg border-2 transition-colors",
                                                textBg === color ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"
                                            )}
                                        >
                                            <span className="block size-7 rounded-lg border border-border" style={{ backgroundColor: color }} />
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-foreground/80">Textfarbe</Label>
                                <div className="flex items-center gap-2">
                                    {['#ffffff', '#000000', '#facc15', '#1e293b'].map(c => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={c}
                                            onClick={() => setTextColor(c)}
                                            aria-label={`Textfarbe ${c}`}
                                            aria-pressed={textColor === c}
                                            className={cn(
                                                "grid size-11 shrink-0 place-items-center rounded-lg border-2 transition-colors",
                                                textColor === c ? "border-primary ring-2 ring-primary/30" : "border-border"
                                            )}
                                        >
                                            <span className="block size-7 rounded-lg border border-border" style={{ backgroundColor: c }} />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODE 3: DRAW */}
                    {mode === 'draw' && (
                        <div className="space-y-4">
                            <p className="text-xs text-muted-foreground text-center">
                                Zeichne direkt in den Kreis oben mit der Maus oder dem Finger!
                            </p>

                            {/* Tool Controls */}
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
                                {/* Color Palette */}
                                <div className="flex w-full items-center gap-1.5 overflow-x-auto">
                                    {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff'].map(col => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={col}
                                            onClick={() => setBrushColor(col)}
                                            aria-label={col === '#ffffff' ? 'Radierer / Weiß' : `Farbe ${col}`}
                                            aria-pressed={brushColor === col}
                                            className={cn(
                                                "grid size-11 shrink-0 place-items-center rounded-lg border transition-colors",
                                                brushColor === col ? "border-primary ring-2 ring-primary/30" : "border-border"
                                            )}
                                            title={col === '#ffffff' ? 'Radierer / Weiß' : col}
                                        >
                                            <span className="block size-7 rounded-lg border border-border" style={{ backgroundColor: col }} />
                                        </Button>
                                    ))}
                                </div>

                                {/* Brush Size */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {[3, 7, 14].map(size => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={size}
                                            onClick={() => setBrushSize(size)}
                                            aria-label={`Strichstärke ${size}`}
                                            aria-pressed={brushSize === size}
                                            className={cn(
                                                "grid size-11 place-items-center rounded-lg border transition-colors",
                                                brushSize === size ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border hover:bg-muted"
                                            )}
                                        >
                                            <div
                                                style={{ width: Math.min(14, size), height: Math.min(14, size) }}
                                                className="bg-current rounded-full"
                                            />
                                        </Button>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="unstyled" size="unstyled" type="button"
                                        onClick={handleUndo}
                                        disabled={drawHistory.length <= 1}
                                        aria-label="Rückgängig"
                                        className="grid size-11 place-items-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-40"
                                        title="Rückgängig"
                                    >
                                        <RotateCcw size={16} aria-hidden />
                                    </Button>
                                    <Button variant="unstyled" size="unstyled" type="button"
                                        onClick={handleClearDraw}
                                        aria-label="Leinwand löschen"
                                        className="grid size-11 place-items-center rounded-lg border border-destructive/25 text-destructive transition-colors hover:bg-destructive/10"
                                        title="Leinwand löschen"
                                    >
                                        <Trash2 size={16} aria-hidden />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODE 4: PHOTO UPLOAD */}
                    {mode === 'upload' && (
                        <div className="space-y-4 text-center">
                            <Input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        try {
                                            const compressed = await compressImage(e.target.files[0]);
                                            setUploadedUrl(compressed);
                                            triggerHaptic('success');
                                            toast.success("Foto ausgewählt.");
                                        } catch {
                                            toast.error("Fehler beim Komprimieren des Fotos.");
                                        }
                                    }
                                }}
                            />
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-border p-6 transition-colors hover:border-foreground hover:bg-muted/50"
                            >
                                <span className="grid size-14 place-items-center rounded-full bg-muted text-foreground">
                                    <Upload size={26} aria-hidden />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold text-foreground">Eigenes Foto hochladen</span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">Das Bild wird vor dem Hochladen verkleinert.</span>
                                </span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer Save Button */}
                <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:p-4">
                    <Button variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-full">
                        Abbrechen
                    </Button>
                    <Button onClick={handleSave} className="h-11 flex-[1.4] gap-2 rounded-lg font-semibold">
                        <Check size={16} aria-hidden /> Als Profilbild speichern
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
