import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Button } from './ui/Button';
import { Copy, Share2, Check, Users, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface ChildLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChildLinkModal({ isOpen, onClose }: ChildLinkModalProps) {
    const { user, profile } = useAuth();
    const [copied, setCopied] = useState(false);

    // Compute link code: use profile's parent_link_code or fallback to first 6 chars of user UUID
    const linkCode = profile?.parent_link_code || (user?.id ? user.id.slice(0, 6).toUpperCase() : '------');

    const handleCopy = () => {
        navigator.clipboard.writeText(linkCode);
        setCopied(true);
        toast.success('Code in die Zwischenablage kopiert!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsAppShare = () => {
        const shareText = encodeURIComponent(
            `Hallo! Bitte verknüpfe mein Schülerkonto auf der FWG Nachhilfebörse mit deinem Elternteil-Account.\n\n` +
            `Verknüpfungscode: *${linkCode}*\n\n` +
            `Gib diesen Code einfach im Eltern-Dashboard unter "Kind verknüpfen" ein.`
        );
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
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
                        <div className="text-3xl font-black tracking-widest font-mono text-primary-hover select-all">
                            {linkCode}
                        </div>
                        <p className="text-[11px] text-gray-400">Dieser Code ist einzigartig für dein Schülerprofil.</p>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={handleCopy}
                            variant="outline"
                            className="rounded-2xl h-12 gap-2 text-xs font-bold border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            {copied ? 'Kopiert!' : 'Code kopieren'}
                        </Button>

                        <Button
                            onClick={handleWhatsAppShare}
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
                            <li>Nach Eingabe des Codes <strong className="font-mono text-gray-700 dark:text-gray-300">{linkCode}</strong> ist die Verknüpfung aktiv.</li>
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
