import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Star } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface RatingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetUser?: any;
    adId?: string | null;
    onSuccess: () => void;
}

export function RatingDialog({ open, onOpenChange, targetUser, adId, onSuccess }: RatingDialogProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!user || !targetUser) return;
        setLoading(true);
        const payload = {
            author_id: user.id,
            target_user_id: targetUser.id,
            // Shim sandte bei fehlendem adId null; Backend behandelt null und fehlend identisch ($data['ad_id'] ?? null)
            ad_id: adId ?? undefined,
            rating,
            comment
        };
        const { error } = await api.reviews.create(payload);
        setLoading(false);
        if (error) {
            toast.error('Fehler beim Bewerten: ' + error.message);
        } else {
            toast.success("Bewertung erfolgreich gesendet!");
            onOpenChange(false);
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Bewertung für {targetUser?.display_name}</DialogTitle>
                    <DialogDescription>
                        Wie war die Nachhilfe? Dein Feedback hilft anderen Schülern.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex items-center gap-1" role="radiogroup" aria-label="Sterne-Bewertung">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Button variant="unstyled" size="unstyled"
                                key={star}
                                type="button"
                                role="radio"
                                aria-checked={rating === star}
                                aria-label={`${star} von 5 Sternen`}
                                onClick={() => setRating(star)}
                                className={`grid size-11 place-items-center rounded-full transition-colors ${rating >= star ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Star fill={rating >= star ? 'currentColor' : 'none'} size={30} strokeWidth={1.75} aria-hidden />
                            </Button>
                        ))}
                    </div>
                    <Textarea
                        className="min-h-24 w-full resize-none"
                        placeholder="Schreibe einen Kommentar (optional)..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        aria-label="Kommentar zur Bewertung"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11 rounded-full">Abbrechen</Button>
                    <Button onClick={handleSubmit} disabled={loading || rating === 0} isLoading={loading} className="h-11 rounded-full">
                        Bewertung absenden
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
