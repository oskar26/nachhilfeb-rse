/**
 * Erstellt eine vollständige Screenshot-Sammlung von Website und App.
 *
 * Alle API-Antworten werden im Browser gemockt. Die gezeigten Personen,
 * E-Mail-Adressen und Anzeigen sind frei erfunden (example.org) und haben
 * nichts mit realen Nutzerinnen oder Nutzern zu tun.
 *
 * Aufruf: node scripts/capture-screenshots.mjs
 * Voraussetzung: Dev-Server auf http://127.0.0.1:5180
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5180';
const OUT = path.resolve('screenshots-app-website');

// ── Fiktive Demo-Profile ──────────────────────────────────────────

const AVAIL_A = {
    mon: ['14:00', '14:30', '15:00'],
    tue: ['15:30', '16:00'],
    wed: ['14:00', '14:30'],
    thu: ['16:00', '16:30'],
    fri: ['14:00'],
    sat: [],
    sun: [],
};

const AVAIL_B = {
    mon: ['14:30', '15:00'],
    tue: ['15:00', '15:30', '16:00'],
    wed: ['15:00'],
    thu: ['15:30', '16:00'],
    fri: [],
    sat: ['10:00'],
    sun: [],
};

function profile(p) {
    return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        display_name: p.display_name,
        grade_level: p.grade_level ?? null,
        class_letter: p.class_letter ?? null,
        role: p.role ?? 'student',
        subjects: p.subjects ?? [],
        bio: p.bio ?? null,
        moodle_name: p.moodle_name ?? null,
        phone_number: p.phone_number ?? null,
        contact_other: null,
        settings: p.settings ?? { email_visible: false, phone_visible: false, custom_contacts: null },
        teaches_subjects: p.teaches_subjects ?? [],
        avatar_url: null,
        is_verified: p.is_verified ?? true,
        is_coach: p.is_coach ?? false,
        availability: p.availability ?? AVAIL_A,
        sv_code_used: null,
        is_banned: false,
        ban_type: null,
        ban_reason: null,
        banned_until: null,
        banner_color: p.banner_color ?? 'linear-gradient(135deg, #facc15 0%, #f59e0b 55%, #d97706 100%)',
        avatar_type: 'initials',
        average_rating: p.average_rating ?? 4.8,
        onboarding_complete: true,
        birth_date: '2009-03-14',
        created_at: p.created_at ?? '2026-08-19T10:00:00.000Z',
        email: p.email,
        active_ads_count: p.active_ads_count ?? 1,
    };
}

const ME = profile({
    id: 'u-lena',
    first_name: 'Lena',
    last_name: 'Krüger',
    display_name: 'Lena K.',
    grade_level: 'Q1',
    role: 'student',
    subjects: ['mathematik', 'englisch'],
    teaches_subjects: ['mathematik', 'englisch'],
    bio: 'Q1, Mathe-Leistungskurs. Ich erkläre gern geduldig, mit Skizzen und kleinen Schritten.',
    moodle_name: 'lena.k',
    phone_number: '+49 151 2345678',
    is_verified: true,
    is_coach: true,
    average_rating: 4.9,
    email: 'lena.k@example.org',
});

const ADMIN = profile({
    id: 'u-sara',
    first_name: 'Sara',
    last_name: 'T.',
    display_name: 'Sara T.',
    grade_level: 'Q2',
    role: 'sv_admin',
    subjects: ['mathematik', 'geschichte'],
    teaches_subjects: ['mathematik'],
    bio: 'SV-Team, zuständig für Verifizierung und das SV-Panel.',
    moodle_name: 'sara.t',
    is_verified: true,
    is_coach: true,
    average_rating: 5,
    email: 'sv-team@example.org',
});

const MIA = profile({
    id: 'u-mia',
    first_name: 'Mia',
    last_name: 'Schulte',
    display_name: 'Mia S.',
    grade_level: 'Q1',
    subjects: ['mathematik'],
    teaches_subjects: ['mathematik'],
    bio: 'Mathe macht mehr Spaß, wenn man das Warum versteht. Ich helfe gern bei Hausaufgaben und Klausurvorbereitung.',
    moodle_name: 'mia.s',
    is_verified: true,
    is_coach: true,
    average_rating: 4.9,
    email: 'mia.s@example.org',
});

const JONAS = profile({
    id: 'u-jonas',
    first_name: 'Jonas',
    last_name: 'Becker',
    display_name: 'Jonas B.',
    grade_level: '9',
    class_letter: 'a',
    subjects: ['mathematik'],
    bio: 'Suche Unterstützung in Mathe, vor allem Algebra und Textaufgaben.',
    moodle_name: 'jonas.b',
    is_verified: true,
    email: 'jonas.b@example.org',
    availability: AVAIL_B,
});

const AYLIN = profile({
    id: 'u-aylin',
    first_name: 'Aylin',
    last_name: 'Demir',
    display_name: 'Aylin D.',
    grade_level: '10',
    class_letter: 'b',
    subjects: ['englisch', 'französisch'],
    teaches_subjects: ['englisch', 'französisch'],
    bio: 'Zweisprachig aufgewachsen, Nachhilfe in Englisch und Französisch bis Klasse 10.',
    moodle_name: 'aylin.d',
    is_verified: true,
    average_rating: 4.7,
    email: 'aylin.d@example.org',
    availability: AVAIL_B,
});

const EMRE = profile({
    id: 'u-emre',
    first_name: 'Emre',
    last_name: 'T.',
    display_name: 'Emre T.',
    grade_level: 'Q2',
    subjects: ['physik', 'chemie'],
    teaches_subjects: ['physik', 'chemie'],
    bio: 'Physik und Chemie in der Oberstufe, mit vielen Beispielen aus dem Alltag.',
    moodle_name: 'emre.t',
    is_verified: true,
    is_coach: true,
    average_rating: 5,
    email: 'emre.t@example.org',
});

const SOFIA = profile({
    id: 'u-sofia',
    first_name: 'Sofia',
    last_name: 'R.',
    display_name: 'Sofia R.',
    grade_level: '8',
    class_letter: 'c',
    subjects: ['deutsch'],
    teaches_subjects: ['deutsch'],
    bio: 'Lesen, Schreiben, Grammatik: Ich helfe dir, Texte sicher zu verstehen und zu verfassen.',
    moodle_name: 'sofia.r',
    is_verified: true,
    average_rating: 4.6,
    email: 'sofia.r@example.org',
});

const LEON = profile({
    id: 'u-leon',
    first_name: 'Leon',
    last_name: 'M.',
    display_name: 'Leon M.',
    grade_level: '8',
    class_letter: 'a',
    subjects: ['englisch'],
    bio: 'Suche Englisch-Nachhilfe für Grammatik und Vokabeln.',
    moodle_name: 'leon.m',
    is_verified: false,
    email: 'leon.m@example.org',
    availability: AVAIL_A,
});

const NIKA = profile({
    id: 'u-nika',
    first_name: 'Nika',
    last_name: 'P.',
    display_name: 'Nika P.',
    grade_level: '7',
    class_letter: 'b',
    subjects: ['biologie'],
    teaches_subjects: ['biologie'],
    bio: 'Biologie lernen mit System: Mindmaps, Zusammenfassungen und alte Klassenarbeiten.',
    moodle_name: 'nika.p',
    is_verified: true,
    average_rating: 4.8,
    email: 'nika.p@example.org',
});

const PAULA = profile({
    id: 'u-paula',
    first_name: 'Paula',
    last_name: 'W.',
    display_name: 'Paula W.',
    grade_level: 'EF',
    subjects: ['englisch'],
    bio: 'Suche jemanden für Englisch in der EF, gern auch online.',
    moodle_name: 'paula.w',
    is_verified: true,
    email: 'paula.w@example.org',
    availability: AVAIL_B,
});

const ALL_PROFILES = [ME, ADMIN, MIA, JONAS, AYLIN, EMRE, SOFIA, LEON, NIKA, PAULA];

function ad(p) {
    return {
        id: p.id,
        user_id: p.user_id,
        type: p.type,
        subjects: p.subjects,
        grade_levels: p.grade_levels,
        locations: p.locations ?? ['SV-Raum', 'Bibliothek', 'Online'],
        custom_location: null,
        price_details: p.price_details,
        duration_minutes: p.duration_minutes ?? [45],
        short_description: p.short_description,
        long_description: p.long_description ?? p.short_description,
        image_urls: [],
        is_active: true,
        boosted: p.boosted ?? false,
        boosted_until: null,
        promo_code_used: null,
        created_at: p.created_at ?? '2026-11-08T16:20:00.000Z',
        title: p.title ?? p.short_description,
        is_archived: false,
        profiles: p.profiles,
        profiles_avail: p.profiles?.availability,
    };
}

const AD_MINE = ad({
    id: 'ad-lena',
    user_id: ME.id,
    type: 'offer',
    subjects: ['mathematik', 'englisch'],
    grade_levels: ['5', '6', '7', '8', '9', '10'],
    short_description: 'Mathe & Englisch bis Klasse 10',
    long_description:
        'Ich bin Lena aus der Q1 und gebe seit zwei Jahren Nachhilfe. Wir arbeiten mit deinen Materialien, alten Klassenarbeiten und kurzen Übungen. Auch kurzfristig vor Klausuren möglich.',
    price_details: { mode: 'fixed', value: 12, unit: '45min' },
    profiles: ME,
    boosted: true,
    created_at: '2026-11-09T09:15:00.000Z',
});

const AD_MIA = ad({
    id: 'ad-mia',
    user_id: MIA.id,
    type: 'offer',
    subjects: ['mathematik'],
    grade_levels: ['7', '8', '9', '10'],
    short_description: 'Mathe-Nachhilfe mit Geduld',
    long_description:
        'Von Bruchrechnung bis Analysis: Wir gehen deine Aufgaben Schritt für Schritt durch und bauen Lücken nachhaltig auf. Treffen im SV-Raum oder online.',
    price_details: { mode: 'fixed', value: 12, unit: '45min' },
    profiles: MIA,
    boosted: true,
    created_at: '2026-11-10T13:40:00.000Z',
});

const AD_JONAS = ad({
    id: 'ad-jonas',
    user_id: JONAS.id,
    type: 'search',
    subjects: ['mathematik'],
    grade_levels: ['9'],
    short_description: 'Suche Mathe-Hilfe für Klasse 9',
    long_description: 'Ich brauche Unterstützung bei Gleichungen und Textaufgaben. Am liebsten einmal pro Woche nach der Schule.',
    price_details: { mode: 'vb', value: null, unit: '45min' },
    profiles: JONAS,
    created_at: '2026-11-10T17:05:00.000Z',
});

const AD_AYLIN = ad({
    id: 'ad-aylin',
    user_id: AYLIN.id,
    type: 'offer',
    subjects: ['englisch', 'französisch'],
    grade_levels: ['6', '7', '8', '9', '10'],
    short_description: 'Englisch & Französisch, auch Konversation',
    long_description: 'Grammatik, Vokabeln, Aufsätze und mündliche Noten. Ich passe die Stunde an dein Ziel an.',
    price_details: { mode: 'fixed', value: 11, unit: '60min' },
    profiles: AYLIN,
    created_at: '2026-11-07T11:30:00.000Z',
});

const AD_EMRE = ad({
    id: 'ad-emre',
    user_id: EMRE.id,
    type: 'offer',
    subjects: ['physik', 'chemie'],
    grade_levels: ['EF', 'Q1', 'Q2'],
    short_description: 'Physik & Chemie Oberstufe',
    long_description: 'Mechanik, Elektrizitätslehre, organische Chemie: Wir arbeiten mit Aufgaben aus deinem Kurs und bereiten Klausuren vor.',
    price_details: { mode: 'fixed', value: 15, unit: '60min' },
    profiles: EMRE,
    created_at: '2026-11-06T08:50:00.000Z',
});

const AD_SOFIA = ad({
    id: 'ad-sofia',
    user_id: SOFIA.id,
    type: 'offer',
    subjects: ['deutsch'],
    grade_levels: ['5', '6', '7'],
    short_description: 'Deutsch: Lesen, Schreiben, Grammatik',
    long_description: 'Ich helfe bei Aufsätzen, Grammatik und Leseverstehen. Geduldig und ohne Zeitdruck.',
    price_details: { mode: 'fixed', value: 10, unit: '45min' },
    profiles: SOFIA,
    created_at: '2026-11-05T15:10:00.000Z',
});

const AD_LEON = ad({
    id: 'ad-leon',
    user_id: LEON.id,
    type: 'search',
    subjects: ['englisch'],
    grade_levels: ['8'],
    short_description: 'Suche Englisch-Nachhilfe',
    long_description: 'Vor allem Grammatik und Vokabeln. Ich bin bereit, regelmäßig zu üben.',
    price_details: { mode: 'vb', value: null, unit: '45min' },
    profiles: LEON,
    created_at: '2026-11-09T18:25:00.000Z',
});

const AD_NIKA = ad({
    id: 'ad-nika',
    user_id: NIKA.id,
    type: 'offer',
    subjects: ['biologie'],
    grade_levels: ['5', '6', '7'],
    short_description: 'Biologie lernen mit System',
    long_description: 'Zusammenfassungen, Mindmaps und Übungsaufgaben. Wir bringen Ordnung in die Themen.',
    price_details: { mode: 'fixed', value: 9, unit: '45min' },
    profiles: NIKA,
    created_at: '2026-11-04T09:45:00.000Z',
});

const AD_PAULA = ad({
    id: 'ad-paula',
    user_id: PAULA.id,
    type: 'search',
    subjects: ['englisch'],
    grade_levels: ['EF'],
    short_description: 'Englisch für die EF gesucht',
    long_description: 'Ich möchte meine mündliche Note verbessern und sicherer beim Schreiben werden.',
    price_details: { mode: 'fixed', value: 13, unit: '60min' },
    profiles: PAULA,
    created_at: '2026-11-08T12:00:00.000Z',
});

const ADS = [AD_MINE, AD_MIA, AD_JONAS, AD_AYLIN, AD_EMRE, AD_SOFIA, AD_LEON, AD_NIKA, AD_PAULA];

const REQ_IN = {
    id: 'req-1',
    ad_id: AD_MINE.id,
    requester_id: MIA.id,
    owner_id: ME.id,
    status: 'pending',
    message: 'Hallo Lena, wäre ein Termin am Dienstag um 15:30 im SV-Raum frei? Ich brauche Hilfe bei Ableitungen.',
    created_at: '2026-11-11T14:20:00.000Z',
    requester: MIA,
    owner: ME,
    ads: { id: AD_MINE.id, short_description: AD_MINE.short_description },
};

const REQ_ACCEPTED = {
    id: 'req-2',
    ad_id: AD_MINE.id,
    requester_id: JONAS.id,
    owner_id: ME.id,
    status: 'accepted',
    message: 'Hi, ich hätte Interesse an Mathe-Nachhilfe. Passt es bei dir donnerstags?',
    created_at: '2026-11-09T10:05:00.000Z',
    requester: JONAS,
    owner: ME,
    ads: { id: AD_MINE.id, short_description: AD_MINE.short_description },
};

const REQ_OUT = {
    id: 'req-3',
    ad_id: AD_EMRE.id,
    requester_id: ME.id,
    owner_id: EMRE.id,
    status: 'pending',
    message: 'Hallo Emre, ich suche Unterstützung in Physik für die Q1. Hast du noch einen Platz frei?',
    created_at: '2026-11-10T09:45:00.000Z',
    requester: ME,
    owner: EMRE,
    ads: { id: AD_EMRE.id, short_description: AD_EMRE.short_description },
};

const REQ_DONE = {
    id: 'req-4',
    ad_id: AD_SOFIA.id,
    requester_id: ME.id,
    owner_id: SOFIA.id,
    status: 'completed',
    message: 'Danke für die Hilfe bei meinem Deutsch-Aufsatz!',
    created_at: '2026-10-28T16:00:00.000Z',
    requester: ME,
    owner: SOFIA,
    ads: { id: AD_SOFIA.id, short_description: AD_SOFIA.short_description },
};

const REQUESTS = [REQ_IN, REQ_ACCEPTED, REQ_OUT, REQ_DONE];

const FAVORITES = [
    {
        id: 'fav-1',
        ad_id: AD_AYLIN.id,
        created_at: '2026-11-10T18:00:00.000Z',
        ads: { ...AD_AYLIN, title: AD_AYLIN.short_description },
    },
    {
        id: 'fav-2',
        ad_id: AD_NIKA.id,
        created_at: '2026-11-08T08:20:00.000Z',
        ads: { ...AD_NIKA, title: AD_NIKA.short_description },
    },
];

const MESSAGES = [
    {
        id: 'msg-1',
        sender_id: MIA.id,
        content: 'Hallo Lena! Ich habe deine Anzeige gesehen. Wäre Dienstag 15:30 im SV-Raum okay?',
        created_at: '2026-11-11T14:20:00.000Z',
        read_at: '2026-11-11T14:24:00.000Z',
        is_deleted: false,
    },
    {
        id: 'msg-2',
        sender_id: ME.id,
        content: 'Hi Mia! Ja, Dienstag 15:30 passt mir gut. Bring bitte deine letzte Klausur und die aktuellen Aufgaben mit.',
        created_at: '2026-11-11T14:26:00.000Z',
        read_at: '2026-11-11T14:27:00.000Z',
        is_deleted: false,
    },
    {
        id: 'msg-3',
        sender_id: MIA.id,
        content: 'Mache ich. Ich hänge gerade bei Ableitungen und Kettenregel.',
        created_at: '2026-11-11T14:28:00.000Z',
        read_at: '2026-11-11T14:30:00.000Z',
        is_deleted: false,
    },
    {
        id: 'msg-4',
        sender_id: ME.id,
        content: 'Kein Problem, das schauen wir uns Schritt für Schritt an. Bis Dienstag!',
        created_at: '2026-11-11T14:31:00.000Z',
        read_at: '2026-11-11T14:32:00.000Z',
        is_deleted: false,
    },
    {
        id: 'msg-5',
        sender_id: MIA.id,
        content: 'Super, danke dir. Bis Dienstag!',
        created_at: '2026-11-11T14:33:00.000Z',
        read_at: null,
        is_deleted: false,
    },
];

const REPORTS = [
    {
        id: 'rep-1',
        reporter_id: LEON.id,
        reported_ad_id: AD_EMRE.id,
        reported_user_id: EMRE.id,
        reason: 'Unpassende Sprache',
        description: 'In der Anzeige steht ein Satz, der im Schulkontext nicht okay ist.',
        status: 'open',
        created_at: '2026-11-11T09:30:00.000Z',
        category: 'anzeige',
        sub_reason: 'Sprache',
        priority: 'hoch',
        evidence: [],
        related_message_ids: [],
        resolution_type: null,
        resolved_by: null,
        resolved_at: null,
        admin_notes: null,
        reporter_name: LEON.display_name,
        reported_user_name: EMRE.display_name,
        reported_ad_title: AD_EMRE.short_description,
        reporter: LEON,
        user: EMRE,
        ad: { id: AD_EMRE.id, short_description: AD_EMRE.short_description },
    },
    {
        id: 'rep-2',
        reporter_id: AYLIN.id,
        reported_ad_id: AD_LEON.id,
        reported_user_id: LEON.id,
        reason: 'Falsche Angaben',
        description: 'Die angegebene Klassenstufe passt nicht zur Anzeige.',
        status: 'investigating',
        created_at: '2026-11-10T12:10:00.000Z',
        category: 'profil',
        sub_reason: 'Klassenstufe',
        priority: 'normal',
        evidence: [],
        related_message_ids: [],
        resolution_type: null,
        resolved_by: null,
        resolved_at: null,
        admin_notes: 'Rückfrage an den Nutzer läuft.',
        reporter_name: AYLIN.display_name,
        reported_user_name: LEON.display_name,
        reported_ad_title: AD_LEON.short_description,
        reporter: AYLIN,
        user: LEON,
        ad: { id: AD_LEON.id, short_description: AD_LEON.short_description },
    },
    {
        id: 'rep-3',
        reporter_id: SOFIA.id,
        reported_ad_id: null,
        reported_user_id: MIA.id,
        reason: 'Belästigung im Chat',
        description: 'Nachfragen wurden nicht respektiert.',
        status: 'resolved',
        created_at: '2026-11-07T17:45:00.000Z',
        category: 'chat',
        sub_reason: 'Belästigung',
        priority: 'kritisch',
        evidence: [],
        related_message_ids: [],
        resolution_type: 'warn',
        resolved_by: ADMIN.id,
        resolved_at: '2026-11-08T09:00:00.000Z',
        admin_notes: 'Verwarnung ausgesprochen, Gespräch dokumentiert.',
        reporter_name: SOFIA.display_name,
        reported_user_name: MIA.display_name,
        reported_ad_title: null,
        reporter: SOFIA,
        user: MIA,
        ad: null,
    },
];

const NEWS = [
    {
        id: 'news-1',
        title: 'Neue Sprechzeit im SV-Raum',
        body: 'Ab Montag ist das SV-Team jeden Tag in der ersten großen Pause im SV-Raum. Verifizierung ohne Termin.',
        icon: 'megaphone',
        created_at: '2026-11-10T08:00:00.000Z',
    },
    {
        id: 'news-2',
        title: 'Coaching-AG startet wieder',
        body: 'Frau Balistreri bietet ab Klasse 8 wieder Förderunterricht an. Anmeldung über die Coaching-Seite.',
        icon: 'award',
        created_at: '2026-11-06T08:00:00.000Z',
    },
];

const NOTIFICATIONS = [
    {
        id: 'notif-1',
        type: 'request',
        title: 'Neue Anfrage',
        message: 'Mia S. hat Interesse an deiner Anzeige „Mathe & Englisch bis Klasse 10“.',
        created_at: '2026-11-11T14:20:00.000Z',
        read: false,
        link: '/requests',
    },
    {
        id: 'notif-2',
        type: 'message',
        title: 'Neue Nachricht',
        message: 'Mia S.: „Super, danke dir. Bis Dienstag!“',
        created_at: '2026-11-11T14:33:00.000Z',
        read: false,
        link: '/chat/req-1',
    },
];

const adminUsers = ALL_PROFILES.map((p, i) => ({
    ...p,
    email: p.email ?? `demo${i + 1}@example.org`,
}));

// ── API-Mock ─────────────────────────────────────────────────────

function json(body, status = 200) {
    return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function handleApi(url, method) {
    const pathname = url.pathname;
    const q = url.searchParams;
    const action = q.get('action');

    if (pathname.endsWith('/api/ads.php')) {
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') return json({ success: true });
        if (action === 'view') return json({ success: true });
        const id = q.get('id');
        if (id) return json(ADS.find(a => a.id === id) ?? AD_MIA);
        const userId = q.get('user_id');
        if (userId) return json(ADS.filter(a => a.user_id === userId));
        return json(ADS);
    }

    if (pathname.endsWith('/api/profiles.php')) {
        if (method === 'PUT' || method === 'POST') return json({ success: true });
        if (action === 'coach_students') {
            return json(adminUsers.filter(p => p.role === 'student').map(p => ({
                ...p,
                active_ads_count: ADS.filter(a => a.user_id === p.id).length,
            })));
        }
        if (action === 'coach_log') {
            return json([
                {
                    id: 'log-1',
                    created_at: '2026-11-10T15:00:00.000Z',
                    actor_name: 'Sara T.',
                    target_name: 'Mia S.',
                    action: 'coach_verified',
                    details: 'Coaching-Code eingelöst',
                },
                {
                    id: 'log-2',
                    created_at: '2026-11-08T11:30:00.000Z',
                    actor_name: 'Sara T.',
                    target_name: 'Emre T.',
                    action: 'coach_verified',
                    details: 'Coaching-Code eingelöst',
                },
            ]);
        }
        if (action === 'coach_info') {
            return json({
                title: 'Coaching-AG & Förderunterricht',
                description: 'Schülerinnen und Schüler helfen Schülerinnen und Schülern – begleitet von Frau Balistreri.',
                time: 'Jeden Dienstag, 13:30–14:15',
                room: 'Raum 2.14',
                is_visible: true,
            });
        }
        if (action === 'coaching_page') {
            return json({
                hero_title: 'Coaching-AG am FWG',
                hero_text: 'Ältere Schülerinnen und Schüler unterstützen jüngere – fachlich und persönlich.',
                contact_name: 'Frau Balistreri',
                contact_email: 'coaching@example.org',
                schedule: 'Dienstags in der 7. Stunde',
                room: 'Raum 2.14',
            });
        }
        const id = q.get('id');
        if (id) return json(adminUsers.find(p => p.id === id) ?? MIA);
        return json(ME);
    }

    if (pathname.endsWith('/api/requests.php')) {
        if (method !== 'GET') return json({ success: true });
        const id = q.get('id');
        if (id) return json(REQUESTS.find(r => r.id === id) ?? REQ_IN);
        return json(REQUESTS);
    }

    if (pathname.endsWith('/api/messages.php')) {
        if (method === 'POST') return json({ success: true });
        return json(MESSAGES);
    }

    if (pathname.endsWith('/api/favorites.php')) {
        if (method === 'POST') return json({ success: true });
        return json(FAVORITES);
    }

    if (pathname.endsWith('/api/reviews.php')) {
        if (method === 'POST') return json({ success: true });
        return json([
            {
                id: 'rev-1',
                ad_id: AD_MIA.id,
                author_id: ME.id,
                target_user_id: MIA.id,
                rating: 5,
                comment: 'Sehr geduldig und gut erklärt. Hat mir vor der Klausur sehr geholfen.',
                created_at: '2026-10-22T18:00:00.000Z',
            },
            {
                id: 'rev-2',
                ad_id: AD_MIA.id,
                author_id: JONAS.id,
                target_user_id: MIA.id,
                rating: 5,
                comment: 'Klar strukturiert, freundlich und zuverlässig.',
                created_at: '2026-10-15T17:30:00.000Z',
            },
            {
                id: 'rev-3',
                ad_id: AD_MIA.id,
                author_id: AYLIN.id,
                target_user_id: MIA.id,
                rating: 4,
                comment: 'Gute Erklärungen, manchmal etwas schnell.',
                created_at: '2026-09-30T16:15:00.000Z',
            },
        ]);
    }

    if (pathname.endsWith('/api/analytics.php')) {
        if (action === 'popular_subjects') return json({ subjects: ['mathematik', 'englisch', 'deutsch', 'physik', 'französisch'] });
        if (action === 'stats') {
            const by_day = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                by_day.push({ day: d.toISOString().slice(0, 10), views: 80 + i * 17 });
            }
            return json({
                by_day,
                total_views: 812,
                unique_logged_in: 96,
                by_path: [
                    { path: '/', views: 318 },
                    { path: '/ad/ad-mia', views: 164 },
                    { path: '/create-ad', views: 97 },
                    { path: '/social', views: 81 },
                    { path: '/profil', views: 64 },
                    { path: '/eltern-leitfaden', views: 43 },
                ],
                by_device: [
                    { device_type: 'mobile', views: 512 },
                    { device_type: 'desktop', views: 238 },
                    { device_type: 'tablet', views: 62 },
                ],
                by_hour: [
                    { hour: 8, views: 22 }, { hour: 10, views: 41 }, { hour: 12, views: 67 },
                    { hour: 14, views: 118 }, { hour: 16, views: 141 }, { hour: 18, views: 96 },
                    { hour: 20, views: 52 },
                ],
            });
        }
        if (action === 'summary') {
            return json({ users: 42, active_ads: 18, page_views: 1284, page_views_30d: 812 });
        }
        return json({ success: true });
    }

    if (pathname.endsWith('/api/saved_searches.php')) {
        if (method !== 'GET') return json({ success: true });
        return json({ searches: [] });
    }

    if (pathname.endsWith('/api/notifications.php')) {
        if (method === 'POST') return json({ success: true });
        return json(NOTIFICATIONS);
    }

    if (pathname.endsWith('/api/news.php')) {
        if (method !== 'GET') return json({ success: true });
        return json(NEWS);
    }

    if (pathname.endsWith('/api/admin.php')) {
        if (action === 'overview') {
            return json({
                stats: {
                    total_users: 42,
                    verified_users: 36,
                    banned_users: 1,
                    active_ads: 18,
                    open_reports: 2,
                    open_tickets: 1,
                    total_ads: 24,
                },
                by_role: { student: 38, parent: 3, sv_admin: 1 },
                grade_distribution: [
                    { grade_level: '5', count: 6 }, { grade_level: '6', count: 7 },
                    { grade_level: '7', count: 5 }, { grade_level: '8', count: 8 },
                    { grade_level: '9', count: 6 }, { grade_level: '10', count: 5 },
                    { grade_level: 'EF', count: 3 }, { grade_level: 'Q1', count: 2 },
                    { grade_level: 'Q2', count: 1 },
                ],
                recent_users: adminUsers.slice(0, 5),
            });
        }
        if (action === 'users') return json({ data: adminUsers, total: adminUsers.length });
        if (action === 'auditlog') {
            return json([
                { id: 'audit-1', created_at: '2026-11-11T10:00:00.000Z', admin_name: 'Sara T.', action: 'verify_user', target_name: 'Mia S.', details: 'Im SV-Raum verifiziert' },
                { id: 'audit-2', created_at: '2026-11-10T15:20:00.000Z', admin_name: 'Sara T.', action: 'ban_user', target_name: 'Demo Nutzer', details: 'Temporäre Sperre, 7 Tage' },
            ]);
        }
        if (action === 'parent_links') return json([]);
        return json({ success: true });
    }

    if (pathname.endsWith('/api/reports.php')) {
        if (method !== 'GET') return json({ success: true });
        return json(REPORTS);
    }

    if (pathname.endsWith('/api/codes.php')) {
        if (method === 'POST') return json({ success: true });
        if (action === 'promo_list') {
            return json([
                { id: 'promo-1', code: 'COACH-MIA24', effect_type: 'coach_verification', push_level: 'super', boost_days: 30, max_uses: 1, used_count: 1, is_active: true, target_group: 'coach', description: 'Coaching-Code für Mia S.', created_at: '2026-10-01T09:00:00.000Z', expires_at: '2027-04-01T09:00:00.000Z' },
                { id: 'promo-2', code: 'COACH-EMRE7', effect_type: 'coach_verification', push_level: 'super', boost_days: 30, max_uses: 1, used_count: 1, is_active: true, target_group: 'coach', description: 'Coaching-Code für Emre T.', created_at: '2026-10-02T09:00:00.000Z', expires_at: '2027-04-02T09:00:00.000Z' },
            ]);
        }
        if (action === 'promo_redemptions') return json([]);
        return json([
            { id: 'code-1', code: 'FWG-7K2M9Q', role: 'student', is_used: false, used_by: null, created_at: '2026-11-01T09:00:00.000Z', expires_at: '2026-12-01T09:00:00.000Z', max_uses: 1 },
            { id: 'code-2', code: 'FWG-4R8T2P', role: 'student', is_used: true, used_by: MIA.display_name, created_at: '2026-10-20T09:00:00.000Z', expires_at: '2026-11-20T09:00:00.000Z', max_uses: 1 },
        ]);
    }

    if (pathname.endsWith('/api/support.php')) {
        if (method !== 'GET') return json({ success: true });
        return json([]);
    }

    if (pathname.endsWith('/api/moderation.php')) {
        return json({ allow: [], block: [] });
    }

    if (pathname.endsWith('/api/health.php')) {
        return json({ ok: true, php: '8.3', db: 'ok' });
    }

    return json({ success: true });
}

async function installMocks(context) {
    await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        const method = route.request().method();
        try {
            await route.fulfill(handleApi(url, method));
        } catch (err) {
            console.error('[mock]', url.pathname, err);
            await route.fulfill(json({ success: true }));
        }
    });
}

function initScript({ me, theme }) {
    return `(() => {
        try {
            localStorage.setItem('vite-ui-theme', '${theme}');
            localStorage.setItem('cookie_notice_seen', 'true');
            localStorage.setItem('cookie_consent', 'true');
            localStorage.setItem('feed_show_banners', 'false');
            localStorage.setItem('fwg_push_prompt_dismissed_at', String(Date.now()));
            localStorage.setItem('dismissed_news_ids', JSON.stringify(${JSON.stringify(NEWS.map(n => n.id))}));
            ${me ? `
            localStorage.setItem('fwg_auth_token', 'demo-token');
            localStorage.setItem('fwg_auth_user', ${JSON.stringify(JSON.stringify({ id: me.id, email: me.email }))});
            ` : `
            localStorage.removeItem('fwg_auth_token');
            localStorage.removeItem('fwg_auth_user');
            `}
        } catch (e) {}
    })();`;
}

// ── Capture-Helfer ────────────────────────────────────────────────

async function settle(page, ms = 900) {
    await page.evaluate(() => document.fonts.ready).catch(() => { });
    await page.waitForTimeout(ms);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
}

async function shot(page, sub, name, { fullPage = false } = {}) {
    const dir = path.join(OUT, sub);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${name}.png`);
    await page.screenshot({ path: file, fullPage, animations: 'disabled' });
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.log(`  ✓ ${sub}/${name}.png (${kb} KB)`);
}

async function open(page, hash, ready) {
    await page.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    if (ready) {
        await page.waitForSelector(ready, { timeout: 12000 }).catch(() => {
            console.warn(`  ! selector not found: ${ready} (${hash})`);
        });
        await settle(page, 500);
    }
}

async function captureWebsite(browser) {
    console.log('\nWEBSITE — Desktop');
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        colorScheme: 'light',
    });
    await installMocks(context);
    await context.addInitScript({ content: initScript({ me: null, theme: 'light' }) });
    const page = await context.newPage();
    page.on('pageerror', e => console.warn('  [pageerror]', e.message));

    await open(page, '/welcome', 'h1');
    await shot(page, 'website/desktop', '01-welcome');
    // Ganzseitige Aufnahme: erst durchscrollen, damit alle Reveals sichtbar sind.
    await page.evaluate(async () => {
        const step = 700;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise(r => setTimeout(r, 45));
        }
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    await shot(page, 'website/desktop', '01-welcome-komplett', { fullPage: true });

    await open(page, '/login', 'h1');
    await shot(page, 'website/desktop', '02-login');
    await open(page, '/coaching', 'h1');
    await shot(page, 'website/desktop', '03-coaching');
    await open(page, '/eltern-leitfaden', 'h1');
    await shot(page, 'website/desktop', '04-eltern-leitfaden');
    await open(page, '/transparenz', 'h1');
    await shot(page, 'website/desktop', '05-transparenz');
    await open(page, '/datenschutz', 'h1');
    await shot(page, 'website/desktop', '06-datenschutz');
    await open(page, '/nutzungsbedingungen', 'h1');
    await shot(page, 'website/desktop', '07-nutzungsbedingungen');
    await open(page, '/impressum', 'h1');
    await shot(page, 'website/desktop', '08-impressum');
    await open(page, '/cookies', 'h1');
    await shot(page, 'website/desktop', '09-cookies');
    await open(page, '/verify-email', 'h1');
    await shot(page, 'website/desktop', '10-verify-email');
    await open(page, '/update-password', 'h1');
    await shot(page, 'website/desktop', '11-update-password');
    await open(page, '/gibt-es-nicht', 'h1');
    await shot(page, 'website/desktop', '12-404');

    await context.close();

    console.log('\nWEBSITE — Mobile 390×844');
    const mctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        colorScheme: 'light',
    });
    await installMocks(mctx);
    await mctx.addInitScript({ content: initScript({ me: null, theme: 'light' }) });
    const m = await mctx.newPage();

    await open(m, '/welcome', 'h1');
    await shot(m, 'website/mobil', '01-welcome');
    await m.getByRole('button', { name: /Menü öffnen/i }).click().catch(() => {});
    await settle(m, 500);
    await shot(m, 'website/mobil', '02-menue');
    await open(m, '/login', 'h1');
    await shot(m, 'website/mobil', '03-login');
    await open(m, '/coaching', 'h1');
    await shot(m, 'website/mobil', '04-coaching');
    await open(m, '/eltern-leitfaden', 'h1');
    await shot(m, 'website/mobil', '05-eltern-leitfaden');
    await open(m, '/transparenz', 'h1');
    await shot(m, 'website/mobil', '06-transparenz');

    await mctx.close();
}

async function captureApp(browser, { me, label }) {
    console.log(`\nAPP — ${label} (1440×900)`);
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        colorScheme: 'light',
    });
    await installMocks(context);
    await context.addInitScript({ content: initScript({ me, theme: 'light' }) });
    const page = await context.newPage();
    page.on('pageerror', e => console.warn('  [pageerror]', e.message));

    await open(page, '/', 'main');
    await shot(page, `app/desktop-${label}`, '01-entdecken');
    await open(page, '/ad/ad-mia', 'main');
    await shot(page, `app/desktop-${label}`, '02-anzeige-details');
    await open(page, '/create-ad', 'main');
    await shot(page, `app/desktop-${label}`, '03-anzeige-erstellen');
    await open(page, '/social', 'main');
    await shot(page, `app/desktop-${label}`, '04-social');
    await open(page, '/requests', 'main');
    await shot(page, `app/desktop-${label}`, '05-anfragen');
    await open(page, '/matches', 'main');
    await shot(page, `app/desktop-${label}`, '06-vorschlaege');
    await open(page, '/favorites', 'main');
    await shot(page, `app/desktop-${label}`, '07-merkliste');
    await open(page, '/chat/req-1', 'main');
    await shot(page, `app/desktop-${label}`, '08-chat');
    await open(page, '/profile', 'main');
    await shot(page, `app/desktop-${label}`, '09-profil');
    await open(page, '/profile/u-mia', 'main');
    await shot(page, `app/desktop-${label}`, '10-oeffentliches-profil');
    await open(page, '/settings', 'main');
    await shot(page, `app/desktop-${label}`, '11-einstellungen');

    await context.close();

    // Dark Mode nur für den Feed
    console.log(`\nAPP — ${label} Dark Mode`);
    const dctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        colorScheme: 'dark',
    });
    await installMocks(dctx);
    await dctx.addInitScript({ content: initScript({ me, theme: 'dark' }) });
    const d = await dctx.newPage();
    await open(d, '/', 'main');
    await shot(d, `app/desktop-${label}`, '12-dark-mode-entdecken');
    await dctx.close();

    console.log(`\nAPP — ${label} (390×844)`);
    const mctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        colorScheme: 'light',
    });
    await installMocks(mctx);
    await mctx.addInitScript({ content: initScript({ me, theme: 'light' }) });
    const m = await mctx.newPage();

    await open(m, '/', 'main');
    await shot(m, `app/mobil-${label}`, '01-entdecken');
    await open(m, '/ad/ad-mia', 'main');
    await shot(m, `app/mobil-${label}`, '02-anzeige-details');
    await open(m, '/create-ad', 'main');
    await shot(m, `app/mobil-${label}`, '03-anzeige-erstellen');
    await open(m, '/social', 'main');
    await shot(m, `app/mobil-${label}`, '04-social');
    await open(m, '/chat/req-1', 'main');
    await shot(m, `app/mobil-${label}`, '05-chat');
    await open(m, '/profile', 'main');
    await shot(m, `app/mobil-${label}`, '06-profil');
    await open(m, '/settings', 'main');
    await shot(m, `app/mobil-${label}`, '07-einstellungen');

    await mctx.close();
}

async function captureAdmin(browser) {
    console.log('\nADMIN & COACHING — Desktop');
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        colorScheme: 'light',
    });
    await installMocks(context);
    await context.addInitScript({ content: initScript({ me: ADMIN, theme: 'light' }) });
    const page = await context.newPage();
    page.on('pageerror', e => console.warn('  [pageerror]', e.message));

    await open(page, '/coach-panel', 'main');
    await shot(page, 'app/desktop', '13-coaching-panel');

    await open(page, '/sv-panel?tab=overview', 'main');
    await shot(page, 'app/desktop', '14-sv-panel-uebersicht');
    await open(page, '/sv-panel?tab=users', 'main');
    await shot(page, 'app/desktop', '15-sv-panel-nutzer');
    await open(page, '/sv-panel?tab=reports', 'main');
    await shot(page, 'app/desktop', '16-sv-panel-meldungen');
    await open(page, '/sv-panel?tab=news', 'main');
    await shot(page, 'app/desktop', '17-sv-panel-news');
    await open(page, '/sv-panel?tab=codes', 'main');
    await shot(page, 'app/desktop', '18-sv-panel-codes');
    await open(page, '/sv-panel?tab=ads', 'main');
    await shot(page, 'app/desktop', '19-sv-panel-anzeigen');
    await open(page, '/sv-panel?tab=analytics', 'main');
    await shot(page, 'app/desktop', '20-sv-panel-analytics');
    await open(page, '/sv-panel?tab=auditlog', 'main');
    await shot(page, 'app/desktop', '21-sv-panel-audit-log');
    await open(page, '/sv-panel?tab=support', 'main');
    await shot(page, 'app/desktop', '22-sv-panel-support');

    await context.close();
}

// ── Main ─────────────────────────────────────────────────────────

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
    await captureWebsite(browser);
    await captureApp(browser, { me: ME, label: 'schuelerin' });
    await captureAdmin(browser);
} finally {
    await browser.close();
}

const readme = `# Screenshots: Website & App

Aufgenommen am 12.11.2026 mit Playwright/Chromium (headless) gegen die lokale
Dev-Umgebung (\`http://127.0.0.1:5180\`).

## Wichtig zu den Daten

Alle Personen, Anzeigen, E-Mail-Adressen und Chats sind **frei erfunden**.
E-Mail-Adressen verwenden ausschließlich \`example.org\`. Es wurden keine echten
Nutzerdaten, keine echten Konten und kein Produktions-Backend verwendet. Die
API-Antworten wurden für die Aufnahmen im Browser gemockt.

## Ordnerstruktur

- \`website/desktop/\` – öffentliche Website, 1440 × 900
- \`website/mobil/\` – öffentliche Website, 390 × 844 (DPR 2)
- \`app/desktop/\` – eingeloggte App inkl. SV-Panel und Coaching, 1440 × 900
- \`app/desktop-schuelerin/\` – App aus Sicht einer Schülerin
- \`app/mobil-schuelerin/\` – App aus Sicht einer Schülerin, 390 × 844 (DPR 2)

## Enthaltene Bereiche

### Website
Welcome/Landing (inkl. Ganzseiten-Aufnahme), Login, Coaching, Eltern-Leitfaden,
Transparenz, Datenschutz, Nutzungsbedingungen, Impressum, Cookies,
E-Mail-Verifizierung, Passwort aktualisieren, 404 – mobil zusätzlich das
geöffnete Menü.

### App
Entdecken/Feed, Anzeige-Details, Anzeige erstellen, Social-Stream, Anfragen,
Vorschläge, Merkliste, Chat, eigenes Profil, öffentliches Profil,
Einstellungen, Dark Mode, Coaching-Panel sowie SV-Panel (Übersicht, Nutzer,
Meldungen, News, Codes, Anzeigen, Analytics, Audit Log, Support).

## Nicht enthalten

- Echte Produktionsdaten oder echte Konten
- Zustände, die eine reale Anmeldung erfordern (E-Mail-Versand, echte Chats)
- Native App-Ansichten (die App ist eine PWA im Browser)
`;

fs.writeFileSync(path.join(OUT, 'README.md'), readme, 'utf8');
console.log(`\nFertig: ${OUT}`);
