import { useState } from 'react';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { Copy, Check, Share2, Mail, MessageSquare, X, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { triggerHaptic } from '../lib/haptics';

export interface ShareDialogProps {
    type?: 'ad' | 'profile' | 'app';
    adId?: string;
    profileId?: string;
    adTitle?: string;
    title?: string;
    customUrl?: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareDialog({
    type = 'ad',
    adId,
    profileId,
    adTitle,
    title,
    customUrl,
    isOpen,
    onClose
}: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);

    const effectiveTitle = title || adTitle || 'FWG Nachhilfebörse';

    let shareUrl = customUrl;
    if (!shareUrl) {
        if (adId) {
            shareUrl = `${window.location.origin}/#/ad/${adId}`;
        } else if (profileId) {
            shareUrl = `${window.location.origin}/#/profile/${profileId}`;
        } else {
            shareUrl = `${window.location.origin}/#/welcome`;
        }
    }

    const dialogTitle = type === 'profile'
        ? 'Profil weiterempfehlen'
        : type === 'app'
            ? 'Nachhilfebörse teilen'
            : 'Anzeige teilen';

    const dialogSubtitle = type === 'profile'
        ? `Empfiehl das Profil von ${effectiveTitle} weiter.`
        : type === 'app'
            ? 'Teile die offizielle FWG Nachhilfebörse mit Mitschülern oder Eltern.'
            : 'Teile dieses Angebot mit deinen Freunden oder Mitschülern.';

    const shareText = type === 'profile'
        ? `Schau dir das Nachhilfe-Profil von ${effectiveTitle} an der FWG Nachhilfebörse an: ${shareUrl}`
        : type === 'app'
            ? `Kennst du schon die FWG Nachhilfebörse? Finde Schüler, die Nachhilfe anbieten oder suchen: ${shareUrl}`
            : `Schau dir dieses Angebot auf der FWG Nachhilfebörse an: ${effectiveTitle} - ${shareUrl}`;

    const handleCopy = async () => {
        triggerHaptic('light');
        try {
            await navigator.clipboard.writeText(shareUrl!);
            setCopied(true);
            toast.success("Link in die Zwischenablage kopiert!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Fehler beim Kopieren des Links.");
        }
    };

    const handleSystemShare = async () => {
        triggerHaptic('medium');
        if (navigator.share) {
            try {
                await navigator.share({
                    title: effectiveTitle,
                    text: shareText,
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

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(`FWG Nachhilfebörse: ${effectiveTitle}`)}&body=${encodeURIComponent(`Hallo,\n\nich möchte das mit dir teilen:\n\n${shareText}\n\nViele Grüße!`)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl!)}`;

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 relative border-b dark:border-gray-800">
                    <DialogTitle className="text-lg font-black">{dialogTitle}</DialogTitle>
                    <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                        {dialogSubtitle}
                    </DialogDescription>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    {/* Copy Link Field */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="bg-transparent text-xs w-full text-gray-700 dark:text-gray-300 font-medium select-all outline-none pl-2"
                        />
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 shrink-0 rounded-xl font-bold text-xs gap-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xs"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <>
                                    <Check size={14} className="text-green-500" />
                                    <span className="text-green-600 dark:text-green-400">Kopiert</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={14} />
                                    <span>Kopieren</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Social Action Grid */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <Button
                            variant="outline"
                            className="flex flex-col items-center justify-center p-3.5 h-auto rounded-2xl text-xs gap-1.5 font-bold border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-xs"
                            onClick={handleSystemShare}
                        >
                            <Share2 size={20} className="text-blue-500" />
                            <span>Teilen</span>
                        </Button>

                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => triggerHaptic('light')}
                            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-green-50/50 dark:hover:bg-green-950/20 rounded-2xl text-xs gap-1.5 font-bold text-center shadow-xs transition-colors"
                        >
                            <MessageSquare size={20} className="text-green-500 mx-auto" />
                            <span>WhatsApp</span>
                        </a>

                        <a
                            href={emailUrl}
                            onClick={() => triggerHaptic('light')}
                            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-2xl text-xs gap-1.5 font-bold text-center shadow-xs transition-colors"
                        >
                            <Mail size={20} className="text-indigo-500 mx-auto" />
                            <span>E-Mail</span>
                        </a>
                    </div>

                    {/* QR Code Section */}
                    <div className="pt-2 border-t dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => setShowQr(!showQr)}
                            className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 text-xs font-bold flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <QrCode size={16} />
                            <span>{showQr ? 'QR-Code verbergen' : 'QR-Code zum Abscannen anzeigen'}</span>
                        </button>

                        {showQr && (
                            <div className="mt-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-950 rounded-2xl border dark:border-gray-800 shadow-inner animate-in fade-in zoom-in-95">
                                <img
                                    src={qrCodeUrl}
                                    alt="QR-Code zum Abscannen"
                                    className="w-44 h-44 rounded-xl shadow-xs"
                                />
                                <p className="text-[11px] text-gray-400 font-semibold mt-2 text-center">
                                    Scanne diesen Code mit deiner Handy-Kamera
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
