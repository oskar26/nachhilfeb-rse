import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-sm font-medium text-fd-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Seite nicht gefunden</h1>
      <p className="text-fd-muted-foreground">
        Diese Seite gibt es nicht. Zurück zur Dokumentation findest du hier.
      </p>
      <Link
        to="/docs"
        className="w-fit rounded-full bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
      >
        Zur Dokumentation
      </Link>
    </main>
  );
}
