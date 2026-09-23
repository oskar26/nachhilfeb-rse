import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
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
} from 'lucide-react';
import { api } from '../lib/api';
import { SUBJECT_CATEGORIES, type Subject } from '../components/SubjectChip';

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

/* iPhone-Mockups für die Sektion „So sieht's in der App aus". */
const MOCKUPS = [
    { src: '/mockups/app-feed.png', file: 'public/mockups/app-feed.png', alt: 'App-Vorschau: Feed mit Nachhilfe-Anzeigen vom FWG', caption: 'Feed — Anzeigen stöbern' },
    { src: '/mockups/app-chat.png', file: 'public/mockups/app-chat.png', alt: 'App-Vorschau: Chat für Anfragen zwischen Schülern', caption: 'Chat — Anfragen klären' },
    { src: '/mockups/app-profil.png', file: 'public/mockups/app-profil.png', alt: 'App-Vorschau: Profil mit Fächern und Verifiziert-Badge', caption: 'Profil — zeigen, was du kannst' },
];

const easeOut = [0.16, 1, 0.3, 1] as const;

/* Faden-Netz (Netz-Effekt) als reine SVG-Deko — Fäden wie am Schwarzen Brett:
   Pin-Köpfe (Pin-Rot #dc2626, Kante #7f1d1d wie .board-pin) + feine Fäden
   dazwischen (Gelb/Weiß auf Schwarz, dezent dunkel auf Papier). Statisch, kein
   Canvas, kein rAF, keine Listener: Bewegung kommt ausschließlich per
   Parallax-Transform vom Eltern-Wrapper (drift-Prop, transform-only, kein
   Layout). 9 Pins, 10 kurze Nachbar-Segmente (Distanz-Schwelle by
   construction, Limit ~40 Nodes weit unterschritten). aria-hidden +
   pointer-events-none: kein Kontrast-, Touch- oder A11y-Einfluss. Unter
   prefers-reduced-motion bleibt das Netz sichtbar, aber starr
   (drift=undefined + CSS-Fallback in index.css). */
const THREAD_PINS: Array<{ x: number; y: number; extra?: boolean }> = [
    { x: 70, y: 112 },
    { x: 250, y: 52 },
    { x: 430, y: 118 },
    { x: 610, y: 48 },
    { x: 795, y: 112 },
    { x: 975, y: 54 },
    { x: 1130, y: 108 },
    { x: 350, y: 62, extra: true },
    { x: 880, y: 62, extra: true },
];
/* Ketten-Segmente (jeweils Nachbarn) + lokale Extra-Segmente; Q-Kontrolle
   hängt die Fäden leicht durch wie echte Brett-Fäden. fill:none, 1.25px. */
const THREAD_LINKS: Array<{ a: number; b: number; sag: number; tone: 0 | 1 | 2; extra?: boolean }> = [
    { a: 0, b: 1, sag: 16, tone: 0 },
    { a: 1, b: 2, sag: 18, tone: 1 },
    { a: 2, b: 3, sag: 16, tone: 2 },
    { a: 3, b: 4, sag: 18, tone: 0 },
    { a: 4, b: 5, sag: 16, tone: 1 },
    { a: 5, b: 6, sag: 18, tone: 2 },
    { a: 1, b: 7, sag: 10, tone: 1, extra: true },
    { a: 7, b: 2, sag: 12, tone: 0, extra: true },
    { a: 4, b: 8, sag: 12, tone: 0, extra: true },
    { a: 8, b: 5, sag: 10, tone: 1, extra: true },
];

function ThreadSeam({ variant = 'dark', drift, className = '' }: { variant?: 'dark' | 'paper'; drift?: MotionValue<number>; className?: string }) {
    const tones = variant === 'dark'
        ? (['#FACC15', '#dc2626', '#ffffff'] as const)
        : (['#1c1917', '#dc2626', '#1c1917'] as const);
    const opacities = variant === 'dark' ? ([0.3, 0.34, 0.14] as const) : ([0.14, 0.3, 0.12] as const);
    const threadPath = (l: (typeof THREAD_LINKS)[number]) => {
        const p = THREAD_PINS[l.a];
        const q = THREAD_PINS[l.b];
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2 + l.sag;
        return `M ${p.x} ${p.y} Q ${mx} ${my} ${q.x} ${q.y}`;
    };
    return (
        <div aria-hidden="true" className={`thread-seam pointer-events-none relative h-16 w-full overflow-hidden sm:h-24 ${className}`}>
            {/* +2rem Bleed (oben/unten je 1rem, geclippt): Parallax-Drift legt
                nie den Sektionsgrund frei, kein Page-Overflow. */}
            <motion.svg
                viewBox="0 0 1200 160"
                preserveAspectRatio="xMidYMid slice"
                focusable="false"
                aria-hidden="true"
                className="block h-[calc(100%+2rem)] w-full -mt-4"
                style={drift ? { y: drift } : undefined}
            >
                {THREAD_LINKS.map((l, i) => (
                    <path
                        key={i}
                        d={threadPath(l)}
                        fill="none"
                        stroke={tones[l.tone]}
                        strokeOpacity={opacities[l.tone]}
                        strokeWidth={1.25}
                        className={l.extra ? 'thread-extra' : undefined}
                    />
                ))}
                {THREAD_PINS.map((p, i) => (
                    <g key={i} className={p.extra ? 'thread-extra' : undefined}>
                        <circle cx={p.x} cy={p.y} r={6.5} fill="#dc2626" stroke="#7f1d1d" strokeWidth={2} opacity={variant === 'dark' ? 0.9 : 0.85} />
                        <circle cx={p.x - 2} cy={p.y - 2} r={1.8} fill="#ffffff" opacity={0.65} />
                    </g>
                ))}
            </motion.svg>
        </div>
    );
}

/* CSS-iPhone-Frame mit Dynamic Island; zeigt bei fehlender Datei eine
   gestaltete Platzhalter-Card mit exaktem Ablagepfad. */
function IPhoneFrame({ src, alt, file }: { src: string; alt: string; file: string }) {
    const [ok, setOk] = useState(false);
    return (
        <div className="relative mx-auto w-full max-w-[300px] rounded-[3rem] border border-white/20 bg-black p-2.5 shadow-2xl">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[2.4rem] bg-[#faf7ef]">
                <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden />
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-gray-900">
                    <Smartphone size={28} aria-hidden className="text-gray-400" />
                    <p className="text-sm font-bold">Noch kein Screenshot da.</p>
                    <p className="font-mono text-xs leading-relaxed text-gray-600 break-anywhere">Screenshot ablegen unter: {file}</p>
                </div>
                {!ok ? null : (
                    <img src={src} alt={alt} loading="lazy" onLoad={() => setOk(true)} onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover object-top" />
                )}
                {/* Unsichtbarer Probe-Loader: schaltet das echte Bild nur bei erfolgreichem Laden frei */}
                {!ok && <img src={src} alt="" aria-hidden loading="lazy" onLoad={() => setOk(true)} className="absolute h-px w-px opacity-0" />}
            </div>
            <div className="absolute -left-[2px] top-24 h-10 w-[3px] rounded-full bg-white/20" aria-hidden />
            <div className="absolute -left-[2px] top-40 h-14 w-[3px] rounded-full bg-white/20" aria-hidden />
            <div className="absolute -right-[2px] top-32 h-16 w-[3px] rounded-full bg-white/20" aria-hidden />
        </div>
    );
}

export default function Landing() {
    const { user } = useAuth();
    const reduceMotion = useReducedMotion();
    const [liveStats, setLiveStats] = useState<{ active_ads: number; users: number; page_views: number } | null>(null);
    const [statsFailed, setStatsFailed] = useState(false);

    /* Privatsphäre-Demo */
    const [showPhone, setShowPhone] = useState(true);
    const [showMoodle, setShowMoodle] = useState(false);

    /* Brett-Showcase: vertikaler Scroll treibt horizontale Kartenfahrt (Sticky-Pin).
       Journey draußen (280vh via .board-journey) + klemmendes Board (.board-sticky,
       100svh, overflow hidden) + Track per translateX aus Scroll-Progress.
       Framer useScroll/useTransform = bestehende Motion-Sprache (kein Hand-Listener);
       Distanz in px gemessen (scrollWidth - clientWidth) = responsiv exakt, nur
       transform (kein Layout), will-change nur im Journey (CSS). */
    const [activeMock, setActiveMock] = useState(0);
    const journeyRef = useRef<HTMLDivElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const mockItemRefs = useRef<(HTMLElement | null)[]>([]);
    const journeyEnabled = !reduceMotion;
    const [trackDist, setTrackDist] = useState(0);
    const { scrollYProgress } = useScroll({
        target: journeyRef,
        offset: ['start start', 'end end'],
    });
    const trackX = useTransform(scrollYProgress, [0, 1], [0, -trackDist]);
    /* Netz + Parallax-Staffelung (nur transform, Framer useScroll/useTransform
       im bestehenden Motion-Stil): Grain/Glows langsam, Headline subtil,
       Tickets gegenläufig, Faden-Nähte driften im eigenen Fenster. Jede Ebene
       eigene Geschwindigkeit. reduceMotion → Styles undefined (statisch,
       Inhalt identisch). #brett-Journey bleibt unangetastet (eigene Refs). */
    const heroRef = useRef<HTMLElement | null>(null);
    const wegeRef = useRef<HTMLElement | null>(null);
    const brettSeamRef = useRef<HTMLDivElement | null>(null);
    const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const { scrollYProgress: wegeProgress } = useScroll({ target: wegeRef, offset: ['start end', 'end start'] });
    const { scrollYProgress: brettSeamProgress } = useScroll({ target: brettSeamRef, offset: ['start end', 'end start'] });
    const heroGrainY = useTransform(heroProgress, [0, 1], [0, 70]);
    const heroGlowAY = useTransform(heroProgress, [0, 1], [0, 110]);
    const heroGlowBY = useTransform(heroProgress, [0, 1], [0, 60]);
    const heroHeadY = useTransform(heroProgress, [0, 1], [0, 36]);
    const heroTicketY = useTransform(heroProgress, [0, 1], [0, -46]);
    const heroSeamDrift = useTransform(heroProgress, [0, 1], [-8, 12]);
    const wegeSeamDrift = useTransform(wegeProgress, [0, 1], [-16, 16]);
    const brettSeamDrift = useTransform(brettSeamProgress, [0, 1], [-12, 12]);
    useMotionValueEvent(scrollYProgress, 'change', (v) => {
        const idx = Math.min(MOCKUPS.length - 1, Math.max(0, Math.round(v * (MOCKUPS.length - 1))));
        setActiveMock(idx);
    });

    /* Fahrstrecke messen: Track-Breite minus Viewport (0 = alles sichtbar, keine Fahrt).
       ResizeObserver + Resize-Listener, keine Layout-Animation. */
    useEffect(() => {
        if (!journeyEnabled) {
            setTrackDist(0);
            return;
        }
        const track = trackRef.current;
        const viewport = viewportRef.current;
        if (!track || !viewport || typeof ResizeObserver === 'undefined') {
            const measureFallback = () => {
                const t = trackRef.current;
                const vp = viewportRef.current;
                if (!t || !vp) return;
                setTrackDist(Math.max(0, t.scrollWidth - vp.clientWidth));
            };
            measureFallback();
            window.addEventListener('resize', measureFallback);
            return () => window.removeEventListener('resize', measureFallback);
        }
        const measure = () => setTrackDist(Math.max(0, track.scrollWidth - viewport.clientWidth));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(track);
        ro.observe(viewport);
        window.addEventListener('resize', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [journeyEnabled]);

    /* Dots = Fortschritt: scrollen die SEITE zur passenden Progress-Position
       (kein Carousel-Snap). Fallback (RM): normale Anker per scrollIntoView. */
    const scrollToMock = (index: number) => {
        if (!journeyEnabled) {
            mockItemRefs.current[index]?.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                inline: 'center',
                block: 'nearest',
            });
            return;
        }
        const journey = journeyRef.current;
        if (!journey) return;
        const top = window.scrollY + journey.getBoundingClientRect().top;
        const total = Math.max(0, journey.offsetHeight - window.innerHeight);
        const y = top + (total * index) / (MOCKUPS.length - 1);
        window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    useEffect(() => {
        api.analytics.summary().then(({ data, error }) => {
            if (!error && data) {
                setLiveStats({
                    active_ads: Number((data as any).active_ads) || 0,
                    users: Number((data as any).users) || 0,
                    page_views: Number((data as any).page_views) || 0,
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
    const anim = (delay = 0) => reduceMotion ? {} : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.7, delay, ease: easeOut },
    };

    /* FOCAL „Frisch geklebt": Tape-up — Elemente kommen leicht schräg und geradet sich. */
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
    const pinPress = (i: number) => reduceMotion ? {} : {
        initial: { x: '-50%', opacity: 0, scale: 1.55 },
        whileInView: { x: '-50%', opacity: 1, scale: [1.55, 0.8, 1] },
        viewport: { once: true, margin: '-80px 0px' },
        transition: { duration: 0.6, delay: 0.3 + i * 0.08, ease: easeOut },
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
                            Mathe-SOS oder Englisch-Ass? Am FWG Köln Nachhilfe <strong className="text-white font-bold">suchen</strong> und <strong className="text-white font-bold">anbieten</strong> — direkt unter Mitschülern, SV-verifiziert.
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
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700"><BadgeCheck size={14} aria-hidden /> Verifiziert</span>
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
                                <span className="font-mono tabular-nums">{liveStats ? `${liveStats.active_ads.toLocaleString('de-DE')} aktive Anzeigen` : '—'}</span>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
                {/* Faden-Naht Hero → Wege: Netz hängt zwischen Plakat und Tickerband. */}
                <ThreadSeam variant="dark" drift={reduceMotion ? undefined : heroSeamDrift} className="relative z-0" />
            </section>

            {/* Fächer-Ticker, Kennzahlen & News — eigene Sektion direkt unter der Hero */}
            <section aria-label="Fächer, Kennzahlen und Neuigkeiten">
                {/* Tickerband */}
                <div className="relative border-y-4 border-primary bg-primary text-black overflow-hidden" aria-label="Fächerübersicht">
                    <div className="ticker-track flex w-max items-center gap-0 py-2.5 font-display uppercase text-lg tracking-wide">
                        {[0, 1].map(copy => (
                            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                                {FAECHER_TICKER.map(f => (
                                    <span key={`${copy}-${f}`} className="flex items-center">
                                        <span className="px-5">{f}</span>
                                        <Sparkles size={15} aria-hidden />
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Kennzahlen */}
                <div className="relative border-b border-white/10">
                    <dl className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 gap-2 sm:gap-4 min-w-0" aria-label="Aktuelle Kennzahlen der Nachhilfebörse">
                        {[
                            { value: liveStats?.active_ads, label: 'Aktive Anzeigen' },
                            { value: liveStats?.users, label: 'Nutzer' },
                        ].map(s => (
                            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-6 sm:py-4 min-w-0 flex flex-col">
                                <dt className="order-2 mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.14em] text-gray-400 break-words">{s.label}</dt>
                                <dd className="order-1 font-mono tabular-nums text-xl sm:text-4xl font-bold text-white">
                                    {s.value !== undefined && s.value !== null ? s.value.toLocaleString('de-DE') : '—'}
                                </dd>
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
            <section id="wege" ref={wegeRef} className="relative overflow-hidden bg-[#faf7ef] text-gray-900 poster-grain-dark scroll-mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <motion.div {...anim()}>
                        <h2 className="font-display uppercase leading-[0.95] break-words text-4xl sm:text-7xl max-w-3xl">Drei Wege an ein Ziel: die Klausur sitzt.</h2>
                        <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 text-lg text-gray-600 max-w-2xl">Reiß dir deinen Streifen ab — jeder Weg startet mit einem Klick und endet im Chat mit echten Mitschülern.</p>
                    </motion.div>
                    <div className="mt-10 divide-y-2 divide-dashed divide-gray-300 border-y-2 border-dashed border-gray-300">
                        {[
                            { icon: Search, ink: '#1D4ED8', title: 'Ich suche Nachhilfe', text: 'Filtere nach Fach, Klasse und Preis. Direkter Kontakt in der App, geprüfte Oberstufenschüler.', points: ['Filter für Fach & Klasse', 'Direkter Kontakt in der App', 'Geprüfte Oberstufenschüler'], cta: 'Anzeigen stöbern', to: suchZiel },
                            { icon: GraduationCap, ink: '#15803D', title: 'Ich biete Nachhilfe', text: 'Setze eigene Preise, mache flexible Termine aus und sammle Bewertungen für dein Profil.', points: ['Eigene Preise & Bedingungen', 'Flexible Termine', 'Bewertungen & Profilstatus'], cta: 'Anzeige erstellen', to: bietZiel },
                            { icon: Users, ink: '#7B3FBF', title: 'Für Eltern', text: 'Verknüpfe deinen Eltern-Account, gib Anzeigen für deine Kinder auf und bleib informiert.', points: ['Anzeigen für Kinder erstellen', 'Passende Anfragen & Fortschritt einsehen', 'Kontrolle & Benachrichtigungen'], cta: 'Eltern-Leitfaden', to: '/eltern-leitfaden' },
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
                {/* Faden-Naht Wege → Brett: dezente dunkle Fäden auf Papier, zeigen Richtung Brett. */}
                <ThreadSeam variant="paper" drift={reduceMotion ? undefined : wegeSeamDrift} className="relative z-0" />
            </section>

            {/* SCHWARZES BRETT: Sticky-Pin-Showcase — vertikaler Scroll fährt die Karten horizontal.
                Außen .board-journey (280vh Scroll-Strecke), innen .board-sticky (100svh,
                overflow hidden), Track per translateX aus Scroll-Progress (useScroll/
                useTransform). Titel oben + CTA unten bleiben normal im Fluss (kein Cut);
                Dots klemmen mit (Fortschritt) und scrollen die Seite zur Position. */}
            <section id="brett" className="bg-gray-950 border-y border-white/10 scroll-mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="relative rounded-[1.75rem] board-frame bg-[#0c0c10]">
                        <div className="absolute inset-0 rounded-[1.4rem] poster-grain opacity-100" aria-hidden />
                        <div className="absolute inset-0 rounded-[1.4rem] board-vignette pointer-events-none" aria-hidden />
                        <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed border-white/15" aria-hidden />
                        <div className="relative p-6 sm:p-10 lg:p-12">
                            <motion.div {...anim()} className="max-w-3xl">
                                <h2 className="font-display uppercase leading-[0.95] break-words text-4xl sm:text-6xl text-white">So sieht das <span className="text-primary">Schwarze Brett</span> in der App aus.</h2>
                                <motion.span {...wipeLine()} className="mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                                <p className="mt-4 text-gray-300 text-lg leading-relaxed">Kein Katalog, kein Kleingedrucktes: stöbern, anfragen, Profil zeigen — alles direkt am Handy, alles vom FWG.</p>
                            </motion.div>
                            {/* Faden-Naht Brett-Intro → Journey: gelb-rote Fäden führen zu den Pins.
                                In-Flow-Sibling mit eigenem Overflow-Fenster — Journey-Mechanik
                                (Sticky/Track-Ref/Distanz) bleibt unangetastet. */}
                            <div ref={brettSeamRef}>
                                <ThreadSeam variant="dark" drift={reduceMotion ? undefined : brettSeamDrift} className="mt-6 sm:mt-8" />
                            </div>
                            <div ref={journeyRef} className={journeyEnabled ? 'board-journey' : undefined}>
                                <div className={journeyEnabled ? 'board-sticky' : undefined}>
                                    <div ref={viewportRef} className={journeyEnabled ? 'board-viewport' : 'mt-10'}>
                                        <motion.div
                                            ref={trackRef}
                                            style={journeyEnabled ? { x: trackX } : undefined}
                                            className={journeyEnabled ? 'board-track flex w-max items-stretch gap-6 pb-2 pt-4' : 'mt-10 grid gap-6 md:grid-cols-3'}
                                        >
                                            {MOCKUPS.map((m, i) => (
                                                <motion.figure
                                                    key={m.src}
                                                    {...(journeyEnabled ? {} : anim(i * 0.06))}
                                                    ref={(el) => {
                                                        mockItemRefs.current[i] = el;
                                                    }}
                                                    className={journeyEnabled ? 'flex-none w-[78vw] max-w-[340px] sm:w-[340px] lg:w-[400px]' : 'w-full'}
                                                >
                                                    <div className={`board-card board-card--${i} relative rounded-3xl border border-white/10 px-4 pb-5 pt-9 transition-transform duration-300 hover:rotate-0 ${i === 0 ? 'rotate-[-1.8deg]' : i === 1 ? 'rotate-[1.4deg] translate-y-2' : 'rotate-[-0.7deg] -translate-y-1'}`}>
                                                        <motion.span aria-hidden className="board-pin absolute left-1/2 top-3 z-[2] -translate-x-1/2" {...pinPress(i)} />
                                                        <div className="board-phone">
                                                            <IPhoneFrame src={m.src} alt={m.alt} file={m.file} />
                                                        </div>
                                                        <figcaption className="mt-4 text-center text-sm font-bold">
                                                            <span className={`board-caption ${i === 0 ? '-rotate-1' : i === 1 ? 'rotate-1' : '-rotate-[0.5deg]'}`}>{m.caption}</span>
                                                        </figcaption>
                                                    </div>
                                                </motion.figure>
                                            ))}
                                        </motion.div>
                                    </div>
                                    <div className={journeyEnabled ? 'flex justify-center gap-0' : 'mt-4 flex justify-center gap-0'} role="group" aria-label="Vorschau wählen">
                                        {MOCKUPS.map((m, i) => (
                                            <button
                                                key={m.src}
                                                type="button"
                                                onClick={() => scrollToMock(i)}
                                                aria-label={`Vorschau ${i + 1} von ${MOCKUPS.length}: ${m.caption}`}
                                                aria-current={activeMock === i ? 'true' : undefined}
                                                className="press group flex min-h-11 min-w-11 items-center justify-center p-3"
                                            >
                                                <span aria-hidden className={`block h-2.5 rounded-full transition-all duration-150 ease-out group-active:scale-75 ${activeMock === i ? 'w-7 bg-primary' : 'w-2.5 bg-white/40 group-hover:bg-white/70'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <motion.div {...anim()} className="mt-10">
                                <Link to={ziel} className="press inline-flex items-center justify-center h-14 px-8 text-base gap-2.5 rounded-full font-bold bg-primary text-black hover:bg-primary-hover shadow-md">Jetzt loslegen <ArrowRight size={18} aria-hidden /></Link>
                            </motion.div>
                        </div>
                    </div>
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
                            { icon: Filter, t: 'Entdecken & Filtern', d: 'Präzise Filter für Klassenstufen, Fächer und Preisspannen — finde exakt, was du suchst.' },
                            { icon: Bookmark, t: 'Merkliste', d: 'Spannende Anzeigen ablegen und später wiederfinden. Nichts geht verloren.' },
                            { icon: MessageSquare, t: 'Sichere Anfragen', d: 'Anbieter direkt anschreiben. Handy und Moodle bleiben privat, bis die Anfrage angenommen ist.' },
                            { icon: Shield, t: 'Verifizierte Nutzer', d: 'Echte Accounts durch Verifizierung im SV-Raum. Keine Fake-Profile, Moderation inklusive.' },
                            { icon: ImageIcon, t: 'Starke Profile', d: 'Profilbild und ausführliche Biografie mit Text-Editor — zeig, was du kannst.' },
                            { icon: Smartphone, t: 'Als App installierbar', d: 'Auf den Homescreen legen und wie eine echte App nutzen — iOS wie Android (PWA).' },
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
                        <p className="mt-4 text-gray-600 leading-relaxed">Handy, Moodle, E-Mail: erst nach Annahme deiner Anfrage sichtbar. Schieb die Regler — so fühlt sich Kontrolle an.</p>
                        <div className="mt-6 space-y-3">
                            {[
                                { label: 'Handynummer', desc: 'Nur für angenommene Anfragen', on: showPhone, set: setShowPhone },
                                { label: 'Moodle-Name', desc: 'Nur für angenommene Anfragen', on: showMoodle, set: setShowMoodle },
                            ].map(r => (
                                <div key={r.label} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
                                    <div>
                                        <p className="font-bold text-sm">{r.label}</p>
                                        <p className="text-xs text-gray-500">{r.on ? r.desc : 'Versteckt — niemand sieht das'}</p>
                                    </div>
                                    <button
                                        role="switch" aria-checked={r.on} aria-label={`${r.label} Sichtbarkeit`}
                                        onClick={() => r.set(v => !v)}
                                        className={`press relative h-7 w-12 rounded-full shrink-0 ${r.on ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${r.on ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
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
                            { icon: GraduationCap, t: 'Pädagogisch begleitet', d: 'Coaches lernen Methoden fürs Lernen-Lernen und Arbeitsorganisation — nicht nur Fachwissen.' },
                            { icon: Shield, t: 'Offizielles Coach-Abzeichen', d: 'Goldenes Badge auf Profil und Anzeigen: Eltern und 5./6.-Klässler erkennen geprüfte Coaches sofort.' },
                            { icon: Users, t: 'Gemeinschaft & Fairness', d: 'Unkomplizierte Vermittlung, faire Richtpreise (ca. 10–15 € pro 45 Minuten), sicherer Chat im Schulsystem.' },
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
            <section id="eltern" className="bg-black text-white border-y border-white/10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
                    <motion.div {...anim()}>
                        <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10"><Shield className="text-blue-500" size={30} aria-hidden /></span>
                        <h2 className="mt-6 font-display uppercase leading-[0.95] break-words text-4xl sm:text-6xl text-primary">Informationen für Eltern</h2>
                        <motion.span {...wipeLine()} className="mx-auto mt-4 block h-1.5 w-16 origin-left rounded-full bg-primary" aria-hidden />
                        <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">Die Sicherheit Ihrer Kinder hat oberste Priorität: Meldefunktion, SV-Moderation, verifizierte Accounts. Wer sich registrieren darf und wie wir schützen — alles im Leitfaden.</p>
                        <Link to="/eltern-leitfaden" className="press mt-8 inline-flex items-center justify-center h-14 px-8 text-base gap-2.5 rounded-full bg-primary text-black hover:bg-primary-hover font-bold shadow-md">Eltern-Leitfaden <ArrowRight size={18} aria-hidden /></Link>
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
