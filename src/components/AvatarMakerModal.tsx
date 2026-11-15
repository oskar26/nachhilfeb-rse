import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Shapes, Type, PenTool, Upload, RotateCcw, Trash2, Check, Sparkles, X, BookOpen, Pencil, GraduationCap, FlaskConical, Calculator, Lightbulb, Brain, Backpack, NotebookPen, Laptop, Palette, Globe, Smile, Laugh, Rocket, Star, Flame, Zap, Heart, ThumbsUp, Trophy, Music, Gamepad2, Bike, Dumbbell, Guitar, Headphones, Target, Camera, Medal, Flag, Puzzle, Dices, Timer, Tent, Cat, Dog, Rabbit, Bird, Fish, Bug, Turtle, Squirrel, PawPrint, Leaf, Flower2, Sprout, Sun, Moon, Cloud, Snowflake, IceCream, CakeSlice, Cookie, Popcorn, Coffee, Pizza, Apple, Gift, PartyPopper, Crown, Wand2, Ghost, SmilePlus, Glasses, Shirt, type LucideIcon } from 'lucide-react';
import { compressImage } from '../lib/image';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { m, prefersReducedMotion, SPRING } from '../lib/motion';

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

interface PaletteColor {
    hex: string;
    name: string;
}

interface EmojiItem {
    char: string;
    label: string;
}

type AvatarMode = 'symbol' | 'emoji' | 'text' | 'draw' | 'upload';

const MODES: { id: AvatarMode; label: string; Icon: LucideIcon }[] = [
    { id: 'symbol', label: 'Symbol', Icon: Shapes },
    { id: 'emoji', label: 'Emoji', Icon: Smile },
    { id: 'text', label: 'Text', Icon: Type },
    { id: 'draw', label: 'Zeichnen', Icon: PenTool },
    { id: 'upload', label: 'Foto', Icon: Upload },
];

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
        name: 'Tiere & Natur',
        items: [
            { name: 'Cat', label: 'Katze', Icon: Cat },
            { name: 'Dog', label: 'Hund', Icon: Dog },
            { name: 'Rabbit', label: 'Hase', Icon: Rabbit },
            { name: 'Bird', label: 'Vogel', Icon: Bird },
            { name: 'Fish', label: 'Fisch', Icon: Fish },
            { name: 'Bug', label: 'Käfer', Icon: Bug },
            { name: 'Turtle', label: 'Schildkröte', Icon: Turtle },
            { name: 'Squirrel', label: 'Eichhörnchen', Icon: Squirrel },
            { name: 'PawPrint', label: 'Pfote', Icon: PawPrint },
            { name: 'Leaf', label: 'Blatt', Icon: Leaf },
            { name: 'Flower2', label: 'Blume', Icon: Flower2 },
            { name: 'Sprout', label: 'Keimling', Icon: Sprout },
            { name: 'Sun', label: 'Sonne', Icon: Sun },
            { name: 'Moon', label: 'Mond', Icon: Moon },
            { name: 'Cloud', label: 'Wolke', Icon: Cloud },
            { name: 'Snowflake', label: 'Schneeflocke', Icon: Snowflake },
        ]
    },
    {
        name: 'Cute & Party',
        items: [
            { name: 'IceCream', label: 'Eis', Icon: IceCream },
            { name: 'CakeSlice', label: 'Kuchen', Icon: CakeSlice },
            { name: 'Cookie', label: 'Keks', Icon: Cookie },
            { name: 'Popcorn', label: 'Popcorn', Icon: Popcorn },
            { name: 'Coffee', label: 'Kaffee', Icon: Coffee },
            { name: 'Pizza', label: 'Pizza', Icon: Pizza },
            { name: 'Apple', label: 'Apfel', Icon: Apple },
            { name: 'Gift', label: 'Geschenk', Icon: Gift },
            { name: 'PartyPopper', label: 'Party', Icon: PartyPopper },
            { name: 'Crown', label: 'Krone', Icon: Crown },
            { name: 'Wand2', label: 'Zauberstab', Icon: Wand2 },
            { name: 'Ghost', label: 'Geist', Icon: Ghost },
            { name: 'SmilePlus', label: 'Extra-Lächeln', Icon: SmilePlus },
            { name: 'Glasses', label: 'Brille', Icon: Glasses },
            { name: 'Shirt', label: 'Shirt', Icon: Shirt },
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

const EMOJI_CATEGORIES: { name: string; items: EmojiItem[] }[] = [
    {
        name: 'Tiere',
        items: [
            { char: '🐱', label: 'Katze' },
            { char: '🐶', label: 'Hund' },
            { char: '🐰', label: 'Hase' },
            { char: '🐦', label: 'Vogel' },
            { char: '🐢', label: 'Schildkröte' },
            { char: '🐿️', label: 'Eichhörnchen' },
            { char: '🦊', label: 'Fuchs' },
            { char: '🐼', label: 'Panda' },
            { char: '🐨', label: 'Koala' },
            { char: '🦁', label: 'Löwe' },
            { char: '🐸', label: 'Frosch' },
            { char: '🐝', label: 'Biene' },
        ]
    },
    {
        name: 'Cute',
        items: [
            { char: '🍦', label: 'Eiscreme' },
            { char: '🍰', label: 'Kuchen' },
            { char: '🍪', label: 'Keks' },
            { char: '🧁', label: 'Cupcake' },
            { char: '🍓', label: 'Erdbeere' },
            { char: '🌈', label: 'Regenbogen' },
            { char: '⭐', label: 'Stern' },
            { char: '💖', label: 'Herz' },
            { char: '🎀', label: 'Schleife' },
            { char: '✨', label: 'Funkeln' },
            { char: '🧸', label: 'Teddy' },
            { char: '🦄', label: 'Einhorn' },
        ]
    },
    {
        name: 'Natur',
        items: [
            { char: '🌸', label: 'Kirschblüte' },
            { char: '🌻', label: 'Sonnenblume' },
            { char: '🌼', label: 'Blume' },
            { char: '🌱', label: 'Keimling' },
            { char: '🍀', label: 'Glücksklee' },
            { char: '🌙', label: 'Mond' },
            { char: '☀️', label: 'Sonne' },
            { char: '☁️', label: 'Wolke' },
            { char: '❄️', label: 'Schneeflocke' },
            { char: '🌊', label: 'Welle' },
            { char: '🍄', label: 'Pilz' },
            { char: '🌵', label: 'Kaktus' },
        ]
    },
    {
        name: 'Spaß',
        items: [
            { char: '🎉', label: 'Party' },
            { char: '🎁', label: 'Geschenk' },
            { char: '👑', label: 'Krone' },
            { char: '🪄', label: 'Zauberstab' },
            { char: '👻', label: 'Geist' },
            { char: '😎', label: 'Cool' },
            { char: '🤩', label: 'Begeistert' },
            { char: '😂', label: 'Lachen' },
            { char: '🚀', label: 'Rakete' },
            { char: '🎮', label: 'Gaming' },
            { char: '🎧', label: 'Kopfhörer' },
            { char: '⚽', label: 'Fußball' },
        ]
    },
];

const BG_PALETTE: PaletteColor[] = [
    { hex: '#facc15', name: 'Gold' },
    { hex: '#38bdf8', name: 'Himmelblau' },
    { hex: '#4ade80', name: 'Grün' },
    { hex: '#f472b6', name: 'Pink' },
    { hex: '#8b5cf6', name: 'Violett' },
    { hex: '#fb923c', name: 'Orange' },
    { hex: '#2dd4bf', name: 'Türkis' },
    { hex: '#334155', name: 'Schiefer' },
    { hex: '#fef3c7', name: 'Creme' },
    { hex: '#a7f3d0', name: 'Minze' },
    { hex: '#fda4af', name: 'Rosé' },
    { hex: '#ddd6fe', name: 'Lavendel' },
    { hex: '#fed7aa', name: 'Pfirsich' },
    { hex: '#fef08a', name: 'Zitrone' },
    { hex: '#e9d5ff', name: 'Flieder' },
    { hex: '#fca5a5', name: 'Koralle' },
];

const TEXT_COLORS: PaletteColor[] = [
    { hex: '#ffffff', name: 'Weiß' },
    { hex: '#000000', name: 'Schwarz' },
    { hex: '#facc15', name: 'Gelb' },
    { hex: '#1e3a8a', name: 'Navy' },
    { hex: '#7e22ce', name: 'Pflaume' },
    { hex: '#0f766e', name: 'Petrol' },
    { hex: '#dc2626', name: 'Rot' },
    { hex: '#78350f', name: 'Braun' },
];

const BRUSH_COLORS: PaletteColor[] = [
    { hex: '#0f172a', name: 'Schwarz' },
    { hex: '#475569', name: 'Graublau' },
    { hex: '#ef4444', name: 'Rot' },
    { hex: '#f97316', name: 'Orange' },
    { hex: '#facc15', name: 'Gelb' },
    { hex: '#22c55e', name: 'Grün' },
    { hex: '#14b8a6', name: 'Türkis' },
    { hex: '#3b82f6', name: 'Blau' },
    { hex: '#8b5cf6', name: 'Violett' },
    { hex: '#ec4899', name: 'Pink' },
    { hex: '#78350f', name: 'Braun' },
    { hex: '#ffffff', name: 'Radierer / Weiß' },
];

const MONOGRAM_FONTS = [
    { label: 'Modern Sans', font: 'system-ui, -apple-system, sans-serif', weight: 'bold' },
    { label: 'Impact', font: 'Impact, sans-serif', weight: 'normal' },
    { label: 'Serif Elegant', font: 'Georgia, serif', weight: 'bold' },
    { label: 'Monospace', font: 'monospace', weight: 'bold' }
];

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Relative Helligkeit nach WCAG, damit Symbole auf jeder Fläche lesbar bleiben. */
function relativeLuminance(hex: string): number {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255);
    const [r, g, b] = channels.map(channel =>
        channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Wählt Schwarz oder Weiß – je nachdem, was auf der Hintergrundfarbe besser lesbar ist. */
function readableForeground(hex: string): string {
    const background = relativeLuminance(hex);
    const whiteContrast = 1.05 / (background + 0.05);
    const darkContrast = (background + 0.05) / (relativeLuminance('#0f172a') + 0.05);
    return whiteContrast >= darkContrast ? '#ffffff' : '#0f172a';
}

interface SwatchGridProps {
    colors: PaletteColor[];
    value: string;
    onChange: (hex: string) => void;
    label: string;
    reduceMotion: boolean;
    columns?: string;
}

/** Farbfelder als responsives Raster – kein waagerechtes Scrollen mehr. */
function SwatchGrid({ colors, value, onChange, label, reduceMotion, columns = 'grid-cols-6 sm:grid-cols-8' }: SwatchGridProps) {
    return (
        <div role="group" aria-label={label} className={cn('grid gap-1.5', columns)}>
            {colors.map(color => {
                const selected = value === color.hex;
                const swatch = (
                    <span
                        className="block size-7 rounded-lg border border-black/15"
                        style={{ backgroundColor: color.hex }}
                    />
                );
                return (
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        key={color.hex}
                        onClick={() => onChange(color.hex)}
                        aria-label={`${color.name} (${color.hex})`}
                        aria-pressed={selected}
                        title={color.name}
                        className={cn(
                            'relative grid size-11 place-items-center justify-self-center rounded-xl border-2 transition-colors',
                            selected
                                ? 'border-primary ring-2 ring-primary/25'
                                : 'border-transparent hover:border-border'
                        )}
                    >
                        {selected ? (
                            <m.span
                                initial={reduceMotion ? false : { scale: 0.86 }}
                                animate={{ scale: 1.06 }}
                                transition={SPRING.press}
                                className="pointer-events-none grid place-items-center"
                            >
                                {swatch}
                            </m.span>
                        ) : swatch}
                    </Button>
                );
            })}
        </div>
    );
}

export default function AvatarMakerModal({ isOpen, onClose, onSave, initialName = '' }: AvatarMakerModalProps) {
    const [reduceMotion] = useState(() => prefersReducedMotion());
    const [mode, setMode] = useState<AvatarMode>('symbol');

    // Symbol Tab State
    const [selectedSymbol, setSelectedSymbol] = useState('GraduationCap');
    const [symbolBg, setSymbolBg] = useState('#facc15');
    const symbolPreviewRef = useRef<HTMLSpanElement | null>(null);
    const symbolIconColor = readableForeground(symbolBg);

    // Emoji Tab State
    const [selectedEmoji, setSelectedEmoji] = useState('🦊');
    const [emojiBg, setEmojiBg] = useState('#fef3c7');

    // Text Tab State
    const derivedInitials = initialName
        ? initialName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'FW';
    const [textInitials, setTextInitials] = useState(derivedInitials);
    const [textBg, setTextBg] = useState('#38bdf8');
    const [textColor, setTextColor] = useState('#1e3a8a');
    const [textFontIndex, setTextFontIndex] = useState(0);

    // Drawing Tab State
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#0f172a');
    const [brushSize, setBrushSize] = useState(7);
    const [drawBg] = useState('#ffffff');
    const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

    // Upload Tab State
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    const initDrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill background
        ctx.fillStyle = drawBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setDrawHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }, [drawBg]);

    useEffect(() => {
        if (mode === 'draw') {
            initDrawCanvas();
        }
    }, [mode, initDrawCanvas]);

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
        ctx.lineTo(x, y);
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
        clone.setAttribute('width', '176');
        clone.setAttribute('height', '176');
        // currentColor aus der Vorschau explizit setzen, damit der Export
        // dieselbe Kontrastfarbe wie die Vorschau verwendet.
        clone.setAttribute('color', symbolIconColor);
        clone.style.color = symbolIconColor;
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, size / 2 - 88, size / 2 - 88, 176, 176);
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

        if (mode === 'emoji') {
            // Background
            ctx.fillStyle = emojiBg;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Emoji mittig auf die Fläche zeichnen. Die Emoji-Schrift liefert
            // die Farben, deshalb ist hier keine Kontrastfarbe nötig.
            ctx.font = `150px ${EMOJI_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(selectedEmoji, size / 2, size / 2 + 8);
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

    const previewBackground = mode === 'symbol' ? symbolBg : mode === 'text' ? textBg : mode === 'emoji' ? emojiBg : undefined;
    const SelectedSymbolIcon = SYMBOL_MAP[selectedSymbol] || GraduationCap;

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogContent showCloseButton={false} className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-lg">
                <DialogHeader className="relative border-b border-border p-5 pr-16 sm:p-6 sm:pb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-foreground" aria-hidden />
                        <DialogTitle className="text-base font-semibold">Profilbild erstellen</DialogTitle>
                    </div>
                    <DialogDescription className="text-[13px] text-muted-foreground">
                        Wähle ein Symbol oder Emoji, setze Initialen, zeichne selbst oder lade ein Foto hoch.
                    </DialogDescription>
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={onClose}
                        aria-label="Profilbild-Dialog schließen"
                        className="absolute right-2 top-2 grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X size={18} aria-hidden />
                    </Button>
                </DialogHeader>

                {/* Mode Selector Tabs – 2/3/5 Spalten, damit alle fünf Tabs auch bei 390px passen. */}
                <div className="grid grid-cols-2 gap-1.5 border-b border-border bg-muted/40 p-2 min-[400px]:grid-cols-3 sm:grid-cols-5">
                    {MODES.map(({ id, label, Icon }) => {
                        const active = mode === id;
                        return (
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                key={id}
                                onClick={() => { triggerHaptic('selection'); setMode(id); }}
                                aria-pressed={active}
                                className={cn(
                                    'relative isolate flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors',
                                    active ? 'text-foreground' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                                )}
                            >
                                {active && (
                                    <m.span
                                        aria-hidden
                                        layoutId={reduceMotion ? undefined : 'avatar-mode-active'}
                                        initial={false}
                                        transition={reduceMotion ? { duration: 0 } : SPRING.settle}
                                        className="absolute inset-0 -z-10 rounded-xl bg-card shadow-sm"
                                    />
                                )}
                                <Icon size={15} className="relative z-10" aria-hidden />
                                <span className="relative z-10">{label}</span>
                            </Button>
                        );
                    })}
                </div>

                <div className="space-y-5 p-4 sm:p-6">
                    {mode === 'draw' ? (
                        /* Große, klar markierte Zeichenfläche */
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-full">
                                <span className="block text-[13px] font-semibold text-foreground">Zeichenfläche</span>
                                <span className="block text-[13px] text-muted-foreground">Mit Maus oder Finger zeichnen</span>
                            </div>
                            <div className="relative aspect-square w-full max-w-[224px] overflow-hidden rounded-2xl border-2 border-dashed border-foreground/35 bg-white shadow-inner sm:max-w-[260px]">
                                <canvas
                                    ref={canvasRef}
                                    width={384}
                                    height={384}
                                    aria-label="Zeichenfläche für dein Profilbild"
                                    className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    onTouchCancel={stopDrawing}
                                />
                                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-foreground/20" />
                            </div>
                            <span className="text-center text-[13px] text-muted-foreground">Der eingezeichnete Kreis wird dein Profilbild.</span>
                        </div>
                    ) : (
                        /* Live-Vorschau */
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div
                                role="img"
                                aria-label="Vorschau deines Profilbilds"
                                className={cn(
                                    'flex size-44 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card shadow-inner sm:size-52',
                                    !previewBackground && 'bg-muted'
                                )}
                                style={{ backgroundColor: previewBackground }}
                            >
                                {mode === 'symbol' && (
                                    <span ref={symbolPreviewRef} className="flex select-none items-center justify-center" style={{ color: symbolIconColor }}>
                                        <SelectedSymbolIcon size={88} strokeWidth={1.7} className="size-20 sm:size-24" aria-hidden />
                                    </span>
                                )}
                                {mode === 'emoji' && (
                                    <span className="select-none text-[80px] leading-none sm:text-[96px]" aria-hidden>
                                        {selectedEmoji}
                                    </span>
                                )}
                                {mode === 'text' && (
                                    <span
                                        className="select-none text-4xl font-semibold leading-none sm:text-5xl"
                                        style={{
                                            color: textColor,
                                            fontFamily: MONOGRAM_FONTS[textFontIndex].font
                                        }}
                                    >
                                        {(textInitials || 'FW').toUpperCase()}
                                    </span>
                                )}
                                {mode === 'upload' && (
                                    uploadedUrl ? (
                                        <img src={uploadedUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Upload size={32} className="text-muted-foreground" aria-hidden />
                                    )
                                )}
                            </div>
                            <span className="text-[13px] font-semibold text-muted-foreground">Vorschau</span>
                        </div>
                    )}

                    {/* MODE 1: SYMBOL */}
                    {mode === 'symbol' && (
                        <div className="space-y-4">
                            {/* Color Selector */}
                            <div>
                                <Label className="mb-2 block text-[13px] font-semibold text-foreground/80">Hintergrundfarbe</Label>
                                <SwatchGrid
                                    colors={BG_PALETTE}
                                    value={symbolBg}
                                    onChange={setSymbolBg}
                                    label="Hintergrundfarbe für das Symbol"
                                    reduceMotion={reduceMotion}
                                />
                            </div>

                            {/* Symbol List */}
                            <div className="space-y-3">
                                {SYMBOL_CATEGORIES.map(cat => (
                                    <div key={cat.name}>
                                        <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{cat.name}</span>
                                        <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-border bg-muted/40 p-2 sm:grid-cols-6">
                                            {cat.items.map(({ name, label, Icon }) => {
                                                const selected = selectedSymbol === name;
                                                return (
                                                    <Button variant="unstyled" size="unstyled" type="button"
                                                        key={name}
                                                        title={label}
                                                        aria-label={label}
                                                        aria-pressed={selected}
                                                        onClick={() => {
                                                            triggerHaptic('light');
                                                            setSelectedSymbol(name);
                                                        }}
                                                        className={cn(
                                                            'grid size-11 select-none place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground',
                                                            selected && 'border border-border bg-card text-foreground'
                                                        )}
                                                    >
                                                        {selected ? (
                                                            <m.span
                                                                initial={reduceMotion ? false : { scale: 0.86 }}
                                                                animate={{ scale: 1.04 }}
                                                                transition={SPRING.press}
                                                                className="pointer-events-none grid place-items-center"
                                                            >
                                                                <Icon size={24} aria-hidden />
                                                            </m.span>
                                                        ) : (
                                                            <Icon size={24} aria-hidden />
                                                        )}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODE 2: EMOJI */}
                    {mode === 'emoji' && (
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block text-[13px] font-semibold text-foreground/80">Hintergrundfarbe</Label>
                                <SwatchGrid
                                    colors={BG_PALETTE}
                                    value={emojiBg}
                                    onChange={setEmojiBg}
                                    label="Hintergrundfarbe für das Emoji"
                                    reduceMotion={reduceMotion}
                                />
                            </div>

                            <div className="space-y-3">
                                {EMOJI_CATEGORIES.map(cat => (
                                    <div key={cat.name}>
                                        <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{cat.name}</span>
                                        <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-border bg-muted/40 p-2 sm:grid-cols-8">
                                            {cat.items.map(({ char, label }) => {
                                                const selected = selectedEmoji === char;
                                                return (
                                                    <Button variant="unstyled" size="unstyled" type="button"
                                                        key={char}
                                                        title={label}
                                                        aria-label={`Emoji ${label}`}
                                                        aria-pressed={selected}
                                                        onClick={() => {
                                                            triggerHaptic('light');
                                                            setSelectedEmoji(char);
                                                        }}
                                                        className={cn(
                                                            'grid size-11 place-items-center rounded-xl text-2xl leading-none transition-colors hover:bg-card',
                                                            selected && 'border border-border bg-card'
                                                        )}
                                                    >
                                                        {selected ? (
                                                            <m.span
                                                                initial={reduceMotion ? false : { scale: 0.82 }}
                                                                animate={{ scale: 1.1 }}
                                                                transition={SPRING.press}
                                                                className="pointer-events-none leading-none"
                                                            >
                                                                <span aria-hidden>{char}</span>
                                                            </m.span>
                                                        ) : (
                                                            <span aria-hidden>{char}</span>
                                                        )}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[13px] text-muted-foreground">Tipp: Emojis werden als farbiges Bild gespeichert.</p>
                        </div>
                    )}

                    {/* MODE 3: TEXT / MONOGRAM */}
                    {mode === 'text' && (
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block text-[13px] font-semibold text-foreground/80">Deine Initialen (max. 2 Buchstaben)</Label>
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
                                <Label className="mb-2 block text-[13px] font-semibold text-foreground/80">Schriftstil</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {MONOGRAM_FONTS.map((font, idx) => (
                                        <Button variant="unstyled" size="unstyled" type="button"
                                            key={font.label}
                                            onClick={() => setTextFontIndex(idx)}
                                            aria-pressed={textFontIndex === idx}
                                            className={cn(
                                                'min-h-11 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors',
                                                textFontIndex === idx
                                                    ? 'border-primary bg-muted font-semibold text-foreground'
                                                    : 'border-border hover:bg-muted'
                                            )}
                                        >
                                            {font.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block text-[13px] font-semibold text-foreground/80">Hintergrundfarbe</Label>
                                <SwatchGrid
                                    colors={BG_PALETTE}
                                    value={textBg}
                                    onChange={setTextBg}
                                    label="Hintergrundfarbe für die Initialen"
                                    reduceMotion={reduceMotion}
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block text-[13px] font-semibold text-foreground/80">Textfarbe</Label>
                                <SwatchGrid
                                    colors={TEXT_COLORS}
                                    value={textColor}
                                    onChange={setTextColor}
                                    label="Textfarbe der Initialen"
                                    reduceMotion={reduceMotion}
                                />
                                <p className="mt-2 text-[13px] text-muted-foreground">Für guten Kontrast: dunkle Schrift auf hellen Farben.</p>
                            </div>
                        </div>
                    )}

                    {/* MODE 4: DRAW */}
                    {mode === 'draw' && (
                        <div className="space-y-4">
                            {/* Tool Controls */}
                            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
                                <div>
                                    <span className="mb-1.5 block text-[13px] font-semibold text-foreground/80">Stiftfarbe</span>
                                    <SwatchGrid
                                        colors={BRUSH_COLORS}
                                        value={brushColor}
                                        onChange={setBrushColor}
                                        label="Stiftfarbe"
                                        reduceMotion={reduceMotion}
                                    />
                                </div>

                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <span className="mb-1.5 block text-[13px] font-semibold text-foreground/80">Strichstärke</span>
                                        <div className="flex items-center gap-1.5">
                                            {[3, 7, 14].map(size => (
                                                <Button variant="unstyled" size="unstyled" type="button"
                                                    key={size}
                                                    onClick={() => setBrushSize(size)}
                                                    aria-label={`Strichstärke ${size}`}
                                                    aria-pressed={brushSize === size}
                                                    className={cn(
                                                        'grid size-11 place-items-center rounded-lg border transition-colors',
                                                        brushSize === size ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border hover:bg-muted'
                                                    )}
                                                >
                                                    <div
                                                        style={{ width: Math.min(14, size), height: Math.min(14, size) }}
                                                        className="rounded-full bg-current"
                                                    />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="mb-1.5 block text-[13px] font-semibold text-foreground/80">Werkzeuge</span>
                                        <div className="flex items-center gap-1.5">
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
                            </div>
                        </div>
                    )}

                    {/* MODE 5: PHOTO UPLOAD */}
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
                                    <span className="mt-0.5 block text-[13px] text-muted-foreground">Das Bild wird vor dem Hochladen verkleinert.</span>
                                </span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer Save Button */}
                <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur sm:p-4">
                    <Button variant="ghost" onClick={onClose} className="h-11 min-w-0 flex-1 rounded-full px-3 sm:px-6">
                        Abbrechen
                    </Button>
                    <Button onClick={handleSave} className="h-11 min-w-0 flex-[1.4] gap-2 rounded-lg px-3 font-semibold sm:px-6">
                        <Check size={16} aria-hidden />
                        <span className="sm:hidden">Speichern</span>
                        <span className="hidden sm:inline">Als Profilbild speichern</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
