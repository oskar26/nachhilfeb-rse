# E-Mail-Deliverability – FWG Nachhilfebörse (ALL-INKL KAS)

Stand: 2026-10-05. Gilt für den Versand über `api/mailer.php` (PHP `mail()`,
Envelope-Sender `anmeldung@nachhilfe-sv.de`, From-Domain `nachhilfe-sv.de`).

## Ausgangslage

- Versandweg: PHP `mail()` auf dem ALL-INKL Webserver (sendmail des Hosters),
  fünfter Parameter `-f anmeldung@nachhilfe-sv.de`.
- From: `anmeldung@nachhilfe-sv.de`, Reply-To: `info@nachhilfe-sv.de`.
- Mailer baut jetzt `multipart/alternative` (text/plain + text/html, UTF-8,
  base64). Das verbessert Spam-Scores spürbar, ersetzt aber keine DNS-Authentifizierung.
- Diese Datei ist die Checkliste für das KAS; alles mit „im KAS prüfen“ ist
  hosterseitig und kann nur dort eingestellt oder bestätigt werden.

## 1. SPF (Pflicht)

- [ ] Im KAS einloggen → **Tools → DNS-Einstellungen** → Domain
  `nachhilfe-sv.de` bearbeiten.
- [ ] Pro Domain darf es **nur einen** SPF-Eintrag geben. Existiert bereits
  einer, diesen bearbeiten statt einen zweiten anzulegen.
- [ ] Von ALL-INKL dokumentierter Eintrag (TXT, Name leer):
  `v=spf1 a mx include:spf.kasserver.com ~all`
- [ ] Kein `-all` verwenden, solange nicht sicher ist, dass wirklich alle
  legitimen Sender (inkl. späterer Dienste) erfasst sind; `~all` ist der
  dokumentierte Standard.
- [ ] Prüfen, ob weitere Dienste (Newsletter, Formulare, externe Tools) über
  diese Domain senden – deren Includes ergänzen, sonst landen sie im Spam.
- [ ] Nach dem Setzen prüfen (z. B. `dig TXT nachhilfe-sv.de` oder
  mail-tester.com).

## 2. DKIM (stark empfohlen)

- [ ] Im KAS prüfen, ob für die Domain bereits DKIM-Signierung aktiv ist
  (Domain-Einstellungen bzw. E-Mail-Verwaltung). ALL-INKL liefert die
  DNS-Verwaltung; ob der Mailausgang für `mail()` automatisch signiert,
  ist tarif-/setupabhängig und **hosterseitig zu bestätigen**.
- [ ] Falls KAS eine Option „DKIM aktivieren“ anbietet: aktivieren und den
  angezeigten DNS-Eintrag (Selector z. B. `mail._domainkey`) im KAS
  übernehmen lassen.
- [ ] Achtung: Die ALL-INKL-Anleitung „DKIM bei Versand über externe
  Mailserver“ beschreibt einen manuell eingetragenen öffentlichen Schlüssel.
  Diesen **nicht** blind eintragen – der private Schlüssel muss zum
  tatsächlich sendenden Server passen.
- [ ] Falls DKIM über KAS für `mail()` nicht verfügbar ist: Support fragen.
  Übergangslösung wäre SMTP-Versand über ein Postfach mit DKIM (nicht Teil
  dieses Mailers).
- [ ] Ergebnis mit mail-tester.com oder `check-auth@verifier.port25.com`
  verifizieren (DKIM = pass).

## 3. DMARC (nach SPF/DKIM)

- [ ] TXT-Record `_dmarc.nachhilfe-sv.de` anlegen, **Start mit Monitoring**:
  `v=DMARC1; p=none; rua=mailto:info@nachhilfe-sv.de; fo=1;`
- [ ] `rua`-Postfach muss existieren und gelesen werden (Reports!).
- [ ] 2–4 Wochen Reports beobachten, dann auf `p=quarantine` erhöhen.
- [ ] Erst wenn alles sauber ist: `p=reject`.
- [ ] Kein `p=reject` von Anfang an (Gefahr, legitime Mails zu verlieren).

## 4. Envelope / From / Domain-Konsistenz

- [ ] From-Domain, Envelope-Domain (`-f`) und SPF-/DKIM-Domain identisch
  halten: `nachhilfe-sv.de`.
- [ ] `MAIL_FROM_EMAIL` in `api/config.php` nicht auf fremde Domains ändern.
- [ ] `MAIL_REPLY_TO` (`info@nachhilfe-sv.de`) muss ein reales Postfach sein.
- [ ] Kein Display-Name-Spoofing, keine wechselnden Absenderadressen.

## 5. Zustellbarkeit testen

- [ ] mail-tester.com: Testmail über den SV-Admin-Testmail-Endpunkt senden,
  Ziel 9–10/10. Wiederholen nach jeder DNS-Änderung.
- [ ] Google Postmaster Tools einrichten (nach nennenswertem Volumen) für
  Reputation/Spam-Rate.
- [ ] Gmail/Outlook/Web.de/GMX-Testkonten: Posteingang statt Spam prüfen,
  Text- und HTML-Teil ansehen, Links klicken.
- [ ] Prüfen, dass der `List-Unsubscribe`-Header (mailto) korrekt ankommt.

## 6. Warmup und Versandverhalten

- [ ] Volumen langsam steigern (kein Massenversand am ersten Tag).
- [ ] Ankündigungen (`send_email_announcement`) in Wellen versenden, nicht
  als ein großer Schwall.
- [ ] Bounces zeitnah auswerten und ungültige Adressen aussortieren.
- [ ] Beschwerdequote unter 0,1 % halten; bei Beschwerden sofort reagieren.

## 7. Spam-Wort- und Inhaltscheck

- [ ] Keine Ausrufezeichen-Ketten, kein „GRATIS“, keine Dauer-Großschreibung
  im Betreff.
- [ ] Links sparsam und auf die eigene Domain; ausgewogenes Text/HTML-Verhältnis
  (der text/plain-Teil des Mailers erfüllt das).
- [ ] Vor dem Versand großer Ankündigungen Betreff/Text durch einen
  Spam-Wort-Checker laufen lassen.

## 8. Feedback-Loop / Monitoring

- [ ] Bei ALL-INKL fragen, ob ein FBL/Postmaster-Kontakt für die Domain
  existiert; Beschwerden dorthin leiten lassen.
- [ ] DMARC-`rua`-Reports regelmäßig sichten.
- [ ] Nach Änderungen an `api/mailer.php`: mail-tester.com erneut prüfen.

## Was der Mailer selbst bereits liefert (2026-10-05)

- `multipart/alternative` mit text/plain zuerst, dann text/html, UTF-8 base64.
- Header: `MIME-Version`, `Date`, `Message-ID` (UUID@Domain), `From`
  (RFC-2047-Name), `Reply-To`, `List-Unsubscribe: <mailto:…?subject=Abmelden>`.
- Kein `X-Priority`, kein `X-Mailer`; kein `List-Unsubscribe-Post` (es gibt
  keinen HTTPS-One-Click-Endpoint).
- Header-Werte gegen CR/LF-Injection bereinigt, Betreff RFC-2047-kodiert.
- Envelope-Sender weiterhin per `-f anmeldung@nachhilfe-sv.de`.

## Offene Punkte

- DKIM-Verfügbarkeit für `mail()` bei ALL-INKL (im KAS/Support klären).
- Ob SPF in der eigenen DNS-Zone gepflegt werden kann oder über
  „Zone zurücksetzen“ gesetzt werden muss (im KAS prüfen).
- DMARC-Record ist noch nicht angelegt (Schritt 3).
