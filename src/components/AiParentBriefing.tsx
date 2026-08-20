import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Brain, Loader2, ClipboardCopy, RotateCcw, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateParentBriefingDraft, type ParentBriefingResult } from '../lib/ai-client';
import { cn } from '../lib/utils';

interface AiParentBriefingProps {
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
}

export default function AiParentBriefing({
  isOpen,
  onClose,
  childName = '',
}: AiParentBriefingProps) {
  const [duration, setDuration] = useState('45');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [practiced, setPracticed] = useState('');
  const [progress, setProgress] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParentBriefingResult | null>(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = subject.trim() && topic.trim() && practiced.trim();

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Bitte fülle mindestens Fach, Thema und Geübtes aus.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await generateParentBriefingDraft({
        student_first_name: childName || 'Schüler/in',
        duration_minutes: parseInt(duration) || 45,
        subject: subject.trim(),
        topic: topic.trim(),
        practiced: practiced.trim(),
        progress: progress.trim(),
        next_step: nextStep.trim(),
      });
      setResult(res);
      toast.success('Eltern-Briefing erstellt!');
    } catch (err: any) {
      console.error('[AiParentBriefing]', err);
      const msg = err.message || 'Unbekannter Fehler bei der KI-Generierung';
      setError(msg);
      toast.error('KI-Generierung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.data?.summary) return;
    try {
      await navigator.clipboard.writeText(result.data.summary);
      setCopied(true);
      toast.success('In Zwischenablage kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCopied(false);
  };

  const handleFullClose = () => {
    setSubject('');
    setTopic('');
    setPracticed('');
    setProgress('');
    setNextStep('');
    setDuration('45');
    setResult(null);
    setError(null);
    setLoading(false);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
                <Brain size={16} />
              </div>
              KI-Eltern-Briefing
            </DialogTitle>
            <button onClick={handleFullClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <DialogDescription className="text-xs mt-1">
            Erstelle eine prägnante 3-Satz-Zusammenfassung der Nachhilfestunde für die Eltern.
          </DialogDescription>
        </DialogHeader>

        {/* Child Info */}
        {childName && (
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 text-[11px] font-bold rounded-lg border border-teal-100 dark:border-teal-900/40">
              👤 {childName}
            </span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 animate-ping opacity-20" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
                <Loader2 size={24} className="animate-spin" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 animate-pulse">KI formuliert Briefing...</p>
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
            <div className="relative bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-900/40 rounded-2xl p-5">
              <div className="absolute top-3 left-3 text-teal-300 dark:text-teal-800 text-3xl font-serif leading-none">&ldquo;</div>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed pt-4 px-2 font-medium italic">
                {result.data.summary}
              </p>
              <div className="absolute bottom-3 right-4 text-teal-300 dark:text-teal-800 text-3xl font-serif leading-none">&rdquo;</div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className={cn(
                  "flex-1 rounded-2xl font-bold gap-2 shadow-lg transition-all",
                  copied
                    ? "bg-green-500 text-white shadow-green-500/20"
                    : "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:from-teal-600 hover:to-emerald-700 shadow-teal-500/20"
                )}
              >
                {copied ? <><CheckCircle size={14} /> Kopiert!</> : <><ClipboardCopy size={14} /> Kopieren</>}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="rounded-2xl font-bold gap-1"
              >
                <RotateCcw size={14} /> Neu
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleFullClose}
              className="w-full rounded-xl text-xs text-gray-500"
            >
              Schließen
            </Button>
          </div>
        )}

        {/* Input Form */}
        {!loading && !result && !error && (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Dauer (Min.)</label>
                <Input
                  type="number"
                  placeholder="45"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Fach *</label>
                <Input
                  placeholder="z.B. Mathematik"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Thema *</label>
              <Input
                placeholder="z.B. Bruchrechnen"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Was wurde geübt? *</label>
              <textarea
                placeholder="z.B. Kürzen, Erweitern und Addieren gleichnamiger Brüche"
                value={practiced}
                onChange={e => setPracticed(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Fortschritt / Erkenntnis</label>
              <textarea
                placeholder="z.B. Vorzeichenfehler wurden gemeinsam erkannt und verbessert"
                value={progress}
                onChange={e => setProgress(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nächste Schritte / Übung</label>
              <Input
                placeholder="z.B. Zwei gemischte Übungsaufgaben bis nächste Woche"
                value={nextStep}
                onChange={e => setNextStep(e.target.value)}
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
              disabled={!canGenerate}
              className={cn(
                "rounded-2xl font-bold gap-2 shadow-lg",
                "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:from-teal-600 hover:to-emerald-700",
                "shadow-teal-500/20 disabled:opacity-50 disabled:shadow-none"
              )}
            >
              <Brain size={14} /> Briefing erstellen
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
