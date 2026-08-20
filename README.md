# 🎓 FWG Nachhilfebörse v2

Eine moderne, sichere und KI-gestützte Nachhilfe-Plattform für Schülerinnen, Schüler und Eltern des Friedrich-Wilhelms-Gymnasiums Köln.

![FWG Nachhilfebörse](https://img.shields.io/badge/Status-Aktiv-brightgreen.svg)
![React](https://img.shields.io/badge/Frontend-React_19-blue.svg)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)
![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38bdf8.svg)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ecf8e.svg)
![NVIDIA AI](https://img.shields.io/badge/AI-NVIDIA_NIM_Nemotron-green.svg)

---

## 🌟 Hauptfunktionen

- **🔍 Smart Matching & Suche**: Gezielte Suche nach Fächern (nach Aufgabenfeldern sortiert), Klassenstufen (5 bis Q2) und Verfügbarkeit.
- **✨ KI-Assistenten (NVIDIA NIM)**:
  - **Smart Inserat Assistant**: Formuliert aus Stichpunkten professionelle Inseratentwürfe (`nvidia/nemotron-3.5-lightning-30b-a3b`).
  - **KI-Eltern-Fortschritts-Synthese**: Generiert streng faktengebundene 3-Satz-Zusammenfassungen von Nachhilfestunden für Eltern (`nvidia/nemotron-3-nano-30b-a3b`).
- **👨‍👩‍👧 Eltern-Dashboard & Verknüpfung**: Eltern können Schülerkonten verknüpfen, Fortschritte einsehen, Einverständniserklärungen generieren und Benachrichtigungen verwalten.
- **🛡️ SV-Admin-Panel & Code-System**: SV-Schülerausweis-Verifizierung, Promotion-Codes (`BANANE`), Benutzerverwaltung und Aktivitäts-Audit-Logs.
- **📱 Progressive Web App (PWA)**: Installierbar auf Mobilgeräten und Desktops mit Offline-Unterstützung und Schnellzugriffen.
- **💬 Echtzeit-Chat & Anfragen**: Integriertes Nachrichtensystem für Terminabsprachen.

---

## 🔒 Sicherheitskonzept & Datenschutz (DSGVO)

Die Anwendung wurde mit Fokus auf **Jugendschutz, Datenschutz und Sicherheit** entwickelt:

1. **Keine API-Schlüssel im Frontend**:
   - Der `NVIDIA_API_KEY` und Datenbank-Geheimnisse verbleiben **ausschließlich in der Serverumgebung** (Netlify Functions / Vercel Serverless / Node.js Backend).
   - Der Browser ruft nur geschützte Server-API-Endpunkte (`/api/ai/generate`) auf.
2. **Serverseitiger Inhaltsfilter**:
   - Automatische Profanity-Filter-Trigger auf Datenbankebene verhindern unangemessene Nachrichten.
3. **Schutz der Privatsphäre**:
   - Keine automatische KI-Veröffentlichung: KI-Ergebnisse sind stets **bearbeitbare Entwürfe**, die vom Nutzer erst geprüft und manuell freigegeben werden müssen.
   - Verifizierungs-System über den SV-Raum verhindert unbefugte Anmeldungen.
   - 7-Tage-Aufräumfunktion für unverifizierte Konten.
4. **Umgebungsvariablen-Sicherheit**:
   - Alle `.env`-Dateien mit echten Schlüsseln sind über `.gitignore` vom Git-Repository ausgeschlossen.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Framer Motion, Lucide Icons, Tiptap Rich Text Editor
- **Backend & Datenbank**: Supabase (PostgreSQL, Row Level Security, Auth, Realtime)
- **KI-Integration**: NVIDIA NIM Microservices (Nemotron 3.5 Lightning & Nemotron 3 Nano) über OpenAI-kompatible REST API
- **Serverless / Hosting**: Netlify Functions / Vercel Serverless API Handlers / Express Node.js Server Adapter

---

## 🚀 Erste Schritte (Lokale Entwicklung)

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/oskar26/nachhilfeb-rse.git
cd nachhilfeb-rse
npm install
```

### 2. Umgebungsvariablen konfigurieren
Erstelle eine `.env`-Datei im Stammverzeichnis basierend auf `.env.example`:

```env
# Supabase Konfiguration (Öffentlich)
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein_oeffentlicher_anon_key

# NVIDIA API Konfiguration (NUR Serverseitig – NICHT mit VITE_ prefixen!)
NVIDIA_API_KEY=nvapi-dein_nvidia_api_key
NVIDIA_LISTING_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_PARENT_BRIEFING_MODEL=nvidia/nemotron-3-nano-30b-a3b
```

> ⚠️ **Sicherheitshinweis**: Trage NIEMALS echte API-Keys in die `.env.example` ein!

### 3. Entwicklungsserver starten
```bash
npm run dev
```

### 4. Tests ausführen
```bash
node --test test/ai-drafts.test.mjs
```

### 5. Produktions-Build erstellen
```bash
npm run build
```

---

## 🌐 Deployment Options

### Netlify (Aktuell verwendet)
Die Netlify Function unter `netlify/functions/generate.js` ist vorkonfiguriert.
Trage in Netlify unter **Site configuration → Environment variables** die Schlüssel `NVIDIA_API_KEY`, `NVIDIA_LISTING_MODEL` und `NVIDIA_PARENT_BRIEFING_MODEL` ein.

### Vercel
Der Serverless API Handler unter `api/ai/generate.ts` ist vorkonfiguriert.
Trage in Vercel unter **Settings → Environment Variables** den `NVIDIA_API_KEY` ein.

### Eigener Node.js / Express Server
Verwende das mitgelieferte Adapter-Modul `src/http/express-ai-routes.mjs` in deiner eigenen Node.js-Serverdatei.

---

## 📄 Lizenz

Dieses Projekt ist für das **Friedrich-Wilhelms-Gymnasium Köln** entwickelt. Alle Rechte vorbehalten.
