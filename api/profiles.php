<?php
// ==============================================================================
// FWG Nachhilfebörse - Profiles API (Get, Update, Public Profile, Coach AG)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

// Auto-migration helper for is_coach and availability columns
try {
    $pdo->query("SELECT is_coach, availability FROM profiles LIMIT 0");
} catch (Exception $e) {
    try {
        $pdo->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_coach TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Exception $ex) {}
    try {
        $pdo->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability JSON DEFAULT NULL");
    } catch (Exception $ex) {}
}

// Auto-Migration: app_settings Tabelle
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_settings (
            setting_key VARCHAR(64) PRIMARY KEY,
            setting_value LONGTEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by VARCHAR(36) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $ex) {}

// Auto-Migration: parent_link_code Spalte (Eltern-Verknüpfungscode)
try {
    $pdo->query("SELECT parent_link_code FROM profiles LIMIT 0");
} catch (Exception $e) {
    try {
        $pdo->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_link_code VARCHAR(10) NULL");
    } catch (Exception $ex) {
        try {
            $pdo->exec("ALTER TABLE profiles ADD COLUMN parent_link_code VARCHAR(10) NULL");
        } catch (Exception $ex2) {}
    }
    try {
        $pdo->exec("ALTER TABLE profiles ADD UNIQUE INDEX idx_profiles_parent_code (parent_link_code)");
    } catch (Exception $ex3) {}
}

// Fehlende Codes für Bestandsprofile nachtragen (bounded, damit Request nicht hängt)
// Limit 10 pro Request + nur Schüler (parent braucht keinen Code) -> kein Timeout.
// Einzelne Fehler (z. B. Unique-Kollision) dürfen den Haupt-Request nie killen (500 vermeiden).
try {
    $stmt = $pdo->query("SELECT id FROM profiles WHERE (parent_link_code IS NULL OR parent_link_code = '') AND role != 'parent' LIMIT 10");
    $missing = $stmt ? $stmt->fetchAll() : [];
    foreach ($missing as $m) {
        try {
            $code = fwg_generate_parent_code($pdo);
            $pdo->prepare('UPDATE profiles SET parent_link_code = ? WHERE id = ?')->execute([$code, $m['id']]);
        } catch (Throwable $inner) {
            // stiller Skip – nächster Versuch im nächsten Request
        }
    }
} catch (Throwable $e) {}

// ------------------------------------------------------------------------------
// 0b. ELTERN-VERKNÜPFUNG: Code-Lookup, Direktsuche, Code-Erzeugung, Link-CRUD
// ------------------------------------------------------------------------------
$parentPermissionsDefaults = [
    'can_view_ads' => true,
    'can_view_ratings' => true,
    'can_view_activity' => true,
    'can_receive_notifications' => true,
];

// 0b1. Code-Lookup: Schülerprofil anhand des Verknüpfungscodes finden (fehlertolerant)
if ($method === 'GET' && $action === 'lookup_code') {
    require_auth();
    $raw = (string)($_GET['code'] ?? '');
    // Fehlertolerant: Leerzeichen/Bindestriche entfernen, nur A-Z0-9 behalten, Uppercase
    $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', trim($raw)) ?? '');
    if ($code === '' || strlen($code) < 4) {
        json_error('Ungültiger Code. Bitte 6-stelligen Code prüfen.', 400);
    }
    // Auf 6-10 begrenzen, längere Eingaben kürzen statt 500 zu werfen
    if (strlen($code) > 10) $code = substr($code, 0, 10);
    if (!preg_match('/^[A-Z0-9]{4,10}$/', $code)) {
        json_error('Ungültiger Code.', 400);
    }
    try {
        $stmt = $pdo->prepare('
            SELECT id, first_name, last_name, display_name, grade_level, class_letter
            FROM profiles
            WHERE parent_link_code = ? AND role != "parent"
            LIMIT 1
        ');
        $stmt->execute([$code]);
        $child = $stmt->fetch();
    } catch (Throwable $e) {
        error_log('lookup_code failed: ' . $e->getMessage());
        json_error('Suche vorübergehend nicht verfügbar.', 500);
    }
    if (!$child) {
        json_error('Kein Schülerprofil mit diesem Code gefunden.', 404);
    }
    $full = trim((string)($child['first_name'] ?? '') . ' ' . (string)($child['last_name'] ?? ''));
    json_response([
        'id' => $child['id'],
        'full_name' => $full !== '' ? $full : ($child['display_name'] ?? 'Unbekannt'),
        'display_name' => $child['display_name'] ?: $full,
        'grade_level' => $child['grade_level'],
        'class_letter' => $child['class_letter'],
        'parent_link_code' => $code,
    ]);
}

// 0b2. Direktsuche: Name und optional Klasse/Geburtsdatum (fehlertolerant)
if ($method === 'GET' && $action === 'search_children') {
    require_auth();
    $q = trim((string)($_GET['q'] ?? ''));
    $gradeRaw = trim((string)($_GET['grade_level'] ?? ''));
    $birthRaw = trim((string)($_GET['birth_date'] ?? ''));

    // Fehlertolerant: leere Suche liefert leeres Array (200) statt 400, damit Frontend keinen http error zeigt.
    $hasQ = $q !== '';
    $hasGrade = $gradeRaw !== '';
    $hasBirth = $birthRaw !== '';

    $where = 'role != "parent"';
    $params = [];

    // --- Name: Tokenisierung + LIKE-Escaping (tolerant gegen Leerzeichen/Großklein) ---
    if ($hasQ) {
        $q = mb_substr(preg_replace('/\s+/', ' ', $q), 0, 100);
        $tokens = preg_split('/\s+/', $q, -1, PREG_SPLIT_NO_EMPTY);
        $tokens = array_slice(array_filter($tokens, fn($t) => $t !== ''), 0, 5);
        foreach ($tokens as $tok) {
            $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $tok);
            $like = '%' . $escaped . '%';
            $where .= ' AND (display_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            array_push($params, $like, $like, $like);
        }
        if (empty($tokens)) $hasQ = false;
    }

    // --- Klasse: fehlertolerant (7b, 7 B, Klasse 7b, 7, b) ---
    if ($hasGrade) {
        // "Klasse"-Präfix entfernen, trimmen
        $norm = trim(preg_replace('/^(klasse\s*)/i', '', $gradeRaw));
        $norm = mb_substr($norm, 0, 20);
        // Versuche Muster: Zahl + optional Buchstabe (z. B. "7b", "10 a", "7")
        if (preg_match('/^(\d{1,2})\s*([a-zA-Z])?$/u', $norm, $gm)) {
            $d = $gm[1];
            $l = isset($gm[2]) && $gm[2] !== '' ? strtolower($gm[2]) : '';
            // Grade-Level enthält die Stufen-Zahl (LIKE %7%)
            $where .= ' AND grade_level LIKE ?';
            $params[] = '%' . $d . '%';
            if ($l !== '') {
                $escapedL = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $l);
                $where .= ' AND (class_letter LIKE ? OR class_letter = ? OR grade_level LIKE ?)';
                $params[] = '%' . $escapedL . '%';
                $params[] = $l;
                $params[] = '%' . $escapedL . '%';
            }
        } else {
            // Fallback: Ziffern und einzelnen Buchstaben separat extrahieren
            $digits = preg_replace('/[^0-9]/', '', $norm);
            $lettersOnly = strtolower(preg_replace('/[^a-zA-Z]/', '', $norm));
            $singleLetter = (strlen($lettersOnly) === 1) ? $lettersOnly : '';
            if ($digits !== '' && $singleLetter !== '') {
                $where .= ' AND grade_level LIKE ?';
                $params[] = '%' . $digits . '%';
                $escapedL = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $singleLetter);
                $where .= ' AND class_letter LIKE ?';
                $params[] = '%' . $escapedL . '%';
            } elseif ($digits !== '') {
                $where .= ' AND grade_level LIKE ?';
                $params[] = '%' . $digits . '%';
            } elseif ($singleLetter !== '') {
                $escapedL = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $singleLetter);
                $where .= ' AND class_letter LIKE ?';
                $params[] = '%' . $escapedL . '%';
            } else {
                // Kein erkanntes Muster -> sanftes LIKE auf grade_level (statt 400)
                $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $norm);
                $where .= ' AND grade_level LIKE ?';
                $params[] = '%' . $escaped . '%';
            }
        }
    }

    // --- Geburtsdatum: mehrere Formate tolerant, ungültiges wird ignoriert statt 400 ---
    $birthNorm = null;
    if ($hasBirth) {
        $b = trim($birthRaw);
        // Versuche YYYY-MM-DD
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $b, $m)) {
            $cand = sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
            if (checkdate((int)$m[2], (int)$m[3], (int)$m[1])) $birthNorm = $cand;
        } elseif (preg_match('/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/', $b, $m)) {
            // DD.MM.YYYY | DD-MM-YYYY | DD/MM/YYYY
            if (checkdate((int)$m[2], (int)$m[1], (int)$m[3])) {
                $birthNorm = sprintf('%04d-%02d-%02d', (int)$m[3], (int)$m[2], (int)$m[1]);
            }
        } elseif (preg_match('/^(\d{4})[.\/](\d{1,2})[.\/](\d{1,2})$/', $b, $m)) {
            if (checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
                $birthNorm = sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
            }
        } else {
            $ts = strtotime(str_replace('.', '-', $b));
            if ($ts !== false) {
                $cand = date('Y-m-d', $ts);
                $y = (int)substr($cand, 0, 4);
                if ($y >= 1900 && $y <= 2035) $birthNorm = $cand;
            }
        }
        if ($birthNorm !== null) {
            $where .= ' AND birth_date = ?';
            $params[] = $birthNorm;
        }
        // sonst: ungültiges Datum wird fehlertolerant ignoriert (kein Filter, kein 400)
    }

    // Wenn nach Normalisierung gar kein Filter wirksam ist -> leeres Ergebnis (200) statt 400
    $hasEffectiveFilter = ($hasQ && isset($tokens) && !empty($tokens)) || $hasGrade || $birthNorm !== null;
    // Falls Eingabe nur aus Leerzeichen/ungültigem Datum bestand und kein anderer Filter -> leer
    if (!$hasEffectiveFilter) {
        // Wenn Nutzer wirklich gar nichts eingegeben hat, liefere leeres Array
        // (Frontend zeigt "Bitte mindestens..."-Toast, aber wir vermeiden http error)
        json_response([]);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT id, first_name, last_name, display_name, grade_level, class_letter, birth_date
            FROM profiles
            WHERE $where
            ORDER BY last_name ASC, first_name ASC
            LIMIT 15
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('search_children failed: ' . $e->getMessage());
        json_error('Suche vorübergehend nicht verfügbar.', 500);
    }
    $result = array_map(function ($r) {
        $full = trim((string)($r['first_name'] ?? '') . ' ' . (string)($r['last_name'] ?? ''));
        return [
            'id' => $r['id'],
            'full_name' => $full !== '' ? $full : ($r['display_name'] ?? 'Unbekannt'),
            'display_name' => $r['display_name'] ?: $full,
            'grade_level' => $r['grade_level'],
            'class_letter' => $r['class_letter'],
            'birth_date' => $r['birth_date'],
        ];
    }, $rows);
    json_response($result);
}

// 0b3. Sicherstellen, dass das eigene Profil einen Code besitzt (und zurückgeben)
// Gehärtet: fehlendes Profil -> 404, Unique-Kollision -> 1x Retry, kein unbehandelter 500.
if ($method === 'POST' && $action === 'ensure_parent_code') {
    $user = require_auth();
    try {
        $stmt = $pdo->prepare('SELECT id, parent_link_code FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error('Profil nicht gefunden.', 404);
        }
        $existing = is_string($row['parent_link_code'] ?? null) ? trim((string)$row['parent_link_code']) : '';
        if ($existing !== '' && preg_match('/^[A-Z0-9]{4,10}$/', strtoupper($existing))) {
            json_response(['parent_link_code' => strtoupper($existing)]);
        }
        // Neuen Code erzeugen + speichern (mit 1x Retry bei Unique-Kollision)
        $code = null;
        for ($attempt = 0; $attempt < 2; $attempt++) {
            try {
                $code = fwg_generate_parent_code($pdo);
                $upd = $pdo->prepare('UPDATE profiles SET parent_link_code = ? WHERE id = ?');
                $upd->execute([$code, $user['id']]);
                break;
            } catch (Throwable $u) {
                $msg = $u->getMessage();
                // Nur bei Unique-Verletzung erneut versuchen, sonst weiterwerfen
                if (stripos($msg, 'uplicate') !== false && $attempt === 0) {
                    continue;
                }
                throw $u;
            }
        }
        if (!$code) {
            json_error('Code konnte nicht erzeugt werden.', 500);
        }
        json_response(['parent_link_code' => $code]);
    } catch (Throwable $e) {
        error_log('ensure_parent_code failed: ' . $e->getMessage());
        json_error('Code konnte nicht geladen werden.', 500);
    }
}

// 0b4. Verknüpfungen lesen: Elternteil -> Kinder (mit Stats/Aktivität) | Kind -> Elternteile
if ($method === 'GET' && $action === 'parent_links') {
    $user = require_auth();

    if ($user['role'] === 'parent') {
        $linksStmt = $pdo->prepare('
            SELECT pl.* FROM parent_links pl WHERE pl.parent_id = ? ORDER BY pl.created_at DESC
        ');
        $linksStmt->execute([$user['id']]);
        $links = $linksStmt->fetchAll();
        $result = [];

        foreach ($links as $link) {
            $personStmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
            $personStmt->execute([$link['child_id']]);
            $child = $personStmt->fetch();
            if (!$child) {
                continue;
            }
            $full = trim((string)($child['first_name'] ?? '') . ' ' . (string)($child['last_name'] ?? ''));

            $c = $link['child_id'];
            $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM ads WHERE user_id = ? AND is_active = 1 AND is_archived = 0');
            $cntStmt->execute([$c]);
            $adsCount = (int)$cntStmt->fetchColumn();
            $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM ad_requests WHERE requester_id = ? OR owner_id = ?');
            $cntStmt->execute([$c, $c]);
            $reqCount = (int)$cntStmt->fetchColumn();
            $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM reviews WHERE target_user_id = ?');
            $cntStmt->execute([$c]);
            $revCount = (int)$cntStmt->fetchColumn();

            $activity = [];
            $aStmt = $pdo->prepare('
                SELECT id, short_description, created_at, type FROM ads
                WHERE user_id = ? AND is_active = 1 AND is_archived = 0
                ORDER BY created_at DESC LIMIT 3
            ');
            $aStmt->execute([$c]);
            foreach ($aStmt->fetchAll() as $a) {
                $activity[] = [
                    'type' => 'ad',
                    'title' => $a['type'] === 'offer' ? 'Neue Nachhilfe angeboten' : 'Neue Nachhilfesuche gestartet',
                    'description' => (string)($a['short_description'] ?? ''),
                    'timestamp' => $a['created_at'],
                ];
            }
            $rStmt = $pdo->prepare('
                SELECT ar.id, ar.status, ar.created_at, ad.short_description
                FROM ad_requests ar
                LEFT JOIN ads ad ON ad.id = ar.ad_id
                WHERE ar.requester_id = ? OR ar.owner_id = ?
                ORDER BY ar.created_at DESC LIMIT 3
            ');
            $rStmt->execute([$c, $c]);
            foreach ($rStmt->fetchAll() as $ar) {
                $activity[] = [
                    'type' => 'request',
                    'title' => 'Anfrage-Aktivität',
                    'description' => 'Nachhilfestunden-Anfrage zu "' . (string)($ar['short_description'] ?? 'Anzeige') . '" (' . $ar['status'] . ')',
                    'timestamp' => $ar['created_at'],
                ];
            }
            $vStmt = $pdo->prepare('
                SELECT r.rating, r.comment, r.created_at, p.display_name
                FROM reviews r
                LEFT JOIN profiles p ON p.id = r.author_id
                WHERE r.target_user_id = ?
                ORDER BY r.created_at DESC LIMIT 3
            ');
            $vStmt->execute([$c]);
            foreach ($vStmt->fetchAll() as $rv) {
                $author = $rv['display_name'] ?: 'Mitschüler';
                $activity[] = [
                    'type' => 'review',
                    'title' => 'Bewertung erhalten (' . $rv['rating'] . ' Sterne)',
                    'description' => $rv['comment'] ? '"' . $rv['comment'] . '" von ' . $author : 'Kein Kommentar hinterlassen',
                    'timestamp' => $rv['created_at'],
                ];
            }
            usort($activity, function ($a, $b) {
                return strtotime($b['timestamp']) <=> strtotime($a['timestamp']);
            });

            $result[] = [
                'id' => $link['id'],
                'parent_id' => $link['parent_id'],
                'child_id' => $c,
                'status' => $link['status'],
                'permissions' => json_decode($link['permissions'] ?? '{}', true) ?: $parentPermissionsDefaults,
                'created_at' => $link['created_at'],
                'linked_at' => $link['linked_at'],
                'child' => [
                    'id' => $child['id'],
                    'full_name' => $full ?: ($child['display_name'] ?? 'Unbekannt'),
                    'display_name' => $child['display_name'] ?: $full,
                    'first_name' => $child['first_name'],
                    'last_name' => $child['last_name'],
                    'grade_level' => $child['grade_level'],
                    'class_letter' => $child['class_letter'],
                    'avatar_url' => $child['avatar_url'],
                    'average_rating' => (float)$child['average_rating'],
                    'stats' => [
                        'ads_count' => $adsCount,
                        'requests_count' => $reqCount,
                        'reviews_count' => $revCount,
                    ],
                    'recent_activity' => array_slice($activity, 0, 5),
                ],
            ];
        }
        json_response($result);
    }

    // Kind / andere Rollen: Elternteile, die dieses Konto verknüpft haben
    $linksStmt = $pdo->prepare('
        SELECT pl.* FROM parent_links pl WHERE pl.child_id = ? ORDER BY pl.created_at DESC
    ');
    $linksStmt->execute([$user['id']]);
    $links = $linksStmt->fetchAll();
    $result = [];
    foreach ($links as $link) {
        $peopleStmt = $pdo->prepare('SELECT id, first_name, last_name, display_name FROM profiles WHERE id = ?');
        $peopleStmt->execute([$link['parent_id']]);
        $parent = $peopleStmt->fetch();
        if (!$parent) {
            continue;
        }
        $full = trim((string)($parent['first_name'] ?? '') . ' ' . (string)($parent['last_name'] ?? ''));
        $result[] = [
            'id' => $link['id'],
            'parent_id' => $link['parent_id'],
            'child_id' => $link['child_id'],
            'status' => $link['status'],
            'permissions' => json_decode($link['permissions'] ?? '{}', true) ?: $parentPermissionsDefaults,
            'created_at' => $link['created_at'],
            'linked_at' => $link['linked_at'],
            'parent' => [
                'id' => $parent['id'],
                'full_name' => $full ?: ($parent['display_name'] ?? 'Unbekannt'),
                'display_name' => $parent['display_name'] ?: $full,
                'first_name' => $parent['first_name'],
                'last_name' => $parent['last_name'],
            ],
        ];
    }
    json_response($result);
}

// 0b5. Verknüpfung erstellen (nur Elternteil- oder SV-Admin-Konto)
if ($method === 'POST' && $action === 'parent_links') {
    $user = require_auth();
    if ($user['role'] !== 'parent' && $user['role'] !== 'sv_admin') {
        json_error('Nur Elternteil-Konten können Kinder verknüpfen.', 403);
    }
    $data = get_json_input();
    $childId = trim((string)($data['child_id'] ?? ''));
    if ($childId === '' || !preg_match('/^[0-9a-f-]{36}$/i', $childId)) {
        json_error('child_id fehlt oder ist ungültig.', 400);
    }
    if ($childId === $user['id']) {
        json_error('Du kannst dein eigenes Konto nicht verknüpfen.', 400);
    }

    $personStmt = $pdo->prepare('SELECT id, role FROM profiles WHERE id = ?');
    $personStmt->execute([$childId]);
    $child = $personStmt->fetch();
    if (!$child) {
        json_error('Profil nicht gefunden.', 404);
    }
    if ($child['role'] === 'parent') {
        json_error('Dieses Profil ist selbst ein Elternteil-Konto.', 400);
    }

    $dup = $pdo->prepare('SELECT id FROM parent_links WHERE parent_id = ? AND child_id = ?');
    $dup->execute([$user['id'], $childId]);
    if ($dup->fetchColumn()) {
        json_error('Dieses Kind ist bereits mit deinem Account verknüpft.', 409);
    }

    $perms = $parentPermissionsDefaults;
    if (isset($data['permissions']) && is_array($data['permissions'])) {
        foreach ($perms as $k => $v) {
            $perms[$k] = (bool)($data['permissions'][$k] ?? $v);
        }
    }

    $linkId = generate_uuid();
    $now = date('Y-m-d H:i:s');
    try {
        $ins = $pdo->prepare('
            INSERT INTO parent_links (id, parent_id, child_id, status, permissions, created_at, linked_at)
            VALUES (?, ?, ?, "active", ?, ?, ?)
        ');
        $ins->execute([$linkId, $user['id'], $childId, json_encode($perms, JSON_UNESCAPED_UNICODE), $now, $now]);
    } catch (Exception $e) {
        json_error('Diese Verknüpfung existiert bereits.', 409);
    }

    json_response([
        'message' => 'Verknüpfung erfolgreich.',
        'link' => [
            'id' => $linkId,
            'parent_id' => $user['id'],
            'child_id' => $childId,
            'status' => 'active',
            'permissions' => $perms,
            'created_at' => $now,
            'linked_at' => $now,
        ],
    ]);
}

// 0b6. Verknüpfung aktualisieren (Berechtigungen: Elternteil; Status: beide Seiten)
if ($method === 'PATCH' && $action === 'parent_links') {
    $user = require_auth();
    $data = get_json_input();
    $linkId = trim((string)($data['link_id'] ?? ''));
    if ($linkId === '') {
        json_error('link_id fehlt.', 400);
    }
    $linkStmt = $pdo->prepare('SELECT * FROM parent_links WHERE id = ?');
    $linkStmt->execute([$linkId]);
    $link = $linkStmt->fetch();
    if (!$link) {
        json_error('Verknüpfung nicht gefunden.', 404);
    }
    $isParent = $link['parent_id'] === $user['id'];
    $isChild = $link['child_id'] === $user['id'];
    $isAdmin = $user['role'] === 'sv_admin';
    if (!$isParent && !$isChild && !$isAdmin) {
        json_error('Keine Berechtigung für diese Verknüpfung.', 403);
    }

    $fields = [];
    $params = [];

    if (isset($data['permissions']) && ($isParent || $isAdmin)) {
        if (!is_array($data['permissions'])) {
            json_error('Ungültige Berechtigungen.', 400);
        }
        $perms = $parentPermissionsDefaults;
        foreach ($perms as $k => $v) {
            $perms[$k] = (bool)($data['permissions'][$k] ?? $v);
        }
        $fields[] = 'permissions = ?';
        $params[] = json_encode($perms, JSON_UNESCAPED_UNICODE);
    }

    if (isset($data['status']) && ($isParent || $isChild || $isAdmin)) {
        $status = (string)$data['status'];
        if (!in_array($status, ['active', 'revoked'], true)) {
            json_error('Ungültiger Status.', 400);
        }
        $fields[] = 'status = ?';
        $params[] = $status;
    }

    if (empty($fields)) {
        json_error('Keine Änderungen übermittelt.', 400);
    }

    $params[] = $linkId;
    $pdo->prepare('UPDATE parent_links SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    json_response(['message' => 'Verknüpfung aktualisiert.']);
}

// 0b7. Verknüpfung aufheben (beide Seiten oder SV-Admin)
if ($method === 'DELETE' && $action === 'parent_links') {
    $user = require_auth();
    $data = get_json_input();
    $linkId = trim((string)($data['link_id'] ?? ''));
    if ($linkId === '') {
        json_error('link_id fehlt.', 400);
    }
    $linkStmt = $pdo->prepare('SELECT * FROM parent_links WHERE id = ?');
    $linkStmt->execute([$linkId]);
    $link = $linkStmt->fetch();
    if (!$link) {
        json_error('Verknüpfung nicht gefunden.', 404);
    }
    $isParent = $link['parent_id'] === $user['id'];
    $isChild = $link['child_id'] === $user['id'];
    $isAdmin = $user['role'] === 'sv_admin';
    if (!$isParent && !$isChild && !$isAdmin) {
        json_error('Keine Berechtigung für diese Verknüpfung.', 403);
    }
    $pdo->prepare('DELETE FROM parent_links WHERE id = ?')->execute([$linkId]);
    json_response(['message' => 'Verknüpfung aufgehoben.']);
}

// ------------------------------------------------------------------------------
// 1. GET: PROFIL ABRUFEN ODER COACH-SCHÜLERLISTE
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // 1a. Schülerliste für Coach-Admin (Frau Balistreri) & SV-Admin
    if ($action === 'coach_students') {
        $currentUser = require_coach_or_admin();
        $stmt = $pdo->query('
            SELECT p.id, p.first_name, p.last_name, p.display_name, p.grade_level, p.class_letter,
                   p.role, p.is_verified, p.is_coach, p.avatar_url, p.avatar_type, p.banner_color,
                   p.settings,
                   (SELECT COUNT(*) FROM ads a WHERE a.user_id = p.id AND a.is_active = 1 AND a.is_archived = 0) as active_ads_count
            FROM profiles p
            WHERE p.role != "parent"
            ORDER BY p.is_coach DESC, p.grade_level DESC, p.last_name ASC, p.first_name ASC
        ');
        $students = $stmt->fetchAll();
        foreach ($students as &$s) {
            $settings = json_decode($s['settings'] ?? '{}', true) ?: [];
            $s['is_coach'] = !empty($s['is_coach']) || !empty($settings['is_coach']);
            $s['is_verified'] = (bool)$s['is_verified'];
            unset($s['settings']);
        }
        json_response($students);
    }

    // 1b. Coach-Aktivitäten-Log für Frau Balistreri
    if ($action === 'coach_log') {
        $currentUser = require_coach_or_admin();
        $stmt = $pdo->query('
            SELECT l.*, a.display_name as admin_name
            FROM admin_audit_log l
            LEFT JOIN profiles a ON a.id = l.admin_id
            WHERE l.action LIKE "coach_%" OR l.action LIKE "verify_%"
            ORDER BY l.created_at DESC
            LIMIT 50
        ');
        $logs = $stmt->fetchAll();
        foreach ($logs as &$l) {
            $l['details'] = json_decode($l['details'] ?? '{}', true);
        }
        json_response($logs);
    }

    // 1c. Schüler-Coaching Startseiten-Informationen (öffentlich lesbar)
    if ($action === 'coach_info') {
        $defaultInfo = [
            'title' => 'Kostenloses Coaching für Klasse 5 & 6!',
            'description' => 'Wöchentlich einmal bieten wir für alle Schülerinnen und Schüler der Jahrgangsstufen 5 und 6 die Möglichkeit, Hilfen zu einzelnen Fächern oder zur Lern- und Arbeitsorganisation allgemein durch Schülerinnen und Schüler der 8. Klassen zu erhalten. Diese werden jeweils vor den Herbstferien für ihre Aufgabe geschult und stellen dann bis zum Ende des Schuljahres ehrenamtlich ihre Hilfe zur Verfügung. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schüler haben.',
            'time' => 'Dienstags, 13:45 - 14:30 Uhr',
            'room' => 'Raum H310',
            'is_visible' => true,
            'updated_at' => null,
            'updated_by_name' => null
        ];

        try {
            $stmt = $pdo->prepare('
                SELECT s.setting_value, s.updated_at, p.display_name as updated_by_name
                FROM app_settings s
                LEFT JOIN profiles p ON p.id = s.updated_by
                WHERE s.setting_key = "coach_info"
            ');
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row && !empty($row['setting_value'])) {
                $val = json_decode($row['setting_value'], true);
                if (is_array($val)) {
                    $defaultInfo = array_merge($defaultInfo, $val);
                    $defaultInfo['updated_at'] = $row['updated_at'];
                    $defaultInfo['updated_by_name'] = $row['updated_by_name'];
                }
            }
        } catch (Exception $e) {}

        json_response($defaultInfo);
    }

    // 1c. Einzelnes Profil
    if (!$id) {
        $currentUser = require_auth();
        $id = $currentUser['id'];
    }

    $stmt = $pdo->prepare('
        SELECT p.*,
               (SELECT COUNT(*) FROM ads a WHERE a.user_id = p.id AND a.is_active = 1 AND a.is_archived = 0) as active_ads_count,
               (SELECT COUNT(*) FROM reviews r WHERE r.target_user_id = p.id) as reviews_count
        FROM profiles p
        WHERE p.id = ?
    ');
    $stmt->execute([$id]);
    $profile = $stmt->fetch();

    if (!$profile) {
        json_error('Profil nicht gefunden.', 404);
    }

    $profile['subjects'] = json_decode($profile['subjects'] ?? '[]', true) ?: [];
    $profile['settings'] = json_decode($profile['settings'] ?? '{}', true) ?: [];
    $profile['average_rating'] = (float)$profile['average_rating'];
    $profile['is_verified'] = (bool)$profile['is_verified'];
    $profile['is_banned'] = (bool)$profile['is_banned'];
    $profile['is_coach'] = !empty($profile['is_coach']) || !empty($profile['settings']['is_coach']);

    // Verfügbarkeitszeiten dekodieren
    if (!empty($profile['availability'])) {
        $profile['availability'] = json_decode($profile['availability'], true);
    } else if (!empty($profile['settings']['availability'])) {
        $profile['availability'] = $profile['settings']['availability'];
    } else {
        $profile['availability'] = null;
    }

    // Datenschutz: Kontaktdaten nur anzeigen, wenn sichtbar gestellt oder eigener Account / Admin
    $currentUser = get_auth_user();
    $isOwnerOrAdmin = $currentUser && ($currentUser['id'] === $id || $currentUser['role'] === 'sv_admin' || $currentUser['role'] === 'coach_admin');

    if (!$isOwnerOrAdmin) {
        if (empty($profile['settings']['email_visible'])) {
            $profile['email'] = null;
        }
        if (empty($profile['settings']['phone_visible'])) {
            $profile['phone_number'] = null;
        }
    }

    json_response($profile);
}

// ------------------------------------------------------------------------------
// 2. COACH-INFO AKTUALISIEREN (NUR COACH-ADMIN ODER SV-ADMIN)
// ------------------------------------------------------------------------------
if ($action === 'coach_info' && ($method === 'POST' || $method === 'PUT')) {
    $currentUser = require_coach_or_admin();
    $data = get_json_input();

    $info = [
        'title' => trim($data['title'] ?? 'Kostenloses Coaching für Klasse 5 & 6!'),
        'description' => trim($data['description'] ?? ''),
        'time' => trim($data['time'] ?? 'Dienstags, 13:45 - 14:30 Uhr'),
        'room' => trim($data['room'] ?? 'Raum H310'),
        'is_visible' => isset($data['is_visible']) ? (bool)$data['is_visible'] : true
    ];

    $jsonVal = json_encode($info, JSON_UNESCAPED_UNICODE);

    $stmt = $pdo->prepare('
        INSERT INTO app_settings (setting_key, setting_value, updated_at, updated_by)
        VALUES ("coach_info", ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
    ');
    $stmt->execute([$jsonVal, $currentUser['id']]);

    // In admin_audit_log schreiben
    try {
        $pdo->prepare('
            INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
            VALUES (?, ?, "coach_info_update", "setting", "coach_info", ?)
        ')->execute([
            generate_uuid(),
            $currentUser['id'],
            json_encode([
                'title' => $info['title'],
                'time' => $info['time'],
                'room' => $info['room'],
                'is_visible' => $info['is_visible'],
                'editor_name' => $currentUser['display_name'] ?: $currentUser['email'],
                'editor_role' => $currentUser['role']
            ], JSON_UNESCAPED_UNICODE)
        ]);
    } catch (Exception $e) {
        error_log('Audit log error on coach_info_update: ' . $e->getMessage());
    }

    json_response([
        'message' => 'Schüler-Coaching Startseiten-Infos erfolgreich aktualisiert.',
        'info' => $info
    ]);
}

// ------------------------------------------------------------------------------
// 2b. COACHING-SEITEN-TEXTE (öffentlich lesen, NUR COACH-ADMIN/SV-ADMIN schreiben)
// Alle Texte der /coaching-Seite, editierbar über das Coach-Panel (Tab Info).
// ------------------------------------------------------------------------------
function fwg_coaching_page_defaults() {
    return [
        'hero_title' => 'Schüler-Coaching am FWG',
        'hero_subtitle' => "Große helfen Kleinen: Geschulte Schülerinnen und Schüler ab Klasse 8 unterstützen die Klassen 5 und 6 beim Ankommen am Friedrich-Wilhelm-Gymnasium Köln – ehrenamtlich, pädagogisch begleitet und für alle nach denselben fairen Regeln.",
        's_badge_title' => 'Was bedeutet das Coach-Abzeichen?',
        's_badge_body' => "Das goldene Coach-Badge auf Profilen und Anzeigen zeigt: Diese Person ist aktives Mitglied der Schüler-Coaching AG, wurde von der AG-Leitung geschult und vom SV-Team verifiziert.\n\nDas Badge steht für Vertrauenswürdigkeit als Person – nicht für Erfolgsgarantien und nicht für kostenlose Nachhilfe. Preise und Absprachen bleiben Sache der Beteiligten (siehe Nutzungsbedingungen).",
        's_school_title' => 'Das Coaching an unserer Schule',
        's_school_body' => "Das Schüler-Coaching ist ein schulisches Angebot des FWG: Jede Woche dienstags von 13:45–14:30 Uhr in Raum H310 helfen geschulte Schülerinnen und Schüler der 8. Klassen den 5. und 6. Klassen – bei einzelnen Fächern oder der Lern- und Arbeitsorganisation allgemein. Die Coaches werden jeweils vor den Herbstferien geschult und engagieren sich ehrenamtlich bis zum Ende des Schuljahres. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schülerinnen und Schüler haben.\n\nMehr dazu auf der Schul-Website: fwg-koeln.de/lebendige-schule/foerdern-und-fordern/coaching. Diese Nachhilfebörse der SV ergänzt das Angebot: Hier finden alle Jahrgangsstufen individuelle Nachhilfe – die Coaches der AG sind dabei besonders sichtbar, damit man sie leicht findet.",
        's_who_title' => 'Wer kann Coach werden?',
        's_who_body' => "• Schülerin oder Schüler des FWG ab Klasse 8\n• Teilnahme an der Coach-Schulung der AG-Leitung (findet jeweils vor den Herbstferien statt)\n• Zuverlässigkeit und respektvoller Umgang – auch auf der Plattform\n• Verifizierter Account auf der Nachhilfebörse\n\nInteressiert? Wende dich an Frau Balistreri oder sprich das SV-Team im SV-Raum an. Die Aufnahme erfolgt nach Schulung über einen persönlichen Coaching-Code – für alle mit denselben Kriterien.",
        's_boost_title' => 'Warum stehen manche Anzeigen oben?',
        's_boost_body' => "Anzeigen mit dem Hinweis „Hervorgehoben“ erhalten eine bessere Platzierung und eine gelbe Markierung. Das passiert ausschließlich in zwei Fällen:\n\n• Coach-Status: Nach Einlösen eines Coaching-Codes werden Anzeigen des Coaches für 30 Tage hervorgehoben.\n• SV-Aktionen: Zeitlich begrenzte Hinweise des SV-Teams (z. B. zum Schuljahresstart).\n\nSichtbarkeit ist bei uns nicht käuflich: Es gibt keine bezahlten Boosts und keine Werbung. Zusätzlich erhalten Coach-Anzeigen einen kleinen, öffentlich dokumentierten Ranking-Vorteil (etwa +24 Stunden Aktualität bzw. leicht bessere Match-Einordnung) – bewusst als Anerkennung für das Ehrenamt der Coaches, für alle Coaches gleich und nur solange der Coach-Status aktiv ist. Versteckte Bevorzugungen gibt es nicht: Alles steht auf dieser Seite.",
        's_fair_title' => 'Gleiche Chancen für alle',
        's_fair_body' => "• Jede Schülerin und jeder Schüler kann kostenlos Anzeigen erstellen – mit oder ohne Badge.\n• Der Filter „Nur Coaches“ hilft beim Finden geprüfter Coaches, blendet aber niemanden aus: Alle Anzeigen bleiben für alle sichtbar.\n• Codes sind personenbezogen und begrenzt (in der Regel einmalig einlösbar) und werden nur nach Schulung vergeben – nicht auf Zuruf oder gegen Gegenleistung.\n• Die Vergabe von Codes und Coach-Status wird protokolliert und kann vom SV-Team geprüft werden.\n• Der kleine Ranking-Vorteil für Coaches steht öffentlich auf dieser Seite – es gibt keine versteckten Bevorzugungen.",
        's_conduct_title' => 'Verhalten als Coach',
        's_conduct_body' => "• Respektvoller, geduldiger Umgang – besonders mit jüngeren Schülern\n• Keine falschen Versprechen (z. B. garantierte Notenverbesserung)\n• Treffen möglichst in der Schule (z. B. Bibliothek, Mensa); private Treffen nur mit Wissen der Eltern\n• Bei Problemen: frühzeitig die AG-Leitung oder das SV-Team ansprechen",
        's_revoke_title' => 'Entzug des Status & Widerspruch',
        's_revoke_body' => "Bei Verstößen gegen diese Regeln oder die Nutzungsbedingungen (z. B. unzuverlässiges Verhalten, Missbrauch des Badges, unangemessene Inhalte) kann die AG-Leitung oder das SV-Team den Coach-Status entziehen – mit kurzer Begründung direkt in der App oder per E-Mail.\n\nDagegen kannst du Widerspruch einlegen: Schreibe an info@nachhilfe-sv.de oder komme im SV-Raum vorbei. Das SV-Team prüft jeden Fall erneut.",
        'contact_text' => 'AG-Leitung: Frau Balistreri · SV-Lehrer: Herr Schulz, Herr Steinberg',
    ];
}

if ($action === 'coaching_page' && $method === 'GET') {
    $page = fwg_coaching_page_defaults();
    try {
        $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = "coaching_page"');
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row && !empty($row['setting_value'])) {
            $val = json_decode($row['setting_value'], true);
            if (is_array($val)) {
                foreach ($page as $k => $v) {
                    if (isset($val[$k]) && is_string($val[$k]) && $val[$k] !== '') {
                        $page[$k] = $val[$k];
                    }
                }
            }
        }
    } catch (Exception $e) {}
    json_response($page);
}

if ($action === 'coaching_page' && ($method === 'POST' || $method === 'PUT')) {
    $currentUser = require_coach_or_admin();
    $data = get_json_input();
    $defaults = fwg_coaching_page_defaults();
    $page = [];
    foreach ($defaults as $k => $v) {
        $raw = trim((string)($data[$k] ?? ''));
        if ($raw === '') {
            $raw = $v;
        }
        $isTitle = (bool)preg_match('/(_title|^hero_title|contact_text)$/', $k);
        $page[$k] = mb_substr($raw, 0, $isTitle ? 200 : 8000);
    }
    $jsonVal = json_encode($page, JSON_UNESCAPED_UNICODE);
    $stmt = $pdo->prepare('
        INSERT INTO app_settings (setting_key, setting_value, updated_at, updated_by)
        VALUES ("coaching_page", ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
    ');
    $stmt->execute([$jsonVal, $currentUser['id']]);
    try {
        $pdo->prepare('
            INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
            VALUES (?, ?, "coach_page_update", "setting", "coaching_page", ?)
        ')->execute([
            generate_uuid(),
            $currentUser['id'],
            json_encode([
                'editor_name' => $currentUser['display_name'] ?: $currentUser['email'],
                'editor_role' => $currentUser['role']
            ], JSON_UNESCAPED_UNICODE)
        ]);
    } catch (Exception $e) {
        error_log('Audit log error on coach_page_update: ' . $e->getMessage());
    }
    json_response(['message' => 'Coaching-Seiten-Texte erfolgreich aktualisiert.', 'page' => $page]);
}

// ------------------------------------------------------------------------------
// 3. PUT / PATCH: PROFIL AKTUALISIEREN
// ------------------------------------------------------------------------------
if ($method === 'PUT' || $method === 'PATCH') {
    $user = require_auth();
    $targetId = $id ?: $user['id'];

    $isSelf = $targetId === $user['id'];
    $isSvAdmin = $user['role'] === 'sv_admin';
    $isCoachAdmin = $user['role'] === 'coach_admin';

    if (!$isSelf && !$isSvAdmin && !$isCoachAdmin) {
        json_error('Keine Berechtigung zur Aktualisierung dieses Profils.', 403);
    }

    $data = get_json_input();
    $fields = [];
    $params = [];

    $textFields = [
        'first_name', 'last_name', 'display_name', 'grade_level', 'class_letter',
        'bio', 'moodle_name', 'phone_number', 'contact_other', 'avatar_url',
        'avatar_type', 'banner_color', 'birth_date'
    ];

    $textLimits = [
        'first_name' => 80, 'last_name' => 80, 'display_name' => 80,
        'grade_level' => 10, 'class_letter' => 5, 'bio' => 5000,
        'moodle_name' => 120, 'phone_number' => 40, 'contact_other' => 300,
        'avatar_url' => 2000, 'avatar_type' => 20, 'banner_color' => 20,
        'birth_date' => 10,
    ];
    if ($isSelf || $isSvAdmin) {
        foreach ($textFields as $tf) {
            if (array_key_exists($tf, $data)) {
                $val = $data[$tf];
                if ($val !== null && !is_string($val)) {
                    json_error('Ungültiger Wert für ' . $tf . '.', 400);
                }
                if (is_string($val)) {
                    $val = mb_substr(trim($val), 0, $textLimits[$tf] ?? 500);
                    if ($tf === 'avatar_url' && $val !== '' && !preg_match('#^https://#i', $val)) {
                        json_error('Avatar-URL muss mit https:// beginnen.', 400);
                    }
                    if ($tf === 'birth_date' && $val !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                        json_error('Ungültiges Geburtsdatum.', 400);
                    }
                }
                $fields[] = "`$tf` = ?";
                $params[] = $val;
            }
        }
    }

    if (($isSelf || $isSvAdmin) && isset($data['subjects'])) {
        $fields[] = '`subjects` = ?';
        $params[] = json_encode($data['subjects']);
    }

    // Verfügbarkeit (Availability) handling
    if (($isSelf || $isSvAdmin) && isset($data['availability'])) {
        $availJson = json_encode($data['availability']);
        try {
            $fields[] = '`availability` = ?';
            $params[] = $availJson;
        } catch (Exception $e) {}

        // Auch in settings speichern für maximale Ausfallsicherheit
        if (!isset($data['settings'])) {
            $data['settings'] = [];
        }
        $data['settings']['availability'] = $data['availability'];
    }

    if (($isSelf || $isSvAdmin) && isset($data['settings'])) {
        $fields[] = '`settings` = ?';
        $params[] = json_encode($data['settings']);
    }

    if (($isSelf || $isSvAdmin) && isset($data['onboarding_complete'])) {
        $fields[] = '`onboarding_complete` = ?';
        $params[] = $data['onboarding_complete'] ? 1 : 0;
    }

    // Schüler-Coach Status vergeben/entziehen (erlaubt für SV-Admin und Coach-Admin Frau Balistreri)
    if (($isSvAdmin || $isCoachAdmin) && isset($data['is_coach'])) {
        $isCoach = $data['is_coach'] ? 1 : 0;
        try {
            $fields[] = '`is_coach` = ?';
            $params[] = $isCoach;
        } catch (Exception $e) {}

        // Audit-Log schreiben
        try {
            $logId = generate_uuid();
            $actionName = $isCoach ? 'coach_assign' : 'coach_revoke';
            $pdo->prepare('
                INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
                VALUES (?, ?, ?, "profile", ?, ?)
            ')->execute([
                $logId,
                $user['id'],
                $actionName,
                $targetId,
                json_encode([
                    'assigned_by' => $user['display_name'] ?: $user['email'],
                    'role' => $user['role'],
                    'is_coach' => (bool)$isCoach
                ])
            ]);
        } catch (Exception $e) {
            error_log('Audit Log error: ' . $e->getMessage());
        }
    }

    // Nur SV-Admins dürfen Verifikation & Rolle direkt im Profil ändern
    if ($isSvAdmin) {
        if (isset($data['is_verified'])) {
            $fields[] = '`is_verified` = ?';
            $params[] = $data['is_verified'] ? 1 : 0;
        }
        if (isset($data['role']) && in_array($data['role'], ['student', 'sv_admin', 'coach_admin', 'parent'])) {
            $fields[] = '`role` = ?';
            $params[] = $data['role'];
        }
    }

    if (empty($fields)) {
        json_error('Keine Änderungen übermittelt.');
    }

    $params[] = $targetId;
    $sql = 'UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Aktualisiertes Profil zurückgeben
    $fetchStmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $fetchStmt->execute([$targetId]);
    $updated = $fetchStmt->fetch();

    if ($updated) {
        $updated['subjects'] = json_decode($updated['subjects'] ?? '[]', true) ?: [];
        $updated['settings'] = json_decode($updated['settings'] ?? '{}', true) ?: [];
        $updated['is_coach'] = !empty($updated['is_coach']) || !empty($updated['settings']['is_coach']);
        if (!empty($updated['availability'])) {
            $updated['availability'] = json_decode($updated['availability'], true);
        } else if (!empty($updated['settings']['availability'])) {
            $updated['availability'] = $updated['settings']['availability'];
        }
    }

    json_response([
        'message' => 'Profil erfolgreich aktualisiert.',
        'profile' => $updated
    ]);
}

json_error('Methode nicht erlaubt.', 405);
