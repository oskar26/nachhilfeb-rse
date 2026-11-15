<?php
// ==============================================================================
// FWG Nachhilfebörse - Eltern-Einwilligung (reine Entscheidungslogik)
// ==============================================================================

/**
 * Entscheidet, ob die Eltern-Einwilligung die Nutzung erlaubt.
 *
 * - Ab 16 ist die Einwilligung irrelevant.
 * - Unter 16 ohne gesetztes Flag: gesperrt.
 * - Unter 16 mit Flag, aber ohne Zeile in parental_consents: Bestandskonten,
 *   die vor Einführung der Tabelle bestätigt wurden, bleiben zugelassen.
 * - Unter 16 mit Flag und Zeile: nur mit bestätigtem confirmed_at zugelassen.
 *
 * Diese Funktion ist bewusst frei von Datenbankzugriffen; Aufrufer entscheiden
 * bei Lesefehlern fail-closed, bevor sie sie aufrufen.
 */
function fwg_parental_consent_allows(bool $isUnder16, bool $given, ?array $consentRow): bool {
    if (!$isUnder16) {
        return true;
    }
    if (!$given) {
        return false;
    }
    if ($consentRow === null) {
        return true;
    }
    return !empty($consentRow['confirmed_at']);
}
