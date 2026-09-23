import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const primaryTarget = user ? '/' : '/welcome';
  const primaryLabel = user ? 'Zur Plattform' : 'Jetzt loslegen';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(primaryTarget);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-primary selection:text-black overflow-x-clip flex flex-col">
      <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-black">Zum Inhalt springen</a>

      {/* Dienstleiste */}
      <div className="bg-primary text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em]">
          <span className="truncate">404 · Zettel abgerissen</span>
          <span className="hidden sm:inline">Nur FWG Köln</span>
        </div>
      </div>

      {/* Navigation — bewusst ohne zweiten primären CTA */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => navigate(primaryTarget)} className="flex items-center gap-3 min-w-0" aria-label="Nachhilfebörse Startseite">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary text-black shadow-[0_6px_20px_-6px_rgba(250,204,21,0.6)] shrink-0">
              <Logo size={24} />
            </span>
            <span className="text-lg font-extrabold tracking-tight truncate">Nachhilfebörse <span className="text-primary">FWG</span></span>
          </button>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Schwarzes Brett</span>
        </div>
      </header>

      {/* Inhalt */}
      <main id="inhalt" className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 poster-grain" aria-hidden />
        <div className="absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full bg-primary/15 blur-[120px]" aria-hidden />
        <div className="absolute -bottom-52 -left-40 w-[30rem] h-[30rem] rounded-full bg-blue-600/15 blur-[120px]" aria-hidden />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-20 text-center">
          {/* 404-Stempel */}
          <div className="flex justify-center">
            <span className="inline-flex -rotate-6 items-center gap-2 rounded-xl border-2 border-primary px-4 py-2 font-display uppercase tracking-[0.22em] text-sm sm:text-base text-primary stamp-ring">
              404 · Nichts gefunden
            </span>
          </div>

          {/* Anton-Riesen-H1 */}
          <h1 className="mt-8 font-display uppercase leading-[0.92] tracking-tight break-words text-[17vw] sm:text-8xl lg:text-9xl">
            Nichts klebt
            <span className="block poster-outline mt-1">hier.</span>
          </h1>

          {/* Subline */}
          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-xl mx-auto leading-relaxed">
            Vielleicht wurde die Anzeige gelöscht oder der Link ist veraltet.
          </p>

          {/* Gelbes tape-Detail: abgerissener Zettel */}
          <div className="mt-10 mx-auto max-w-md">
            <div className="tape relative rounded-2xl bg-primary text-black p-6 pt-9 shadow-2xl rotate-[-2deg] text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">Gesucht · Zuletzt gesehen</p>
              <p className="mt-2 font-display uppercase text-2xl leading-none">Diese Seite am Brett</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed">
                Der Zettel ist weg — aber das Brett hängt noch voller Angebote.
              </p>
            </div>
          </div>

          {/* EIN primärer CTA-Intent */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate(primaryTarget)}
              className="rounded-full font-bold bg-primary text-black hover:bg-yellow-300"
            >
              {primaryLabel} <ArrowRight size={18} aria-hidden />
            </Button>
            {/* Zurück nur als unauffälliger Textlink mit History-Fallback */}
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              <ArrowLeft size={15} aria-hidden /> Zurück
            </button>
          </div>

          {/* Tertiäre Textlinks */}
          <nav aria-label="Weiter stöbern" className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            <Link to="/" className="hover:text-white transition-colors underline-offset-4 hover:underline">Feed</Link>
            <Link to="/welcome" className="hover:text-white transition-colors underline-offset-4 hover:underline">Welcome</Link>
            <Link to="/coaching" className="hover:text-white transition-colors underline-offset-4 hover:underline">Coaching</Link>
            <Link to="/eltern-leitfaden" className="hover:text-white transition-colors underline-offset-4 hover:underline">Eltern-Leitfaden</Link>
          </nav>
        </div>
      </main>

      <footer className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between text-xs text-gray-500">
          <span>Nachhilfebörse FWG</span>
          <span>SV-verifiziert · Nur FWG Köln</span>
        </div>
      </footer>
    </div>
  );
}
