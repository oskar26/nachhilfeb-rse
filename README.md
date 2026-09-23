<div align="center">

# 🎓 FWG Nachhilfebörse

**Die schulinterne Nachhilfe-Plattform des Friedrich-Wilhelm-Gymnasiums Köln**  
Nachhilfe suchen und anbieten, direkt unter Mitschülern: ohne kommerzielle Plattform, moderiert von der SV.

[![Live](https://img.shields.io/badge/Live-nachhilfe--sv.de-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white)](https://nachhilfe-sv.de)
[![Status](https://img.shields.io/badge/Status-Aktiv-22c55e?style=for-the-badge)](https://nachhilfe-sv.de)
[![Open Source](https://img.shields.io/badge/Open%20Source-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/oskar26/nachhilfeb-rse)
[![DSGVO](https://img.shields.io/badge/DSGVO-Hosting%20in%20DE-0ea5e9?style=for-the-badge)](https://nachhilfe-sv.de/#/datenschutz)
[![AI](https://img.shields.io/badge/Entwicklung-agentisches%20Coding-a855f7?style=for-the-badge)](#-transparenz)

</div>

---

## 📌 Was ist das?

Die **FWG Nachhilfebörse** ist eine Progressive Web App (PWA) für das FWG Köln: Schüler:innen der Klassen 5 bis 13 finden Nachhilfe oder bieten sie an. Dazu kommen Verifikation über die Schülervertretung, Chat, Eltern-Dashboard und Pflicht zum Jugendschutz.

| | |
|---|---|
| 🌐 **Website** | [https://nachhilfe-sv.de](https://nachhilfe-sv.de) |
| 💻 **Quellcode** | [github.com/oskar26/nachhilfeb-rse](https://github.com/oskar26/nachhilfeb-rse) |
| 🏫 **Träger** | Schülervertretung (SV) des Friedrich-Wilhelm-Gymnasiums Köln |
| 📄 **Rechtliches** | [Impressum](https://nachhilfe-sv.de/#/impressum) · [Datenschutz](https://nachhilfe-sv.de/#/datenschutz) · [Transparenz](https://nachhilfe-sv.de/#/transparenz) |

---

## 📸 Screenshots

> **Platzhalter:** Legt die Bilder unter `docs/screenshots/` ab. Dann erscheinen sie hier automatisch.  
> Benennung und Motive siehe [`docs/screenshots/README.md`](docs/screenshots/README.md).

| Startseite | Feed & Suche | Anfrage & Chat |
|:---:|:---:|:---:|
| ![Welcome](docs/screenshots/01-welcome.png) | ![Feed](docs/screenshots/02-feed.png) | ![Chat](docs/screenshots/04-anfrage-chat.png) |

| Anzeige erstellen | Eltern-Dashboard | SV-Panel |
|:---:|:---:|:---:|
| ![Anzeige erstellen](docs/screenshots/03-anzeige-erstellen.png) | ![Eltern](docs/screenshots/06-eltern-dashboard.png) | ![SV-Panel](docs/screenshots/07-sv-panel.png) |

| Profil & Bewertung | Coaching | Dark Mode / PWA |
|:---:|:---:|:---:|
| ![Profil](docs/screenshots/05-profil.png) | ![Coaching](docs/screenshots/08-coaching.png) | ![Dark Mode](docs/screenshots/09-dark-mode-pwa.png) |

---

## ✨ Funktionen

<details>
<summary><b>Für Schüler:innen</b></summary>

- **🔍 Smart Matching:** Suche nach Fächern (nach Aufgabenfeldern farbcodiert), Klassenstufe (5–Q2), Preis, Ort und Verfügbarkeit
- **📝 Anzeigen in Minuten:** Stepper für „biete“ und „suche“, inkl. Bilder und Zeitfenstern
- **💬 Anfragen & Chat:** Terminabsprachen mit Match-Übersicht und Kalender-Export (ICS)
- **⭐ Bewertungen:** nur nach echtem Kontakt, keine Fake-Reviews
- **📌 Merkliste:** Anzeigen speichern und später vergleichen
- **👤 Profile mit Bio:** Rich-Text-Bio, Fach-Tags, Verifizierungs-Hinweis
- **🏅 Schüler-Coaching AG:** Badge für verifizierte Coaches ab Klasse 8

</details>

<details>
<summary><b>Für Eltern</b></summary>

- **👨‍👩‍👧 Eltern-Dashboard:** Kind verknüpfen, Fortschritt einsehen
- **📄 Einverständnis & Briefings:** Generierte, streng faktengebundene 3-Satz-Zusammenfassungen der Nachhilfe für Eltern (KI, NVIDIA NIM)
- **🛡️ Leitfaden:** Was die Plattform kann, was sie nicht kann, wie Sicherheit funktioniert ([Eltern-Leitfaden](https://nachhilfe-sv.de/#/eltern-leitfaden))

</details>

<details>
<summary><b>Für die SV (Administration)</b></summary>

- **✅ Verifikation:** SV-Raum, Codes/QR, Vor-Ort-Freischaltung
- **🎟️ Promotion-Codes:** z. B. `BANANE` für den Start
- **📣 Moderation:** Reports, Nutzerverwaltung, Audit-Log
- **📊 Analytics:** Live-Stats (Anzeigen, Nutzer, Seitenaufrufe) ohne externe Tracker

</details>

<details>
<summary><b>Technisch</b></summary>

- **📱 PWA:** installierbar auf Handy und Desktop, Offline-Prompt, Bottom-Nav mobil / Sidebar Desktop
- **🌗 Dark & Light Mode**
- **🤖 KI-Assistenten:** Smart Inserat Assistant und Eltern-Briefing über NVIDIA NIM (serverseitig, kein Key im Browser)
- **🔔 News-Widget & Push-Hinweise**

</details>

---

## 📊 Projekt in Zahlen

<div align="center">

| ![Code](https://img.shields.io/badge/Zeilen_Code_(src)-~27.500-0ea5e9?style=flat-square&labelColor=0f172a&color=0ea5e9) | ![Files](https://img.shields.io/badge/TS_TSX-Dateien-88-22c55e?style=flat-square&labelColor=0f172a&color=22c55e) | ![Components](https://img.shields.io/badge/UI--Components-34-f59e0b?style=flat-square&labelColor=0f172a&color=f59e0b) | ![API](https://img.shields.io/badge/API_/_Functions-27-a855f7?style=flat-square&labelColor=0f172a&color=a855f7) |
|:---:|:---:|:---:|:---:|
| **SQL-Migrationen** | **Seit Ende 2025** | **> 10 Monate** | **Agentisches Coding** |
| ![SQL](https://img.shields.io/badge/15_Migrationen-14b8a6?style=flat-square&labelColor=0f172a&color=14b8a6) | ![Since](https://img.shields.io/badge/Start-Ende%202025-ec4899?style=flat-square&labelColor=0f172a&color=ec4899) | ![Duration](https://img.shields.io/badge/Dauer-%3E%2010%20Monate-ec4899?style=flat-square&labelColor=0f172a&color=ec4899) | ![AI](https://img.shields.io/badge/mehrere%20hundert%20Stunden-a855f7?style=flat-square&labelColor=0f172a&color=a855f7) |

</div>

---

## 🤖 Transparenz: KI-gestützte Entwicklung

Dieses Projekt ist **Open Source** und erklärt seine Entstehung offen, auch auf der Website: [Transparenzhinweis](https://nachhilfe-sv.de/#/transparenz).

- **Seit Ende 2025**, also **über zehn Monate**, entsteht die Nachhilfebörse im Wesentlichen durch **agentisches Coding**: KI-Agenten schreiben und iterieren den Code, ein Mensch setzt Ziele, prüft, entscheidet und dirigiert.
- Der Aufwand beläuft sich auf **mehrere hundert Stunden**. Oft laufen dafür lange Workflows über viele Tage und Wochen.
- Ein **großer Teil des Codes und der Texte ist AI-generated**. Das ist Absicht und wird hier nicht beschönigt: Die Plattform ist ein Schülerprojekt, das mit modernen Werkzeugen gebaut wird, nicht das Ergebnis eines klassischen Entwicklerteams.
- **Verantwortung bleibt menschlich:** Inhalte, Sicherheitskonzept, Datenschutz und Entscheidungen über Features prüft und trägt das SV-Team. Fehler und Lücken können trotzdem vorkommen. Feedback an [technik@nachhilfe-sv.de](mailto:technik@nachhilfe-sv.de) oder als [Issue auf GitHub](https://github.com/oskar26/nachhilfeb-rse/issues).

> Weniger Maschine. Mehr Haltung: Wir sagen, woher der Code kommt, damit ihr einschätzen könnt, was ihr benutzt.

---

## 🔒 Sicherheit & Datenschutz (DSGVO)

1. **Kein API-Key im Browser:** `NVIDIA_API_KEY` und DB-Geheimnisse liegen ausschließlich serverseitig (Netlify Functions / Vercel / Express-Adapter). Das Frontend ruft nur geschützte Endpunkte wie `/api/ai/generate` auf.
2. **Serverseitiger Inhaltsfilter:** Profanity-Trigger auf Datenbankebene.
3. **Privatsphäre zuerst:** KI-Ergebnisse sind bearbeitbare Entwürfe, nie automatisch öffentlich. Verifikation über den SV-Raum, 7-Tage-Aufräumjob für unverifizierte Konten.
4. **Kein Tracking-Müll:** keine externen Analyse-/Werbedienste, Hosting in Deutschland.

Details: [Datenschutzerklärung](https://nachhilfe-sv.de/#/datenschutz) · [Cookies](https://nachhilfe-sv.de/#/cookies)

---

## 🛠️ Tech Stack

| Ebene | Technologien |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, Framer Motion, Lucide Icons, Tiptap |
| **Backend & DB** | Supabase (PostgreSQL, Row Level Security, Auth, Realtime) |
| **KI** | NVIDIA NIM: `nemotron-3.5-lightning-30b-a3b` (Inserate), `nemotron-3-nano-30b-a3b` (Eltern-Briefings) |
| **Serverless** | Netlify Functions · Vercel Serverless · Express-Adapter (`src/http/express-ai-routes.mjs`) |
| **PWA** | vite-plugin-pwa, Workbox |

---

## 🚀 Loslegen

```bash
git clone https://github.com/oskar26/nachhilfeb-rse.git
cd nachhilfeb-rse
npm install
```

`.env` anlegen (Vorlage: `.env.example`):

```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein_anon_key

# Nur serverseitig, nie mit VITE_ prefixen!
NVIDIA_API_KEY=nvapi-...
NVIDIA_LISTING_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_PARENT_BRIEFING_MODEL=nvidia/nemotron-3-nano-30b-a3b
```

```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build
npm run lint         # ESLint
node --test test/ai-drafts.test.mjs
```

> ⚠️ Echte Keys niemals in `.env.example` oder ins Repository schreiben.

Weitere Hinweise: [`DEPLOYMENT.md`](DEPLOYMENT.md) · [`PUBLISH.md`](PUBLISH.md) · [`ALL_INKL_ANLEITUNG.md`](ALL_INKL_ANLEITUNG.md)

---

## 🌐 Deployment

| Ziel | Konfiguration |
|---|---|
| **Netlify** (aktuell) | `netlify/functions/generate.js` · Env-Vars: `NVIDIA_API_KEY`, `NVIDIA_LISTING_MODEL`, `NVIDIA_PARENT_BRIEFING_MODEL` |
| **Vercel** | `api/ai/generate.ts` · Env-Vars analog unter Settings → Environment |
| **Eigener Node** | Adapter `src/http/express-ai-routes.mjs` einbinden |

---

## 🗺️ Projektstruktur

```
nachhilfev2/
├── src/
│   ├── pages/          # Feed, Chat, Profile, Eltern, SV-Panel, Rechtliches …
│   ├── components/     # UI, Layout, Modals
│   ├── context/        # Auth, Theme
│   └── lib/            # Supabase-Client, Analytics, Helpers
├── api/                # Vercel Serverless (KI-Endpunkte)
├── netlify/functions/  # Netlify Functions
├── supabase/ + sql/    # Schema, RLS, Migrationen
├── test/               # Node-Tests
└── docs/               # Briefings, Screenshots
```

---

## 🤝 Mitmachen

1. Fork erzeugen und Branch anlegen
2. Änderung mit klarem Commit-Message
3. PR aufmachen und kurz beschreiben, was sich warum ändert

Issues und Fehler: [github.com/oskar26/nachhilfeb-rse/issues](https://github.com/oskar26/nachhilfeb-rse/issues)

---

## 📄 Lizenz & Rechte

Entwickelt für das **Friedrich-Wilhelm-Gymnasium Köln**, Betrieb durch die **Schülervertretung**.  
Quellcode öffentlich auf GitHub; die Plattform selbst ist ein **nicht-kommerzielles Schülerprojekt**.  
Rechtliches: [Impressum](https://nachhilfe-sv.de/#/impressum) · [Nutzungsbedingungen](https://nachhilfe-sv.de/#/nutzungsbedingungen)

---

<div align="center">

**[nachhilfe-sv.de](https://nachhilfe-sv.de)** · von Schülern, für Schüler, mit KI im Backoffice und offenen Augen.

</div>
