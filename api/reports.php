<?php
// ==============================================================================
// FWG Nachhilfebörse - Reports API (Meldewesen, Moderation)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';

cors_headers();

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;

// Auto-Migrationen: Melde-Assistent-Details + Anzeigentitel (MariaDB,
// mehrfach ausführbar; ältere Datenbanken bleiben ohne manuellen Import nutzbar).
try {
    $pdo->exec("ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT NULL");
} catch (Exception $e) {}
try {
    $pdo->exec("ALTER TABLE reports ADD COLUMN IF NOT EXISTS related_message_ids JSON NULL");
} catch (Exception $e) {}
try {
    $pdo->exec("ALTER TABLE ads ADD COLUMN IF NOT EXISTS title VARCHAR(120) NULL AFTER user_id");
} catch (Exception $e) {}

// ------------------------------------------------------------------------------
// Helfer
// ------------------------------------------------------------------------------

/**
 * Liest einen skalaren Textwert defensiv ein (keine Arrays/Objekte) und
 * begrenzt ihn auf die angegebene Länge.
 */
function fwg_reports_text($value, int $maxLength): string {
    if (!is_string($value) && !is_int($value) && !is_float($value)) {
        return '';
    }
    return mb_substr(trim((string)$value), 0, $maxLength);
}

/**
 * Meldungsgrund inkl. Untergrund als ein Satz für Warnung/E-Mail.
 */
function fwg_reports_reason_text(array $report): string {
    $reason = trim((string)($report['reason'] ?? ''));
    $subReason = trim((string)($report['sub_reason'] ?? ''));

    if ($subReason !== '' && ($reason === '' || mb_stripos($reason, $subReason) === false)) {
        $reason = $reason === '' ? $subReason : $reason . ' – ' . $subReason;
    }
    if ($reason === '') {
        $reason = 'Verstoß gegen die Nutzungsbedingungen';
    }
    return mb_substr($reason, 0, 500);
}

/**
 * Ermittelt den betroffenen Nutzer einer Meldung. Fallback auf den
 * Anzeigen-Eigentümer, wenn nur eine Anzeige gemeldet wurde.
 */
function fwg_reports_target(PDO $pdo, array $report): ?array {
    $targetId = trim((string)($report['reported_user_id'] ?? ''));

    if ($targetId === '' && !empty($report['reported_ad_id'])) {
        try {
            $stmt = $pdo->prepare('SELECT user_id FROM ads WHERE id = ? LIMIT 1');
            $stmt->execute([(string)$report['reported_ad_id']]);
            $targetId = trim((string)$stmt->fetchColumn());
        } catch (Exception $e) {
            error_log('Report target lookup failed: ' . $e->getMessage());
        }
    }

    if ($targetId === '') {
        return null;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT u.id, u.email,
                   COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Schüler/in') AS display_name
            FROM users u
            LEFT JOIN profiles p ON p.id = u.id
            WHERE u.id = ?
            LIMIT 1
        ");
        $stmt->execute([$targetId]);
        $row = $stmt->fetch();
        if ($row) {
            return $row;
        }
    } catch (Exception $e) {
        error_log('Report target profile lookup failed: ' . $e->getMessage());
    }

    return ['id' => $targetId, 'email' => null, 'display_name' => 'Schüler/in'];
}

/**
 * In-App-Benachrichtigung. Fehler dürfen die Moderation nicht verhindern.
 */
function fwg_reports_notify(PDO $pdo, string $userId, string $type, string $title, string $message, array $data = []): void {
    try {
        $pdo->prepare('
            INSERT INTO notifications (id, user_id, type, title, message, data)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([
            generate_uuid(),
            $userId,
            mb_substr($type, 0, 50),
            mb_substr($title, 0, 255),
            $message,
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        ]);
    } catch (Exception $e) {
        error_log('Report notification failed: ' . $e->getMessage());
    }
}

/**
 * E-Mail-Verwarnung mit dem Meldungsgrund (kein eigenes Template in mailer.php).
 */
function fwg_reports_send_warning_email(?string $email, string $displayName, string $reason): bool {
    if (empty($email)) {
        return false;
    }

    $html = render_email_template([
        'category' => 'VERWARNUNG',
        'category_bg' => '#FEE2E2',
        'category_color' => '#991B1B',
        'title' => 'Verwarnung durch die SV',
        'subtitle' => 'Bitte beachte die Regeln der Nachhilfebörse.',
        'preheader' => 'Dein Konto wurde wegen eines gemeldeten Inhalts verwarnt.',
        'greeting' => "Hallo $displayName,",
        'body_html' => '
            Dein Konto auf der FWG Nachhilfebörse wurde von der Schülervertretung (SV) verwarnt,
            weil ein gemeldeter Inhalt gegen die Nutzungsregeln verstößt.<br><br>
            Bitte achte künftig auf ein respektvolles Miteinander. Bei weiteren Verstößen
            können wir dein Konto vorübergehend oder dauerhaft sperren.
        ',
        'quote_box' => [
            'title' => 'Grund der Meldung',
            'content' => $reason
        ],
        'cta_text' => 'Zur Nachhilfebörse',
        'cta_url' => APP_URL
    ]);

    return send_html_email($email, 'Verwarnung – FWG Nachhilfebörse', $html);
}

// ------------------------------------------------------------------------------
// 1. POST: MELDUNG ERSTELLEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();

    $reportedUserId = fwg_reports_text($data['reported_user_id'] ?? '', 64);
    $reportedAdId = fwg_reports_text($data['reported_ad_id'] ?? '', 64);
    $reportedUserId = $reportedUserId !== '' ? $reportedUserId : null;
    $reportedAdId = $reportedAdId !== '' ? $reportedAdId : null;

    $category = in_array($data['category'] ?? '', ['profil', 'anzeige', 'chat', 'datenschutz', 'sonstiges'], true) ? $data['category'] : 'anzeige';
    $reason = fwg_reports_text($data['reason'] ?? '', 1000);
    $subReason = fwg_reports_text($data['sub_reason'] ?? '', 500);
    $description = fwg_reports_text($data['description'] ?? '', 5000);
    $priority = in_array($data['priority'] ?? '', ['normal', 'hoch', 'kritisch'], true) ? $data['priority'] : 'normal';
    $evidence = $data['evidence'] ?? [];
    if (!is_array($evidence)) {
        $evidence = [];
    }

    // Nachrichten-IDs aus dem Melde-Assistenten (max. 50, dedupliziert).
    $relatedMessageIds = [];
    $rawRelated = $data['related_message_ids'] ?? [];
    if (!is_array($rawRelated)) {
        json_error('related_message_ids muss ein Array von Nachrichten-IDs sein.');
    }
    if (count($rawRelated) > 50) {
        json_error('Es können höchstens 50 Nachrichten mit einer Meldung verknüpft werden.');
    }
    foreach ($rawRelated as $messageId) {
        if (!is_string($messageId) && !is_int($messageId)) {
            continue;
        }
        $messageId = mb_substr(trim((string)$messageId), 0, 64);
        if ($messageId !== '' && !in_array($messageId, $relatedMessageIds, true)) {
            $relatedMessageIds[] = $messageId;
        }
    }

    if (empty($reason)) {
        json_error('Ein Grund für die Meldung ist erforderlich.');
    }
    if (!$reportedUserId && !$reportedAdId) {
        json_error('Es muss ein gemeldeter Nutzer oder eine gemeldete Anzeige angegeben werden.');
    }

    $reportId = generate_uuid();
    $insert = $pdo->prepare('
        INSERT INTO reports (
            id, reporter_id, reported_user_id, reported_ad_id, category,
            reason, sub_reason, priority, status, evidence, description,
            related_message_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'open\', ?, ?, ?)
    ');
    $insert->execute([
        $reportId,
        $user['id'],
        $reportedUserId,
        $reportedAdId,
        $category,
        $reason,
        $subReason,
        $priority,
        json_encode($evidence),
        $description !== '' ? $description : null,
        !empty($relatedMessageIds)
            ? json_encode($relatedMessageIds, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            : null
    ]);

    json_response([
        'id' => $reportId,
        'message' => 'Meldung wurde erfolgreich an die SV übermittelt. Vielen Dank!'
    ], 201);
}

// ------------------------------------------------------------------------------
// 2. GET: MELDUNGEN ABRUFEN (NUR SV-ADMIN)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    require_admin();

    // Für die Nutzer-Akte im Admin-Panel: alle Meldungen gegen eine Person,
    // unabhängig vom Status. Die Historie bleibt bis zur Kontolöschung erhalten.
    $reportedUserId = trim((string)($_GET['reported_user_id'] ?? ''));
    $whereSql = $reportedUserId !== '' ? 'WHERE r.reported_user_id = ?' : '';
    $params = $reportedUserId !== '' ? [$reportedUserId] : [];

    $stmt = $pdo->prepare('
        SELECT r.*,
               rep.display_name as reporter_name,
               u.display_name as reported_user_name,
               COALESCE(a.title, a.short_description) as reported_ad_title
        FROM reports r
        JOIN profiles rep ON rep.id = r.reporter_id
        LEFT JOIN profiles u ON u.id = r.reported_user_id
        LEFT JOIN ads a ON a.id = r.reported_ad_id
        ' . $whereSql . '
        ORDER BY 
            (CASE r.status WHEN \'open\' THEN 1 WHEN \'investigating\' THEN 2 ELSE 3 END),
            r.created_at DESC
        LIMIT 200
    ');
    $stmt->execute($params);
    $reports = $stmt->fetchAll();

    foreach ($reports as &$r) {
        $r['evidence'] = json_decode($r['evidence'] ?? '[]', true);
        if (!is_array($r['evidence'])) {
            $r['evidence'] = [];
        }

        $related = $r['related_message_ids'] ?? null;
        if (is_string($related) && $related !== '') {
            $related = json_decode($related, true);
        }
        $r['related_message_ids'] = is_array($related) ? array_values($related) : [];
    }
    unset($r);

    json_response($reports);
}

// ------------------------------------------------------------------------------
// 3. PATCH: MELDUNG BEARBEITEN / SCHLIESSEN (NUR SV-ADMIN)
// ------------------------------------------------------------------------------
// Unterstützte Felder:
//   status           open|investigating|resolved|dismissed
//   resolution_type  warn|ban|delete|dismiss|escalate
//   admin_notes      interne Notiz (max. 2000)
//   priority         normal|hoch|kritisch
//   ban_type         temporary|permanent (nur bei resolution_type=ban)
//   ban_days         Tage für temporäre Sperre (Standard 7)
//   ban_reason       eigener Sperrgrund (Standard: Meldungsgrund)
// resolved_by/resolved_at werden serverseitig aus dem Admin-Token gesetzt.
if ($method === 'PATCH' || $method === 'PUT') {
    $admin = require_admin();
    if (!$id) {
        json_error('Report-ID erforderlich.');
    }

    $data = get_json_input();
    $status = $data['status'] ?? null;
    $resolutionType = $data['resolution_type'] ?? null;
    $adminNotes = $data['admin_notes'] ?? null;
    $priority = $data['priority'] ?? null;

    if ($status !== null && !in_array($status, ['open', 'investigating', 'resolved', 'dismissed'], true)) {
        json_error('Ungültiger Status.');
    }
    if ($resolutionType !== null && !in_array($resolutionType, ['warn', 'ban', 'delete', 'dismiss', 'escalate'], true)) {
        json_error('Ungültige Lösungsart.');
    }
    if ($priority !== null && !in_array($priority, ['normal', 'hoch', 'kritisch'], true)) {
        json_error('Ungültige Priorität.');
    }

    // Echte Moderationsaktionen schließen die Meldung auch dann, wenn der
    // Client (anders als die Admin-UI) keinen status mitschickt.
    $effectiveStatus = $status;
    if ($effectiveStatus === null && in_array($resolutionType, ['warn', 'ban', 'delete'], true)) {
        $effectiveStatus = 'resolved';
    }

    $reportStmt = $pdo->prepare('SELECT * FROM reports WHERE id = ? LIMIT 1');
    $reportStmt->execute([$id]);
    $report = $reportStmt->fetch();
    if (!$report) {
        json_error('Meldung nicht gefunden.', 404);
    }

    // Aktionen nur einmal pro Meldung anwenden (wiederholte PATCH-Aufrufe zum
    // Speichern der Admin-Notizen dürfen keine zweite Warnung/E-Mail auslösen).
    $applyAction = $resolutionType !== null
        && !((($report['resolution_type'] ?? null) === $resolutionType)
            && in_array((string)($report['status'] ?? ''), ['resolved', 'dismissed'], true));

    $target = null;
    if ($applyAction && in_array($resolutionType, ['warn', 'ban', 'delete'], true)) {
        $target = fwg_reports_target($pdo, $report);
        if ($resolutionType === 'ban' && $target && (string)$target['id'] === (string)$admin['id']) {
            json_error('Du kannst dich nicht selbst sperren.', 400);
        }
    }

    // Ban-Parameter vor der Transaktion validieren.
    $banType = 'temporary';
    $banDays = 7;
    $banReason = '';
    if ($applyAction && $resolutionType === 'ban') {
        $banType = in_array($data['ban_type'] ?? '', ['temporary', 'permanent'], true)
            ? (string)$data['ban_type']
            : 'temporary';
        if (isset($data['ban_days']) && is_numeric($data['ban_days'])) {
            $banDays = max(1, min(3650, (int)$data['ban_days']));
        }
        $banReason = fwg_reports_text($data['ban_reason'] ?? '', 500);
        if ($banReason === '') {
            $banReason = 'Verstoß gegen die Nutzungsbedingungen: ' . fwg_reports_reason_text($report);
        }
        $banReason = mb_substr($banReason, 0, 500);
    }

    $fields = ['resolved_by = ?', 'resolved_at = NOW()'];
    $params = [$admin['id']];

    if ($effectiveStatus !== null) {
        $fields[] = 'status = ?';
        $params[] = $effectiveStatus;
    }
    if ($resolutionType !== null) {
        $fields[] = 'resolution_type = ?';
        $params[] = $resolutionType;
    }
    if ($priority !== null) {
        $fields[] = 'priority = ?';
        $params[] = $priority;
    }
    if ($adminNotes !== null) {
        $fields[] = 'admin_notes = ?';
        $params[] = fwg_reports_text($adminNotes, 2000);
    }

    $warningEmail = null;
    $warningEmailSent = false;
    $actionResult = null;

    $pdo->beginTransaction();
    try {
        if ($applyAction) {
            switch ($resolutionType) {
                case 'warn':
                    if ($target) {
                        $reasonText = fwg_reports_reason_text($report);
                        fwg_reports_notify(
                            $pdo,
                            (string)$target['id'],
                            'warning',
                            'Verwarnung durch die SV',
                            'Dein Konto wurde wegen eines gemeldeten Verstoßes verwarnt. Grund: ' . $reasonText,
                            ['report_id' => $id, 'link' => '/#/profile']
                        );

                        if (!empty($target['email'])) {
                            $warningEmail = [
                                'email' => (string)$target['email'],
                                'name' => (string)$target['display_name'],
                                'reason' => $reasonText,
                            ];
                        }
                        $actionResult = [
                            'action' => 'warn',
                            'target_user_id' => (string)$target['id'],
                            'email_queued' => $warningEmail !== null,
                        ];
                    } else {
                        $actionResult = ['action' => 'warn', 'skipped' => 'no_target'];
                    }
                    break;

                case 'ban':
                    if ($target) {
                        if ($banType === 'permanent') {
                            $pdo->prepare("
                                UPDATE profiles
                                SET is_banned = 1, ban_type = 'permanent', ban_reason = ?, banned_until = NULL
                                WHERE id = ?
                            ")->execute([$banReason, $target['id']]);
                            $banUntilText = 'dauerhaft';
                        } else {
                            // $banDays ist auf 1–3650 begrenzt (Integer), daher sicher
                            // als Intervall-Literal einsetzbar; alle Werte sonst per ?.
                            $pdo->prepare("
                                UPDATE profiles
                                SET is_banned = 1, ban_type = 'temporary', ban_reason = ?,
                                    banned_until = DATE_ADD(NOW(), INTERVAL $banDays DAY)
                                WHERE id = ?
                            ")->execute([$banReason, $target['id']]);
                            $banUntilText = 'für ' . $banDays . ' Tage';
                        }

                        fwg_reports_notify(
                            $pdo,
                            (string)$target['id'],
                            'ban',
                            'Dein Konto wurde gesperrt',
                            'Dein Konto wurde ' . $banUntilText . ' gesperrt. Grund: ' . $banReason,
                            [
                                'report_id' => $id,
                                'ban_type' => $banType,
                                'ban_days' => $banType === 'permanent' ? null : $banDays,
                                'link' => '/#/'
                            ]
                        );

                        $actionResult = [
                            'action' => 'ban',
                            'target_user_id' => (string)$target['id'],
                            'ban_type' => $banType,
                            'ban_days' => $banType === 'permanent' ? null : $banDays,
                        ];
                    } else {
                        $actionResult = ['action' => 'ban', 'skipped' => 'no_target'];
                    }
                    break;

                case 'delete':
                    $deletedMessages = 0;
                    $deletedAd = false;
                    $deletedAdTitle = null;

                    // Verknüpfte Chat-Nachrichten löschen (max. 50).
                    $related = $report['related_message_ids'] ?? null;
                    if (is_string($related) && $related !== '') {
                        $related = json_decode($related, true);
                    }
                    $messageIds = [];
                    if (is_array($related)) {
                        foreach ($related as $messageId) {
                            if (!is_string($messageId) && !is_int($messageId)) {
                                continue;
                            }
                            $messageId = mb_substr(trim((string)$messageId), 0, 64);
                            if ($messageId !== '') {
                                $messageIds[] = $messageId;
                            }
                            if (count($messageIds) >= 50) {
                                break;
                            }
                        }
                    }
                    if (!empty($messageIds)) {
                        $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
                        $deleteMessages = $pdo->prepare("DELETE FROM messages WHERE id IN ($placeholders)");
                        $deleteMessages->execute($messageIds);
                        $deletedMessages = $deleteMessages->rowCount();
                    }

                    // Gemeldete Anzeige hart löschen. Wichtig: reports.reported_ad_id
                    // hat ON DELETE CASCADE – vorher alle Bezüge auf NULL setzen,
                    // damit die Meldung (inkl. Admin-Notizen) erhalten bleibt.
                    $reportedAdId = trim((string)($report['reported_ad_id'] ?? ''));
                    if ($reportedAdId !== '') {
                        $adStmt = $pdo->prepare('SELECT COALESCE(title, short_description) AS ad_title FROM ads WHERE id = ? LIMIT 1');
                        $adStmt->execute([$reportedAdId]);
                        $adTitle = $adStmt->fetchColumn();

                        if ($adTitle !== false) {
                            $deletedAdTitle = (string)$adTitle;
                            $pdo->prepare('UPDATE reports SET reported_ad_id = NULL WHERE reported_ad_id = ?')
                                ->execute([$reportedAdId]);
                            $pdo->prepare('DELETE FROM ads WHERE id = ?')->execute([$reportedAdId]);
                            $deletedAd = true;
                        }
                    }

                    if ($target && ($deletedAd || $deletedMessages > 0)) {
                        $reasonText = fwg_reports_reason_text($report);
                        fwg_reports_notify(
                            $pdo,
                            (string)$target['id'],
                            'moderation',
                            'Inhalt wurde entfernt',
                            'Ein Inhalt von dir wurde wegen eines Verstoßes entfernt. Grund: ' . $reasonText,
                            ['report_id' => $id, 'link' => '/#/']
                        );
                    }

                    $actionResult = [
                        'action' => 'delete',
                        'deleted_ad' => $deletedAd,
                        'deleted_ad_title' => $deletedAdTitle,
                        'deleted_messages' => $deletedMessages,
                        'target_user_id' => $target ? (string)$target['id'] : null,
                    ];
                    break;

                case 'dismiss':
                case 'escalate':
                    // Bestehendes Verhalten: nur resolution_type/Status speichern.
                    $actionResult = ['action' => $resolutionType, 'applied' => true];
                    break;
            }
        }

        $params[] = $id;
        $pdo->prepare('UPDATE reports SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

        fwg_audit($pdo, $admin['id'], 'report_moderate', 'report', $id, [
            'status' => $effectiveStatus,
            'resolution_type' => $resolutionType,
            'priority' => $priority,
            'action_applied' => $applyAction,
            'action_result' => $actionResult,
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Report moderation failed: ' . $e->getMessage());
        json_error('Meldung konnte nicht aktualisiert werden. Bitte später erneut versuchen.', 500);
    }

    // E-Mail erst nach erfolgreichem Commit senden (DB-Aktion bleibt atomar).
    if ($warningEmail !== null) {
        try {
            $warningEmailSent = fwg_reports_send_warning_email(
                $warningEmail['email'],
                $warningEmail['name'],
                $warningEmail['reason']
            );
            if (!$warningEmailSent) {
                error_log('Warn-E-Mail konnte nicht versendet werden (Report ' . $id . ').');
            }
        } catch (Exception $e) {
            error_log('Warn-E-Mail fehlgeschlagen (Report ' . $id . '): ' . $e->getMessage());
        }
    }

    $response = ['message' => 'Meldung erfolgreich aktualisiert.'];
    if ($actionResult !== null) {
        $response['action'] = $actionResult;
    }
    if ($warningEmail !== null) {
        $response['warning_email_sent'] = $warningEmailSent;
    }

    json_response($response);
}

json_error('Methode nicht erlaubt.', 405);
