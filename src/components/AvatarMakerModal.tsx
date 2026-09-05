import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Smile, Type, PenTool, Upload, RotateCcw, Trash2, Check, Sparkles, X } from 'lucide-react';
import { compressImage } from '../lib/image';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

interface AvatarMakerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (avatarUrl: string) => void;
    initialName?: string;
}

const EMOJI_CATEGORIES = [
    {
        name: 'Schule & Lernen',
        emojis: ['📚', '✏️', '🎓', '🔬', '📐', '💡', '🧠', '🎒', '📝', '💻', '🎨', '🪐']
    },
    {
        name: 'Smileys & Vibes',
        emojis: ['😎', '🤓', '🚀', '⭐', '🔥', '✨', '🦊', '🦁', '🐼', '🐨', '🦄', '⚡']
    },
    {
        name: 'Sport & Hobbys',
        emojis: ['⚽', '🏀', '🎾', '🎮', '🎸', '🎧', '🥋', '🛹', '♟️', '🎯', '🏊', '🚴']
    }
];

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
    const [mode, setMode] = useState<'emoji' | 'text' | 'draw' | 'upload'>('emoji');

    // Emoji Tab State
    const [selectedEmoji, setSelectedEmoji] = useState('🎓');
    const [emojiBg, setEmojiBg] = useState('#facc15');

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
    const [drawBg, setDrawBg] = useState('#ffffff');
    const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

    // Upload Tab State
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    // Preview Canvas
    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (mode === 'draw') {
            initDrawCanvas();
        }
    }, [mode, drawBg]);

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
    const generateAvatarUrl = (): string | null => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        if (mode === 'emoji') {
            // Background
            ctx.fillStyle = emojiBg;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Emoji
            ctx.font = '130px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(selectedEmoji, size / 2, size / 2 + 10);
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

    const handleSave = () => {
        const url = generateAvatarUrl();
        if (!url) {
            toast.error("Bitte wähle oder erstelle ein Profilbild.");
            return;
        }
        triggerHaptic('success');
        onSave(url);
        toast.success("Profilbild aktualisiert!");
        onClose();
    };

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto p-0">
                <DialogHeader className="p-6 pb-2 relative border-b dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-primary-hover" />
                        <DialogTitle className="text-lg font-black">Profilbild-Maker</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                        Wähle ein Emoji, Initialen, zeichne selbst oder lade ein Foto hoch.
                    </DialogDescription>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </DialogHeader>

                {/* Mode Selector Tabs */}
                <div className="flex border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-2 gap-1.5 overflow-x-auto">
                    <button
                        onClick={() => { triggerHaptic('selection'); setMode('emoji'); }}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0",
                            mode === 'emoji' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                        )}
                    >
                        <Smile size={15} /> Emoji
                    </button>
                    <button
                        onClick={() => { triggerHaptic('selection'); setMode('text'); }}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0",
                            mode === 'text' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                        )}
                    >
                        <Type size={15} /> Text / Initialen
                    </button>
                    <button
                        onClick={() => { triggerHaptic('selection'); setMode('draw'); }}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0",
                            mode === 'draw' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                        )}
                    >
                        <PenTool size={15} /> Zeichnen
                    </button>
                    <button
                        onClick={() => { triggerHaptic('selection'); setMode('upload'); }}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0",
                            mode === 'upload' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                        )}
                    >
                        <Upload size={15} /> Foto
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Live Preview Bubble */}
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div
                            className="w-24 h-24 rounded-full shadow-lg border-4 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden transition-all transform hover:scale-105"
                            style={{
                                backgroundColor: mode === 'emoji' ? emojiBg : mode === 'text' ? textBg : undefined
                            }}
                        >
                            {mode === 'emoji' && (
                                <span className="text-5xl select-none">{selectedEmoji}</span>
                            )}
                            {mode === 'text' && (
                                <span
                                    className="text-3xl font-black select-none"
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
                                    <img src={uploadedUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <Upload size={28} className="text-gray-400" />
                                )
                            )}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400">Vorschau</span>
                    </div>

                    {/* MODE 1: EMOJI */}
                    {mode === 'emoji' && (
                        <div className="space-y-4">
                            {/* Color Selector */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Hintergrundfarbe</label>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {BG_PALETTES.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setEmojiBg(color)}
                                            style={{ backgroundColor: color }}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-transform shrink-0",
                                                emojiBg === color ? "border-black dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Emoji List */}
                            <div className="space-y-3">
                                {EMOJI_CATEGORIES.map(cat => (
                                    <div key={cat.name}>
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">{cat.name}</span>
                                        <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-2xl border dark:border-gray-800">
                                            {cat.emojis.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => {
                                                        triggerHaptic('light');
                                                        setSelectedEmoji(emoji);
                                                    }}
                                                    className={cn(
                                                        "text-2xl p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-transform active:scale-95 text-center select-none",
                                                        selectedEmoji === emoji && "bg-white dark:bg-gray-800 shadow-sm scale-110 border border-primary/30"
                                                    )}
                                                >
                                                    {emoji}
                                                </button>
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
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Deine Initialen (max. 2 Buchstaben)</label>
                                <input
                                    type="text"
                                    maxLength={2}
                                    value={textInitials}
                                    onChange={(e) => setTextInitials(e.target.value.toUpperCase())}
                                    placeholder="z.B. MK"
                                    className="w-full text-center text-xl font-black py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Schriftstil</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {MONOGRAM_FONTS.map((font, idx) => (
                                        <button
                                            key={font.label}
                                            onClick={() => setTextFontIndex(idx)}
                                            className={cn(
                                                "p-2.5 rounded-xl border text-xs font-semibold transition-all",
                                                textFontIndex === idx
                                                    ? "border-primary bg-primary/10 text-primary-hover font-bold shadow-xs"
                                                    : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            {font.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Hintergrundfarbe</label>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {BG_PALETTES.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setTextBg(color)}
                                            style={{ backgroundColor: color }}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-transform shrink-0",
                                                textBg === color ? "border-black dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Textfarbe</label>
                                <div className="flex items-center gap-2">
                                    {['#ffffff', '#000000', '#facc15', '#1e293b'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setTextColor(c)}
                                            style={{ backgroundColor: c }}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-transform shrink-0",
                                                textColor === c ? "border-primary scale-110 shadow-md" : "border-gray-300 dark:border-gray-700"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODE 3: DRAW */}
                    {mode === 'draw' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Zeichne direkt in den Kreis oben mit der Maus oder dem Finger!
                            </p>

                            {/* Tool Controls */}
                            <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                {/* Color Palette */}
                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff'].map(col => (
                                        <button
                                            key={col}
                                            onClick={() => setBrushColor(col)}
                                            style={{ backgroundColor: col }}
                                            className={cn(
                                                "w-6 h-6 rounded-full border transition-all shrink-0",
                                                brushColor === col ? "ring-2 ring-primary scale-110" : "border-gray-300 dark:border-gray-700"
                                            )}
                                            title={col === '#ffffff' ? 'Radierer / Weiß' : col}
                                        />
                                    ))}
                                </div>

                                {/* Brush Size */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {[3, 7, 14].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setBrushSize(size)}
                                            className={cn(
                                                "w-7 h-7 rounded-lg border flex items-center justify-center transition-colors",
                                                brushSize === size ? "bg-primary text-black font-bold" : "border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                                            )}
                                        >
                                            <div
                                                style={{ width: Math.min(14, size), height: Math.min(14, size) }}
                                                className="bg-current rounded-full"
                                            />
                                        </button>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={handleUndo}
                                        disabled={drawHistory.length <= 1}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                                        title="Rückgängig"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                    <button
                                        onClick={handleClearDraw}
                                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        title="Leinwand löschen"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODE 4: PHOTO UPLOAD */}
                    {mode === 'upload' && (
                        <div className="space-y-4 text-center">
                            <input
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
                                            toast.success("Foto geladen!");
                                        } catch (err) {
                                            toast.error("Fehler beim Komprimieren des Fotos.");
                                        }
                                    }
                                }}
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary rounded-3xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-900/50 flex flex-col items-center justify-center gap-3"
                            >
                                <div className="p-4 rounded-full bg-primary/10 text-primary-hover">
                                    <Upload size={28} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Eigenes Foto hochladen</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Wird automatisch für beste Ladezeiten komprimiert</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Save Button */}
                <div className="p-4 border-t dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
                        Abbrechen
                    </Button>
                    <Button onClick={handleSave} className="rounded-xl font-bold gap-2 shadow-md">
                        <Check size={16} /> Als Profilbild speichern
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
