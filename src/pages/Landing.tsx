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
import { Switch } from '../components/ui/Switch';
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

/* Brett-Vorschau: echte App-Screenshots aus docs/screenshots/. Die drei iPhone-Shots
   liegen mit fertigem Geräterahmen vor — keinen zweiten Rahmen drumlegen.
   Das iPad (Querformat) steht bewusst daneben als eigener Print, nicht im Track:
   die Board-CSS ist auf drei hochkante Sheets komponiert. */
const BOARD_DEVICES: { src: string; alt: string; caption: string }[] = [
    { src: feedIphoneShot, alt: 'iPhone-Feed mit hervorgehobener Anzeige und Tab-Leiste', caption: 'Feed: Anzeigen stöbern' },
    { src: mobileAnzeigeShot, alt: 'iPhone-Anzeigen-Detail mit Preis, Tags und Beschreibung', caption: 'Anzeige: Details zum Angebot' },
    { src: iphoneProfileShot, alt: 'iPhone-Profil mit Profil-Stärke und persönlichen Angaben', caption: 'Profil: zeigen, was du kannst' },
];

/* iPad: der Querformat-Print steht als eigener Übergang zwischen Handy-Reihe
   und Desktop-Ansichten — bewusst gesetzt statt als Fremdkörper im Track. */
const IPAD_PRINT = {
    src: ipadSettingsShot,
    alt: 'iPad-Einstellungen mit Erscheinungsbild, Push und Datenschutz',
    caption: 'Einstellungen & Datenschutz',
};

/* Desktop-Prints: der Rahmen ist eingebrannt (3 px #111, runde Ecken) — als
   geklebte Prints an die Plakatwand gesetzt, Mono-Index wie auf dem Prüfzettel. */
const BOARD_PRINTS = [
    { src: feedShot, index: '02', alt: 'Desktop-Feed „Aktuelle Anzeigen“ mit Suche und Filtern', caption: 'Feed & Suche' },
    { src: createAdShot, index: '03', alt: 'Editor „Anzeige aufgeben“ im Schritt-für-Schritt-Modus', caption: 'Anzeige erstellen' },
    { src: requestsShot, index: '04', alt: '„Anfragen & Matches“ mit Tabs und leerem Posteingang', caption: 'Anfragen & Matches' },
    { src: profileShot, index: '05', alt: 'Öffentliches Profil mit Statistiken und Verfügbarkeits-Kalender', caption: 'Öffentliches Profil' },
    { src: svPanelShot, index: '07', alt: 'SV-Admin-Panel mit Nutzern, Anzeigen und Meldungen', caption: 'SV-Panel' },
    { src: coachingShot, index: '08', alt: 'Coaching-Seite „Schüler-Coaching am FWG“', caption: 'Schüler-Coaching' },
    { src: darkModeShot, index: '09', alt: 'Dark Mode: eigenes Profil mit Profil-Stärke', caption: 'Dark Mode & PWA' },
];

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Landing() {
    const { user } = useAuth();
    const reduceMotion = useReducedMotion();
    const [liveStats, setLiveStats] = useState<{ active_ads: number; users: number; page_views: number; page_views_30d: number } | null>(null);
    const [, setStatsFailed] = useState(false);

    /* Privatsphäre-Demo */
    const [showPhone, setShowPhone] = useState(true);
    const [showMoodle, setShowMoodle] = useState(false);

    /* Desktop-Prints: Kontaktbogen auf der Wand, groß erst im Lightbox-Popup */
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const heroRef = useRef<HTMLElement | null>(null);
    const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroGrainY = useTransform(heroProgress, [0, 1], [0, 70]);
    const heroGlowAY = useTransform(heroProgress, [0, 1], [0, 110]);
    const heroGlowBY = useTransform(heroProgress, [0, 1], [0, 60]);
    const heroHeadY = useTransform(heroProgress, [0, 1], [0, 36]);
    const heroTicketY = useTransform(heroProgress, [0, 1], [0, -46]);

    /* „Schwarzes Brett“: mobil treibt vertikales Scrollen die Ansichten horizontal */
    const boardScrollRef = useRef<HTMLDivElement | null>(null);
    const boardPhonesRef = useRef<HTMLDivElement | null>(null);
    const [boardDriven, setBoardDriven] = useState(false);
    const [boardDistance, setBoardDistance] = useState(0);
    const { scrollYProgress: boardProgress } = useScroll({ target: boardScrollRef, offset: ['start start', 'end end'] });
    const boardX = useTransform(boardProgress, [0, 1], [0, -boardDistance]);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const update = () => setBoardDriven(mq.matches && !reduceMotion);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [reduceMotion]);

    useEffect(() => {
        const el = boardPhonesRef.current;
        if (!el) return;
        const measure = () => setBoardDistance(Math.max(0, el.scrollWidth - el.clientWidth));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    useEffect(() => {
        api.analytics.summary().then(({ data, error }) => {
            if (!error && data) {
                setLiveStats({
                    active_ads: Number((data as any).active_ads) || 0,
                    users: Number((data as any).users) || 0,
                    page_views: Number((data as any).page_views) || 0,
                    page_views_30d: Number((data as any).page_views_30d) || 0,
                });
            } else {
                setStatsFailed(true);
            }
        }).catch(() => setStatsFailed(true));
    }, []);

    const ziel = user ? '/' : '/login';
    /* P2-Clarity: zwei Jobs, zwei Ziele. Feed (/) ≠ Erstellen (/create-ad).
       Beide Routen existieren real (App.tsx) und sind HashRouter-safe via <Link to>.
       Weder Feed noch CreateAd noch Login werten ?intent=* aus (geprüft),
       daher KEIN Query-Param — Differenzierung via Label + Ziel + aria-describedby.
       Logged-out fallen beide sinnvoll auf /login zurück (sonst Loop /welcome). */
    const suchZiel = user ? '/' : '/login';
    const bietZiel = user ? '/create-ad' : '/login';
    const elternZiel = user ? '/parent-dashboard' : '/login';
    const anim = (delay = 0) => reduceMotion ? {} : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
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
        initial: { opacity: 0, y: 24, rotate: i % 2 === 0 ? -1.4 : 1.4 },
        whileInView: { opacity: 1, y: 0, rotate: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.65, delay: i * 0.08, ease: easeOut },
    };
    return (
        <main className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-primary selection:text-black overflow-x-clip">
            {/* Skip-Link als Scroll-Button: reines href="#inhalt" wäre unter HashRouter eine 404-Route. */}
            <button type="button" onClick={() => { const el = document.getElementById('inhalt') as HTMLElement | null; if (!el) return; el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); try { el.focus({ preventScroll: true }); } catch { el.focus(); } }} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-black">Zum Inhalt springen</button>
            {/* THESIS: Die Boerse als Schulhof-Plakatwand bei Nacht: schwarz, gelb, laut. Vertraut nichts dem Kleingedruckten an. OWN-WORLD: Tiefenschwarz plus Vollgelb, Anton-Posterzeilen, Abriss-Tickets mit Perforation, Stempel-Badges, Fach-Ticker, Tabellenzahlen in Mono. STORY: In Sekunden klar: nur FWG, suchen und bieten, SV-verifiziert. Dann Anmeldung oder Eltern- und Coaching-Weiterlesen. FORM: Eigene Liste Nummer 5, Abi-Plakat und Siebdruck. FINISH: unreviewed and undocumented is unfinished. */}

            <SiteHeader />

            {/* HERO — Plakatwand (Parallax: Grain/Glows/Headline/Tickets driften
                gestaffelt per transform; Faden-Naht am Sektionsende → Wege) */}
            <section id="inhalt" ref={heroRef} tabIndex={-1} className="relative overflow-hidden bg-gray-950">
                <motion.div aria-hidden style={reduceMotion ? undefined : { y: heroGrainY }} className="parallax-layer pointer-events-none absolute -inset-y-10 inset-x-0 poster-grain opacity-100" />
                <motion.div aria-hidden style={reduceMotion ? undefined : { y: heroGlowAY }} className="parallax-layer pointer-events-none absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full bg-primary/15 blur-[120px]" />
                <motion.div aria-hidden style={reduceMotion ? undefined : { y: heroGlowBY }} className="parallax-layer pointer-events-none absolute -bottom-52 -left-40 w-[30rem] h-[30rem] rounded-full bg-blue-600/15 blur-[120px]" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10 sm:pt-20 sm:pb-14 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center min-w-0">
                    <motion.div style={reduceMotion ? undefined : { y: heroHeadY }} className="parallax-layer min-w-0">
                        <motion.h1
                            {...rise(0.05)}
                            className="font-display uppercase leading-[0.92] tracking-tight break-words text-[clamp(2.75rem,11vw,4.5rem)] sm:text-7xl lg:text-8xl"
                        >
                            Finde Nach&shy;hilfe.
                            <span className="block poster-outline mt-1">Direkt am FWG.</span>
                        </motion.h1>
                        <motion.p
                            {...rise(0.13)}
                            className="mt-6 text-lg sm:text-xl text-gray-300 max-w-xl leading-relaxed"
                        >
                            Mathe-SOS oder Englisch-Ass? Am FWG Köln Nachhilfe <strong className="text-white font-bold">suchen</strong> und <strong className="text-white font-bold">anbieten</strong>, direkt unter Mitschülern und SV-verifiziert.
                        </motion.p>
                        <motion.div
                            {...rise(0.21)}
                            className="mt-8 flex flex-wrap items-center gap-3"
                        >
                            <Link to={ziel} className="press inline-flex items-center justify-center h-14 px-8 text-base gap-2.5 rounded-full font-bold bg-primary text-black hover:bg-primary-hover shadow-md w-full sm:w-auto">
                                Jetzt loslegen <ArrowRight size={18} aria-hidden />
                            </Link>
                            <Link to="/eltern-leitfaden" className="press inline-flex items-center justify-center h-14 px-8 text-base gap-2.5 rounded-full border border-white/20 text-white hover:bg-white/10 active:bg-primary/10 w-full sm:w-auto">
                                Eltern-Leitfaden
                            </Link>
                        </motion.div>
                        <motion.ul
                            {...rise(0.29)}
                            className="mt-8 flex flex-wrap gap-2.5 text-xs font-bold text-gray-100"
                            aria-label="Vertrauen auf einen Blick"
                        >
                            {[
                                { icon: BadgeCheck, label: 'SV-verifiziert' },
                                { icon: ShieldCheck, label: 'Nur FWG Köln' },
                                { icon: Lock, label: 'DSGVO aus DE' },
                                { icon: BadgeCheck, label: 'Kostenlos fürs FWG' },
                            ].map(s => (
                                <li key={s.label} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-gray-200">
                                    <s.icon size={15} className="text-primary" aria-hidden /> {s.label}
                                </li>
                            ))}
                        </motion.ul>
                    </motion.div>

                    {/* Geneigte Demo-Tickets: Desktop geneigt daneben, mobil als Stapel darunter.
                        Parallax außen (gegenläufig), Float-Animation innen bleibt unberührt. */}
                    <motion.div style={reduceMotion ? undefined : { y: heroTicketY }} className="parallax-layer relative mt-10 md:mt-0 min-w-0" aria-label="Vorschau: Beispiel-Anzeigen">
                        <motion.div
                            className="relative mx-auto w-full max-w-sm min-w-0"
                            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                            transition={reduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <motion.div {...tapeUpCard(0.1)}>
                                <div className="tape relative rounded-2xl bg-[#faf7ef] text-gray-900 p-6 pt-8 shadow-2xl rotate-[-4deg]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white" style={{ background: '#D62728' }}>Mathematik</span>
                                        <VerifiedPill size="sm" />
                                    </div>
                                    <p className="mt-4 font-display uppercase text-2xl sm:text-3xl leading-none break-words">Analysis-Crash vor der Klausur</p>
                                    <p className="mt-2 text-sm text-gray-600">Lena K. · Q1 · SV-Raum · <strong className="text-gray-900">12 € / 45 Min</strong></p>
                                    <motion.span className="absolute top-4 right-4" {...stampPop(0.62)}>
                                        <span className="inline-block rotate-12 rounded border-2 border-gray-400/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-gray-500">Demo</span>
                                    </motion.span>
                                </div>
                            </motion.div>
                            <motion.div {...tapeUpCard(0.24)} className="-mt-2 ml-6 sm:ml-14">
                                <div className="tape relative rounded-2xl bg-primary text-black p-6 pt-8 shadow-2xl rotate-[3deg]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">Physik · Biete</span>
                                        <span className="text-[11px] font-bold">Q2 · Bibliothek</span>
                                    </div>
                                    <p className="mt-4 font-display uppercase text-2xl sm:text-3xl leading-none break-words">Mechanik ohne Panik</p>
                                    <p className="mt-2 text-sm font-medium text-black/70">Aylin D. · mit alten Klausuren · <strong className="text-black">14 € / 45 Min</strong></p>
                                    <motion.span className="absolute top-4 right-4" {...stampPop(0.78)}>
                                        <span className="inline-block rotate-12 rounded border-2 border-black/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black/60">Demo</span>
                                    </motion.span>
                                </div>
                            </motion.div>
                            <motion.div {...rise(0.5, 14)} className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-green-400" aria-hidden />
                                <span className="font-mono tabular-nums">{liveStats && liveStats.page_views_30d > 0 ? `${liveStats.page_views_30d.toLocaleString('de-DE')} Seitenaufrufe (letzte 30 Tage)` : '— Seitenaufrufe (letzte 30 Tage)'}</span>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Fächer-Ticker, Kennzahlen & News — eigene Sektion direkt unter der Hero */}
            <section aria-label="Fächer, Kennzahlen und Neuigkeiten">
                {/* Tickerband */}
                <div className="relative overflow-hidden border-y border-black/20 bg-primary text-black" aria-label="Fächerübersicht">
                    <div className="ticker-track flex w-max items-center py-3 font-display uppercase tracking-[0.14em] text-base sm:text-lg">
                        {[0, 1].map(copy => (
                            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                                {FAECHER_TICKER.map(f => (
                                    <span key={`${copy}-${f}`} className="flex items-center">
                                        <span className="px-4">{f}</span>
                                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-[1px] bg-black/80" />
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative border-b border-white/10 bg-gray-950">
                    <dl className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-12 gap-y-3 px-4 py-5 sm:px-6" aria-label="Aktuelle Kennzahlen der Nachhilfebörse">
                        {[
                            { value: liveStats?.users, label: 'Nutzer' },
                        ].map(s => (
                            <div key={s.label} className="flex items-baseline gap-3">
                                <dd className="font-mono text-3xl font-bold tabular-nums text-primary sm:text-4xl">
                                    {s.value !== undefined && s.value !== null ? s.value.toLocaleString('de-DE') : '—'}
                                </dd>
                                <dt className="text-sm font-semibold text-gray-200">{s.label}</dt>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* News */}
                <div className="bg-gray-950">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                        <CollapsedNewsWidget />
                    </div>
                </div>
            </section>

            {/* WEGE — drei Abriss-Streifen statt Karten (Faden-Naht am Ende → Brett) */}
            <section id="wege" className="relative overflow-hidden bg-[#faf7ef] text-gray-900 poster-grain-dark scroll-mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <motion.div {...anim()}>
                        <h2 className="font-display uppercase leading-[0.95] break-words text-4xl sm:text-7xl max-w-3xl">Drei Wege an ein Ziel: die Klausur sitzt.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 text-lg text-gray-600 max-w-2xl">Reiß dir deinen Streifen ab. Jeder Weg startet mit einem Klick und endet im Chat mit echten Mitschülern.</p>
                    </motion.div>
                    <div className="mt-10 divide-y-2 divide-dashed divide-gray-300 border-y-2 border-dashed border-gray-300">
                        {[
                            { icon: Search, ink: '#1D4ED8', title: 'Ich suche Nachhilfe', text: 'Filtere nach Fach, Klasse und Preis. Direkter Kontakt in der App, geprüfte Oberstufenschüler.', points: ['Filter für Fach & Klasse', 'Direkter Kontakt in der App', 'Geprüfte Oberstufenschüler'], cta: 'Anzeigen stöbern', to: suchZiel },
                            { icon: GraduationCap, ink: '#15803D', title: 'Ich biete Nachhilfe', text: 'Setze eigene Preise, mache flexible Termine aus und sammle Bewertungen für dein Profil.', points: ['Eigene Preise & Bedingungen', 'Flexible Termine', 'Bewertungen & Profilstatus'], cta: 'Anzeige erstellen', to: bietZiel },
                            { icon: Users, ink: '#7B3FBF', title: 'Für Eltern', text: 'Verknüpfen Sie Ihr Konto mit dem Ihres Kindes und behalten Sie dessen Nachhilfe im Blick – der Chat bleibt privat.', points: ['Anzeigen, Anfragen & Merkliste im Blick', 'Profil & Einstellungen fürs Kind', 'Automatisch verifiziert & informiert'], cta: 'Eltern-Leitfaden', to: '/eltern-leitfaden' },
                        ].map((w, i) => (
                            <motion.article key={w.title} {...tiltIn(i)} className="group relative grid gap-5 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
                                <span className="grid place-items-center w-14 h-14 rounded-2xl text-white shrink-0 -rotate-3 group-hover:rotate-3 transition-transform" style={{ background: w.ink }}>
                                    <w.icon size={26} aria-hidden />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="font-display uppercase break-words text-2xl sm:text-4xl">{w.title}</h3>
                                    <p className="mt-2 text-gray-600 max-w-2xl">{w.text}</p>
                                    <ul id={`wege-punkte-${i}`} className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-gray-700">
                                        {w.points.map(p => (
                                            <li key={p} className="inline-flex items-center gap-1.5"><BadgeCheck size={15} style={{ color: w.ink }} aria-hidden />{p}</li>
                                        ))}
                                    </ul>
                                </div>
                                <Link
                                    to={w.to}
                                    aria-describedby={`wege-punkte-${i}`}
                                    aria-label={`${w.cta} – ${w.title}`}
                                    className="press inline-flex items-center justify-center min-h-11 h-11 px-6 text-sm gap-2 rounded-full font-bold text-white justify-self-start sm:justify-self-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    style={{ background: w.ink }}
                                >
                                    {w.cta} <ArrowUpRight size={17} aria-hidden />
                                </Link>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="brett" className="bg-gray-950 border-y border-white/10 scroll-mt-16">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <motion.div {...anim()} className="max-w-3xl">
                        <h2 className="font-display uppercase leading-[0.95] break-words text-4xl text-white sm:text-6xl">So sieht das <span className="text-primary">Schwarze Brett</span> in der App aus.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 text-lg leading-relaxed text-gray-300">Echte Screenshots aus der App: stöbern, anfragen, Profil zeigen — am Handy, am iPad und am Desktop. Ohne Katalog, ohne Kleingedrucktes.</p>
                    </motion.div>
                    <div ref={boardScrollRef} className={boardDriven ? 'board-scroll' : undefined}>
                        <div className={boardDriven ? 'board-sticky' : undefined}>
                            <div className="board-stage relative mt-10">
                                <div
                                    ref={boardPhonesRef}
                                    className={`board-phones${boardDriven ? ' board-phones--driven' : ''}`}
                                    aria-label="App-Ansichten auf dem Handy — beim Scrollen durchblättern"
                                    tabIndex={boardDriven ? -1 : 0}
                                >
                                    <motion.div className="board-track pt-4" style={boardDriven ? { x: boardX } : undefined}>
                                        {BOARD_DEVICES.map((m) => (
                                            <figure
                                                key={m.caption}
                                                className="board-sheet tape relative"
                                            >
                                                <img
                                                    src={m.src}
                                                    alt={m.alt}
                                                    loading="lazy"
                                                    className="h-auto w-full rounded-2xl"
                                                />
                                                <figcaption className="mt-4 text-center">
                                                    <span className="board-caption text-sm font-bold">{m.caption}</span>
                                                </figcaption>
                                            </figure>
                                        ))}
                                    </motion.div>
                                </div>
                                <p className="board-swipe-hint" aria-hidden>{boardDriven ? 'Weiterscrollen für weitere Ansichten →' : 'Wischen für weitere Ansichten →'}</p>
                            </div>
                        </div>
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
                            <h3 className="font-display uppercase leading-[0.95] text-2xl text-white sm:text-4xl">Auch am Desktop.</h3>
                            <p className="font-mono tabular-nums text-sm font-bold text-gray-500">07 ANSICHTEN · 01 PLATTFORM</p>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">Klick auf eine Ansicht öffnet sie groß — im Popup mit Pfeiltasten durchblättern.</p>
                        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
                            {BOARD_PRINTS.map((p, i) => (
                                <button
                                    key={p.index}
                                    type="button"
                                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                                    aria-label={`Screenshot groß ansehen: ${p.caption}`}
                                    className="group block rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                                    style={{ transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)` }}
                                >
                                    <span className="block overflow-hidden rounded-2xl ring-1 ring-white/10 transition-shadow group-hover:ring-primary/50">
                                        <img
                                            src={p.src}
                                            alt={p.alt}
                                            loading="lazy"
                                            className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
                                        />
                                    </span>
                                    <span className="mt-2.5 flex items-baseline gap-2">
                                        <span className="font-mono text-xs font-bold tabular-nums text-primary">{p.index}</span>
                                        <span className="board-caption text-xs font-bold sm:text-sm">{p.caption}</span>
                                    </span>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                                aria-label="Alle Screenshots groß ansehen"
                                className="group block rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                                style={{ transform: 'rotate(0.8deg)' }}
                            >
                                <span className="flex aspect-[1606/1104] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-3 text-center text-gray-300 transition-colors group-hover:border-primary/60 group-hover:text-white">
                                    <Maximize2 size={22} aria-hidden />
                                    <span className="font-mono text-xs font-bold uppercase tracking-wide">Alle groß ansehen</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <motion.div {...anim()} className="mt-12">
                        <Link to={ziel} className="press inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-base font-bold text-black shadow-md hover:bg-primary-hover">Jetzt loslegen <ArrowRight size={18} aria-hidden /></Link>
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
            <section id="plan" className="bg-[#faf7ef] text-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <motion.div {...anim()} className="flex flex-wrap items-end justify-between gap-6">
                        <div className="max-w-2xl min-w-0">
                            <h2 className="font-display uppercase leading-[0.95] break-words text-4xl sm:text-7xl">Sechs Funktionen für Suchen, Bieten, Chatten.</h2>
                            <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        </div>
                        <p className="font-mono tabular-nums text-sm font-bold text-gray-500">06 MODULE · 01 PLATTFORM</p>
                    </motion.div>
                    <motion.dl {...anim(0.06)} className="mt-10 border-t-2 border-black">
                        {[
                            { icon: Filter, t: 'Entdecken & Filtern', d: 'Präzise Filter für Klassenstufen, Fächer und Preisspannen. So findest du exakt, was du suchst.' },
                            { icon: Bookmark, t: 'Merkliste', d: 'Spannende Anzeigen ablegen und später wiederfinden. Nichts geht verloren.' },
                            { icon: MessageSquare, t: 'Sichere Anfragen', d: 'Anbieter direkt anschreiben. Handy und Moodle bleiben privat, bis die Anfrage angenommen ist.' },
                            { icon: Shield, t: 'Verifizierte Nutzer', d: 'Echte Accounts durch Verifizierung im SV-Raum. Keine Fake-Profile, Moderation inklusive.' },
                            { icon: ImageIcon, t: 'Starke Profile', d: 'Profilbild und ausführliche Biografie mit Text-Editor. Zeig, was du kannst.' },
                            { icon: Smartphone, t: 'Als App installierbar', d: 'Auf den Homescreen legen und wie eine echte App nutzen, auf iOS wie Android (PWA).' },
                        ].map((f, i) => (
                            <div key={f.t} className={`grid gap-3 py-5 sm:grid-cols-[3.5rem_1fr_1.4fr] sm:items-center sm:gap-6 ${i > 0 ? 'border-t border-gray-300' : ''}`}>
                                <span className="grid place-items-center w-12 h-12 rounded-xl bg-black text-primary"><f.icon size={22} aria-hidden /></span>
                                <dt className="font-display uppercase text-2xl sm:text-3xl">{f.t}</dt>
                                <dd className="text-gray-600 leading-relaxed">{f.d}</dd>
                            </div>
                        ))}
                    </motion.dl>
                </div>
            </section>

            {/* PRIVATSPHÄRE + VERIFIKATION */}
            <section id="sicher" className="bg-gray-950 border-y border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-10">
                    <motion.div {...anim()} className="rounded-3xl bg-[#faf7ef] text-gray-900 p-6 sm:p-10">
                        <Shield size={30} className="text-amber-600" aria-hidden />
                        <h2 className="mt-4 font-display uppercase leading-[0.95] text-4xl sm:text-5xl">Du entscheidest, wer was sieht.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 text-gray-600 leading-relaxed">Handy, Moodle, E-Mail: erst nach Annahme deiner Anfrage sichtbar. Schieb die Regler, so fühlt sich Kontrolle an.</p>
                        <div className="mt-6 space-y-3">
                            {[
                                { label: 'Handynummer', desc: 'Nur für angenommene Anfragen', on: showPhone, set: setShowPhone },
                                { label: 'Moodle-Name', desc: 'Nur für angenommene Anfragen', on: showMoodle, set: setShowMoodle },
                            ].map(r => (
                                <div key={r.label} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
                                    <div>
                                        <p className="font-bold text-sm">{r.label}</p>
                                        <p className="text-xs text-gray-500">{r.on ? r.desc : 'Versteckt: niemand sieht das'}</p>
                                    </div>
                                    <Switch
                                        checked={r.on}
                                        onChange={() => r.set(v => !v)}
                                        label={`${r.label} Sichtbarkeit`}
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-gray-500"><Lock size={13} aria-hidden /> Erst-nach-Annahme-Prinzip: Kontakte erscheinen erst nach angenommener Anfrage.</p>
                    </motion.div>

                    <motion.div {...anim(0.08)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-10 flex flex-col justify-center">
                        <h2 className="font-display uppercase leading-[0.95] text-4xl sm:text-5xl text-white">In drei Schritten verifiziert.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <VerifySteps tone="du" variant="spotlight" />
                        <Link to={ziel} className="press mt-8 inline-flex items-center justify-center h-11 px-6 text-sm gap-2 rounded-full border border-white/20 text-white hover:bg-white/10 active:bg-primary/10 self-start">Jetzt loslegen <ArrowRight size={16} aria-hidden /></Link>
                    </motion.div>
                </div>
            </section>

            {/* COACHING AG — gelbes Feld */}
            <section id="coaching" className="bg-primary text-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <motion.div {...anim()} className="max-w-3xl">
                        <p className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-primary"><Sparkles size={13} aria-hidden /> Besonderes Engagement am FWG</p>
                        <h2 className="mt-5 font-display uppercase leading-[0.95] break-words text-4xl sm:text-7xl">Die Schüler-Coaching AG</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-black" aria-hidden />
                        <p className="mt-4 text-lg font-medium text-black/70 leading-relaxed">Große helfen Kleinen: Unter Leitung von <strong className="text-black font-bold">Frau Balistreri</strong> begleiten geschulte Schüler <strong className="text-black font-bold">ab Klasse 8</strong> gezielt Kinder der <strong className="text-black font-bold">Klassen 5 und 6</strong> beim Start an unserer Schule.</p>
                    </motion.div>
                    <div className="mt-10 grid md:grid-cols-3 gap-4">
                        {[
                            { icon: GraduationCap, t: 'Pädagogisch begleitet', d: 'Coaches lernen Methoden fürs Lernen-Lernen und Arbeitsorganisation, nicht nur Fachwissen.' },
                            { icon: Shield, t: 'Offizielles Coach-Abzeichen', d: 'Goldenes Badge auf Profil und Anzeigen: Eltern und 5./6.-Klässler erkennen geprüfte Coaches sofort.' },
                            { icon: Users, t: 'Gemeinschaft & Fairness', d: 'Unkomplizierte Vermittlung, faire Richtpreise der Coaching-AG (ca. 10–15 € pro 45 Min), sicherer Chat im Schulsystem.' },
                        ].map((c, i) => (
                            <motion.div key={c.t} {...anim(i * 0.06)} className="rounded-3xl bg-black text-white p-7">
                                <c.icon size={26} className="text-primary" aria-hidden />
                                <h3 className="mt-4 font-display uppercase text-2xl">{c.t}</h3>
                                <p className="mt-2 text-sm text-gray-300 leading-relaxed">{c.d}</p>
                            </motion.div>
                        ))}
                    </div>
                    <motion.div {...anim()} className="mt-6 rounded-3xl border-2 border-dashed border-black/30 p-7 sm:p-9 flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em]">Schüler-Coach werden? Ab Klasse 8</p>
                            <p className="mt-2 max-w-xl font-medium text-black/70">Lust, Fünft- und Sechstklässler zu unterstützen? Sprich Frau Balistreri oder die SV an. Alle Regeln findest du transparent auf der <Link to="/coaching" className="font-bold text-black underline underline-offset-4">Coaching-Seite</Link>.</p>
                        </div>
                        <Link to={ziel} className="press inline-flex items-center justify-center h-14 px-8 text-base gap-2.5 rounded-full bg-black text-white hover:bg-gray-900 font-bold shrink-0">Jetzt loslegen</Link>
                    </motion.div>
                </div>
            </section>

            {/* ELTERN — schwarzes Feld mit gelber Headline */}
            <section id="eltern" className="bg-black text-white border-y border-white/10 scroll-mt-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <motion.div {...anim()} className="max-w-3xl">
                        <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10"><Shield className="text-blue-500" size={30} aria-hidden /></span>
                        <h2 className="mt-6 font-display uppercase leading-[0.95] break-words text-4xl sm:text-6xl text-primary">Informationen für Eltern</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 text-lg text-gray-300 max-w-2xl leading-relaxed">Verknüpfen Sie Ihr Konto mit dem Ihres Kindes und behalten Sie dessen Nachhilfe im Blick: Anzeigen, Anfragen, passende Matches, Merkliste und Bewertungen – an einem Ort und mit klaren Grenzen.</p>
                    </motion.div>

                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                        {[
                            { icon: BadgeCheck, t: 'Automatisch verifiziert', d: 'Sobald Sie Ihr Kind verknüpft haben, ist Ihr Eltern-Account verifiziert – ohne Formulare und ohne Warten.' },
                            { icon: Bookmark, t: 'Alles über das Kind', d: 'Anzeigen, Anfragen, passende Matches, Merkliste und Bewertungen live im Eltern-Dashboard – synchron zum Kinderkonto.' },
                            { icon: Filter, t: 'Profil & Einstellungen', d: 'Name, Klasse, Fächer, Bio, Verfügbarkeit und Sichtbarkeit fürs Kind pflegen – inklusive Anzeigen erstellen und pausieren.' },
                            { icon: Lock, t: 'Der Chat bleibt privat', d: 'Sie sehen den Status jeder Anfrage und wer sich gemeldet hat, aber nie die Nachrichten Ihres Kindes.' },
                        ].map((f, i) => (
                            <motion.article key={f.t} {...tiltIn(i)} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                <span className="inline-grid place-items-center w-11 h-11 rounded-2xl bg-primary text-black"><f.icon size={20} aria-hidden /></span>
                                <h3 className="mt-4 font-display uppercase text-xl">{f.t}</h3>
                                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{f.d}</p>
                            </motion.article>
                        ))}
                    </div>

                    <motion.div {...anim()} className="mt-10 flex flex-wrap items-center gap-3">
                        <Link to={elternZiel} className="press inline-flex items-center justify-center h-14 px-8 text-base gap-2.5 rounded-full bg-primary text-black hover:bg-primary-hover font-bold shadow-md">Eltern-Dashboard öffnen <ArrowRight size={18} aria-hidden /></Link>
                        <Link to="/eltern-leitfaden" className="press inline-flex items-center justify-center h-14 px-8 text-base gap-2.5 rounded-full border border-white/20 text-white hover:bg-white/10 font-bold">Eltern-Leitfaden</Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black text-gray-400 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center w-11 h-11 rounded-xl bg-primary text-black"><Logo size={26} /></span>
                            <div>
                                <p className="font-display uppercase text-2xl text-white leading-none">Nachhilfebörse</p>
                                <p className="mt-1 text-xs font-semibold">Die clevere Art, am FWG zu lernen.</p>
                            </div>
                        </div>
                        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Rechtliches und Infos">
                            {[
                                ['Impressum', '/impressum'], ['Datenschutz', '/datenschutz'], ['Cookies', '/cookies'],
                                ['Schüler-Coaching', '/coaching'], ['Nutzungsbedingungen', '/nutzungsbedingungen'], ['Eltern-Leitfaden', '/eltern-leitfaden'],
                                ['Transparenz', '/transparenz'],
                            ].map(([label, path]) => (
                                <Link key={path} to={path} className="hover:text-primary transition-colors">{label}</Link>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                        <p>© Schülervertretung Friedrich-Wilhelm-Gymnasium Köln {new Date().getFullYear()}.</p>
                        <p className="font-mono tabular-nums">Hosting in Deutschland · DSGVO-konform</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
