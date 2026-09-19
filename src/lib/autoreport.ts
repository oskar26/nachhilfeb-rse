/**
 * Automatische Filtermeldungen an die SV-Moderation (Profanity 2.0).
 * Schwere Filtertreffer (severe/extreme/selfharm) erzeugen best-effort einen
 * Report mit Quelle 'auto_filter', den die SV im Reiter „Filter-Review"
 * mit wahr/falsch bewerten kann (Filter-Training).
 * Versand ist gedrosselt (max. 1×/Minute), damit ein Paste-Spam keine
 * Report-Flut erzeugt.
 */
import { api } from './api';
import { shouldAutoReport, type ProfanityResult } from './profanity';

let lastSentAt = 0;
const COOLDOWN_MS = 60_000;

export interface AutoReportContext {
    category: 'chat' | 'anzeige' | 'profil' | 'datenschutz' | 'sonstiges';
    /** Wer hat den blockierten Text geschrieben (für contextuelle Prüfung)? */
    reportedUserId?: string | null;
    reportedAdId?: string | null;
    /** Wo wurde geblockt (z. B. 'Chat', 'Support')? */
    place: string;
}

const SEVERITY_LABEL: Record<string, string> = {
    severe: 'schwerwiegend',
    extreme: 'extrem',
    selfharm: 'mögliche Selbstgefährdung',
};

export async function maybeAutoReport(
    result: ProfanityResult,
    excerpt: string,
    ctx: AutoReportContext
): Promise<void> {
    if (!shouldAutoReport(result)) return;
    const now = Date.now();
    if (now - lastSentAt < COOLDOWN_MS) return;
    lastSentAt = now;
    const label = SEVERITY_LABEL[result.severity] ?? result.severity;
    const priority = result.severity === 'severe' ? 'hoch' : 'kritisch';
    try {
        await api.reports.create({
            category: ctx.category,
            reported_user_id: ctx.reportedUserId ?? null,
            reported_ad_id: ctx.reportedAdId ?? null,
            reason:
                `Automatische Filtermeldung (${label}) aus ${ctx.place}. ` +
                `Treffer: ${result.hits.join(', ') || '–'}.`,
            sub_reason: 'Filter-Autoreport',
            priority,
            evidence: {
                source: 'auto_filter',
                severity: result.severity,
                hits: result.hits,
                excerpt: (excerpt || '').slice(0, 300),
            },
        });
    } catch {
        /* Best-effort: Ein fehlgeschlagener Report darf das Chatten nie kaputt machen. */
    }
}
