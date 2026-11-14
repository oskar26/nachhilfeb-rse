import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { RootProvider } from 'fumadocs-ui/provider/react-router';
import type { Route } from './+types/root';
import '@fontsource-variable/plus-jakarta-sans';
import './app.css';
import SearchDialog from '@/components/search';
import NotFound from './routes/not-found';

const translations = {
  'Ask AI(AI chat button)': 'KI fragen',
  'Back to Home(404 not found page)': 'Zur Startseite',
  'Choose a language(language switcher)': 'Sprache wählen',
  'Choose a language(language switcher)(aria-label)': 'Sprache wählen',
  'Close Banner(banner)(aria-label)': 'Banner schließen',
  'Close Search(search dialog)(aria-label)': 'Suche schließen',
  'Close Sidebar(aria-label)': 'Seitenleiste schließen',
  'Close Sidebar(sidebar)(aria-label)': 'Seitenleiste schließen',
  'Close(image zoom)(aria-label)': 'Schließen',
  'Collapse Sidebar(sidebar)(aria-label)': 'Seitenleiste einklappen',
  'Copied Anchor Link(heading anchor)(aria-label)': 'Ankerlink kopiert',
  'Copied Link(accordion)(aria-label)': 'Link kopiert',
  'Copied Markdown(page actions)': 'Markdown kopiert',
  'Copied Text(code block)(aria-label)': 'Text kopiert',
  'Copy Anchor Link(heading anchor)(aria-label)': 'Ankerlink kopieren',
  'Copy Link(accordion)(aria-label)': 'Link kopieren',
  'Copy Markdown(page actions)': 'Markdown kopieren',
  'Copy Text(code block)(aria-label)': 'Text kopieren',
  'Dark(theme switcher)(aria-label)': 'Dunkel',
  'Default(type table)': 'Standard',
  'Edit on GitHub(edit page)': 'Auf GitHub bearbeiten',
  'Hide Sidebar(sidebar)': 'Seitenleiste ausblenden',
  'Image Viewer(image zoom)(aria-label)': 'Bildansicht',
  'Language(language switcher)': 'Sprache',
  'Last updated on(page footer)': 'Zuletzt aktualisiert am',
  'Layout Tab(layout tab trigger)': 'Layout-Reiter',
  'Light(theme switcher)(aria-label)': 'Hell',
  'Next Image(image zoom)(aria-label)': 'Nächstes Bild',
  'Next Page(pagination)': 'Weiter',
  'No Headings(table of contents)': 'Keine Überschriften',
  'No results found(search dialog)': 'Keine Ergebnisse',
  'On this page(table of contents)': 'Auf dieser Seite',
  'Open Search(search trigger)(aria-label)': 'Suche öffnen',
  'Open Sidebar(aria-label)': 'Seitenleiste öffnen',
  'Open Sidebar(sidebar)(aria-label)': 'Seitenleiste öffnen',
  'Open in ChatGPT(page actions)': 'In ChatGPT öffnen',
  'Open in Claude(page actions)': 'In Claude öffnen',
  'Open in Cursor(page actions)': 'In Cursor öffnen',
  'Open in GitHub(page actions)': 'Auf GitHub öffnen',
  'Open in Scira AI(page actions)': 'In Scira AI öffnen',
  'Open(page actions)': 'Öffnen',
  'Options(aria-label)': 'Optionen',
  'Page Not Found(404 not found page)': 'Seite nicht gefunden',
  'Parameters(type table)': 'Parameter',
  'Previous Image(image zoom)(aria-label)': 'Vorheriges Bild',
  'Previous Page(pagination)': 'Zurück',
  'Prop(type table)': 'Eigenschaft',
  'Read {url}, I want to ask questions about it.(page actions)':
    'Lies {url}, ich möchte Fragen dazu stellen.',
  'Returns(type table)': 'Rückgabe',
  'Search failed(search dialog)': 'Suche fehlgeschlagen',
  'Search failed, showing results for {query}(search dialog)':
    'Suche fehlgeschlagen, zeige Ergebnisse für {query}',
  'Search(search dialog)': 'Suche',
  'Search(search trigger)': 'Suche',
  'Show Sidebar(sidebar)': 'Seitenleiste anzeigen',
  'Skip to Content(skip link)': 'Zum Inhalt springen',
  'System(theme switcher)(aria-label)': 'System',
  'Table of Contents(inline table of contents)': 'Inhaltsverzeichnis',
  'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 not found page)':
    'Die gesuchte Seite wurde möglicherweise entfernt, umbenannt oder ist vorübergehend nicht erreichbar.',
  'Theme(site menu)': 'Design',
  'Toggle Menu(home layout header)(aria-label)': 'Menü umschalten',
  'Toggle Theme(theme switcher)(aria-label)': 'Design wechseln',
  'Type(type table)': 'Typ',
  'View as Markdown(page actions)': 'Als Markdown ansehen',
  displayName: 'Deutsch',
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider
          search={{ SearchDialog }}
          theme={{ hotKey: false }}
          i18n={{ translations }}
        >
          {children}
        </RootProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  const message = isRouteErrorResponse(error)
    ? error.statusText
    : 'Die Seite konnte nicht geladen werden.';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Etwas ist schiefgelaufen</h1>
      <p className="text-fd-muted-foreground">{message}</p>
      <a
        href="/docs"
        className="w-fit rounded-full bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
      >
        Zur Dokumentation
      </a>
    </main>
  );
}
