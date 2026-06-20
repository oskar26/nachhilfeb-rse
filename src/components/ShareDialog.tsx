import { useState } from 'react';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Copy, Check, Share2, Mail, MessageSquare, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ShareDialogProps {
    adId: string;
    adTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareDialog({ adId, adTitle, isOpen, onClose }: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/ad/${adId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success("Link in Zwischenablage kopiert!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Fehler beim Kopieren des Links.");
        }
    };

    const handleSystemShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Nachhilfe am FWG: ${adTitle}`,
                    text: `Schau dir dieses Angebot auf der FWG Nachhilfebörse an: ${adTitle}`,
                    url: shareUrl,
                });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    toast.error("Fehler beim Teilen.");
                }
            }
        } else {
            handleCopy();
        }
    };

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Schau dir dieses Angebot auf der FWG Nachhilfebörse an: ${adTitle} - ${shareUrl}`)}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(`Nachhilfe-Angebot: ${adTitle}`)}&body=${encodeURIComponent(`Hallo,\n\nich habe diese Anzeige auf der FWG Nachhilfebörse gefunden:\n\n${adTitle}\nLink: ${shareUrl}\n\nViele Grüße!`)}`;

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="relative">
                    <DialogTitle>Anzeige teilen</DialogTitle>
                    <DialogDescription>
                        Teile dieses Angebot mit deinen Freunden oder Mitschülern.
                    </DialogDescription>
                    <button 
                        onClick={onClose} 
                        className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    {/* Copy Link Input */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="bg-transparent text-xs w-full text-gray-500 select-all outline-none pl-2"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-gray-500" onClick={handleCopy}>
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </Button>
                    </div>

                    {/* Social Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {typeof navigator.share !== 'undefined' && (
                            <Button 
                                variant="outline" 
                                className="flex flex-col items-center justify-center p-4 h-auto rounded-2xl text-xs gap-2"
                                onClick={handleSystemShare}
                            >
                                <Share2 size={20} className="text-blue-500" />
                                <span>Teilen</span>
                            </Button>
                        )}
                        <a 
                            href={whatsappUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 border hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl text-xs gap-2 font-medium text-center"
                        >
                            <MessageSquare size={20} className="text-green-500 mx-auto" />
                            <span>WhatsApp</span>
                        </a>
                        <a 
                            href={emailUrl}
                            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 border hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl text-xs gap-2 font-medium text-center"
                        >
                            <Mail size={20} className="text-indigo-500 mx-auto" />
                            <span>E-Mail</span>
                        </a>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
