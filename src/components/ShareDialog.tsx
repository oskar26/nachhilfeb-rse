import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Copy, Check, Share2, Mail, MessageSquare, X, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { triggerHaptic } from '../lib/haptics';
import { QRCodeSVG } from 'qrcode.react';

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
            toast.success("Link kopiert.");
            setTimeout(() => setCopied(false), 2000);
        } catch {
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
    // QR-Code wird lokal als SVG erzeugt (qrcode.react) – kein Drittanbieter-Dienst mehr.

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-md">
                <DialogHeader className="relative border-b border-border p-5 pr-16 sm:p-6 sm:pb-3">
                    <DialogTitle className="text-base font-semibold">{dialogTitle}</DialogTitle>
                    <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                        {dialogSubtitle}
                    </DialogDescription>
                    <Button variant="unstyled" size="unstyled" type="button"
                        onClick={onClose}
                        aria-label="Dialog schließen"
                        className="absolute right-2 top-2 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X size={18} aria-hidden />
                    </Button>
                </DialogHeader>

                <div className="space-y-4 p-5 sm:p-6">
                    {/* Copy Link Field */}
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2">
                        <Input
                            type="text"
                            value={shareUrl}
                            readOnly
                            aria-label="Link zum Teilen"
                            className="w-full min-w-0 border-0 bg-transparent text-xs font-medium text-foreground select-all focus-visible:ring-0"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-11 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <>
                                    <Check size={14} className="text-brand-ink dark:text-primary" aria-hidden />
                                    <span>Kopiert</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={14} aria-hidden />
                                    <span>Kopieren</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Social Action Grid */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <Button
                            variant="outline"
                            className="flex h-auto min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-semibold"
                            onClick={handleSystemShare}
                        >
                            <Share2 size={20} className="text-brand-ink dark:text-primary" aria-hidden />
                            <span>Teilen</span>
                        </Button>

                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => triggerHaptic('light')}
                            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center text-xs font-semibold transition-colors hover:bg-muted"
                        >
                            <MessageSquare size={20} className="text-brand-ink dark:text-primary" aria-hidden />
                            <span>WhatsApp</span>
                        </a>

                        <a
                            href={emailUrl}
                            onClick={() => triggerHaptic('light')}
                            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center text-xs font-semibold transition-colors hover:bg-muted"
                        >
                            <Mail size={20} className="text-brand-ink dark:text-primary" aria-hidden />
                            <span>E-Mail</span>
                        </a>
                    </div>

                    {/* QR Code Section */}
                    <div className="border-t border-border pt-4">
                        <Button variant="unstyled" size="unstyled"
                            type="button"
                            onClick={() => setShowQr(!showQr)}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                            <QrCode size={16} aria-hidden />
                            <span>{showQr ? 'QR-Code verbergen' : 'QR-Code zum Abscannen anzeigen'}</span>
                        </Button>

                        {showQr && (
                            <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in fade-in zoom-in-95">
                                <QRCodeSVG value={shareUrl!} size={220} title="QR-Code zum Abscannen" className="size-44 rounded-lg" />
                                <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
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
