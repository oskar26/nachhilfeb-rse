import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
    ArrowRight,
    BadgeCheck,
    ChevronDown,
    GraduationCap,
    Image as ImageIcon,
    Lightbulb,
    Lock,
    Mail,
    Search,
    Shield,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { CollapsedNewsWidget } from '../components/CollapsedNewsWidget';
import SupportModal from '../components/SupportModal';
import SiteHeader from '../components/SiteHeader';
import { PageEnter } from '../components/site/PageEnter';
import VerifySteps from '../components/VerifySteps';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { SUBJECT_CATEGORIES, SubjectChip, type Subject } from '../components/SubjectChip';
import { Switch } from '../components/ui/switch';
import { Button, buttonVariants } from '../components/ui/button';
import { DeviceFrame } from '../components/site/DeviceFrame';
import { Reveal } from '../components/site/Reveal';
import { m, prefersReducedMotion, SPRING } from '../lib/motion';
import { cn } from '../lib/utils';
import phoneFeedShot from '../../docs/screenshots/v2-phone-feed.png';
import phoneChatShot from '../../docs/screenshots/v2-phone-chat.png';
import tabletSettingsShot from '../../docs/screenshots/v2-tablet-settings.png';
import feedShot from '../../docs/screenshots/v2-laptop-feed.png';
import svPanelShot from '../../docs/screenshots/07-sv-panel.png';

/* Single Source of Truth für alle Fächer: SUBJECT_CATEGORIES aus SubjectChip.tsx
   (dieselbe Quelle nutzen CreateAd + Feed). */
const POPULAR_SUBJECTS: Subject[] = ['mathematik', 'deutsch', 'englisch', 'physik', 'latein', 'franzoesisch', 'chemie', 'informatik'];
const ALL_SUBJECTS = SUBJECT_CATEGORIES.flatMap((c) => c.subjects);
const MORE_SUBJECTS = ALL_SUBJECTS.filter((s) => !POPULAR_SUBJECTS.includes(s));

const WAY_TONES = [
    { card: 'bg-pastel-blue text-pastel-blue-foreground', icon: 'text-pastel-blue-foreground', pill: 'bg-white/80 text-pastel-blue-foreground' },
    { card: 'bg-primary text-primary-foreground', icon: 'text-primary-foreground', pill: 'bg-white/70 text-primary-foreground' },
    { card: 'bg-pastel-mint text-pastel-mint-foreground', icon: 'text-pastel-mint-foreground', pill: 'bg-white/80 text-pastel-mint-foreground' },
];

function parseCount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

/* Einmal pro Datei erzeugt, nie im Render: Motion-Variante des React-Router-Links. */
const MotionLink = motion.create(Link);

export default function Landing() {
    const { user, isAdmin } = useAuth();
    const location = useLocation();
    const reduce = useReducedMotion();
    const [liveStats, setLiveStats] = useState<{ active_ads: number | null; users: number | null } | null>(null);
    const [isFeatureOpen, setIsFeatureOpen] = useState(false);

    /* Privatsphäre-Demo */
    const [showPhone, setShowPhone] = useState(true);
    const [showMoodle, setShowMoodle] = useState(false);

    useEffect(() => {
        // Statistik ist optional (die Landing funktioniert auch ohne Daten);
        // Fehler werden bewusst still ignoriert.
        api.analytics.summary().then(({ data, error }) => {
            if (error || !data) return;
            const summary = data as { active_ads?: unknown; users?: unknown };
            const active_ads = parseCount(summary.active_ads);
            const users = parseCount(summary.users);
            // Ohne verwertbare Zahl keine Statistik rendern (kein 0- oder —-Platzhalter).
            if (active_ads === null && users === null) return;
            setLiveStats({ active_ads, users });
        }).catch(() => { /* Statistik ist optional */ });
    }, []);

    // Registrierungs-CTAs öffnen direkt den Registrieren-Tab; „Anmelden“ bleibt /login.
    const registerZiel = user ? '/' : '/login?mode=register';
    const loginZiel = user ? '/' : '/login';
    const suchZiel = user ? '/' : '/login';
    const bietZiel = user ? '/create-ad' : '/login';
    const elternZiel = '/eltern-leitfaden';
    // Das SV-Panel ist nur für bestätigte SV-Admins sichtbar; alle anderen bleiben beim sicheren Ziel.
    const appTourZiel = (index: number) => {
        if (!user) return registerZiel;
        if (index === 0) return '/';
        if (index === 1) return '/';
        if (index === 2) return '/profile';
        return isAdmin ? '/sv-panel' : '/';
    };

    // Routenwechsel startet oben; gezielte Abschnittssprünge (z. B. aus dem
    // Header) werden über den Router-State übergeben und hier ausgeführt.
    useEffect(() => {
        const section = (location.state as { section?: string } | null)?.section;
        if (!section) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            return;
        }
        let tries = 0;
        let frame = 0;
        const scrollToTarget = () => {
            const el = document.getElementById(section);
            if (el) {
                el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
                return;
            }
            if (tries < 30) {
                tries += 1;
                frame = window.requestAnimationFrame(scrollToTarget);
            }
        };
        frame = window.requestAnimationFrame(scrollToTarget);
        return () => window.cancelAnimationFrame(frame);
    }, [location.key, location.pathname, location.state]);
    const stats = liveStats
        ? [
            ...(liveStats.active_ads !== null ? [{ value: liveStats.active_ads, label: 'Aktive Anzeigen', tone: 'bg-pastel-yellow text-pastel-yellow-foreground' }] : []),
            ...(liveStats.users !== null ? [{ value: liveStats.users, label: 'Nutzer', tone: 'bg-pastel-mint text-pastel-mint-foreground' }] : []),
        ]
        : [];

    return (
        <main className="min-h-dvh overflow-x-clip bg-background font-sans text-foreground">
            {/* Skip-Link als Scroll-Button: reines href="#inhalt" wäre unter HashRouter eine 404-Route. */}
            <button
                type="button"
                onClick={() => {
                    const el = document.getElementById('inhalt') as HTMLElement | null;
                    if (!el) return;
                    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
                    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
                }}
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
            >
                Zum Inhalt springen
            </button>

            <SiteHeader />

            <PageEnter>
            <section id="inhalt" tabIndex={-1} className="scroll-mt-24 bg-background">
                <div className="mx-auto max-w-site px-4 pb-14 pt-7 sm:px-6 sm:pb-20 sm:pt-10">
                    <Reveal>
                        <CollapsedNewsWidget compact />
                    </Reveal>

                    <div className="mt-6 grid items-center gap-10 lg:mt-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
                        <Reveal>
                            <div className="min-w-0">
                                <h1 className="max-w-2xl text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[3.4rem] lg:text-[3.5rem]">
                                    Finde Nachhilfe. Direkt am FWG.
                                </h1>
                                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
                                    Nachhilfe in Mathematik, Englisch und weiteren Fächern, direkt unter Mitschülerinnen und Mitschülern. Jede Anzeige stammt von einem verifizierten Konto.
                                </p>
                                <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                                    <Link to={registerZiel} className={buttonVariants({ size: 'lg' }) + ' w-full sm:w-auto'}>
                                        {user ? 'Anzeigen ansehen' : 'Kostenlos registrieren'} <ArrowRight aria-hidden />
                                    </Link>
                                    <Link to="/eltern-leitfaden" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' w-full sm:w-auto'}>
                                        Eltern-Leitfaden
                                    </Link>
                                </div>
                                {!user && (
                                    <p className="mt-3 text-[13px] font-medium leading-relaxed text-muted-foreground">
                                        Konto erstellen → im SV-Raum verifizieren → loslegen.
                                    </p>
                                )}
                                <ul className="mt-7 flex flex-wrap gap-2" aria-label="Vertrauen auf einen Blick">
                                    {[
                                        { icon: BadgeCheck, label: 'SV-verifiziert', tone: 'bg-pastel-blue text-pastel-blue-foreground' },
                                        { icon: ShieldCheck, label: 'Nur FWG Köln', tone: 'bg-pastel-mint text-pastel-mint-foreground' },
                                        { icon: Lock, label: 'Server in Deutschland', tone: 'bg-pastel-rose text-pastel-rose-foreground' },
                                        { icon: BadgeCheck, label: 'Nutzung kostenlos', tone: 'bg-pastel-yellow text-pastel-yellow-foreground' },
                                    ].map((s) => (
                                        <li key={s.label} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ${s.tone}`}>
                                            <s.icon size={15} aria-hidden /> {s.label}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>

                        <Reveal delay={90}>
                            <div className="relative mx-auto w-full max-w-[560px]" aria-label="Vorschau: App auf Laptop, Tablet und Handy">
                                <div className="relative rounded-panel bg-[linear-gradient(140deg,var(--primary)_0%,var(--primary-soft)_100%)] p-5 shadow-card sm:p-8">
                                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-panel">
                                        <span className="absolute -left-1/4 -top-1/3 h-[70%] w-[85%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.62),transparent_68%)]" />
                                    </div>

                                    <div className="relative h-[310px] sm:h-[430px]">
                                        <DeviceFrame
                                            kind="tablet"
                                            src={tabletSettingsShot}
                                            alt="Tablet-Vorschau der Einstellungen"
                                            className="absolute -left-10 top-[22%] hidden w-[44%] sm:block"
                                        />
                                        <DeviceFrame
                                            kind="laptop"
                                            src={feedShot}
                                            alt="Laptop-Vorschau der Anzeigenübersicht"
                                            priority
                                            className="absolute left-[10%] top-[4%] w-[82%]"
                                        />
                                        <DeviceFrame
                                            kind="phone"
                                            src={phoneFeedShot}
                                            alt="Handy-Vorschau der Anzeigenübersicht"
                                            priority
                                            className="absolute -right-2 bottom-[-4%] w-[27%]"
                                        />
                                    </div>

                                    <div className="absolute -left-3 bottom-2 z-30 w-[176px] rounded-card border border-border/80 bg-card p-3.5 shadow-card sm:-left-6 sm:bottom-5 sm:w-[202px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <SubjectChip subject="mathematik" />
                                            <span className="rounded-full bg-pastel-yellow px-2 py-0.5 text-xs font-semibold text-pastel-yellow-foreground">Beispiel</span>
                                        </div>
                                        <p className="mt-2.5 text-sm font-bold leading-snug">Analysis-Crash vor der Klausur</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Lena K. · Q1 · SV-Raum</p>
                                        <p className="mt-2.5 text-[13px] font-bold tabular-nums">12 € / 45 Min <span className="font-medium text-muted-foreground">· ≈ 16 €/h</span></p>
                                    </div>

                                    <div className="absolute -right-2 top-[16%] z-30 w-[160px] rounded-card border border-border/80 bg-card p-3.5 shadow-card sm:-right-5 sm:w-[186px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <SubjectChip subject="physik" />
                                            <span className="rounded-full bg-pastel-mint px-2 py-0.5 text-xs font-semibold text-pastel-mint-foreground">Beispiel</span>
                                        </div>
                                        <p className="mt-2.5 text-sm font-bold leading-snug">Mechanik ohne Panik</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Aylin D. · Q2 · Bibliothek</p>
                                        <p className="mt-2.5 text-[13px] font-bold tabular-nums">12 € / 60 Min</p>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* WEGE */}
            <section id="wege" className="scroll-mt-28 bg-background">
                <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-24">
                    <Reveal>
                        <div className="max-w-3xl">
                            <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">Drei Wege zur Nachhilfe.</h2>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">Wähle den Weg, der zu dir passt. Jeder Weg beginnt mit einer Anzeige oder einer Anfrage.</p>
                        </div>
                    </Reveal>
                    <div className="mt-8 grid gap-4 lg:grid-cols-3">
                        {[
                            { icon: Search, title: 'Ich suche Nachhilfe', text: 'Filtere nach Fach, Klasse und Preis. Kontakt über die App, sobald eine Anfrage angenommen ist.', points: ['Filter für Fach und Klasse', 'Kontakt nach Annahme', 'Verifizierte Konten'], cta: 'Anzeigen stöbern', to: suchZiel },
                            { icon: GraduationCap, title: 'Ich biete Nachhilfe', text: 'Lege deinen Preis fest, gib deine Zeiten an und antworte auf Anfragen.', points: ['Eigene Preise und Bedingungen', 'Flexible Termine', 'Bewertungen nach Kontakt'], cta: 'Anzeige erstellen', to: bietZiel },
                            { icon: Users, title: 'Für Eltern: Begleitung & Einwilligung', text: 'Betreuen Sie das Konto gemeinsam mit Ihrem Kind oder lassen Sie es selbstständig nutzen. In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. So behalten Sie Anzeigen und Anfragen im Blick.', points: ['Ein Konto pro Kind', 'Gemeinsam Anzeigen und Anfragen ansehen', 'Kontakt zur SV bei Fragen'], cta: 'Eltern-Leitfaden', to: '/eltern-leitfaden' },
                        ].map((w, i) => (
                            <Reveal key={w.title} delay={i * 70} className="h-full">
                                <m.article
                                    whileHover={reduce ? undefined : { y: -2 }}
                                    whileTap={reduce ? undefined : { scale: 0.985 }}
                                    transition={SPRING.settle}
                                    className={cn('flex h-full flex-col rounded-card p-6 shadow-soft transition-[box-shadow] duration-150 hover:shadow-card sm:p-7', WAY_TONES[i].card)}
                                >
                                    <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white shadow-soft">
                                        <w.icon size={28} className={WAY_TONES[i].icon} aria-hidden />
                                    </span>
                                    <div className="mt-5 flex min-w-0 flex-1 flex-col">
                                        <h3 className="text-xl font-extrabold tracking-tight">{w.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed">{w.text}</p>
                                        <ul id={`wege-punkte-${i}`} className="mt-5 flex flex-wrap gap-2">
                                            {w.points.map((p) => (
                                                <li key={p} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${WAY_TONES[i].pill}`}>
                                                    <BadgeCheck size={14} aria-hidden />{p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <Link
                                        to={w.to}
                                        aria-describedby={`wege-punkte-${i}`}
                                        aria-label={`${w.cta}: ${w.title}`}
                                        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-foreground shadow-soft"
                                    >
                                        {w.cta} <ArrowRight size={17} aria-hidden />
                                    </Link>
                                </m.article>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Empfehlung + Fächer + Kennzahlen */}
            <section aria-label="Empfehlung, Fächer und Kennzahlen" className="bg-card">
                <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20">
                    <Reveal>
                        <div className="flex flex-col items-start gap-3 rounded-panel bg-pastel-blue p-4 text-pastel-blue-foreground sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 text-xs font-semibold">
                                <Users size={15} aria-hidden /> Empfehlung
                            </span>
                            <p className="min-w-0 flex-1 text-sm leading-relaxed">
                                <strong className="font-bold">Ein Konto pro Kind:</strong> In den Klassen 5 und 6 betreuen viele Eltern mit, ältere nutzen die Börse selbstständig.
                            </p>
                            <Link to="/eltern-leitfaden" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors hover:bg-white/60">
                                Eltern-Leitfaden <ArrowRight size={16} aria-hidden />
                            </Link>
                        </div>
                    </Reveal>

                    <Reveal delay={70}>
                        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-muted-foreground">Fächer</p>
                                <div className="mt-3 flex flex-wrap gap-2" aria-label="Fächerübersicht">
                                    {POPULAR_SUBJECTS.map((s) => (
                                        <SubjectChip key={s} subject={s} />
                                    ))}
                                </div>
                                <details className="group mt-3">
                                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border/80 bg-background px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                                        Alle 25 Fächer anzeigen
                                        <ChevronDown size={15} aria-hidden className="transition-transform duration-150 group-open:rotate-180" />
                                    </summary>
                                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Weitere Fächer">
                                        {MORE_SUBJECTS.map((s) => (
                                            <SubjectChip key={s} subject={s} />
                                        ))}
                                    </div>
                                </details>
                            </div>

                            {stats.length > 0 ? (
                                <dl
                                    className={cn('grid shrink-0 gap-3', stats.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}
                                    aria-label="Aktuelle Kennzahlen der Nachhilfebörse"
                                >
                                    {stats.map((s) => (
                                        <div key={s.label} className={`rounded-card px-5 py-4 ${s.tone}`}>
                                            <dd className="text-2xl font-extrabold tabular-nums sm:text-3xl">
                                                {s.value.toLocaleString('de-DE')}
                                            </dd>
                                            <dt className="mt-1 text-xs font-semibold">{s.label}</dt>
                                        </div>
                                    ))}
                                </dl>
                            ) : (
                                <p className="shrink-0 rounded-card border border-border/80 bg-background px-5 py-4 text-[13px] font-medium leading-relaxed text-muted-foreground">
                                    Die Zahlen werden gerade nicht geladen.
                                </p>
                            )}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* APP-RUNDGANG */}
            <section id="brett" className="scroll-mt-28 bg-card">
                <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-24">
                    <Reveal>
                        <div className="max-w-3xl">
                            <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">So sieht die Nachhilfebörse aus.</h2>
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">Echte Screenshots aus der App: stöbern, anfragen, Profil zeigen. Am Handy, am iPad und am Desktop.</p>
                        </div>
                    </Reveal>

                    <div className="mt-10 space-y-16 sm:mt-14 sm:space-y-24">
                        {[
                            {
                                title: 'Entdecken & Filtern',
                                text: 'Filtere nach Fach, Klasse und Preis. Die Übersicht zeigt dir auf einen Blick, wer zu deiner Klasse passt.',
                                device: 'laptop' as const,
                                src: feedShot,
                                alt: 'Desktop-Übersicht „Aktuelle Anzeigen“ mit Suche und Filtern',
                                tone: 'bg-pastel-blue',
                                deviceClass: 'ml-auto w-full max-w-[560px]',
                                label: 'Am Laptop',
                                adminOnly: false,
                            },
                            {
                                title: 'Chat',
                                text: 'Kontakt über die App, sobald eine Anfrage angenommen ist. Telefonnummer und Moodle-Name sehen andere erst, wenn du eine Anfrage annimmst.',
                                device: 'phone' as const,
                                src: phoneChatShot,
                                alt: 'Handy-Ansicht des Chats mit Nachrichtenblasen und Eingabeleiste',
                                tone: 'bg-pastel-mint',
                                deviceClass: 'mx-auto w-full max-w-[260px]',
                                label: 'Am Handy',
                                adminOnly: false,
                            },
                            {
                                title: 'Profil und Einstellungen',
                                text: 'Profilbild und ausführliche Beschreibung. Beschreibe deine Fächer und deine Erfahrung. Du entscheidest, welche Kontaktdaten sichtbar sind.',
                                device: 'tablet' as const,
                                src: tabletSettingsShot,
                                alt: 'Tablet-Einstellungen mit Erscheinungsbild, Push und Datenschutz',
                                tone: 'bg-pastel-yellow',
                                deviceClass: 'mx-auto w-full max-w-[340px]',
                                label: 'Am Tablet',
                                adminOnly: false,
                            },
                            {
                                title: 'SV-Panel',
                                text: 'Verifizierte Konten durch persönliche Prüfung im SV-Raum, dazu Moderation und Meldefunktion. Das SV-Team behält Anzeigen und Meldungen im Blick.',
                                device: 'laptop' as const,
                                src: svPanelShot,
                                alt: 'SV-Admin-Panel mit Nutzern, Anzeigen und Meldungen',
                                tone: 'bg-pastel-violet',
                                deviceClass: 'ml-auto w-full max-w-[560px]',
                                label: 'Im SV-Raum',
                                adminOnly: true,
                                screenClassName: 'aspect-[1606/1104]',
                            },
                        ].filter((row) => !row.adminOnly || isAdmin).map((row, i) => (
                            <Reveal key={row.title}>
                                <div className={cn('grid items-center gap-8 lg:grid-cols-2 lg:gap-16', i % 2 === 1 && 'lg:[&>*:first-child]:order-2')}>
                                    <div className="min-w-0">
                                        <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                            {row.label}
                                        </span>
                                        <h3 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{row.title}</h3>
                                        <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{row.text}</p>
                                        <Link
                                            to={appTourZiel(i)}
                                            className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
                                        >
                                            {user ? 'In der App ansehen' : 'Kostenlos registrieren'} <ArrowRight size={16} aria-hidden />
                                        </Link>
                                    </div>
                                    <div className={cn('rounded-panel p-5 shadow-soft sm:p-8', row.tone)}>
                                        <DeviceFrame kind={row.device} src={row.src} alt={row.alt} className={row.deviceClass} screenClassName={row.screenClassName} />
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>

                    <Reveal>
                        <div className="mt-14 flex flex-col items-start justify-between gap-4 rounded-panel bg-primary p-5 text-primary-foreground shadow-card sm:mt-20 sm:flex-row sm:items-center sm:p-7">
                            <div className="flex items-center gap-3">
                                <span className="grid size-11 place-items-center rounded-full bg-white/45">
                                    <ImageIcon size={21} aria-hidden />
                                </span>
                                <p className="text-lg font-extrabold">Börse ansehen</p>
                            </div>
                            <MotionLink
                                to={registerZiel}
                                whileHover={reduce ? undefined : { y: -2 }}
                                whileTap={reduce ? undefined : { scale: 0.985 }}
                                transition={SPRING.settle}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background shadow-soft transition-[box-shadow] duration-150 hover:shadow-card"
                            >
                                {user ? 'Börse ansehen' : 'Kostenlos registrieren'} <ArrowRight aria-hidden />
                            </MotionLink>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* PRIVATSPHÄRE + VERIFIKATION */}
            <section id="sicher" className="scroll-mt-28 bg-card">
                <div className="mx-auto grid max-w-site gap-4 px-4 py-14 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_0.85fr]">
                    <Reveal className="h-full">
                        <div className="flex h-full flex-col justify-center rounded-card bg-background p-6 shadow-soft sm:p-8">
                            <Shield size={24} className="text-pastel-blue-foreground" aria-hidden />
                            <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">Du entscheidest, wer was sieht.</h2>
                            <p className="mt-4 leading-relaxed text-muted-foreground">Du entscheidest, welche Kontaktdaten sichtbar sind. Telefonnummer und Moodle-Name sehen andere erst nach Annahme einer Anfrage. Die E-Mail-Adresse kannst du im Profil öffentlich schalten.</p>
                            <div className="mt-6 rounded-card border border-border/80 bg-card p-4 shadow-soft sm:p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[13px] font-semibold text-foreground">So sieht es in der App aus</p>
                                    <span className="rounded-full bg-pastel-yellow px-2.5 py-1 text-xs font-semibold text-pastel-yellow-foreground">Beispiel</span>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {[
                                        { label: 'Telefonnummer', desc: 'Nur für angenommene Anfragen', on: showPhone, set: setShowPhone },
                                        { label: 'Moodle-Name', desc: 'Nur für angenommene Anfragen', on: showMoodle, set: setShowMoodle },
                                    ].map((r, index) => {
                                        const descId = `privacy-preview-row-${index}`;
                                        return (
                                            <div key={r.label} className="flex items-center justify-between gap-4 rounded-full bg-background px-4 py-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold">{r.label}</p>
                                                    <p id={descId} className="text-[13px] text-muted-foreground">{r.on ? r.desc : 'Versteckt: niemand sieht das'}</p>
                                                </div>
                                                <Switch
                                                    checked={r.on}
                                                    onCheckedChange={() => r.set(v => !v)}
                                                    label={`${r.label} Sichtbarkeit`}
                                                    aria-describedby={`${descId} privacy-preview-hint`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <p id="privacy-preview-hint" className="mt-4 inline-flex items-start gap-2 text-[13px] font-medium leading-relaxed text-muted-foreground"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden /> Diese Vorschau speichert nichts; in der App stellst du die Sichtbarkeit in den Einstellungen ein.</p>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={80} className="h-full">
                        <div className="flex h-full flex-col justify-center rounded-card bg-pastel-mint p-6 text-pastel-mint-foreground shadow-soft sm:p-8">
                            <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">So wird dein Konto verifiziert.</h2>
                            <div className="mt-7">
                                <VerifySteps tone="du" variant="timeline" />
                            </div>
                            <MotionLink
                                to={loginZiel}
                                whileHover={reduce ? undefined : { y: -2 }}
                                whileTap={reduce ? undefined : { scale: 0.985 }}
                                transition={SPRING.settle}
                                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-white px-6 text-sm font-semibold text-foreground shadow-soft transition-[box-shadow] duration-150 hover:shadow-card"
                            >
                                {user ? 'Zur Börse' : 'Zur Anmeldung'} <ArrowRight aria-hidden />
                            </MotionLink>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* COACHING-AG */}
            <section id="coaching" className="scroll-mt-28 bg-background">
                <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-24">
                    <Reveal>
                        <div className="rounded-panel bg-primary p-5 text-primary-foreground shadow-card sm:p-8">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/55 px-3.5 py-2 text-xs font-semibold">
                                <Sparkles size={15} aria-hidden /> Coaching-AG am FWG
                            </span>
                            <h2 className="mt-4 text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">Die Coaching-AG</h2>
                            <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-primary-foreground/85 sm:text-lg">Ältere unterstützen Jüngere: Unter Leitung von <strong className="font-bold text-primary-foreground">Frau Balistreri</strong> begleiten geschulte Schülerinnen und Schüler <strong className="font-bold text-primary-foreground">ab Klasse 8</strong> gezielt Kinder der <strong className="font-bold text-primary-foreground">Klassen 5 und 6</strong> beim Start an unserer Schule.</p>

                            <div className="mt-7 grid gap-4 md:grid-cols-3">
                                {[
                                    { icon: GraduationCap, t: 'Pädagogisch begleitet', d: 'Coaches lernen Lernmethoden und Arbeitsorganisation.' },
                                    { icon: Shield, t: 'Offizielles Coach-Abzeichen', d: 'Coaches mit Abzeichen haben die Schulung besucht und sind verifiziert.' },
                                    { icon: Users, t: 'Gemeinschaft & Fairness', d: 'Kontakt über die App. Richtwert: 12 € pro 45 Minuten (≈ 16 €/h), individuell anpassbar.' },
                                ].map((c) => (
                                    <div key={c.t} className="rounded-card bg-card p-5 text-foreground shadow-soft">
                                        <span className="grid size-11 place-items-center rounded-full bg-pastel-violet text-pastel-violet-foreground">
                                            <c.icon size={20} aria-hidden />
                                        </span>
                                        <h3 className="mt-3 text-base font-bold">{c.t}</h3>
                                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                                <div>
                                    <p className="text-sm font-semibold">Schüler-Coach werden? Ab Klasse 8</p>
                                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-primary-foreground/80">Du möchtest Schülerinnen und Schüler der Klassen 5 und 6 unterstützen? Sprich Frau Balistreri oder die SV an. Alle Regeln findest du transparent auf der <Link to="/coaching" className="font-semibold text-primary-foreground underline underline-offset-4">Coaching-Seite</Link>.</p>
                                </div>
                                <MotionLink
                                    to="/coaching"
                                    whileHover={reduce ? undefined : { y: -2 }}
                                    whileTap={reduce ? undefined : { scale: 0.985 }}
                                    transition={SPRING.settle}
                                    className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-foreground shadow-soft transition-[box-shadow] duration-150 hover:shadow-card"
                                >
                                    Jetzt mitmachen
                                </MotionLink>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ELTERN */}
            <section id="eltern" className="scroll-mt-28 bg-card text-foreground">
                <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-24">
                    <Reveal>
                        <div className="max-w-3xl">
                            <span className="inline-grid size-14 place-items-center rounded-full bg-pastel-orange text-pastel-orange-foreground"><Shield size={24} aria-hidden /></span>
                            <h2 className="mt-5 text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">Informationen für Eltern</h2>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">Ihr Kind nutzt die Nachhilfebörse über sein eigenes Konto. Wie selbstständig es läuft, entscheiden Sie gemeinsam: In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. So behalten Sie Anzeigen und Anfragen im Blick. Unter 16 Jahren brauchen wir Ihre Einwilligung.</p>
                        </div>
                    </Reveal>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {[
                            { icon: Users, t: 'Gemeinsam betreuen', d: 'Ihr Kind nutzt sein Konto, Sie schauen mit und unterstützen. Wie eng Sie begleiten, entscheiden Sie gemeinsam.', tone: 'bg-pastel-blue text-pastel-blue-foreground' },
                            { icon: BadgeCheck, t: 'Verifizierte Konten', d: 'Nur verifizierte Konten können Anzeigen erstellen, Kontakt aufnehmen oder Anzeigen ansehen. Im Profil ist sichtbar, ob jemand verifiziert ist.', tone: 'bg-pastel-mint text-pastel-mint-foreground' },
                            { icon: Lock, t: 'Keine Zahlungen über die App', d: 'Die Börse vermittelt nur den Kontakt. Vergütung und Umfang klären Sie direkt mit der Familie der Anbieterin oder des Anbieters.', tone: 'bg-pastel-violet text-pastel-violet-foreground' },
                            { icon: Shield, t: 'Melden & Fragen', d: 'Jede Anzeige und jedes Profil lässt sich melden. Das SV-Team sichtet Meldungen mindestens einmal pro Woche, oft auch häufiger.', tone: 'bg-pastel-rose text-pastel-rose-foreground' },
                        ].map((f, i) => (
                            <Reveal key={f.t} delay={i * 50} className="h-full">
                                <article className={`h-full rounded-card p-6 shadow-soft ${f.tone}`}>
                                    <span className="inline-grid size-12 place-items-center rounded-full bg-white/85"><f.icon size={21} aria-hidden /></span>
                                    <h3 className="mt-4 text-lg font-extrabold">{f.t}</h3>
                                    <p className="mt-2 text-sm leading-relaxed">{f.d}</p>
                                </article>
                            </Reveal>
                        ))}
                    </div>

                    <Reveal delay={70}>
                        <m.a
                            href="mailto:info@nachhilfe-sv.de?subject=Frage%20als%20Elternteil"
                            whileHover={reduce ? undefined : { y: -2 }}
                            whileTap={reduce ? undefined : { scale: 0.995 }}
                            transition={SPRING.settle}
                            className="group mt-6 flex flex-col gap-4 rounded-card border border-primary/35 bg-primary-soft p-5 text-foreground shadow-soft transition-[box-shadow] duration-200 hover:shadow-card sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-card text-primary shadow-soft">
                                    <Mail size={21} aria-hidden />
                                </span>
                                <div>
                                    <p className="text-base font-extrabold">Fragen als Elternteil?</p>
                                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                        Schreib dem SV-Team direkt bei Fragen zu Registrierung, Einwilligung oder Sicherheit.
                                    </p>
                                </div>
                            </div>
                            <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors group-hover:bg-foreground/90">
                                info@nachhilfe-sv.de <ArrowRight size={16} aria-hidden />
                            </span>
                        </m.a>
                    </Reveal>

                    <Reveal delay={80}>
                        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-panel bg-[linear-gradient(135deg,var(--primary),var(--primary-soft))] p-6 text-primary-foreground shadow-card sm:flex-row sm:items-center sm:p-8">
                            <div>
                                <p className="text-xl font-extrabold sm:text-2xl">Der Eltern-Leitfaden</p>
                                <p className="mt-1.5 text-sm font-medium text-primary-foreground/80">Ablauf, Einwilligung und Kontakt zur SV in einem Dokument.</p>
                            </div>
                            <MotionLink
                                to={elternZiel}
                                whileHover={reduce ? undefined : { y: -2 }}
                                whileTap={reduce ? undefined : { scale: 0.985 }}
                                transition={SPRING.settle}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background shadow-soft transition-[box-shadow] duration-150 hover:shadow-card"
                            >
                                Eltern-Leitfaden lesen <ArrowRight aria-hidden />
                            </MotionLink>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Funktionswunsch */}
            <section id="funktionswunsch" className="scroll-mt-28 bg-secondary/60 text-foreground">
                <div className="mx-auto max-w-site px-4 py-12 sm:px-6 sm:py-16">
                    <Reveal>
                        <div className="flex flex-col gap-6 rounded-panel border border-border bg-card p-6 shadow-card sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-soft-foreground">
                                    <Lightbulb size={22} aria-hidden />
                                </span>
                                <div>
                                    <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Etwas fehlt?</h2>
                                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                        Wünsch dir eine Funktion für die Nachhilfebörse. Dein Funktionswunsch landet direkt beim SV-Team – ohne Umwege.
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                                {user ? (
                                    <Button type="button" onClick={() => setIsFeatureOpen(true)} className="min-h-11 rounded-full font-semibold">
                                        <Lightbulb size={16} aria-hidden /> Funktionswunsch senden
                                    </Button>
                                ) : (
                                    <Link to="/login?mode=register" className={cn(buttonVariants(), 'min-h-11 rounded-full font-semibold')}>
                                        Konto erstellen <ArrowRight size={16} aria-hidden />
                                    </Link>
                                )}
                                <a
                                    href="mailto:info@nachhilfe-sv.de?subject=Funktionswunsch"
                                    className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 rounded-full font-semibold')}
                                >
                                    <Mail size={16} aria-hidden /> Per E-Mail
                                </a>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            <SupportModal isOpen={isFeatureOpen} onClose={() => setIsFeatureOpen(false)} initialType="feature" initialView="form" />

            {/* Footer */}
            <footer className="rounded-t-panel bg-secondary text-muted-foreground">
                <div className="mx-auto max-w-site px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-14 sm:px-6">
                    <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
                        <div className="flex items-center gap-3">
                            <Logo size={34} className="shrink-0 text-primary" />
                            <div>
                                <p className="text-lg font-bold leading-none text-foreground">Nachhilfebörse</p>
                                <p className="mt-1 text-xs font-medium">Nachhilfebörse der Schülervertretung am FWG.</p>
                            </div>
                        </div>
                        <nav className="flex flex-wrap gap-x-5 text-sm font-medium" aria-label="Rechtliches und Infos">
                            {[
                                ['Impressum', '/impressum'], ['Datenschutz', '/datenschutz'], ['Cookies', '/cookies'],
                                ['Coaching-AG', '/coaching'], ['Nutzungsbedingungen', '/nutzungsbedingungen'], ['Eltern-Leitfaden', '/eltern-leitfaden'],
                                ['Transparenz', '/transparenz'],
                            ].map(([label, path]) => (
                                <Link key={path} to={path} className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">{label}</Link>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs sm:flex-row">
                        <p>© Schülervertretung Friedrich-Wilhelm-Gymnasium Köln {new Date().getFullYear()}.</p>
                        <div className="flex flex-col gap-1 sm:items-end">
                            <a href="mailto:info@nachhilfe-sv.de" className="inline-flex min-h-11 items-center gap-1.5 font-medium transition-colors hover:text-foreground">
                                <Mail size={14} aria-hidden /> info@nachhilfe-sv.de
                            </a>
                            <p className="tabular-nums">Hosting in Deutschland · DSGVO-konform</p>
                        </div>
                    </div>
                </div>
            </footer>
            </PageEnter>
        </main>
    );
}
