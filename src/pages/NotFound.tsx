import { Link, useNavigate } from 'react-router-dom';
import { SearchX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gray-50 dark:bg-gray-950">
      <div className="w-20 h-20 rounded-3xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-6">
        <SearchX size={36} className="text-yellow-600 dark:text-yellow-400" />
      </div>
      <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">404</h1>
      <p className="mt-3 text-lg font-bold text-gray-800 dark:text-gray-200">Diese Seite gibt es nicht.</p>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Vielleicht wurde die Anzeige gelöscht oder der Link ist veraltet. Zurück zur Startseite?
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft size={16} className="mr-1.5" /> Zurück
        </Button>
        <Link to="/">
          <Button>
            <Home size={16} className="mr-1.5" /> Zur Startseite
          </Button>
        </Link>
      </div>
    </div>
  );
}
