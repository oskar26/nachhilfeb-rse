import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Copy, Check, Users, MessageCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';

interface ChildLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChildLinkModal({ isOpen, onClose }: ChildLinkModalProps) {
    const [linkCode, setLinkCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Beim Öffnen immer den persistierten Code laden bzw. erzeugen.
    // Der Code wird serverseitig gespeichert (profiles.parent_link_code),
    // damit Eltern ihn sicher abrufen können.
    // WICHTIG: useEffect statt onOpenChange(true) – Dialog ruft onOpenChange
    // nur beim Schließen auf, nie beim deklarativen Öffnen (open=true).
    // Genau das war der Grund für den endlosen Lade-Spinner.
    const ensureCode = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await api.parentLinks.ensureCode();
            const code = (res.data as { parent_link_code?: string } | null)?.parent_link_code;
            if (res.error || !code) {
                const msg = (res.error as { message?: string } | null)?.message || 'Code konnte nicht geladen werden.';
                setLoadError(msg);
                setLinkCode(null);
            } else {
                setLinkCode(code);
                setLoadError(null);
            }
        } catch (err: any) {
            setLoadError(err?.message || 'Code konnte nicht geladen werden.');
            setLinkCode(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCopied(false);
            void ensureCode();
        } else {
            // State zurücksetzen, damit beim nächsten Öffnen frisch geladen wird
            setLinkCode(null);
            setLoadError(null);
            setLoading(false);
            setCopied(false);
        }
    }, [isOpen, ensureCode]);

    const handleOpenChange = (open: boolean) => {
        if (!open) onClose();
    };

    const handleRetry = () => {
        toast.dismiss();
        void ensureCode();
    };

    const handleCopy = async () => {
        if (!linkCode) return;
        try {
            await navigator.clipboard.writeText(linkCode);
        } catch {
            // Fallback für nicht-sichere Kontexte / ältere Browser
            try {
                const ta = document.createElement('textarea');
                ta.value = linkCode;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            } catch {
                toast.error('Kopieren fehlgeschlagen – bitte Code manuell markieren.');
                return;
            }
        }
        setCopied(true);
        toast.success('Code in die Zwischenablage kopiert!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsAppShare = () => {
        if (!linkCode) return;
        const shareText = encodeURIComponent(
            `Hallo! Bitte verknüpfe mein Schülerkonto auf der FWG Nachhilfebörse mit deinem Elternteil-Account.\n\n` +
            `Verknüpfungscode: *${linkCode}*\n\n` +
            `Gib diesen Code einfach im Eltern-Dashboard unter "Kind verknüpfen" ein.`
        );
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
    };

    return (
        <Dialog open={isOpen} onClose={onClose} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-3xl max-w-md bg-white dark:bg-gray-900 border dark:border-gray-800 shadow-xl">
                <DialogHeader className="text-center space-y-2">
                    <div className="w-14 h-14 bg-primary/10 text-primary-hover rounded-2xl flex items-center justify-center mx-auto mb-1">
                        <Users size={28} />
                    </div>
                    <DialogTitle className="text-xl font-black">Elternteil verknüpfen</DialogTitle>
                    <DialogDescription className="text-xs text-gray-500">
                        Teile diesen Einladungscode mit deinen Eltern, damit sie deine Nachhilfe-Aktivitäten einsehen können.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Code Display Box */}
                    <div className="bg-gray-50 dark:bg-gray-950 p-5 rounded-2xl border dark:border-gray-800 text-center space-y-2">
                        <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">Dein Verknüpfungscode</span>
                        {loading ? (
                            <div className="h-11 flex flex-col items-center justify-center gap-1">
                                <Loader2 size={24} className="animate-spin text-gray-400" />
                                <span className="text-[11px] text-gray-400">Code wird geladen …</span>
                            </div>
                        ) : loadError || !linkCode ? (
                            <div className="py-1 space-y-2">
                                <p className="text-xs text-red-500 font-semibold">
                                    {loadError || 'Code konnte nicht geladen werden.'}
                                </p>
                                <Button
                                    onClick={handleRetry}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl gap-2 text-xs font-bold mx-auto"
                                >
                                    <RefreshCw size={14} /> Erneut versuchen
                                </Button>
                            </div>
                        ) : (
                            <div className="text-3xl font-black tracking-widest font-mono text-primary-hover select-all">
                                {linkCode}
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400">Dieser Code ist einzigartig für dein Schülerprofil.</p>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={handleCopy}
                            disabled={!linkCode}
                            variant="outline"
                            className="rounded-2xl h-12 gap-2 text-xs font-bold border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            {copied ? 'Kopiert!' : 'Code kopieren'}
                        </Button>

                        <Button
                            onClick={handleWhatsAppShare}
                            disabled={!linkCode}
                            className="rounded-2xl h-12 gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        >
                            <MessageCircle size={16} />
                            Per WhatsApp
                        </Button>
                    </div>

                    {/* How it works instructions */}
                    <div className="space-y-2 pt-2 border-t dark:border-gray-800 text-xs">
                        <span className="font-bold text-gray-700 dark:text-gray-300 block">So funktioniert's:</span>
                        <ol className="list-decimal list-inside space-y-1.5 text-gray-500 leading-relaxed">
                            <li>Dein Elternteil registriert sich als <strong className="text-gray-700 dark:text-gray-300">Elternteil</strong>.</li>
                            <li>Im Eltern-Dashboard klickt er/sie auf <strong className="text-gray-700 dark:text-gray-300">"Kind verknüpfen"</strong>.</li>
                            <li>Der Code kann per WhatsApp geteilt oder direkt eingegeben werden – die Verknüpfung ist danach sofort aktiv.</li>
                        </ol>
                    </div>
                </div>

                <div className="pt-2">
                    <Button onClick={onClose} variant="ghost" className="w-full rounded-xl text-gray-500">
                        Schließen
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}