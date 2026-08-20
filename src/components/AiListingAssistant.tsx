import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Sparkles, Loader2, Copy, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateListingDraft, type ListingDraftResult } from '../lib/ai-client';
import { cn } from '../lib/utils';

interface AiListingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDraft: (draft: {
    title: string;
    description: string;
    tags: string[];
  }) => void;
  currentType?: 'offer' | 'search';
  currentSubjects?: string[];
  currentGrades?: string[];
}

export default function AiListingAssistant({
  isOpen,
  onClose,
  onApplyDraft,
  currentType = 'offer',
  currentSubjects = [],
  currentGrades = [],
}: AiListingAssistantProps) {
  const [topic, setTopic] = useState('');
  const [availability, setAvailability] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ListingDraftResult | null>(null);

  const subjectLabel = currentSubjects.length > 0
    ? currentSubjects.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
    : 'Allgemein';
  const gradeLabel = currentGrades.length > 0 ? currentGrades.join(', ') : '';

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Bitte gib ein Thema oder einen Schwerpunkt ein.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await generateListingDraft({
        intent: currentType === 'offer' ? 'offering' : 'searching',
        subject: subjectLabel,
        grade: gradeLabel,
        topic: topic.trim(),
        availability: availability.trim(),
        details: details.trim(),
      });
      setResult(res);
      toast.success('KI-Entwurf erfolgreich erstellt!');
    } catch (err: any) {
      console.error('[AiListingAssistant]', err);
      const msg = err.message || 'Unbekannter Fehler bei der KI-Generierung';
      setError(msg);
      toast.error('KI-Generierung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result?.data) return;
    onApplyDraft({
      title: result.data.title,
      description: result.data.description,
      tags: result.data.tags,
    });
    toast.success('Entwurf in Formular übernommen!');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const handleFullClose = () => {
    setTopic('');
    setAvailability('');
    setDetails('');
    setResult(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <Sparkles size={16} />
              </div>
              KI-Entwurf erstellen
            </DialogTitle>
            <button onClick={handleFullClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <DialogDescription className="text-xs mt-1">
            Beschreibe kurz, worum es geht – die KI formuliert einen professionellen Inseratentwurf für dich.
          </DialogDescription>
        </DialogHeader>

        {/* Context Info */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-lg border border-indigo-100 dark:border-indigo-900/40">
            {currentType === 'offer' ? '🎓 Biete' : '🔍 Suche'}
          </span>
          {currentSubjects.length > 0 && (
            <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-[11px] font-bold rounded-lg border border-purple-100 dark:border-purple-900/40">
              📚 {subjectLabel}
            </span>
          )}
          {gradeLabel && (
            <span className="px-2.5 py-1 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-[11px] font-bold rounded-lg border border-violet-100 dark:border-violet-900/40">
              🏫 Klasse {gradeLabel}
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-ping opacity-20" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <Loader2 size={24} className="animate-spin" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 animate-pulse">KI denkt nach...</p>
            <p className="text-[11px] text-gray-400">Dies kann einige Sekunden dauern.</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-300">Fehler bei der KI-Generierung</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              variant="outline"
              className="w-full rounded-xl text-xs font-bold border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 gap-2"
            >
              <RotateCcw size={14} /> Erneut versuchen
            </Button>
          </div>
        )}

        {/* Result State */}
        {result && !loading && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 space-y-3">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">{result.data.title}</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.data.description}</p>
              {result.data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.data.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/60 dark:bg-gray-800/60 text-[11px] font-semibold text-gray-600 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApply}
                className="flex-1 rounded-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 gap-2 shadow-lg shadow-indigo-500/20"
              >
                ✅ Übernehmen
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="rounded-2xl font-bold gap-1"
              >
                <RotateCcw size={14} /> Neu
              </Button>
            </div>
          </div>
        )}

        {/* Input Form */}
        {!loading && !result && !error && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Thema / Schwerpunkt *</label>
              <Input
                placeholder="z.B. binomische Formeln, Gedichtanalyse..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Verfügbarkeit</label>
              <Input
                placeholder="z.B. Dienstag ab 16 Uhr"
                value={availability}
                onChange={e => setAvailability(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Zusätzliche Details</label>
              <textarea
                placeholder="Besonderheiten, Wünsche, Vorbereitung auf Klausur..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && !result && !error && (
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={handleFullClose} className="rounded-xl">
              Abbrechen
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!topic.trim()}
              className={cn(
                "rounded-2xl font-bold gap-2 shadow-lg",
                "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700",
                "shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
              )}
            >
              <Sparkles size={14} /> Entwurf generieren
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
