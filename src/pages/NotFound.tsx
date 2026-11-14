import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, buttonVariants } from '../components/ui/button';
import { Logo } from '../components/ui/Logo';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

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
      <Button variant="unstyled" size="unstyled" type="button" onClick={() => document.getElementById('inhalt')?.scrollIntoView()} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground">Zum Inhalt springen</Button>

      <SiteHeader />

      <main id="inhalt" className="flex-1 bg-background">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <p className="text-sm font-medium text-muted-foreground">404 · Seite nicht gefunden</p>
          <h1 className="mt-4 break-words text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            Seite nicht gefunden.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Vielleicht wurde die Anzeige gelöscht oder der Link ist veraltet.
          </p>

          <div className="mt-8 max-w-md rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-medium text-muted-foreground">Gesucht · Zuletzt gesehen</p>
            <p className="mt-2 text-lg font-semibold leading-snug">Diese Seite am Brett</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {user
                ? 'Diese Seite gibt es nicht. Auf der Startseite findest du weitere Anzeigen.'
                : 'Diese Seite gibt es nicht. Auf der Startseite erfährst du, wie die Börse funktioniert.'}
            </p>
          </div>

          <div className="mt-8 flex flex-col items-start gap-3">
            <Link to={primaryTarget} className={buttonVariants({ size: 'lg', className: 'min-h-12' })}>
              {primaryLabel} <ArrowRight size={20} aria-hidden />
            </Link>
            <Button variant="ghost" type="button" onClick={handleBack} className="min-h-11 px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground">
              <ArrowLeft size={16} aria-hidden /> Zurück
            </Button>
          </div>

          <nav aria-label="Weiter stöbern" className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
            {user ? (
              <Link to="/" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">Übersicht</Link>
            ) : null}
            <Link to="/welcome" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">Startseite</Link>
            <Link to="/coaching" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">Coaching</Link>
            <Link to="/eltern-leitfaden" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">Eltern-Leitfaden</Link>
          </nav>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-5 text-xs text-muted-foreground sm:px-6">
          <span className="inline-flex items-center gap-2"><Logo size={16} className="text-primary" /> Nachhilfebörse FWG</span>
          <span>SV-verifiziert · Nur FWG Köln</span>
        </div>
      </footer>
    </div>
  );
}
