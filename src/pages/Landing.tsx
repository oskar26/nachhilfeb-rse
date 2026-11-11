import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { CollapsedNewsWidget } from '../components/CollapsedNewsWidget';
import SiteHeader from '../components/SiteHeader';
import VerifySteps from '../components/VerifySteps';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import {
    Search,
    Shield,
    ShieldCheck,
    Filter,
    Bookmark,
    MessageSquare,
    Image as ImageIcon,
    BadgeCheck,
    Smartphone,
    GraduationCap,
    Users,
    Sparkles,
    ArrowRight,
    ArrowUpRight,
    Lock,
    Maximize2,
} from 'lucide-react';
import { api } from '../lib/api';
import { SUBJECT_CATEGORIES, type Subject } from '../components/SubjectChip';
import { Switch } from '../components/ui/switch';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import ScreenshotLightbox from '../components/ScreenshotLightbox';
import feedIphoneShot from '../../docs/screenshots/feed-iphone.png';
import mobileAnzeigeShot from '../../docs/screenshots/mobile-anzeige.png';
import iphoneProfileShot from '../../docs/screenshots/iphone-profile.png';
import ipadSettingsShot from '../../docs/screenshots/ipad-settings.png';
import feedShot from '../../docs/screenshots/02-feed.png';
import createAdShot from '../../docs/screenshots/03-anzeige-erstellen.png';
import requestsShot from '../../docs/screenshots/04-anfrage-chat.png';
import profileShot from '../../docs/screenshots/05-profil.png';
import svPanelShot from '../../docs/screenshots/07-sv-panel.png';
import coachingShot from '../../docs/screenshots/08-coaching.png';
import darkModeShot from '../../docs/screenshots/09-dark-mode-pwa.png';

/* Single Source of Truth für alle Fächer: SUBJECT_CATEGORIES aus SubjectChip.tsx
   (dieselbe Quelle nutzen CreateAd + Feed). Labels 1:1 aus subjectLabelMap. */
const SUBJECT_LABELS: Record<Subject, string> = {
    deutsch: 'Deutsch',
    englisch: 'Englisch',
    franzoesisch: 'Französisch',
    kunst: 'Kunst',
    griechisch: 'Griechisch',
    latein: 'Latein',
    musik: 'Musik',
    literatur: 'Literatur',
    kultur: 'Kultur',
    geschichte: 'Geschichte',
    paedagogik: 'Pädagogik',
    erdkunde: 'Erdkunde',
    philosophie: 'Philosophie',
    sowi: 'Sozialwiss.',
    wirtschaft_gesell: 'Wi & Gesell.',
    wirtschaft_politik: 'Wi & Politik',
    biologie: 'Biologie',
    chemie: 'Chemie',
    informatik: 'Informatik',
    mathematik: 'Mathematik',
    physik: 'Physik',
    blauer_planet: 'Blauer Planet',
    prakt_philosophie: 'Prakt. Philo',
    religion: 'Religion',
    sport: 'Sport',
};

const FAECHER_TICKER: string[] = SUBJECT_CATEGORIES.flatMap((c) => c.subjects).map((s) => SUBJECT_LABELS[s]);

/* App-Showcase: echte App-Screenshots aus docs/screenshots/. Die beiden
   iPhone-Shots für Übersicht und Profil liegen mit fertigem Geräterahmen vor;
   der Anzeige-Shot ist ein reiner Screen und bekommt im Board einen ruhigen
   Rahmen, damit Statusleiste und Bottom-Nav vollständig sichtbar bleiben.
   Das iPad (Querformat) steht bewusst daneben als eigener Print, nicht im Track:
   die Board-CSS ist auf drei hochkante Sheets komponiert. */
const BOARD_DEVICES: { src: string; alt: string; caption: string; index: string; framed: boolean }[] = [
    { src: feedIphoneShot, alt: 'iPhone-Übersicht mit hervorgehobener Anzeige und Tab-Leiste', caption: 'Übersicht: Anzeigen stöbern', index: '01', framed: true },
    { src: mobileAnzeigeShot, alt: 'iPhone-Anzeigen-Detail mit Preis, Tags und Beschreibung', caption: 'Anzeige: Details zum Angebot', index: '02', framed: false },
    { src: iphoneProfileShot, alt: 'iPhone-Profil mit Profil-Stärke und persönlichen Angaben', caption: 'Profil: zeigen, was du kannst', index: '03', framed: true },
];

/* iPad: der Querformat-Print steht als eigener Übergang zwischen Handy-Reihe
   und Desktop-Ansichten — bewusst gesetzt statt als Fremdkörper im Track. */
const IPAD_PRINT = {
    src: ipadSettingsShot,
    alt: 'iPad-Einstellungen mit Erscheinungsbild, Push und Datenschutz',
    caption: 'Einstellungen & Datenschutz',
    index: '04',
};

/* Desktop-Prints: der Rahmen ist eingebrannt (3 px #111, runde Ecken) — als
   geklebte Prints an die Plakatwand gesetzt, Mono-Index wie auf dem Prüfzettel. */
const BOARD_PRINTS = [
    { src: feedShot, index: '01', alt: 'Desktop-Übersicht „Aktuelle Anzeigen“ mit Suche und Filtern', caption: 'Übersicht und Suche' },
    { src: createAdShot, index: '02', alt: 'Editor „Anzeige aufgeben“ im Schritt-für-Schritt-Modus', caption: 'Anzeige erstellen' },
    { src: requestsShot, index: '03', alt: 'Anfragen und Vorschläge mit Tabs und leerem Posteingang', caption: 'Anfragen und Vorschläge' },
    { src: profileShot, index: '04', alt: 'Öffentliches Profil mit Statistiken und Verfügbarkeits-Kalender', caption: 'Öffentliches Profil' },
    { src: svPanelShot, index: '05', alt: 'SV-Admin-Panel mit Nutzern, Anzeigen und Meldungen', caption: 'SV-Panel' },
    { src: coachingShot, index: '06', alt: 'Coaching-Seite „Coaching-AG am FWG“', caption: 'Coaching-AG' },
    { src: darkModeShot, index: '07', alt: 'Dark Mode: eigenes Profil mit Profil-Stärke', caption: 'Dark Mode & PWA' },
];

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Landing() {
    const { user } = useAuth();
    const reduceMotion = useReducedMotion();
    const [liveStats, setLiveStats] = useState<{ active_ads: number; users: number; page_views: number; page_views_30d: number } | null>(null);

    /* Privatsphäre-Demo */
    const [showPhone, setShowPhone] = useState(true);
    const [showMoodle, setShowMoodle] = useState(false);

    /* Desktop-Prints: Kontaktbogen auf der Wand, groß erst im Lightbox-Popup */
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const heroRef = useRef<HTMLElement | null>(null);
    const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroGrainY = useTransform(heroProgress, [0, 1], [0, 70]);
    const heroHeadY = useTransform(heroProgress, [0, 1], [0, 36]);
    const heroTicketY = useTransform(heroProgress, [0, 1], [0, -46]);

    /* Nachhilfebörse-Showcase: mobil und Desktop als native, horizontale
       Wisch-/Scroll-Reihe. Kein Scroll-Jacking, keine 220vh-Bühne: die
       Ansichten bleiben ohne versteckte Leerflächen erreichbar. */

    useEffect(() => {
        // Statistik ist optional (die Landing funktioniert auch ohne Daten);
        // Fehler werden bewusst still ignoriert.
        api.analytics.summary().then(({ data, error }) => {
            if (!error && data) {
                setLiveStats({
                    active_ads: Number((data as any).active_ads) || 0,
                    users: Number((data as any).users) || 0,
                    page_views: Number((data as any).page_views) || 0,
                    page_views_30d: Number((data as any).page_views_30d) || 0,
                });
            }
        }).catch(() => { /* Statistik ist optional */ });
    }, []);

    const ziel = user ? '/' : '/login';
    /* P2-Clarity: zwei Jobs, zwei Ziele. Feed (/) ≠ Erstellen (/create-ad).
       Beide Routen existieren real (App.tsx) und sind HashRouter-safe via <Link to>.
       Weder Feed noch CreateAd noch Login werten ?intent=* aus (geprüft),
       daher KEIN Query-Param — Differenzierung via Label + Ziel + aria-describedby.
       Logged-out fallen beide sinnvoll auf /login zurück (sonst Loop /welcome). */
    const suchZiel = user ? '/' : '/login';
    const bietZiel = user ? '/create-ad' : '/login';
    const elternZiel = '/eltern-leitfaden';
    const anim = (delay = 0) => reduceMotion ? {} : {
        initial: { y: 28 },
        whileInView: { y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.7, delay, ease: easeOut },
    };

    /* FOCAL „Frisch geklebt“: Tape-up — Elemente kommen leicht schräg und geradet sich. */
    const rise = (delay = 0, y = 26) => reduceMotion ? {} : {
        initial: { opacity: 0, y, rotate: -0.7 },
        animate: { opacity: 1, y: 0, rotate: 0 },
        transition: { duration: 0.6, delay, ease: easeOut },
    };
    const tapeUpCard = (delay: number) => reduceMotion ? {} : {
        initial: { opacity: 0, y: 34, rotate: -6 },
        animate: { opacity: 1, y: 0, rotate: 0 },
        transition: { duration: 0.6, delay, ease: easeOut },
    };
    const stampPop = (delay: number) => reduceMotion ? {} : {
        initial: { opacity: 0, scale: 1.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.38, delay, ease: easeOut },
    };
    /* Line-Wipe unter jeder Anton-Headline (Siebdruck-Zug). clip-path statt scaleX(0):
       zero-width-Rects liefern IntersectionObserver isIntersecting=false (Chromium) →
       whileInView würde nie feuern; clip-path lässt die Layout-Box unangetastet. */
    const wipeLine = (delay = 0.2) => reduceMotion ? {} : {
        initial: { clipPath: 'inset(0 100% 0 0)' },
        whileInView: { clipPath: 'inset(0 0% 0 0)' },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.5, delay, ease: easeOut },
    };
    const tiltIn = (i: number) => reduceMotion ? {} : {
        initial: { y: 24, rotate: i % 2 === 0 ? -1.4 : 1.4 },
        whileInView: { y: 0, rotate: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.65, delay: i * 0.08, ease: easeOut },
    };
    return (
        <main className="min-h-dvh bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground overflow-x-clip">
            {/* Skip-Link als Scroll-Button: reines href="#inhalt" wäre unter HashRouter eine 404-Route. */}
            <Button variant="unstyled" size="unstyled" type="button" onClick={() => { const el = document.getElementById('inhalt') as HTMLElement | null; if (!el) return; el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); try { el.focus({ preventScroll: true }); } catch { el.focus(); } }} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground">Zum Inhalt springen</Button>
            {/* THESIS: Die Boerse als helle Schulhof-Plakatwand: Papier, schwarze Schrift, Vollgelb als Akzent. Vertraut nichts dem Kleingedruckten an. OWN-WORLD: Papierweiss mit schwarzer Schrift, Anton-Posterzeilen mit gelbem Marker, Abriss-Tickets mit Perforation, Stempel-Badges, Fach-Ticker, Tabellenzahlen in Mono. STORY: In Sekunden klar: nur FWG, suchen und bieten, SV-verifiziert. Dann Anmeldung oder Eltern- und Coaching-Weiterlesen. FORM: Eigene Liste Nummer 5, Abi-Plakat und Siebdruck. FINISH: unreviewed and undocumented is unfinished. */}

            <SiteHeader />

            {/* HERO — Plakatwand (Parallax: Grain/Glows/Headline/Tickets driften
                gestaffelt per transform; Faden-Naht am Sektionsende → Wege) */}
            <section id="inhalt" ref={heroRef} tabIndex={-1} className="relative overflow-hidden bg-background">
                <motion.div aria-hidden style={reduceMotion ? undefined : { y: heroGrainY }} className="parallax-layer pointer-events-none absolute -inset-y-10 inset-x-0 poster-grain-dark opacity-100 dark:opacity-30" />

                <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr]">
                    <motion.div style={reduceMotion ? undefined : { y: heroHeadY }} className="parallax-layer min-w-0">
                        <motion.h1
                            {...rise(0.05)}
                            className="break-words font-display uppercase leading-[0.92] tracking-tight text-[clamp(2.75rem,11vw,4.5rem)] sm:text-7xl lg:text-8xl"
                        >
                            Finde Nach&shy;hilfe.
                            <span className="block mt-1"><span className="inline-block bg-primary px-2 text-primary-foreground sm:px-3">Direkt am FWG.</span></span>
                        </motion.h1>
                        <motion.p
                            {...rise(0.13)}
                            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
                        >
                            Nachhilfe in Mathematik, Englisch und weiteren Fächern, direkt unter Mitschülerinnen und Mitschülern. Jede Anzeige stammt von einem verifizierten Konto.
                        </motion.p>
                        <motion.div
                            {...rise(0.21)}
                            className="mt-8 flex flex-wrap items-center gap-3"
                        >
                            <Link to={ziel} className="press inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover sm:w-auto">
                                Anzeigen ansehen <ArrowRight size={20} aria-hidden />
                            </Link>
                            <Link to="/eltern-leitfaden" className="press inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full border border-border px-8 text-base font-bold text-foreground hover:bg-muted active:bg-primary/10 sm:w-auto">
                                Eltern-Leitfaden
                            </Link>
                        </motion.div>
                        <motion.ul
                            {...rise(0.29)}
                            className="mt-8 flex flex-wrap gap-2.5 text-xs font-bold text-foreground"
                            aria-label="Vertrauen auf einen Blick"
                        >
                            {[
                                { icon: BadgeCheck, label: 'SV-verifiziert' },
                                { icon: ShieldCheck, label: 'Nur FWG Köln' },
                                { icon: Lock, label: 'Server in Deutschland' },
                                { icon: BadgeCheck, label: 'Nutzung kostenlos' },
                            ].map(s => (
                                <li key={s.label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-foreground shadow-soft">
                                    <s.icon size={16} className="text-brand-ink dark:text-primary" aria-hidden /> {s.label}
                                </li>
                            ))}
                        </motion.ul>
                    </motion.div>

                    {/* Geneigte Demo-Tickets: Desktop geneigt daneben, mobil als Stapel darunter.
                        Parallax außen (gegenläufig), Float-Animation innen bleibt unberührt. */}
                    <motion.div style={reduceMotion ? undefined : { y: heroTicketY }} className="parallax-layer relative mt-10 min-w-0 md:mt-0" aria-label="Vorschau: Beispiel-Anzeigen">
                        <motion.div
                            className="relative mx-auto w-full max-w-sm min-w-0"
                            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                            transition={reduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <motion.div {...tapeUpCard(0.1)}>
                                <div className="tape relative rounded-2xl bg-card p-6 pt-8 text-card-foreground shadow-card rotate-[-4deg]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wider text-primary-foreground">Mathematik</span>
                                        <VerifiedPill size="sm" />
                                    </div>
                                    <p className="mt-4 break-words font-display uppercase text-2xl leading-none sm:text-3xl">Analysis-Crash vor der Klausur</p>
                                    <p className="mt-2 text-sm text-muted-foreground">Lena K. · Q1 · SV-Raum · <strong className="whitespace-nowrap tabular-nums text-foreground">12 € / 45 Min</strong></p>
                                    <motion.span className="mt-3 flex justify-end" {...stampPop(0.62)}>
                                        <span className="inline-block rotate-12 rounded border-2 border-muted-foreground/50 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-muted-foreground">Demo</span>
                                    </motion.span>
                                </div>
                            </motion.div>
                            <motion.div {...tapeUpCard(0.24)} className="-mt-2 ml-6 sm:ml-14">
                                <div className="tape relative rounded-2xl bg-primary p-6 pt-8 text-primary-foreground shadow-card rotate-[3deg]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center rounded-full bg-background px-3 py-1 text-xs font-black uppercase tracking-wider text-foreground">Physik · Biete</span>
                                        <span className="text-xs font-bold">Q2 · Bibliothek</span>
                                    </div>
                                    <p className="mt-4 break-words font-display uppercase text-2xl leading-none sm:text-3xl">Mechanik ohne Panik</p>
                                    <p className="mt-2 text-sm font-medium text-primary-foreground/80">Aylin D. · mit alten Klausuren · <strong className="whitespace-nowrap tabular-nums text-primary-foreground">12 € / 60 Min</strong></p>
                                    <motion.span className="mt-3 flex justify-end" {...stampPop(0.78)}>
                                        <span className="inline-block rotate-12 rounded border-2 border-primary-foreground/40 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-primary-foreground/70">Demo</span>
                                    </motion.span>
                                </div>
                            </motion.div>
                            <motion.div {...rise(0.5, 14)} className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                                <span className={`h-2 w-2 rounded-full ${liveStats && liveStats.page_views_30d > 0 ? 'bg-green-500' : 'bg-muted-foreground/40'}`} aria-hidden />
                                <span className="font-mono tabular-nums">{liveStats && liveStats.page_views_30d > 0 ? `${liveStats.page_views_30d.toLocaleString('de-DE')} Seitenaufrufe (letzte 30 Tage)` : 'Keine Angabe zu Seitenaufrufen (letzte 30 Tage)'}</span>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* EMPFEHLUNG — direkt unter der Hero: ein Konto pro Kind, altersgerecht begleitet */}
            <section aria-label="Empfehlung zur Nutzung des Kontos" className="border-b border-border bg-background">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-4 sm:px-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-primary-foreground">
                        <Users size={16} aria-hidden /> Empfehlung
                    </span>
                    <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                        <strong className="font-bold text-foreground">Ein Konto pro Kind:</strong> In den Klassen 5 und 6 betreuen viele Eltern mit, ältere nutzen die Börse selbstständig.
                    </p>
                    <Link to="/eltern-leitfaden" className="press inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-primary-hover">
                        Eltern-Leitfaden <ArrowUpRight size={16} aria-hidden />
                    </Link>
                </div>
            </section>

            {/* Fächer-Ticker, Kennzahlen & News — eigene Sektion direkt unter der Hero */}
            <section aria-label="Fächer, Kennzahlen und Neuigkeiten">
                {/* Tickerband */}
                <div className="relative overflow-hidden border-y border-border bg-primary text-primary-foreground" aria-label="Fächerübersicht">
                    <div className="ticker-track flex w-max items-center py-3 font-display uppercase tracking-[0.14em] text-base sm:text-lg">
                        {[0, 1].map(copy => (
                            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                                {FAECHER_TICKER.map(f => (
                                    <span key={`${copy}-${f}`} className="flex items-center">
                                        <span className="px-4">{f}</span>
                                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-[1px] bg-primary-foreground/80" />
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative border-b border-border bg-background">
                    <dl className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-12 gap-y-3 px-4 py-5 sm:px-6" aria-label="Aktuelle Kennzahlen der Nachhilfebörse">
                        {[
                            { value: liveStats?.users, label: 'Nutzer' },
                        ].map(s => (
                            <div key={s.label} className="flex items-baseline gap-3">
                                <dd className={`font-mono font-bold tabular-nums text-foreground ${s.value !== undefined && s.value !== null ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
                                    {s.value !== undefined && s.value !== null ? s.value.toLocaleString('de-DE') : 'Keine Angabe'}
                                </dd>
                                <dt className="text-sm font-semibold text-muted-foreground">{s.label}</dt>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* News */}
                <div className="bg-background">
                    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
                        <CollapsedNewsWidget />
                    </div>
                </div>
            </section>

            {/* WEGE — drei Abriss-Streifen statt Karten (Faden-Naht am Ende → Brett) */}
            <section id="wege" className="relative scroll-mt-24 overflow-hidden bg-background text-foreground poster-grain-dark dark:opacity-100">
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
                    <motion.div {...anim()}>
                        <h2 className="max-w-3xl break-words font-display uppercase leading-[0.95] text-4xl sm:text-7xl">Drei Wege zur Nachhilfe.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Wähle den Weg, der zu dir passt. Jeder Weg beginnt mit einer Anzeige oder einer Anfrage.</p>
                    </motion.div>
                    <div className="mt-10 divide-y-2 divide-dashed divide-border border-y-2 border-dashed border-border">
                        {[
                            { icon: Search, title: 'Ich suche Nachhilfe', text: 'Filtere nach Fach, Klasse und Preis. Kontakt über die App, sobald eine Anfrage angenommen ist.', points: ['Filter für Fach und Klasse', 'Kontakt nach Annahme', 'Verifizierte Konten'], cta: 'Anzeigen stöbern', to: suchZiel },
                            { icon: GraduationCap, title: 'Ich biete Nachhilfe', text: 'Lege deinen Preis fest, gib deine Zeiten an und antworte auf Anfragen.', points: ['Eigene Preise und Bedingungen', 'Flexible Termine', 'Bewertungen nach Kontakt'], cta: 'Anzeige erstellen', to: bietZiel },
                            { icon: Users, title: 'Für Eltern', text: 'Betreuen Sie das Konto gemeinsam mit Ihrem Kind oder lassen Sie es selbstständig nutzen. In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. So behalten Sie Anzeigen und Anfragen im Blick.', points: ['Ein Konto pro Kind', 'Gemeinsam Anzeigen und Anfragen ansehen', 'Kontakt zur SV bei Fragen'], cta: 'Eltern-Leitfaden', to: '/eltern-leitfaden' },
                        ].map((w, i) => (
                            <motion.article key={w.title} {...tiltIn(i)} className="group relative grid gap-5 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
                                <span className="grid h-14 w-14 shrink-0 -rotate-3 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform group-hover:rotate-3">
                                    <w.icon size={24} aria-hidden />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="break-words font-display uppercase text-2xl sm:text-4xl">{w.title}</h3>
                                    <p className="mt-2 max-w-2xl text-muted-foreground">{w.text}</p>
                                    <ul id={`wege-punkte-${i}`} className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-foreground">
                                        {w.points.map(p => (
                                            <li key={p} className="inline-flex items-center gap-1.5"><BadgeCheck size={16} className="text-brand-ink dark:text-primary" aria-hidden />{p}</li>
                                        ))}
                                    </ul>
                                </div>
                                <Link
                                    to={w.to}
                                    aria-describedby={`wege-punkte-${i}`}
                                    aria-label={`${w.cta}: ${w.title}`}
                                    className="press inline-flex h-11 min-h-11 items-center justify-center gap-2 justify-self-start rounded-full bg-foreground px-6 text-sm font-bold text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:justify-self-end"
                                >
                                    {w.cta} <ArrowUpRight size={16} aria-hidden />
                                </Link>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="brett" className="scroll-mt-24 border-y border-border bg-foreground text-background poster-grain">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <motion.div {...anim()} className="max-w-3xl">
                        <h2 className="break-words font-display uppercase leading-[0.95] text-4xl text-background sm:text-6xl">So sieht die <span className="bg-primary px-2 text-primary-foreground">Nachhilfebörse</span> aus.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 text-lg leading-relaxed text-background/70">Echte Screenshots aus der App: stöbern, anfragen, Profil zeigen. Am Handy, am iPad und am Desktop.</p>
                    </motion.div>
                    <div className="board-stage relative mt-10">
                        <div
                            className="board-phones"
                            role="region"
                            aria-label="App-Ansichten auf dem Handy. Horizontal wischen für weitere Ansichten."
                            tabIndex={0}
                        >
                            <div className="board-track pt-4">
                                {BOARD_DEVICES.map((m) => (
                                    <figure
                                        key={m.caption}
                                        className="board-sheet tape relative"
                                    >
                                        {m.framed ? (
                                            <img
                                                src={m.src}
                                                alt={m.alt}
                                                loading="lazy"
                                                className="h-auto w-full rounded-2xl"
                                            />
                                        ) : (
                                            /* Der Anzeige-Shot liegt ohne Geräterahmen vor. Der Rahmen
                                               wird hier als ruhige Bühne ergänzt, damit Statusleiste,
                                               Inhalt und Bottom-Nav vollständig im Bild bleiben. */
                                            <div className="rounded-[2rem] bg-foreground p-1.5 shadow-overlay ring-1 ring-background/10">
                                                <div className="overflow-hidden rounded-[1.65rem] bg-black">
                                                    <img
                                                        src={m.src}
                                                        alt={m.alt}
                                                        loading="lazy"
                                                        className="h-auto w-full"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <figcaption className="mt-4 flex items-baseline justify-center gap-2 text-center">
                                            <span className="font-mono text-xs font-bold tabular-nums text-primary">{m.index}</span>
                                            <span className="board-caption text-sm font-bold">{m.caption}</span>
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        </div>
                        <p className="board-swipe-hint">Wischen für weitere Ansichten →</p>
                    </div>

                    {/* iPad: Querformat-Print als bewusster Übergang von der Handy-Reihe
                        zu den Desktop-Ansichten — eigener Platz statt Fremdkörper im Track. */}
                    <div className="mt-16 flex justify-center">
                        <div className="w-full max-w-3xl" style={{ transform: 'rotate(-0.6deg)' }}>
                            <motion.figure {...anim()} className="tape relative">
                                <img
                                    src={IPAD_PRINT.src}
                                    alt={IPAD_PRINT.alt}
                                    loading="lazy"
                                    className="h-auto w-full rounded-2xl"
                                />
                                <figcaption className="mt-4 flex items-baseline justify-center gap-2.5">
                                    <span className="font-mono text-xs font-bold tabular-nums text-primary">{IPAD_PRINT.index}</span>
                                    <span className="font-mono text-xs font-bold tabular-nums text-primary">iPad</span>
                                    <span className="board-caption text-sm font-bold">{IPAD_PRINT.caption}</span>
                                </figcaption>
                            </motion.figure>
                        </div>
                    </div>

                    {/* Desktop-Prints: Kontaktbogen aus Mini-Kacheln — groß erst im
                        Lightbox-Popup (Klick auf eine Kachel), damit die Wand atmet. */}
                    <div className="mt-16">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <h3 className="font-display uppercase leading-[0.95] text-2xl text-background sm:text-4xl">Auch am Desktop.</h3>
                            <p className="font-mono tabular-nums text-sm font-bold text-background/60">07 ANSICHTEN · 01 PLATTFORM</p>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-background/70">Klicke auf eine Ansicht, um sie groß zu öffnen. Mit den Pfeiltasten kannst du durchblättern.</p>
                        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
                            {BOARD_PRINTS.map((p, i) => (
                                <Button variant="unstyled" size="unstyled"
                                    key={p.index}
                                    type="button"
                                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                                    aria-label={`Screenshot groß ansehen: ${p.caption}`}
                                    className="group block min-h-11 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-foreground"
                                    style={{ transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)` }}
                                >
                                    <span className="block overflow-hidden rounded-2xl ring-1 ring-white/10 transition-shadow group-hover:ring-primary/60">
                                        <img
                                            src={p.src}
                                            alt={p.alt}
                                            loading="lazy"
                                            className="h-auto w-full"
                                        />
                                    </span>
                                    <span className="mt-2.5 flex items-baseline gap-2">
                                        <span className="font-mono text-xs font-bold tabular-nums text-primary">{p.index}</span>
                                        <span className="board-caption text-xs font-bold sm:text-sm">{p.caption}</span>
                                    </span>
                                </Button>
                            ))}
                            <Button variant="unstyled" size="unstyled"
                                type="button"
                                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                                aria-label="Alle Screenshots groß ansehen"
                                className="group block min-h-11 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-foreground"
                                style={{ transform: 'rotate(0.8deg)' }}
                            >
                                <span className="flex aspect-[1606/1104] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-background/20 bg-background/[0.03] px-3 text-center text-background/70 transition-colors group-hover:border-primary group-hover:text-background">
                                    <Maximize2 size={24} aria-hidden />
                                    <span className="font-mono text-xs font-bold uppercase tracking-wide">Alle groß ansehen</span>
                                </span>
                            </Button>
                        </div>
                    </div>

                    <motion.div {...anim()} className="mt-12">
                        <Link to={ziel} className="press inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover">Börse ansehen <ArrowRight size={20} aria-hidden /></Link>
                    </motion.div>

                    <ScreenshotLightbox
                        items={BOARD_PRINTS}
                        open={lightboxOpen}
                        index={lightboxIndex}
                        onIndexChange={setLightboxIndex}
                        onClose={() => setLightboxOpen(false)}
                    />
                </div>
            </section>

            {/* SPECS — Vertretungsplan-Tabelle statt Kartenraster */}
            <section id="plan" className="scroll-mt-24 bg-background text-foreground">
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
                    <motion.div {...anim()} className="flex flex-wrap items-end justify-between gap-6">
                        <div className="min-w-0 max-w-2xl">
                            <h2 className="break-words font-display uppercase leading-[0.95] text-4xl sm:text-7xl">Sechs Funktionen für Suchen, Bieten, Chatten.</h2>
                            <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        </div>
                        <p className="font-mono tabular-nums text-sm font-bold text-muted-foreground">06 MODULE · 01 PLATTFORM</p>
                    </motion.div>
                    <motion.dl {...anim(0.06)} className="mt-10 border-t-2 border-foreground">
                        {[
                            { icon: Filter, t: 'Entdecken & Filtern', d: 'Filter nach Fach, Klasse, Ort und Preis.' },
                            { icon: Bookmark, t: 'Merkliste', d: 'Anzeigen speichern und später wiederfinden.' },
                            { icon: MessageSquare, t: 'Private Kontaktdaten', d: 'Telefonnummer und Moodle-Name sehen andere erst, wenn du eine Anfrage annimmst.' },
                            { icon: Shield, t: 'Verifizierte Nutzer', d: 'Verifizierte Konten durch persönliche Prüfung im SV-Raum, dazu Moderation und Meldefunktion.' },
                            { icon: ImageIcon, t: 'Profil', d: 'Profilbild und ausführliche Beschreibung. Beschreibe deine Fächer und deine Erfahrung.' },
                            { icon: Smartphone, t: 'Als App installierbar', d: 'Zum Startbildschirm hinzufügen und wie eine App öffnen, auf iOS und Android.' },
                        ].map((f, i) => (
                            <div key={f.t} className={`grid gap-3 py-5 sm:grid-cols-[3.5rem_1fr_1.4fr] sm:items-center sm:gap-6 ${i > 0 ? 'border-t border-border' : ''}`}>
                                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground"><f.icon size={20} aria-hidden /></span>
                                <dt className="font-display uppercase text-2xl sm:text-3xl">{f.t}</dt>
                                <dd className="leading-relaxed text-muted-foreground">{f.d}</dd>
                            </div>
                        ))}
                    </motion.dl>
                </div>
            </section>

            {/* PRIVATSPHÄRE + VERIFIKATION */}
            <section id="sicher" className="scroll-mt-24 border-y border-border bg-background">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
                    <motion.div {...anim()} className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft sm:p-10">
                        <Shield size={24} className="text-brand-ink dark:text-primary" aria-hidden />
                        <h2 className="mt-4 font-display uppercase leading-[0.95] text-4xl sm:text-5xl">Du entscheidest, wer was sieht.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 leading-relaxed text-muted-foreground">Du entscheidest, welche Kontaktdaten sichtbar sind. Telefonnummer und Moodle-Name sehen andere erst nach Annahme einer Anfrage. Die E-Mail-Adresse kannst du im Profil öffentlich schalten.</p>
                        <div className="mt-6 divide-y divide-border border-y border-border">
                            {[
                                { label: 'Handynummer', desc: 'Nur für angenommene Anfragen', on: showPhone, set: setShowPhone },
                                { label: 'Moodle-Name', desc: 'Nur für angenommene Anfragen', on: showMoodle, set: setShowMoodle },
                            ].map(r => (
                                <div key={r.label} className="flex items-center justify-between gap-4 py-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold">{r.label}</p>
                                        <p className="text-xs text-muted-foreground">{r.on ? r.desc : 'Versteckt: niemand sieht das'}</p>
                                    </div>
                                    <Switch
                                        checked={r.on}
                                        onChange={() => r.set(v => !v)}
                                        label={`${r.label} Sichtbarkeit`}
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 inline-flex items-start gap-2 text-xs font-bold text-muted-foreground"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden /> Telefonnummer und Moodle-Name erscheinen erst nach angenommener Anfrage.</p>
                    </motion.div>

                    <motion.div {...anim(0.08)} className="flex flex-col justify-center rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft sm:p-10">
                        <h2 className="font-display uppercase leading-[0.95] text-4xl sm:text-5xl">So wird dein Konto verifiziert.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <div className="[&_li]:transform-none! [&_li]:opacity-100!">
                            <VerifySteps tone="du" variant="spotlight" />
                        </div>
                        <Link to={ziel} className="press mt-8 inline-flex h-11 items-center justify-center gap-2 self-start rounded-full border border-border px-6 text-sm text-foreground hover:bg-muted active:bg-primary/10">Zur Anmeldung <ArrowRight size={16} aria-hidden /></Link>
                    </motion.div>
                </div>
            </section>

            {/* COACHING AG — gelbes Feld */}
            <section id="coaching" className="scroll-mt-24 bg-primary text-primary-foreground">
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
                    <motion.div {...anim()} className="max-w-3xl">
                        <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-primary-foreground"><Sparkles size={16} aria-hidden /> Coaching-AG am FWG</p>
                        <h2 className="mt-5 break-words font-display uppercase leading-[0.95] text-4xl sm:text-7xl">Die Coaching-AG</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary-foreground" aria-hidden />
                        <p className="mt-4 text-lg font-medium leading-relaxed text-primary-foreground/80">Ältere unterstützen Jüngere: Unter Leitung von <strong className="font-bold text-primary-foreground">Frau Balistreri</strong> begleiten geschulte Schülerinnen und Schüler <strong className="font-bold text-primary-foreground">ab Klasse 8</strong> gezielt Kinder der <strong className="font-bold text-primary-foreground">Klassen 5 und 6</strong> beim Start an unserer Schule.</p>
                    </motion.div>
                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        {[
                            { icon: GraduationCap, t: 'Pädagogisch begleitet', d: 'Coaches lernen Lernmethoden und Arbeitsorganisation.' },
                            { icon: Shield, t: 'Offizielles Coach-Abzeichen', d: 'Coaches mit Abzeichen haben die Schulung besucht und sind verifiziert.' },
                            { icon: Users, t: 'Gemeinschaft & Fairness', d: 'Kontakt über die App. Richtwert: ca. 12 € pro Stunde, individuell anpassbar.' },
                        ].map((c, i) => (
                            <motion.div key={c.t} {...anim(i * 0.06)} className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-soft">
                                <c.icon size={24} className="text-brand-ink dark:text-primary" aria-hidden />
                                <h3 className="mt-4 font-display uppercase text-2xl">{c.t}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                            </motion.div>
                        ))}
                    </div>
                    <motion.div {...anim()} className="mt-6 flex flex-col justify-between gap-6 rounded-3xl border-2 border-dashed border-primary-foreground/30 p-7 sm:flex-row sm:items-center sm:p-9">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em]">Schüler-Coach werden? Ab Klasse 8</p>
                            <p className="mt-2 max-w-xl font-medium text-primary-foreground/80">Du möchtest Schülerinnen und Schüler der Klassen 5 und 6 unterstützen? Sprich Frau Balistreri oder die SV an. Alle Regeln findest du transparent auf der <Link to="/coaching" className="font-bold text-primary-foreground underline underline-offset-4">Coaching-Seite</Link>.</p>
                        </div>
                        <Link to={ziel} className="press inline-flex h-14 shrink-0 items-center justify-center gap-2.5 rounded-full border border-border bg-background px-8 text-base font-bold text-foreground shadow-md hover:bg-muted">Jetzt mitmachen</Link>
                    </motion.div>
                </div>
            </section>

            {/* ELTERN — helles Papierfeld, ruhiger Trust-Block */}
            <section id="eltern" className="scroll-mt-24 border-y border-border bg-background text-foreground poster-grain-dark dark:opacity-100">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <motion.div {...anim()} className="max-w-3xl">
                        <span className="inline-grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card shadow-soft"><Shield className="text-brand-ink dark:text-primary" size={24} aria-hidden /></span>
                        <h2 className="mt-6 break-words font-display uppercase leading-[0.95] text-4xl sm:text-6xl">Informationen für Eltern</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">Ihr Kind nutzt die Nachhilfebörse über sein eigenes Konto. Wie selbstständig es läuft, entscheiden Sie gemeinsam: In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. So behalten Sie Anzeigen und Anfragen im Blick. Unter 16 Jahren brauchen wir Ihre Einwilligung.</p>
                    </motion.div>

                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                        {[
                            { icon: Users, t: 'Gemeinsam betreuen', d: 'Ihr Kind nutzt sein Konto, Sie schauen mit und unterstützen. Wie eng Sie begleiten, entscheiden Sie gemeinsam.' },
                            { icon: BadgeCheck, t: 'Verifizierte Konten', d: 'Nur verifizierte Konten können Anzeigen erstellen, Kontakt aufnehmen oder Anzeigen ansehen. Im Profil ist sichtbar, ob jemand verifiziert ist.' },
                            { icon: Lock, t: 'Keine Zahlungen über die App', d: 'Die Börse vermittelt nur den Kontakt. Vergütung und Umfang klären Sie direkt mit der Familie der Anbieterin oder des Anbieters.' },
                            { icon: Shield, t: 'Melden & Fragen', d: 'Jede Anzeige und jedes Profil lässt sich melden. Das SV-Team sichtet Meldungen mindestens einmal pro Woche, oft auch häufiger. Bei Fragen: info@nachhilfe-sv.de.' },
                        ].map((f, i) => (
                            <motion.article key={f.t} {...tiltIn(i)} className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft">
                                <span className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><f.icon size={20} aria-hidden /></span>
                                <h3 className="mt-4 font-display uppercase text-xl">{f.t}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                            </motion.article>
                        ))}
                    </div>

                    <motion.div {...anim()} className="mt-10 flex flex-wrap items-center gap-3">
                        <Link to={elternZiel} className="press inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover">Eltern-Leitfaden lesen <ArrowRight size={20} aria-hidden /></Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-background text-muted-foreground">
                <div className="mx-auto max-w-7xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-14 sm:px-6">
                    <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
                        <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Logo size={24} /></span>
                            <div>
                                <p className="font-display uppercase text-2xl leading-none text-foreground">Nachhilfebörse</p>
                                <p className="mt-1 text-xs font-semibold">Nachhilfebörse der Schülervertretung am FWG.</p>
                            </div>
                        </div>
                        <nav className="flex flex-wrap gap-x-5 text-sm font-semibold" aria-label="Rechtliches und Infos">
                            {[
                                ['Impressum', '/impressum'], ['Datenschutz', '/datenschutz'], ['Cookies', '/cookies'],
                                ['Coaching-AG', '/coaching'], ['Nutzungsbedingungen', '/nutzungsbedingungen'], ['Eltern-Leitfaden', '/eltern-leitfaden'],
                                ['Transparenz', '/transparenz'],
                            ].map(([label, path]) => (
                                <Link key={path} to={path} className="inline-flex min-h-11 items-center rounded-full transition-colors hover:text-foreground">{label}</Link>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs sm:flex-row">
                        <p>© Schülervertretung Friedrich-Wilhelm-Gymnasium Köln {new Date().getFullYear()}.</p>
                        <p className="font-mono tabular-nums">Hosting in Deutschland · DSGVO-konform</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
