# Nachhilfebörse Dokumentation

Die Dokumentation ist eine React-Router-/Fumadocs-App und wird als statischer
Ordner nach `dist/docs` kopiert.

## Entwicklung

Die Dokumentation läuft unter `/docs/` und braucht keinen `<base>`-Tag:

```bash
cd docs-site
npm run dev -- --port 5182
# http://localhost:5182/docs/
```

`npm run dev` ohne Portangabe nutzt Vite-Standardport 5173; der Pfad `/docs/`
bleibt derselbe. Die Seite wird unter `/docs/` ausgeliefert, Module und Assets
kommen in der Entwicklung vom Server-Root. Damit hydratisiert die Seite direkt
auf `/docs/` und auf jeder Unterseite.

## Build

```bash
npm run types:check
npm run build
```

`npm run build` im Projektwurzelverzeichnis baut die Docs und kopiert sie nach
`dist/docs`. Unbekannte `/docs/*`-Pfade werden in Produktion über die
`.htaccess` auf `docs/404.html` geführt und nie auf die App-Shell.
