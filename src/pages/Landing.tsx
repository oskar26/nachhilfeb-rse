import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    ArrowUpRight,
    BadgeCheck,
    Bookmark,
    Filter,
    GraduationCap,
    Image as ImageIcon,
    Lock,
    MessageSquare,
    Search,
    Shield,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Users,
} from 'lucide-react';
import { CollapsedNewsWidget } from '../components/CollapsedNewsWidget';
import SiteHeader from '../components/SiteHeader';
import VerifySteps from '../components/VerifySteps';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { SUBJECT_CATEGORIES, SubjectChip, type Subject } from '../components/SubjectChip';
import { Switch } from '../components/ui/switch';
import { VerifiedPill } from '../components/ui/VerifiedPill';
import { Badge } from '../components/ui/badge';
import { buttonVariants } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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

const FAECHER = SUBJECT_CATEGORIES.flatMap((c) => c.subjects).map((s) => SUBJECT_LABELS[s]);

const SCREENSHOT_ITEMS = [
    { id: 'feed-iphone', src: feedIphoneShot, alt: 'iPhone-Übersicht mit hervorgehobener Anzeige und Tab-Leiste', caption: 'Übersicht: Anzeigen stöbern' },
    { id: 'mobile-anzeige', src: mobileAnzeigeShot, alt: 'iPhone-Anzeigen-Detail mit Preis, Tags und Beschreibung', caption: 'Anzeige: Details zum Angebot' },
    { id: 'iphone-profile', src: iphoneProfileShot, alt: 'iPhone-Profil mit Profil-Stärke und persönlichen Angaben', caption: 'Profil: zeigen, was du kannst' },
    { id: 'ipad-settings', src: ipadSettingsShot, alt: 'iPad-Einstellungen mit Erscheinungsbild, Push und Datenschutz', caption: 'Einstellungen & Datenschutz' },
    { id: 'desktop-feed', src: feedShot, alt: 'Desktop-Übersicht „Aktuelle Anzeigen“ mit Suche und Filtern', caption: 'Übersicht und Suche' },
    { id: 'desktop-create', src: createAdShot, alt: 'Editor „Anzeige aufgeben“ im Schritt-für-Schritt-Modus', caption: 'Anzeige erstellen' },
    { id: 'desktop-requests', src: requestsShot, alt: 'Anfragen und Vorschläge mit Tabs und leerem Posteingang', caption: 'Anfragen und Vorschläge' },
    { id: 'desktop-profile', src: profileShot, alt: 'Öffentliches Profil mit Statistiken und Verfügbarkeits-Kalender', caption: 'Öffentliches Profil' },
    { id: 'desktop-sv', src: svPanelShot, alt: 'SV-Admin-Panel mit Nutzern, Anzeigen und Meldungen', caption: 'SV-Panel' },
    { id: 'desktop-coaching', src: coachingShot, alt: 'Coaching-Seite „Coaching-AG am FWG“', caption: 'Coaching-AG' },
    { id: 'desktop-dark', src: darkModeShot, alt: 'Dark Mode: eigenes Profil mit Profil-Stärke', caption: 'Dark Mode & PWA' },
];

export default function Landing() {
    const { user } = useAuth();
    const [liveStats, setLiveStats] = useState<{ active_ads: number; users: number } | null>(null);

    /* Privatsphäre-Demo */
    const [showPhone, setShowPhone] = useState(true);
    const [showMoodle, setShowMoodle] = useState(false);

    useEffect(() => {
        // Statistik ist optional (die Landing funktioniert auch ohne Daten);
        // Fehler werden bewusst still ignoriert.
        api.analytics.summary().then(({ data, error }) => {
            if (!error && data) {
                setLiveStats({
                    active_ads: Number((data as any).active_ads) || 0,
                    users: Number((data as any).users) || 0,
                });
            }
        }).catch(() => { /* Statistik ist optional */ });
    }, []);

    const ziel = user ? '/' : '/login';
    const suchZiel = user ? '/' : '/login';
    const bietZiel = user ? '/create-ad' : '/login';
    const elternZiel = '/eltern-leitfaden';

    return (
        <main className="min-h-dvh overflow-x-clip bg-background font-sans text-foreground">
            {/* Skip-Link als Scroll-Button: reines href="#inhalt" wäre unter HashRouter eine 404-Route. */}
            <button
                type="button"
                onClick={() => {
                    const el = document.getElementById('inhalt') as HTMLElement | null;
                    if (!el) return;
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
                }}
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
            >
                Zum Inhalt springen
            </button>

            <SiteHeader />

            <section id="inhalt" tabIndex={-1} className="bg-background">
                <div className="mx-auto grid max-w-site items-center gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20 lg:pt-16">
                    <div className="min-w-0">
                        <h1 className="max-w-2xl text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
                            Finde Nachhilfe. Direkt am FWG.
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
                            Nachhilfe in Mathematik, Englisch und weiteren Fächern, direkt unter Mitschülerinnen und Mitschülern. Jede Anzeige stammt von einem verifizierten Konto.
                        </p>
                        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                            <Link to={ziel} className={buttonVariants({ size: 'lg' }) + ' w-full sm:w-auto'}>
                                Anzeigen ansehen <ArrowRight aria-hidden />
                            </Link>
                            <Link to="/eltern-leitfaden" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' w-full sm:w-auto'}>
                                Eltern-Leitfaden
                            </Link>
                        </div>
                        <ul className="mt-6 flex flex-wrap gap-2 sm:mt-8" aria-label="Vertrauen auf einen Blick">
                            {[
                                { icon: BadgeCheck, label: 'SV-verifiziert' },
                                { icon: ShieldCheck, label: 'Nur FWG Köln' },
                                { icon: Lock, label: 'Server in Deutschland' },
                                { icon: BadgeCheck, label: 'Nutzung kostenlos' },
                            ].map((s) => (
                                <li key={s.label} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-2 text-xs font-semibold shadow-soft">
                                    <s.icon size={15} className="text-muted-foreground" aria-hidden /> {s.label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="min-w-0" aria-label="Vorschau: Beispiel-Anzeigen">
                        <div className="relative mx-auto max-w-[420px]">
                            <div className="relative overflow-hidden rounded-panel bg-primary p-4 shadow-card sm:p-6">
                                <div className="relative mx-auto w-full max-w-[255px] pb-28 pt-3 sm:pb-32">
                                    <div className="overflow-hidden rounded-[2.25rem] border-[7px] border-zinc-900 bg-card shadow-[0_24px_50px_-20px_rgba(24,24,27,0.45)]">
                                        <img
                                            src={feedIphoneShot}
                                            alt="App-Vorschau: Übersicht mit Anzeigen"
                                            className="h-auto w-full"
                                            loading="eager"
                                        />
                                    </div>
                                </div>

                                <div className="absolute bottom-6 left-4 z-10 w-[160px] rounded-card border border-border/70 bg-card p-3 shadow-card sm:bottom-8 sm:left-6 sm:w-[205px] sm:p-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <SubjectChip subject="mathematik" />
                                        <VerifiedPill size="sm" className="hidden px-2 py-0.5 text-[10px] sm:inline-flex" />
                                    </div>
                                    <p className="mt-2.5 text-sm font-bold leading-snug">Analysis-Crash vor der Klausur</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Lena K. · Q1 · SV-Raum</p>
                                    <div className="mt-2.5 flex items-center justify-between gap-2">
                                        <span className="whitespace-nowrap text-[13px] font-bold tabular-nums">12 € / 45 Min</span>
                                        <Badge variant="outline" className="px-1.5 text-[10px]">Demo</Badge>
                                    </div>
                                </div>

                                <div className="absolute right-4 bottom-3 z-20 w-[168px] rounded-card border border-border/70 bg-card p-3 shadow-card sm:bottom-4 sm:w-[180px] sm:p-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <SubjectChip subject="physik" />
                                        <span className="text-[11px] font-semibold text-muted-foreground">Q2 · Bibliothek</span>
                                    </div>
                                    <p className="mt-2.5 text-sm font-bold leading-snug">Mechanik ohne Panik</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Aylin D. · mit alten Klausuren</p>
                                    <div className="mt-2.5 flex items-center justify-between gap-2">
                                        <span className="whitespace-nowrap text-[13px] font-bold tabular-nums">12 € / 60 Min</span>
                                        <Badge variant="outline" className="px-1.5 text-[10px]">Demo</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* EMPFEHLUNG — direkt unter der Hero: ein Konto pro Kind, altersgerecht begleitet */}
            <section aria-label="Empfehlung zur Nutzung des Kontos" className="bg-background pb-10 sm:pb-12">
                <div className="mx-auto max-w-site px-4 sm:px-6">
                    <div className="flex flex-col items-start gap-3 rounded-card border border-border/70 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                        <Badge variant="outline" className="gap-1.5 bg-background">
                            <Users size={14} aria-hidden /> Empfehlung
                        </Badge>
                        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                            <strong className="font-semibold text-foreground">Ein Konto pro Kind:</strong> In den Klassen 5 und 6 betreuen viele Eltern mit, ältere nutzen die Börse selbstständig.
                        </p>
                        <Link to="/eltern-leitfaden" className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground">
                            Eltern-Leitfaden <ArrowUpRight size={16} aria-hidden />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Fächer, Kennzahlen & News */}
            <section aria-label="Fächer, Kennzahlen und Neuigkeiten" className="bg-card">
                <div className="mx-auto max-w-site px-4 py-12 sm:px-6 sm:py-16">
                    <div className="flex flex-wrap gap-2" aria-label="Fächerübersicht">
                        {FAECHER.map((f) => (
                            <Badge key={f} variant="outline" className="font-medium text-muted-foreground">
                                {f}
                            </Badge>
                        ))}
                    </div>

                    <dl className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="Aktuelle Kennzahlen der Nachhilfebörse">
                        {[
                            { value: liveStats?.active_ads, label: 'Aktive Anzeigen' },
                            { value: liveStats?.users, label: 'Nutzer' },
                        ].map((s) => (
                            <div key={s.label} className="rounded-card bg-muted/70 p-5 sm:p-6">
                                <dd className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                                    {s.value !== undefined && s.value !== null ? s.value.toLocaleString('de-DE') : '—'}
                                </dd>
                                <dt className="mt-1 text-sm font-semibold text-muted-foreground">{s.label}</dt>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-8 rounded-card bg-muted/50 p-4 sm:p-6">
                        <CollapsedNewsWidget />
                    </div>
                </div>
            </section>

            {/* WEGE — drei Karten */}
            <section id="wege" className="scroll-mt-24 bg-background">
                <div className="mx-auto max-w-site px-4 py-12 sm:px-6 sm:py-16">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Drei Wege zur Nachhilfe.</h2>
                        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Wähle den Weg, der zu dir passt. Jeder Weg beginnt mit einer Anzeige oder einer Anfrage.</p>
                    </div>
                    <div className="mt-8 grid gap-4 lg:grid-cols-3">
                        {[
                            { icon: Search, title: 'Ich suche Nachhilfe', text: 'Filtere nach Fach, Klasse und Preis. Kontakt über die App, sobald eine Anfrage angenommen ist.', points: ['Filter für Fach und Klasse', 'Kontakt nach Annahme', 'Verifizierte Konten'], cta: 'Anzeigen stöbern', to: suchZiel },
                            { icon: GraduationCap, title: 'Ich biete Nachhilfe', text: 'Lege deinen Preis fest, gib deine Zeiten an und antworte auf Anfragen.', points: ['Eigene Preise und Bedingungen', 'Flexible Termine', 'Bewertungen nach Kontakt'], cta: 'Anzeige erstellen', to: bietZiel },
                            { icon: Users, title: 'Für Eltern', text: 'Betreuen Sie das Konto gemeinsam mit Ihrem Kind oder lassen Sie es selbstständig nutzen. In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. So behalten Sie Anzeigen und Anfragen im Blick.', points: ['Ein Konto pro Kind', 'Gemeinsam Anzeigen und Anfragen ansehen', 'Kontakt zur SV bei Fragen'], cta: 'Eltern-Leitfaden', to: '/eltern-leitfaden' },
                        ].map((w, i) => (
                            <article key={w.title} className="flex h-full flex-col rounded-card border border-border/70 bg-card p-6 shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-card">
                                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/20 text-foreground">
                                    <w.icon size={22} aria-hidden />
                                </span>
                                <div className="mt-5 min-w-0 flex-1">
                                    <h3 className="text-xl font-bold">{w.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.text}</p>
                                    <ul id={`wege-punkte-${i}`} className="mt-4 flex flex-wrap gap-2">
                                        {w.points.map((p) => (
                                            <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                                                <BadgeCheck size={14} className="text-muted-foreground" aria-hidden />{p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <Link
                                    to={w.to}
                                    aria-describedby={`wege-punkte-${i}`}
                                    aria-label={`${w.cta}: ${w.title}`}
                                    className={buttonVariants({ variant: 'outline' }) + ' mt-6 w-full'}
                                >
                                    {w.cta} <ArrowUpRight aria-hidden />
                                </Link>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="brett" className="scroll-mt-24 bg-card">
                <div className="mx-auto max-w-site px-4 py-12 sm:px-6 sm:py-16">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">So sieht die Nachhilfebörse aus.</h2>
                        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Echte Screenshots aus der App: stöbern, anfragen, Profil zeigen. Am Handy, am iPad und am Desktop.</p>
                    </div>
                    <Tabs defaultValue={SCREENSHOT_ITEMS[0].id} className="mt-8">
                        <TabsList className="h-auto! max-w-full flex-wrap justify-start gap-2 rounded-none bg-transparent p-0">
                            {SCREENSHOT_ITEMS.map((item) => (
                                <TabsTrigger key={item.id} value={item.id} className="h-11 shrink-0 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground shadow-none data-active:border-transparent data-active:bg-primary data-active:text-primary-foreground">
                                    {item.caption}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {SCREENSHOT_ITEMS.map((item) => (
                            <TabsContent key={item.id} value={item.id} className="mt-6">
                                <figure className="overflow-hidden rounded-card bg-muted p-3 sm:p-4">
                                    <img src={item.src} alt={item.alt} loading="lazy" className="mx-auto max-h-[70vh] w-full rounded-field bg-card object-contain" />
                                    <figcaption className="px-2 pb-1 pt-3 text-sm font-medium text-muted-foreground">{item.caption}</figcaption>
                                </figure>
                            </TabsContent>
                        ))}
                    </Tabs>

                    <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-panel bg-primary p-5 shadow-card sm:flex-row sm:items-center sm:p-7">
                        <div className="flex items-center gap-3">
                            <span className="grid size-11 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground">
                                <ImageIcon size={21} aria-hidden />
                            </span>
                            <p className="text-lg font-bold text-primary-foreground">Börse ansehen</p>
                        </div>
                        <Link to={ziel} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-overlay">
                            Börse ansehen <ArrowRight aria-hidden />
                        </Link>
                    </div>
                </div>
            </section>

            {/* SPECS — ruhige Liste */}
            <section id="plan" className="scroll-mt-24 bg-background text-foreground">
                <div className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Sechs Funktionen für Suchen, Bieten, Chatten.</h2>
                    </div>
                    <dl className="mt-10 divide-y divide-border border-y border-border">
                        {[
                            { icon: Filter, t: 'Entdecken & Filtern', d: 'Filter nach Fach, Klasse, Ort und Preis.' },
                            { icon: Bookmark, t: 'Merkliste', d: 'Anzeigen speichern und später wiederfinden.' },
                            { icon: MessageSquare, t: 'Private Kontaktdaten', d: 'Telefonnummer und Moodle-Name sehen andere erst, wenn du eine Anfrage annimmst.' },
                            { icon: Shield, t: 'Verifizierte Nutzer', d: 'Verifizierte Konten durch persönliche Prüfung im SV-Raum, dazu Moderation und Meldefunktion.' },
                            { icon: ImageIcon, t: 'Profil', d: 'Profilbild und ausführliche Beschreibung. Beschreibe deine Fächer und deine Erfahrung.' },
                            { icon: Smartphone, t: 'Als App installierbar', d: 'Zum Startbildschirm hinzufügen und wie eine App öffnen, auf iOS und Android.' },
                        ].map((f) => (
                            <div key={f.t} className="grid gap-3 py-5 sm:grid-cols-[3rem_1fr_1.4fr] sm:items-center sm:gap-6">
                                <span className="grid size-11 place-items-center rounded-full bg-muted text-foreground"><f.icon size={20} aria-hidden /></span>
                                <dt className="text-lg font-semibold">{f.t}</dt>
                                <dd className="leading-relaxed text-muted-foreground">{f.d}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* PRIVATSPHÄRE + VERIFIKATION */}
            <section id="sicher" className="scroll-mt-24 bg-card">
                <div className="mx-auto grid max-w-site gap-6 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
                    <div className="rounded-card border border-border/70 bg-background p-6 text-card-foreground sm:p-8">
                        <Shield size={24} className="text-muted-foreground" aria-hidden />
                        <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Du entscheidest, wer was sieht.</h2>
                        <p className="mt-4 leading-relaxed text-muted-foreground">Du entscheidest, welche Kontaktdaten sichtbar sind. Telefonnummer und Moodle-Name sehen andere erst nach Annahme einer Anfrage. Die E-Mail-Adresse kannst du im Profil öffentlich schalten.</p>
                        <div className="mt-6 divide-y divide-border border-y border-border">
                            {[
                                { label: 'Handynummer', desc: 'Nur für angenommene Anfragen', on: showPhone, set: setShowPhone },
                                { label: 'Moodle-Name', desc: 'Nur für angenommene Anfragen', on: showMoodle, set: setShowMoodle },
                            ].map((r) => (
                                <div key={r.label} className="flex items-center justify-between gap-4 py-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">{r.label}</p>
                                        <p className="text-xs text-muted-foreground">{r.on ? r.desc : 'Versteckt: niemand sieht das'}</p>
                                    </div>
                                    <Switch
                                        checked={r.on}
                                        onCheckedChange={() => r.set(v => !v)}
                                        label={`${r.label} Sichtbarkeit`}
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 inline-flex items-start gap-2 text-xs font-medium text-muted-foreground"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden /> Telefonnummer und Moodle-Name erscheinen erst nach angenommener Anfrage.</p>
                    </div>

                    <div className="flex flex-col justify-center rounded-card border border-border/70 bg-background p-6 text-card-foreground sm:p-8">
                        <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">So wird dein Konto verifiziert.</h2>
                        <div className="mt-6 [&_li]:transform-none! [&_li]:opacity-100!">
                            <VerifySteps tone="du" variant="spotlight" />
                        </div>
                        <Link to={ziel} className={buttonVariants({ variant: 'outline' }) + ' mt-8 self-start'}>Zur Anmeldung <ArrowRight aria-hidden /></Link>
                    </div>
                </div>
            </section>

            {/* COACHING AG — weiße Karte */}
            <section id="coaching" className="scroll-mt-24 bg-background">
                <div className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24">
                    <div className="rounded-card border border-border/70 bg-card p-6 text-card-foreground sm:p-8">
                        <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"><Sparkles size={16} aria-hidden /> Coaching-AG am FWG</p>
                        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Die Coaching-AG</h2>
                        <p className="mt-4 max-w-3xl text-lg font-medium leading-relaxed text-muted-foreground">Ältere unterstützen Jüngere: Unter Leitung von <strong className="font-semibold text-foreground">Frau Balistreri</strong> begleiten geschulte Schülerinnen und Schüler <strong className="font-semibold text-foreground">ab Klasse 8</strong> gezielt Kinder der <strong className="font-semibold text-foreground">Klassen 5 und 6</strong> beim Start an unserer Schule.</p>
                        <div className="mt-8 grid gap-6 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
                            {[
                                { icon: GraduationCap, t: 'Pädagogisch begleitet', d: 'Coaches lernen Lernmethoden und Arbeitsorganisation.' },
                                { icon: Shield, t: 'Offizielles Coach-Abzeichen', d: 'Coaches mit Abzeichen haben die Schulung besucht und sind verifiziert.' },
                                { icon: Users, t: 'Gemeinschaft & Fairness', d: 'Kontakt über die App. Richtwert: ca. 12 € pro Stunde, individuell anpassbar.' },
                            ].map((c) => (
                                <div key={c.t} className="pt-6 first:pt-0 md:px-6 md:pt-0 md:first:pl-0 md:last:pr-0">
                                    <c.icon size={22} className="text-muted-foreground" aria-hidden />
                                    <h3 className="mt-3 text-lg font-semibold">{c.t}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-col justify-between gap-6 border-t border-border pt-6 sm:flex-row sm:items-center">
                            <div>
                                <p className="text-sm font-medium">Schüler-Coach werden? Ab Klasse 8</p>
                                <p className="mt-2 max-w-xl text-sm text-muted-foreground">Du möchtest Schülerinnen und Schüler der Klassen 5 und 6 unterstützen? Sprich Frau Balistreri oder die SV an. Alle Regeln findest du transparent auf der <Link to="/coaching" className="font-medium text-foreground underline underline-offset-4">Coaching-Seite</Link>.</p>
                            </div>
                            <Link to={ziel} className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' shrink-0'}>Jetzt mitmachen</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ELTERN — ruhiger Trust-Block */}
            <section id="eltern" className="scroll-mt-24 bg-card text-foreground">
                <div className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24">
                    <div className="max-w-3xl">
                        <span className="inline-grid size-12 place-items-center rounded-full border border-border bg-background"><Shield className="text-muted-foreground" size={22} aria-hidden /></span>
                        <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Informationen für Eltern</h2>
                        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">Ihr Kind nutzt die Nachhilfebörse über sein eigenes Konto. Wie selbstständig es läuft, entscheiden Sie gemeinsam: In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. So behalten Sie Anzeigen und Anfragen im Blick. Unter 16 Jahren brauchen wir Ihre Einwilligung.</p>
                    </div>

                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                        {[
                            { icon: Users, t: 'Gemeinsam betreuen', d: 'Ihr Kind nutzt sein Konto, Sie schauen mit und unterstützen. Wie eng Sie begleiten, entscheiden Sie gemeinsam.' },
                            { icon: BadgeCheck, t: 'Verifizierte Konten', d: 'Nur verifizierte Konten können Anzeigen erstellen, Kontakt aufnehmen oder Anzeigen ansehen. Im Profil ist sichtbar, ob jemand verifiziert ist.' },
                            { icon: Lock, t: 'Keine Zahlungen über die App', d: 'Die Börse vermittelt nur den Kontakt. Vergütung und Umfang klären Sie direkt mit der Familie der Anbieterin oder des Anbieters.' },
                            { icon: Shield, t: 'Melden & Fragen', d: 'Jede Anzeige und jedes Profil lässt sich melden. Das SV-Team sichtet Meldungen mindestens einmal pro Woche, oft auch häufiger. Bei Fragen: info@nachhilfe-sv.de.' },
                        ].map((f) => (
                            <article key={f.t} className="rounded-card border border-border/70 bg-background p-6 text-card-foreground">
                                <span className="inline-grid size-10 place-items-center rounded-full bg-muted text-foreground"><f.icon size={20} aria-hidden /></span>
                                <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                            </article>
                        ))}
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-3">
                        <Link to={elternZiel} className={buttonVariants({ size: 'lg' })}>Eltern-Leitfaden lesen <ArrowRight aria-hidden /></Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-background text-muted-foreground">
                <div className="mx-auto max-w-site px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-14 sm:px-6">
                    <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
                        <div className="flex items-center gap-3">
                            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><Logo size={22} /></span>
                            <div>
                                <p className="text-lg font-semibold leading-none text-foreground">Nachhilfebörse</p>
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
                        <p className="tabular-nums">Hosting in Deutschland · DSGVO-konform</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
