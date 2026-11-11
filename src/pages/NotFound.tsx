import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, buttonVariants } from '../components/ui/button';
import { Logo } from '../components/ui/Logo';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const primaryTarget = user ? '/' : '/welcome';
  const primaryLabel = user ? 'Zur Übersicht' : 'Zur Startseite';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(primaryTarget);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background font-sans text-foreground">
      <Button variant="unstyled" size="unstyled" type="button" onClick={() => document.getElementById('inhalt')?.scrollIntoView()} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground">Zum Inhalt springen</Button>

      <SiteHeader />

      {/* Inhalt */}
      <main id="inhalt" className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 poster-grain-dark dark:opacity-30" aria-hidden />

        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20">
          {/* 404-Stempel */}
          <div className="flex justify-center">
            <span className="stamp-ring inline-flex -rotate-6 items-center gap-2 rounded-xl border-2 border-primary px-4 py-2 font-display text-sm uppercase tracking-[0.22em] text-brand-ink dark:text-primary sm:text-base">
              404 · Seite nicht gefunden
            </span>
          </div>

          {/* Anton-Riesen-H1 */}
          <h1 className="mt-8 break-words font-display uppercase leading-[0.92] tracking-tight text-[17vw] sm:text-8xl lg:text-9xl">
            Seite nicht
            <span className="mt-1 block"><span className="inline-block bg-primary px-2 text-primary-foreground sm:px-3">gefunden.</span></span>
          </h1>

          {/* Subline */}
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Vielleicht wurde die Anzeige gelöscht oder der Link ist veraltet.
          </p>

          {/* Gelbes tape-Detail: abgerissener Zettel */}
          <div className="mx-auto mt-10 max-w-md">
            <div className="tape relative rotate-[-2deg] rounded-2xl bg-primary p-6 pt-9 text-left text-primary-foreground shadow-card">
              <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">Gesucht · Zuletzt gesehen</p>
              <p className="mt-2 font-display uppercase text-2xl leading-none">Diese Seite am Brett</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed">
                Diese Seite gibt es nicht. Auf der Startseite findest du weitere Anzeigen.
              </p>
            </div>
          </div>

          {/* EIN primärer CTA-Intent */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <Link to={primaryTarget} className={buttonVariants({ size: 'lg', className: 'min-h-12 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover' })}>
              {primaryLabel} <ArrowRight size={20} aria-hidden />
            </Link>
            {/* Zurück nur als unauffälliger Textlink mit History-Fallback */}
            <Button variant="unstyled" size="unstyled" type="button"
              onClick={handleBack}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              <ArrowLeft size={16} aria-hidden /> Zurück
            </Button>
          </div>

          {/* Tertiäre Textlinks */}
          <nav aria-label="Weiter stöbern" className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <Link to="/" className="inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:text-foreground hover:underline">Übersicht</Link>
            <Link to="/welcome" className="inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:text-foreground hover:underline">Startseite</Link>
            <Link to="/coaching" className="inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:text-foreground hover:underline">Coaching</Link>
            <Link to="/eltern-leitfaden" className="inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:text-foreground hover:underline">Eltern-Leitfaden</Link>
          </nav>
        </div>
      </main>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-5 text-xs text-muted-foreground sm:px-6">
          <span className="inline-flex items-center gap-2"><Logo size={16} /> Nachhilfebörse FWG</span>
          <span>SV-verifiziert · Nur FWG Köln</span>
        </div>
      </footer>
    </div>
  );
}
