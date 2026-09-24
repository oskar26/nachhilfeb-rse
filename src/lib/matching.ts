// Match-Engine: Fächer-/Stufen-/Verfügbarkeits-Scoring zwischen eigenen Anzeigen
// und Kandidaten-Anzeigen. Aus src/pages/Matching.tsx extrahiert, damit auch das
// Eltern-Dashboard (Matches-Tab pro Kind) dieselbe Logik nutzen kann.

import {
    emptyAvailability,
    countMatches,
    type Availability
} from '../components/AvailabilityCalendar';

export type { Availability };
export { emptyAvailability, countMatches };

export interface MatchAd {
    id: string;
    user_id: string;
    type: 'offer' | 'search';
    subjects: string[];
    grade_levels: string[];
    locations: string[];
    title?: string | null;
    short_description?: string | null;
    long_description?: string | null;
    created_at?: string;
    is_active?: boolean;
    profiles?: {
        id?: string;
        display_name: string | null;
        avatar_url: string | null;
        grade_level: string | null;
        availability?: Availability;
        is_verified?: boolean;
    };
}

export interface MatchProfile {
    grade_level?: string | null;
    subjects?: string[];
    availability?: Availability | null;
}

export interface Match {
    ad: MatchAd;
    myAd?: MatchAd;
    score: number;
    commonSubjects: string[];
    availabilityMatches: number;
    gradeCompatibility: string;
    matchReasons: string[];
    locationMatch?: string;
}

export interface MatchContext {
    myAds: MatchAd[];
    candidateAds: MatchAd[];
    profile?: MatchProfile | null;
    /** Eigene User-ID – eigene Anzeigen werden nie als Match angezeigt. */
    userId?: string;
    dismissedIds?: string[];
}

// ── Stufen-Helfer ────────────────────────────────────────────────

export function gradeToNumber(g: string | number | null | undefined): number {
    if (!g) return 10;
    const str = String(g).trim().toUpperCase();
    if (str === 'EF') return 11;
    if (str === 'Q1') return 12;
    if (str === 'Q2') return 13;
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? 10 : parsed;
}

export function formatGradeLabel(g: string | number | null | undefined): string {
    if (!g) return '?';
    const str = String(g).trim().toUpperCase();
    if (['EF', 'Q1', 'Q2'].includes(str)) return `Stufe ${str}`;
    return `Klasse ${str}`;
}

// ── Fach-Normalisierung & Aliase ─────────────────────────────────

const SUBJECT_ALIASES: Record<string, string> = {
    'mathe': 'mathematik',
    'mathematik': 'mathematik',
    'm': 'mathematik',
    'englisch': 'englisch',
    'english': 'englisch',
    'eng': 'englisch',
    'e': 'englisch',
    'deutsch': 'deutsch',
    'deu': 'deutsch',
    'd': 'deutsch',
    'französisch': 'französisch',
    'franz': 'französisch',
    'french': 'französisch',
    'f': 'französisch',
    'latein': 'latein',
    'lat': 'latein',
    'l': 'latein',
    'spanisch': 'spanisch',
    'span': 'spanisch',
    'es': 'spanisch',
    's': 'spanisch',
    'physik': 'physik',
    'phy': 'physik',
    'ph': 'physik',
    'chemie': 'chemie',
    'chem': 'chemie',
    'ch': 'chemie',
    'biologie': 'biologie',
    'bio': 'biologie',
    'b': 'biologie',
    'informatik': 'informatik',
    'info': 'informatik',
    'inf': 'informatik',
    'geschichte': 'geschichte',
    'gesch': 'geschichte',
    'ge': 'geschichte',
    'erdkunde': 'geographie',
    'geo': 'geographie',
    'geographie': 'geographie',
    'politik': 'politik',
    'sowi': 'politik',
    'sozialwissenschaften': 'politik',
    'philosophie': 'philosophie',
    'phil': 'philosophie',
    'pl': 'philosophie',
    'religion': 'religion',
    'reli': 'religion',
    'er': 'religion',
    'kr': 'religion',
    'kunst': 'kunst',
    'ku': 'kunst',
    'musik': 'musik',
    'mu': 'musik',
    'wirtschaft': 'wirtschaft',
    'wi': 'wirtschaft',
};

export function normalizeSubject(s: string): string {
    const clean = s.trim().toLowerCase();
    return SUBJECT_ALIASES[clean] || clean;
}

export function findCommonSubjects(arr1: string[], arr2: string[]): string[] {
    const norm1 = (arr1 || []).map(normalizeSubject);
    const result: string[] = [];

    (arr2 || []).forEach((s) => {
        const norm2 = normalizeSubject(s);
        if (norm1.includes(norm2) && !result.includes(s)) {
            result.push(s);
        }
    });

    return result;
}

// ── Scoring (Start bei 20 %) ─────────────────────────────────────

export function computeMatches(ctx: MatchContext): Match[] {
    const { myAds, candidateAds, profile, userId, dismissedIds = [] } = ctx;
    if (!candidateAds.length) return [];

    const list: Match[] = [];
    const myAvail = profile?.availability || emptyAvailability();
    const myGrade = profile?.grade_level || '10';
    const myGradeNum = gradeToNumber(myGrade);
    const myProfileSubjects = Array.isArray(profile?.subjects) ? profile.subjects : [];

    candidateAds.forEach((candAd) => {
        if (userId && candAd.user_id === userId) return;
        if (dismissedIds.includes(candAd.id)) return;

        const candGrade = candAd.profiles?.grade_level || (candAd.grade_levels && candAd.grade_levels[0]) || '10';
        const candGradeNum = gradeToNumber(candGrade);
        const candTargetGrades = (candAd.grade_levels || []).map((g) => gradeToNumber(g));
        const candSubjects = candAd.subjects || [];

        let bestScore = 0;
        let bestCommonSubjects: string[] = [];
        let bestReasons: string[] = [];
        let bestGradeCompat = '';
        let bestMyAd: MatchAd | undefined = undefined;

        // Szenario 1: Match gegen die eigenen aktiven Anzeigen
        if (myAds.length > 0) {
            myAds.forEach((myAd) => {
                let score = 0;
                const reasons: string[] = [];
                const common = findCommonSubjects(myAd.subjects, candSubjects);

                // 1. Fach-Match (bis 45 Pkt.)
                if (common.length > 0) {
                    const ratio = common.length / Math.max(1, myAd.subjects.length);
                    const subScore = Math.min(45, Math.round(ratio * 35) + (common.length >= 2 ? 10 : 0));
                    score += subScore;
                    reasons.push(`${common.length} Fach/Fächer: ${common.join(', ')}`);
                } else {
                    const profileCommon = findCommonSubjects(myProfileSubjects, candSubjects);
                    if (profileCommon.length > 0) {
                        score += 15;
                        reasons.push(`Übereinstimmung mit deinem Profilfach (${profileCommon[0]})`);
                    }
                }

                // 2. Anzeigentyp & Stufen-Kompatibilität (bis 35 Pkt.)
                let gradeCompat = '';
                const isComplementary = myAd.type !== candAd.type;

                if (isComplementary) {
                    score += 10;

                    if (myAd.type === 'search' && candAd.type === 'offer') {
                        const offersMyGrade = candTargetGrades.length === 0 || candTargetGrades.includes(myGradeNum);
                        if (offersMyGrade) {
                            score += 25;
                            gradeCompat = `Unterrichtet deine Stufe (${formatGradeLabel(myGrade)})`;
                            reasons.push(`Bietet Nachhilfe gezielt für ${formatGradeLabel(myGrade)}`);
                        } else if (candGradeNum > myGradeNum) {
                            score += 18;
                            gradeCompat = `Tutor aus höherer Stufe (${formatGradeLabel(candGrade)})`;
                            reasons.push(`Erfahrener Tutor aus ${formatGradeLabel(candGrade)}`);
                        } else {
                            score += 10;
                            gradeCompat = `${formatGradeLabel(candGrade)}`;
                        }
                    } else if (myAd.type === 'offer' && candAd.type === 'search') {
                        const myTargetGrades = (myAd.grade_levels || []).map((g) => gradeToNumber(g));
                        const inMyTarget = myTargetGrades.length === 0 || myTargetGrades.includes(candGradeNum);
                        if (inMyTarget) {
                            score += 25;
                            gradeCompat = `Schüler aus deiner Zielstufe (${formatGradeLabel(candGrade)})`;
                            reasons.push(`Gesuch aus passender Stufe ${formatGradeLabel(candGrade)}`);
                        } else if (myGradeNum >= candGradeNum) {
                            score += 18;
                            gradeCompat = `Schüler aus Stufe ${formatGradeLabel(candGrade)}`;
                            reasons.push(`Klassenstufe ${formatGradeLabel(candGrade)}`);
                        } else {
                            score += 10;
                        }
                    }
                } else {
                    if (candGradeNum === myGradeNum) {
                        score += 15;
                        gradeCompat = `Gleiche Stufe (${formatGradeLabel(myGrade)}) - Lernpartner`;
                        reasons.push(`Möglicher Lernpartner in Stufe ${formatGradeLabel(myGrade)}`);
                    } else {
                        score += 8;
                        gradeCompat = `${formatGradeLabel(candGrade)}`;
                    }
                }

                // 3. Verfügbarkeits-Überlappung (bis 15 Pkt.)
                const candAvail = candAd.profiles?.availability || emptyAvailability();
                const availMatches = countMatches(myAvail, candAvail);
                if (availMatches > 0) {
                    const availScore = Math.min(15, availMatches * 5);
                    score += availScore;
                    reasons.push(`${availMatches} übereinstimmende Freistunde(n)`);
                }

                // 4. Gemeinsame Orte (bis 10 Pkt.)
                const myLocs = myAd.locations || [];
                const candLocs = candAd.locations || [];
                const commonLocs = myLocs.filter((l) => candLocs.includes(l));
                if (commonLocs.length > 0) {
                    score += 8;
                    reasons.push(`Ort: ${commonLocs.join(', ')}`);
                }

                // 5. Verifikations-Bonus (5 Pkt.)
                if (candAd.profiles?.is_verified) {
                    score += 5;
                    reasons.push('Verifizierter FWG Schüler');
                }

                const clampedScore = Math.min(100, Math.max(20, score));

                if (clampedScore > bestScore) {
                    bestScore = clampedScore;
                    bestCommonSubjects = common.length > 0 ? common : candSubjects.slice(0, 2);
                    bestReasons = reasons;
                    bestGradeCompat = gradeCompat;
                    bestMyAd = myAd;
                }
            });
        }

        // Szenario 2: Fallback aufs Profil (keine/zu schwache eigene Anzeigen)
        if (bestScore < 30) {
            let fallbackScore = 20;
            const reasons: string[] = [];

            const profCommon = findCommonSubjects(myProfileSubjects, candSubjects);
            if (profCommon.length > 0) {
                fallbackScore += 25;
                reasons.push(`Fach passt zu deinem Profil: ${profCommon.join(', ')}`);
            } else if (candSubjects.length > 0) {
                fallbackScore += 10;
                reasons.push(`Fachangebot: ${candSubjects.slice(0, 2).join(', ')}`);
            }

            if (candAd.type === 'offer') {
                const offersMyGrade = candTargetGrades.length === 0 || candTargetGrades.includes(myGradeNum);
                if (offersMyGrade || candGradeNum > myGradeNum) {
                    fallbackScore += 20;
                    reasons.push(`Unterrichtet deine Stufe ${formatGradeLabel(myGrade)}`);
                } else {
                    fallbackScore += 10;
                }
            } else {
                if (myGradeNum >= candGradeNum) {
                    fallbackScore += 20;
                    reasons.push(`Sucht Unterstützung in Stufe ${formatGradeLabel(candGrade)}`);
                } else {
                    fallbackScore += 10;
                }
            }

            const candAvail = candAd.profiles?.availability || emptyAvailability();
            const availMatches = countMatches(myAvail, candAvail);
            if (availMatches > 0) {
                fallbackScore += Math.min(15, availMatches * 5);
                reasons.push(`${availMatches} freie Stunde(n) gemeinsam`);
            }

            if (candAd.profiles?.is_verified) {
                fallbackScore += 5;
                reasons.push('Verifizierter Account');
            }

            const clampedFallback = Math.min(100, Math.max(20, fallbackScore));
            if (clampedFallback > bestScore) {
                bestScore = clampedFallback;
                bestCommonSubjects = profCommon.length > 0 ? profCommon : candSubjects.slice(0, 2);
                bestReasons = reasons;
                bestGradeCompat = formatGradeLabel(candGrade);
            }
        }

        if (bestScore >= 20) {
            const availMatches = countMatches(myAvail, candAd.profiles?.availability || emptyAvailability());
            list.push({
                ad: candAd,
                myAd: bestMyAd,
                score: bestScore,
                commonSubjects: bestCommonSubjects,
                availabilityMatches: availMatches,
                gradeCompatibility: bestGradeCompat,
                matchReasons: bestReasons.length > 0 ? bestReasons : ['Allgemeines Match basierend auf Klassenstufe'],
                locationMatch: candAd.locations?.[0]
            });
        }
    });

    const unique: Record<string, Match> = {};
    list.forEach((m) => {
        if (!unique[m.ad.id] || unique[m.ad.id].score < m.score) {
            unique[m.ad.id] = m;
        }
    });

    return Object.values(unique).sort((a, b) => b.score - a.score);
}
