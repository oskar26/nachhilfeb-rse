<?php
// Prüft die reine Entscheidungslogik der Eltern-Einwilligung ohne Datenbank.

require_once __DIR__ . '/../api/parental-consent.php';

$failures = 0;

function fwg_check_consent_case(string $label, bool $expected, bool $actual): void {
    global $failures;
    if ($expected === $actual) {
        fwrite(STDOUT, "PASS  {$label}\n");
        return;
    }
    $failures++;
    fwrite(STDERR, sprintf(
        "FAIL  %s (erwartet: %s, tatsächlich: %s)\n",
        $label,
        $expected ? 'erlaubt' : 'gesperrt',
        $actual ? 'erlaubt' : 'gesperrt'
    ));
}

// Erwachsene sind von der Eltern-Einwilligung nicht betroffen.
fwg_check_consent_case(
    'Erwachsene/r ohne Flag ist erlaubt',
    true,
    fwg_parental_consent_allows(false, false, null)
);

// Unter 16 ohne gesetztes Flag bleibt gesperrt.
fwg_check_consent_case(
    'Unter 16 ohne Flag ist gesperrt',
    false,
    fwg_parental_consent_allows(true, false, null)
);

// Bestandskonten: Flag gesetzt, aber noch keine parental_consents-Zeile.
fwg_check_consent_case(
    'Unter 16 mit Flag und ohne Zeile ist erlaubt',
    true,
    fwg_parental_consent_allows(true, true, null)
);

// Regulär bestätigte Einwilligung.
fwg_check_consent_case(
    'Unter 16 mit Flag und bestätigter Zeile ist erlaubt',
    true,
    fwg_parental_consent_allows(true, true, ['confirmed_at' => '2026-11-14 12:00:00'])
);

// Eingeleitet, aber noch nicht bestätigt.
fwg_check_consent_case(
    'Unter 16 mit Flag und unbestätigter Zeile ist gesperrt',
    false,
    fwg_parental_consent_allows(true, true, ['confirmed_at' => null])
);

if ($failures > 0) {
    fwrite(STDERR, sprintf("%d Prüfung(en) fehlgeschlagen.\n", $failures));
    exit(1);
}

fwrite(STDOUT, "Alle Eltern-Einwilligungs-Prüfungen bestanden.\n");
exit(0);
