import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ArrowRight,
    BadgeCheck,
    ChevronDown,
    GraduationCap,
    Lightbulb,
    Lock,
    Mail,
    Search,
    Shield,
    ShieldCheck,
    Users,
} from 'lucide-react';
import SupportModal from '../components/SupportModal';
import SiteHeader from '../components/SiteHeader';
import { PageEnter } from '../components/site/PageEnter';
import VerifySteps from '../components/VerifySteps';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { buttonVariants } from '../components/ui/button';
import { DeviceFrame } from '../components/site/DeviceFrame';
import { Reveal } from '../components/site/Reveal';
import { prefersReducedMotion } from '../lib/motion';
import { cn } from '../lib/utils';
import phoneChatShot from '../assets/screens/v2-phone-chat.webp';
import tabletSettingsShot from '../assets/screens/v2-tablet-settings.webp';
import feedShot from '../assets/screens/v2-laptop-feed.webp';

const TRUST = [
    { icon: BadgeCheck, label: 'SV-verifiziert' },
    { icon: Users, label: 'Nur für das FWG' },
    { icon: Lock, label: 'Keine Zahlungen' },
    { icon: ShieldCheck, label: 'Server in Deutschland' },
];

const FAQ = [
    {
        q: 'Kostet die Nachhilfebörse etwas?',
        a: 'Nein. Die Nutzung ist für alle am FWG kostenlos. Es gibt keine Gebühren und keine Zahlungen über die App. Die Vergütung der Nachhilfe klären die Familien direkt.',
    },
    {
        q: 'Wer kann die Börse nutzen?',
        a: 'Schülerinnen und Schüler des Friedrich-Wilhelm-Gymnasiums in Köln, von Klasse 5 bis 13. Jedes Konto wird vom SV-Team im SV-Raum persönlich freigeschaltet.',
    },
    {
        q: 'Wie läuft die Verifizierung ab?',
        a: 'Konto anlegen, im SV-Raum dem SV-Team den eigenen Namen nennen und die Freischaltung abwarten. Erst danach sind Anzeigen und Anfragen möglich.',
    },
    {
        q: 'Ab welchem Alter kann mein Kind mitmachen?',
        a: 'Ab Klasse 5. Unter 16 Jahren ist bei der Anmeldung die Einwilligung eines Erziehungsberechtigten nötig.',
    },
    {
        q: 'Was kostet die Nachhilfe?',
        a: 'Das legt die anbietende Person selbst fest. Als Orientierung gilt am FWG ein Richtwert von 12 € pro 45 Minuten (16 €/h). Die Börse vermittelt nur den Kontakt und nimmt keine Provision.',
    },
    {
        q: 'Wer sieht meine Telefonnummer?',
        a: 'Telefonnummer und Moodle-Name werden erst sichtbar, wenn du eine Anfrage annimmst. In den Einstellungen kannst du außerdem festlegen, welche Angaben in deinem Profil erscheinen.',
    },
    {
        q: 'Was passiert, wenn etwas schiefgeht?',
        a: 'Jede Anzeige und jedes Profil lässt sich melden. Das SV-Team sichtet die Meldungen und ist unter info@nachhilfe-sv.de erreichbar. Bei Problemen im Coaching kann die AG-Leitung den Coach-Status entziehen.',
    },
];

/** Nur echte, plausible Zahlen anzeigen — nie 0 oder einen Platzhalter erfinden. */
function parseCount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function Landing() {
    const { user } = useAuth();
    const location = useLocation();
    const [isFeatureOpen, setIsFeatureOpen] = useState(false);
    const [liveStats, setLiveStats] = useState<{ activeAds: number | null; users: number | null } | null>(null);

    // Live-Kennzahlen sind optional: ohne verwertbare Antwort bleibt die Seite vollständig.
    useEffect(() => {
        let cancelled = false;
        api.analytics.summary()
            .then(({ data, error }) => {
                if (cancelled || error || !data) return;
                const summary = data as { active_ads?: unknown; users?: unknown };
                const activeAds = parseCount(summary.active_ads);
                const users = parseCount(summary.users);
                if (activeAds === null && users === null) return;
                setLiveStats({ activeAds, users });
            })
            .catch(() => { /* Kennzahlen sind optional. */ });
        return () => { cancelled = true; };
    }, []);

    const registerZiel = user ? '/' : '/login?mode=register';
    const loginZiel = user ? '/' : '/login';
    const bietZiel = user ? '/create-ad' : '/login';

    const stats = liveStats
        ? [
            ...(liveStats.activeAds !== null ? [{ value: liveStats.activeAds, label: 'Aktive Anzeigen', tone: 'bg-pastel-yellow text-pastel-yellow-foreground' }] : []),
            ...(liveStats.users !== null ? [{ value: liveStats.users, label: 'Nutzer:innen', tone: 'bg-pastel-mint text-pastel-mint-foreground' }] : []),
        ]
        : [];

    // Gezielte Sprünge aus dem Header (Router-State) und Reset beim Seitenwechsel.
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

    const zuAbschnitt = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };

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
                {/* HERO */}
                <section id="inhalt" tabIndex={-1} className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
                        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
                            <Reveal>
                                <div className="min-w-0">
                                    <h1 className="max-w-[15ch] text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[3.6rem] lg:text-[4.1rem]">
                                        Nachhilfe, die am FWG bleibt.
                                    </h1>
                                    <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
                                        Von Schüler:innen für Schüler:innen: verifizierte Konten, faire Preise und Kontakt direkt in der App. Für alle Klassen am Friedrich-Wilhelm-Gymnasium.
                                    </p>
                                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                        <Link
                                            to={registerZiel}
                                            className={cn(buttonVariants({ size: 'lg' }), 'group w-full motion-safe:hover:-translate-y-0.5 sm:w-auto')}
                                        >
                                            {user ? 'Anzeigen ansehen' : 'Kostenlos registrieren'}
                                            <ArrowRight aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => zuAbschnitt('so-funktioniert-es')}
                                            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
                                        >
                                            So funktioniert’s
                                        </button>
                                    </div>
                                    {!user && (
                                        <p className="mt-3 text-[13px] font-medium leading-relaxed text-muted-foreground">
                                            Konto anlegen, im SV-Raum verifizieren, loslegen.
                                        </p>
                                    )}
                                    <ul className="mt-8 grid max-w-sm grid-cols-2 gap-x-4 gap-y-2.5" aria-label="Vertrauen auf einen Blick">
                                        {TRUST.map((t) => (
                                            <li key={t.label} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
                                                <t.icon size={16} className="text-foreground" aria-hidden />
                                                {t.label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Reveal>

                            <Reveal delay={90}>
                                <div className="mx-auto w-full max-w-[620px] px-2 sm:px-0">
                                    <div className="relative">
                                        <DeviceFrame
                                            kind="laptop"
                                            src={feedShot}
                                            alt="Anzeigenübersicht der Nachhilfebörse am Laptop"
                                            priority
                                            className="relative z-10 w-full"
                                        />
                                    </div>
                                    <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground sm:mt-6 sm:justify-start sm:pl-1">
                                        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                                        Echte Ansicht aus der App
                                    </p>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* EMPFEHLUNG + KENNZAHLEN — früh sichtbar, weil Vertrauen zuerst zählt. */}
                <section aria-labelledby="vertrauen-titel" className="bg-background">
                    <div className="mx-auto max-w-site px-4 pb-6 sm:px-6 sm:pb-10">
                        <Reveal>
                            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                                <div className="rounded-panel bg-pastel-blue p-6 text-pastel-blue-foreground sm:p-8">
                                    <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">Empfehlung</span>
                                    <h2 id="vertrauen-titel" className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-3xl">
                                        Ein Konto pro Kind.
                                    </h2>
                                    <p className="mt-3 max-w-xl text-base leading-relaxed text-pastel-blue-foreground">
                                        In den Klassen 5 und 6 betreuen viele Eltern mit, ältere nutzen die Börse selbstständig. Ein Konto, eine verifizierte Person – so bleibt klar, wer schreibt.
                                    </p>
                                    <Link
                                        to="/eltern-leitfaden"
                                        className="group mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-pastel-blue-foreground underline decoration-pastel-blue-foreground/30 underline-offset-4 transition-colors hover:decoration-pastel-blue-foreground"
                                    >
                                        Eltern-Leitfaden lesen
                                        <ArrowRight size={16} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                    </Link>
                                </div>

                                <div className="rounded-panel border border-border bg-card p-6 shadow-soft sm:p-8">
                                    <h3 className="text-sm font-bold text-muted-foreground">Die Börse in Zahlen</h3>
                                    {stats.length > 0 ? (
                                        <>
                                            <dl className="mt-4 grid grid-cols-2 gap-3">
                                                {stats.map((s) => (
                                                    <div key={s.label} className={cn('rounded-card px-4 py-5', s.tone)}>
                                                        <dt className="text-xs font-semibold leading-snug">{s.label}</dt>
                                                        <dd className="mt-2 text-[2rem] font-extrabold leading-none tabular-nums">{s.value.toLocaleString('de-DE')}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Live aus der Börse, ohne Namen und ohne Profile.</p>
                                        </>
                                    ) : (
                                        <>
                                            <dl className="mt-4 grid grid-cols-2 gap-3">
                                                <div className="rounded-card bg-pastel-yellow px-4 py-5 text-pastel-yellow-foreground">
                                                    <dt className="text-xs font-semibold leading-snug">Alle Klassen</dt>
                                                    <dd className="mt-2 text-[2rem] font-extrabold leading-none">5–13</dd>
                                                </div>
                                                <div className="rounded-card bg-pastel-mint px-4 py-5 text-pastel-mint-foreground">
                                                    <dt className="text-xs font-semibold leading-snug">Kosten</dt>
                                                    <dd className="mt-2 text-[2rem] font-extrabold leading-none">0 €</dd>
                                                </div>
                                            </dl>
                                            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Kostenlos für alle am FWG. Keine Zahlung über die App.</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* VERIFIZIERUNG */}
                <section id="so-funktioniert-es" className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 pb-16 sm:px-6 sm:pb-24">
                        <Reveal>
                            <div className="overflow-hidden rounded-panel bg-pastel-mint p-6 text-pastel-mint-foreground shadow-card sm:p-10">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="max-w-2xl">
                                        <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">
                                            In drei Schritten dabei.
                                        </h2>
                                        <p className="mt-4 text-base leading-relaxed text-pastel-mint-foreground sm:text-lg">
                                            Die Börse ist nur für das FWG. Deshalb prüft das SV-Team jedes Konto persönlich, bevor es losgeht.
                                        </p>
                                    </div>
                                    <Link
                                        to={loginZiel}
                                        className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-bold text-pastel-mint-foreground underline decoration-pastel-mint-foreground/30 underline-offset-4 transition-colors hover:decoration-pastel-mint-foreground"
                                    >
                                        {user ? 'Zur Börse' : 'Zur Anmeldung'}
                                        <ArrowRight size={16} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                    </Link>
                                </div>
                                <div className="mt-12">
                                    <VerifySteps tone="du" variant="timeline" />
                                </div>
                                <p className="mt-10 border-t border-pastel-mint-foreground/20 pt-5 text-[13px] leading-relaxed text-pastel-mint-foreground">
                                    Unter 16 Jahren braucht die Anmeldung die Einwilligung eines Erziehungsberechtigten. Details im{' '}
                                    <Link to="/eltern-leitfaden" className="font-semibold text-pastel-mint-foreground underline decoration-pastel-mint-foreground/30 underline-offset-4 transition-colors hover:decoration-pastel-mint-foreground">
                                        Eltern-Leitfaden
                                    </Link>.
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* APP-RUNDGANG */}
                <section id="brett" className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24">
                        <Reveal>
                            <div className="max-w-2xl">
                                <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">
                                    Die Börse, wie sie wirklich aussieht.
                                </h2>
                                <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                                    Echte Screenshots aus der App – vom Anzeigen-Feed bis zu den Einstellungen.
                                </p>
                            </div>
                        </Reveal>

                        <div className="mt-12 space-y-16 sm:mt-16 sm:space-y-24">
                            {[
                                {
                                    title: 'Alle Anzeigen an einem Ort',
                                    text: 'Nach Fach, Klasse und Preis filtern, passende Angebote auf die Merkliste legen. Jede Anzeige kommt von einem verifizierten Konto.',
                                    device: 'laptop' as const,
                                    src: feedShot,
                                    alt: 'Desktop-Ansicht „Aktuelle Anzeigen“ mit Filtern und Anzeigenkarten',
                                    tone: 'bg-pastel-blue text-pastel-blue-foreground',
                                    deviceClass: 'w-full max-w-[600px]',
                                },
                                {
                                    title: 'Chat, ohne Nummerntausch',
                                    text: 'Du schreibst zuerst in der App. Telefonnummer und Moodle-Name werden erst sichtbar, wenn du eine Anfrage annimmst.',
                                    device: 'phone' as const,
                                    src: phoneChatShot,
                                    alt: 'Chat-Ansicht auf dem Handy mit Nachrichten und Eingabeleiste',
                                    tone: 'bg-pastel-mint text-pastel-mint-foreground',
                                    deviceClass: 'mx-auto w-full max-w-[270px]',
                                },
                                {
                                    title: 'Profil und Einstellungen',
                                    text: 'Fächer, Klasse, Beschreibung und Verfügbarkeit. Du entscheidest, welche Kontaktdaten andere sehen.',
                                    device: 'tablet' as const,
                                    src: tabletSettingsShot,
                                    alt: 'Tablet-Ansicht der Einstellungen mit Erscheinungsbild, Benachrichtigungen und Datenschutz',
                                    tone: 'bg-pastel-yellow text-pastel-yellow-foreground',
                                    deviceClass: 'mx-auto w-full max-w-[360px]',
                                },
                            ].map((row, i) => (
                                <Reveal key={row.title}>
                                    <div className={cn('grid items-center gap-8 lg:grid-cols-2 lg:gap-16', i % 2 === 1 && 'lg:[&>*:first-child]:order-2')}>
                                        <div className="min-w-0">
                                            <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{row.title}</h3>
                                            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{row.text}</p>
                                            <Link
                                                to={registerZiel}
                                                className="group mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
                                            >
                                                {user ? 'In der App ansehen' : 'Kostenlos registrieren'}
                                                <ArrowRight size={16} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                            </Link>
                                        </div>
                                        <div className={cn('rounded-panel p-5 shadow-soft sm:p-8', row.tone)}>
                                            <DeviceFrame kind={row.device} src={row.src} alt={row.alt} className={row.deviceClass} />
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ZWEI WEGE */}
                <section id="wege" className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24">
                        <Reveal>
                            <div className="max-w-2xl">
                                <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">
                                    Zwei Wege, ein Ziel.
                                </h2>
                                <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                                    Ob du Unterstützung suchst oder selbst helfen möchtest: Der Einstieg ist derselbe.
                                </p>
                            </div>
                        </Reveal>

                        <div className="mt-10 grid gap-4 lg:grid-cols-2">
                            {[
                                {
                                    title: 'Ich suche Nachhilfe',
                                    text: 'Finde jemanden, der dein Fach wirklich kann – und der an deiner Schule ist.',
                                    points: ['Filter nach Fach, Klasse und Preis', 'Kontakt erst nach deiner Zusage', 'Merkliste für später'],
                                    cta: 'Anzeigen entdecken',
                                    to: registerZiel,
                                    icon: Search,
                                    tone: 'bg-pastel-blue text-pastel-blue-foreground',
                                    pill: 'bg-white/75 text-pastel-blue-foreground',
                                },
                                {
                                    title: 'Ich gebe Nachhilfe',
                                    text: 'Du kennst ein Fach gut? Bestimme deinen Preis und deine Zeiten selbst.',
                                    points: ['Eigene Anzeige in wenigen Minuten', 'Preise und Termine selbst festlegen', 'Bewertungen nach dem ersten Kontakt'],
                                    cta: 'Anzeige erstellen',
                                    to: bietZiel,
                                    icon: GraduationCap,
                                    tone: 'bg-pastel-mint text-pastel-mint-foreground',
                                    pill: 'bg-white/75 text-pastel-mint-foreground',
                                },
                            ].map((w, i) => (
                                <Reveal key={w.title} delay={i * 70}>
                                    <article className={cn('group flex h-full flex-col rounded-panel p-6 shadow-soft motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1 sm:p-8', w.tone)}>
                                        <span className="grid size-14 place-items-center rounded-full bg-white/80" aria-hidden>
                                            <w.icon size={26} className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110" />
                                        </span>
                                        <h3 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">{w.title}</h3>
                                        <p className="mt-2 max-w-sm text-base leading-relaxed">{w.text}</p>
                                        <ul className="mt-5 flex flex-wrap gap-2">
                                            {w.points.map((p) => (
                                                <li key={p} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', w.pill)}>{p}</li>
                                            ))}
                                        </ul>
                                        <Link
                                            to={w.to}
                                            className={cn(buttonVariants({ variant: 'outline' }), 'group/cta mt-7 self-start border-transparent bg-white/85 hover:bg-white')}
                                        >
                                            {w.cta}
                                            <ArrowRight size={16} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover/cta:translate-x-0.5" />
                                        </Link>
                                    </article>
                                </Reveal>
                            ))}
                        </div>

                        <Reveal delay={120}>
                            <div className="mt-4 flex flex-col gap-3 rounded-panel border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground sm:items-center">
                                    <Users size={17} className="mt-0.5 shrink-0 text-foreground sm:mt-0" aria-hidden />
                                    Sie begleiten Ihr Kind? Der Eltern-Leitfaden erklärt Konto, Einwilligung und Sicherheit.
                                </p>
                                <Link
                                    to="/eltern-leitfaden"
                                    className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
                                >
                                    Eltern-Leitfaden
                                    <ArrowRight size={16} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ELTERN */}
                <section id="eltern" className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24">
                        <Reveal>
                            <div className="max-w-2xl">
                                <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">Für Eltern.</h2>
                                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                                    Ihr Kind nutzt sein eigenes Konto. In den Klassen 5 bis 7 empfehlen wir, gemeinsam mitzuschauen – wie eng, entscheiden Sie zusammen.
                                </p>
                            </div>
                        </Reveal>

                        <Reveal delay={60}>
                            <dl className="mt-10 grid gap-4 sm:grid-cols-2">
                                {[
                                    { icon: BadgeCheck, t: 'Nur verifizierte Konten', d: 'Anzeigen erstellen und Kontakt aufnehmen ist erst nach der Prüfung im SV-Raum möglich.', tone: 'bg-pastel-blue text-pastel-blue-foreground' },
                                    { icon: Lock, t: 'Keine Zahlungen über die App', d: 'Die Börse vermittelt den Kontakt. Umfang und Vergütung klären die Familien direkt.', tone: 'bg-pastel-mint text-pastel-mint-foreground' },
                                    { icon: Shield, t: 'Kontaktdaten bleiben geschützt', d: 'Telefonnummer und Moodle-Name werden erst nach einer angenommenen Anfrage sichtbar.', tone: 'bg-pastel-yellow text-pastel-yellow-foreground' },
                                    { icon: Mail, t: 'Melden und nachfragen', d: 'Jede Anzeige und jedes Profil lässt sich melden. Das SV-Team ist unter info@nachhilfe-sv.de erreichbar.', tone: 'bg-pastel-rose text-pastel-rose-foreground' },
                                ].map((p) => (
                                    <div key={p.t} className={cn('rounded-panel p-6', p.tone)}>
                                        <dt className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                                            <p.icon size={22} className="shrink-0" aria-hidden />
                                            {p.t}
                                        </dt>
                                        <dd className="mt-2 text-pretty text-sm leading-relaxed">{p.d}</dd>
                                    </div>
                                ))}
                            </dl>
                        </Reveal>

                        <Reveal delay={100}>
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                <Link to="/eltern-leitfaden" className={cn(buttonVariants(), 'group w-full sm:w-auto')}>
                                    Eltern-Leitfaden lesen
                                    <ArrowRight size={16} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                </Link>
                                <a href="mailto:info@nachhilfe-sv.de?subject=Frage%20als%20Elternteil" className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
                                    <Mail size={16} aria-hidden />
                                    E-Mail an das SV-Team
                                </a>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* COACHING */}
                <section id="coaching" className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24">
                        <Reveal>
                            <div className="rounded-panel bg-primary p-6 text-primary-foreground shadow-card sm:p-10">
                                <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
                                    <div>
                                        <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">
                                            Die Coaching-AG am FWG.
                                        </h2>
                                        <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-primary-foreground/85 sm:text-lg">
                                            Unter Leitung von <strong className="font-bold text-primary-foreground">Frau Balistreri</strong> begleiten geschulte Coaches ab Klasse 8 die Klassen 5 und 6 beim Ankommen und Lernen.
                                        </p>
                                        <Link
                                            to="/coaching"
                                            className="group mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background shadow-soft transition-[box-shadow] duration-150 hover:shadow-card"
                                        >
                                            Coaching-AG kennenlernen
                                            <ArrowRight size={16} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                        </Link>
                                    </div>

                                    <dl className="divide-y divide-primary-foreground/15 border-y border-primary-foreground/15">
                                        {[
                                            { t: 'Pädagogisch begleitet', d: 'Coaches lernen Lernmethoden und Arbeitsorganisation.' },
                                            { t: 'Offizielles Abzeichen', d: 'Das Coach-Abzeichen zeigt: geschult und vom SV-Team verifiziert.' },
                                            { t: 'Fair und transparent', d: 'Richtwert 12 € pro 45 Minuten (16 €/h) – individuell anpassbar. Keine Provision.' },
                                        ].map((f) => (
                                            <div key={f.t} className="py-4">
                                                <dt className="text-base font-bold">{f.t}</dt>
                                                <dd className="mt-1 text-pretty text-sm leading-relaxed text-primary-foreground/80">{f.d}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* FUNKTIONSWUNSCH — kurz genannt, ohne eigene Werbefläche. */}
                <section id="funktionswunsch" className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 pb-16 sm:px-6 sm:pb-24">
                        <Reveal>
                            <div className="flex flex-col gap-5 rounded-panel border border-border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
                                <div className="flex items-start gap-4">
                                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pastel-yellow text-pastel-yellow-foreground" aria-hidden>
                                        <Lightbulb size={22} />
                                    </span>
                                    <div>
                                        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Etwas fehlt?</h2>
                                        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                            Wünsch dir eine Funktion für die Nachhilfebörse. Dein Wunsch landet direkt beim SV-Team – ohne Umwege.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                                    {user ? (
                                        <button type="button" onClick={() => setIsFeatureOpen(true)} className={buttonVariants({ variant: 'outline' })}>
                                            Funktionswunsch senden
                                        </button>
                                    ) : (
                                        <Link to={registerZiel} className={buttonVariants({ variant: 'outline' })}>
                                            Konto erstellen
                                        </Link>
                                    )}
                                    <a href="mailto:info@nachhilfe-sv.de?subject=Funktionswunsch" className={cn(buttonVariants({ variant: 'ghost' }), 'text-muted-foreground hover:text-foreground')}>
                                        Per E-Mail
                                    </a>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="scroll-mt-24 bg-background">
                    <div className="mx-auto max-w-site px-4 pb-16 sm:px-6 sm:pb-24">
                        <div className="rounded-panel border border-border bg-card p-6 shadow-soft sm:p-10">
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                            <Reveal>
                                <div>
                                    <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[2.75rem]">
                                        Häufige Fragen.
                                    </h2>
                                    <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
                                        Was Eltern und Schüler:innen vor dem Start wissen möchten.
                                    </p>
                                    <a
                                        href="mailto:info@nachhilfe-sv.de?subject=Frage%20zur%20Nachhilfeb%C3%B6rse"
                                        className={cn(buttonVariants({ variant: 'outline' }), 'mt-6')}
                                    >
                                        <Mail size={16} aria-hidden />
                                        Frage stellen
                                    </a>
                                    <p className="mt-2 text-[13px] text-muted-foreground">Deine Frage ist nicht dabei? Schreib dem SV-Team.</p>
                                </div>
                            </Reveal>

                            <Reveal delay={70}>
                                <div className="divide-y divide-border border-y border-border">
                                    {FAQ.map((item) => (
                                        <details key={item.q} className="group py-1">
                                            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-bold transition-colors hover:text-muted-foreground [&::-webkit-details-marker]:hidden">
                                                {item.q}
                                                <ChevronDown size={19} aria-hidden className="shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180" />
                                            </summary>
                                            <p className="max-w-[68ch] pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">
                                                {item.a}
                                            </p>
                                        </details>
                                    ))}
                                </div>
                            </Reveal>
                        </div>
                        </div>
                    </div>
                </section>

                {/* ABSCHLUSS */}
                <section className="bg-background">
                    <div className="mx-auto max-w-site px-4 pb-20 sm:px-6 sm:pb-28">
                        <Reveal>
                            <div className="rounded-panel bg-foreground p-7 text-background shadow-card sm:p-12">
                                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
                                    <div className="max-w-2xl">
                                        <h2 className="text-[1.9rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-background sm:text-[2.6rem]">
                                            Bereit für die erste Nachhilfe?
                                        </h2>
                                        <p className="mt-3 max-w-xl text-base leading-relaxed text-background/70 sm:text-lg">
                                            Konto anlegen, im SV-Raum verifizieren, passende Anzeige finden. Kostenlos und nur für das FWG.
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                                        <Link to={registerZiel} className={cn(buttonVariants({ size: 'lg' }), 'group w-full sm:w-auto')}>
                                            {user ? 'Zur Börse' : 'Kostenlos registrieren'}
                                            <ArrowRight size={18} aria-hidden className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
                                        </Link>
                                        <a
                                            href="mailto:info@nachhilfe-sv.de?subject=Frage%20zur%20Nachhilfeb%C3%B6rse"
                                            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-background/80 underline decoration-background/30 underline-offset-4 transition-colors hover:text-background hover:decoration-background"
                                        >
                                            Noch Fragen? Schreib uns
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                <SupportModal isOpen={isFeatureOpen} onClose={() => setIsFeatureOpen(false)} initialType="feature" initialView="form" />

                {/* FOOTER */}
                <footer className="rounded-t-panel bg-secondary text-muted-foreground">
                    <div className="mx-auto max-w-site px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-14 sm:px-6">
                        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
                            <div>
                                <div className="flex items-center gap-3">
                                    <Logo size={34} className="shrink-0 text-primary" />
                                    <div>
                                        <p className="text-lg font-bold leading-none text-foreground">Nachhilfebörse</p>
                                        <p className="mt-1 text-xs font-medium">FWG Köln · Schülervertretung</p>
                                    </div>
                                </div>
                                <address className="mt-5 text-sm not-italic leading-relaxed">
                                    Schülervertretung Friedrich-Wilhelm-Gymnasium<br />
                                    Severinstraße 241, 50676 Köln<br />
                                    <a href="mailto:info@nachhilfe-sv.de" className="inline-block py-0.5 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
                                        info@nachhilfe-sv.de
                                    </a>
                                </address>
                                <p className="mt-2 text-xs">Hosting in Deutschland · DSGVO-konform</p>
                            </div>

                            <nav aria-label="Die Börse">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground">Die Börse</p>
                                <ul className="mt-3 space-y-0.5 text-sm font-medium">
                                    {[
                                        ['Start', '/welcome'],
                                        ['Die App', '/welcome'],
                                        ['Coaching-AG', '/coaching'],
                                        ['Eltern-Leitfaden', '/eltern-leitfaden'],
                                        ['Anmelden', '/login'],
                                    ].map(([label, href]) => (
                                        <li key={label}>
                                            <Link
                                                to={href}
                                                state={label === 'Die App' ? { section: 'brett' } : undefined}
                                                className="inline-flex min-h-11 items-center transition-colors hover:text-foreground"
                                            >
                                                {label}
                                            </Link>
                                        </li>
                                    ))}
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => setIsFeatureOpen(true)}
                                            className="inline-flex min-h-11 items-center transition-colors hover:text-foreground"
                                        >
                                            Funktionswunsch
                                        </button>
                                    </li>
                                </ul>
                            </nav>

                            <nav aria-label="Rechtliches">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground">Rechtliches</p>
                                <ul className="mt-3 space-y-0.5 text-sm font-medium">
                                    {[
                                        ['Impressum', '/impressum'],
                                        ['Datenschutz', '/datenschutz'],
                                        ['Cookies', '/cookies'],
                                        ['Nutzungsbedingungen', '/nutzungsbedingungen'],
                                        ['Transparenz', '/transparenz'],
                                    ].map(([label, href]) => (
                                        <li key={label}>
                                            <Link to={href} className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">{label}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>

                        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs sm:flex-row">
                            <p>© Schülervertretung Friedrich-Wilhelm-Gymnasium Köln {new Date().getFullYear()}.</p>
                            <p>Kein Zahlungsdienstleister · keine Provision.</p>
                        </div>
                    </div>
                </footer>
            </PageEnter>
        </main>
    );
}
