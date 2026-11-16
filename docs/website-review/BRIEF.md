# Surface brief — Landing page (Nachhilfebörse FWG)

## Auftrag

Die öffentliche Startseite der Nachhilfebörse so umbauen, dass sie zur neuen
App-Oberfläche (ui-design-v2) gehört, das Produkt zeigt und Familien in unter
einer Minute verstehen lässt, was die Börse ist und was der nächste Schritt ist.
Die App selbst bleibt unangetastet.

## Publikum

- **Schüler:innen, Klasse 5–13** (primär): suchen Nachhilfe oder wollen selbst
  Nachhilfe geben. Sie wollen schnell sehen, ob es jemanden für ihr Fach gibt,
  ob die Person vertrauenswürdig ist und wie viel es kostet.
- **Eltern, besonders Klasse 5–7** (sekundär): fragen zuerst nach Sicherheit,
  Aufsicht, Kosten und Kontakt. Sie brauchen keine Werbung, sondern klare
  Fakten und einen Weg zu einer echten Ansprechperson.
- **SV-Team**: betreibt die Börse, verifiziert Konten und moderiert Meldungen.

## Eine Hauptaktion

Kostenlos registrieren (`/login?mode=register`). Alles andere ist Nebenweg:
Eltern-Leitfaden, Coaching-AG, Anmelden.

## Direction contract

**THESIS.** Die Startseite ist der ruhigste, klarste Bildschirm der
Nachhilfebörse: ein Produktbeweis statt einer Plakatwand, ein nächster Schritt
statt zehn gleich lauter Kacheln.

**OWN-WORLD.** Plus Jakarta Sans, `#f5f6f8` Papier, weiße Karten mit 1-px-Rand
und weichem Schatten, Tinte `#18181b`, Gelb `#facc15` ausschließlich für die
primäre Aktion und die Coaching-Fläche. Pastellfarben nur als Bühne hinter
echten App-Screenshots. Keine Verläufe, kein Glasschmuck, keine schrägen
Karten, keine verschachtelten Karten, keine Kicker über Überschriften.

**STORY.** Erst das Versprechen (Nachhilfe, die am FWG bleibt), dann der
Beweis (echte Screens), dann der Weg hinein (drei Schritte), dann die zwei
Rollen (suchen / geben), dann die Elternfragen, dann Coaching und FAQ.

**FIRST VIEWPORT.** H1 „Nachhilfe, die am FWG bleibt.“; ein Satz Support;
gelbe primäre Aktion „Kostenlos registrieren“; sekundär „So funktioniert’s“;
vier ruhige Vertrauenszeilen; rechts ein echter Laptop-Screenshot der
Anzeigenübersicht, frei auf dem Seitenhintergrund und ohne Bühne. Die
Bildunterschrift steht im Textfluss. Keine erfundenen Anzeigenkarten, keine
Namen, keine Zahlen.

**FORM.** Code-geführt. Bestehende Tokens, `Button`, `DeviceFrame`,
`VerifySteps`, `Reveal`, `SiteHeader` und `Switch` werden wiederverwendet.
`seed: none (unavailable)`.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.

## Seitenaufbau (wie gebaut)

1. Header (geteilt mit den Unterseiten), ein schwarzer „Anmelden“-Pill.
2. Hero mit Produktvisual, einer primären und einer sekundären Aktion.
3. „In drei Schritten dabei.“ — Verifizierung als Timeline, Einwilligung
   unter 16, Weg zum Eltern-Leitfaden.
4. „Die Börse, wie sie wirklich aussieht.“ — drei echte Screens: Feed, Chat,
   Einstellungen.
5. „Zwei Wege, ein Ziel.“ — suchen und geben in einer Fläche, getrennt durch
   Linien statt durch zwei Karten.
6. „Für Eltern.“ — vier Fakten, zwei Aktionen, dazu eine echte
   Sichtbarkeits-Einstellung zum Ausprobieren (Beispiel, speichert nichts).
7. „Die Coaching-AG am FWG.“ — eine gelbe Fläche, Fakten als Liste.
8. „Häufige Fragen.“ — sieben echte Fragen mit kurzen, wahren Antworten.
9. Abschlussaktion.
10. Footer mit Kontakt, Produkt- und Rechtslinks.

## Inhaltliche Regeln

- Keine erfundenen Testimonials, Namen, Zahlen oder Logos. Die Screenshots
  zeigen die App mit ihren Demo-Daten.
- Preise: 12 € pro 45 Minuten (16 €/h) ist ein Richtwert, keine Gebühr der
  Börse. Keine Zahlungen, keine Provision.
- Verifizierung: Konto anlegen, im SV-Raum persönlich vorstellen, freischalten.
- Telefonnummer und Moodle-Name erst nach angenommener Anfrage sichtbar.
- Alle bestehenden Rechtsseiten und Links bleiben unverändert erreichbar.

## Nicht-Ziele

- Die App, ihre Daten oder ihre übrigen Seiten umbauen.
- Neue Features behaupten (keine Zahlungsfunktion, keine Garantie auf
  Vermittlung, keine Erfolgsquote).
- Die Unterseiten (Impressum, Datenschutz, Coaching …) neu gestalten; sie
  erben nur den geteilten Header.

## Offene Entscheidungen

- Ein echtes 1200×630-OG-Bild fehlt; aktuell dient das 512er-Logo als
  Social-Preview. Ein Foto der SV oder ein Screenshot-Motiv müsste vom Team
  freigegeben werden.
- Echte Stimmen von Schüler:innen oder Eltern liegen nicht vor. Lieber leer
  lassen als erfinden.
- Der große JS-Bundle der App bestimmt den LCP; das ist nicht auf der
  Startseite allein lösbar.
