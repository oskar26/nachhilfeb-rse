import { useState } from 'react';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/Dialog';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

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
        const { error } = await supabase.from('reviews').insert({
            author_id: user.id,
            target_user_id: targetUser.id,
            ad_id: adId,
            rating,
            comment
        });
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bewertung für {targetUser?.display_name}</DialogTitle>
                    <DialogDescription>
                        Wie war die Nachhilfe? Dein Feedback hilft anderen Schülern.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 flex flex-col items-center gap-4">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`transition-all ${rating >= star ? 'scale-110' : 'grayscale opacity-50 hover:opacity-100 hover:scale-110'}`}
                            >
                                <Star fill={rating >= star ? "gold" : "none"} color={rating >= star ? "gold" : "currentColor"} size={32} />
                            </button>
                        ))}
                    </div>
                    <textarea
                        className="w-full border rounded-md p-2 h-24 text-sm bg-gray-50 dark:bg-gray-900"
                        placeholder="Schreibe einen Kommentar (optional)..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleSubmit} disabled={loading || rating === 0}>
                        {loading ? 'Sende...' : 'Bewertung absenden'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
