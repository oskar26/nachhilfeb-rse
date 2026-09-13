<?php
// ==============================================================================
// FWG Nachhilfebörse - Reports API (Meldewesen, Moderation)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;

// ------------------------------------------------------------------------------
// 1. POST: MELDUNG ERSTELLEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();

    $reportedUserId = $data['reported_user_id'] ?? null;
    $reportedAdId = $data['reported_ad_id'] ?? null;
    $category = in_array($data['category'] ?? '', ['profil', 'anzeige', 'chat', 'datenschutz', 'sonstiges']) ? $data['category'] : 'anzeige';
    $reason = trim($data['reason'] ?? '');
    $subReason = trim($data['sub_reason'] ?? '');
    $priority = in_array($data['priority'] ?? '', ['normal', 'hoch', 'kritisch']) ? $data['priority'] : 'normal';
    $evidence = $data['evidence'] ?? [];

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
            reason, sub_reason, priority, status, evidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'open\', ?)
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
        json_encode($evidence)
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

    $stmt = $pdo->query('
        SELECT r.*,
               rep.display_name as reporter_name,
               u.display_name as reported_user_name,
               a.short_description as reported_ad_title
        FROM reports r
        JOIN profiles rep ON rep.id = r.reporter_id
        LEFT JOIN profiles u ON u.id = r.reported_user_id
        LEFT JOIN ads a ON a.id = r.reported_ad_id
        ORDER BY 
            (CASE r.status WHEN \'open\' THEN 1 WHEN \'investigating\' THEN 2 ELSE 3 END),
            r.created_at DESC
    ');
    $reports = $stmt->fetchAll();

    foreach ($reports as &$r) {
        $r['evidence'] = json_decode($r['evidence'] ?? '[]', true);
    }

    json_response($reports);
}

// ------------------------------------------------------------------------------
// 3. PATCH: MELDUNG BEARBEITEN / SCHLIESSEN (NUR SV-ADMIN)
// ------------------------------------------------------------------------------
if ($method === 'PATCH' || $method === 'PUT') {
    $admin = require_admin();
    if (!$id) {
        json_error('Report-ID erforderlich.');
    }

    $data = get_json_input();
    $status = $data['status'] ?? null;
    $resolutionType = $data['resolution_type'] ?? null;
    $adminNotes = $data['admin_notes'] ?? null;

    $fields = ['resolved_by = ?', 'resolved_at = NOW()'];
    $params = [$admin['id']];

    if ($status && in_array($status, ['open', 'investigating', 'resolved', 'dismissed'])) {
        $fields[] = 'status = ?';
        $params[] = $status;
    }
    if ($resolutionType && in_array($resolutionType, ['warn', 'ban', 'delete', 'dismiss', 'escalate'])) {
        $fields[] = 'resolution_type = ?';
        $params[] = $resolutionType;
    }
    if ($adminNotes !== null) {
        $fields[] = 'admin_notes = ?';
        $params[] = $adminNotes;
    }

    $params[] = $id;
    $pdo->prepare('UPDATE reports SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

    json_response(['message' => 'Meldung erfolgreich aktualisiert.']);
}

json_error('Methode nicht erlaubt.', 405);
