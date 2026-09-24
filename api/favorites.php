<?php
// ==============================================================================
// FWG Nachhilfebörse - Favorites API (List, Toggle)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';


cors_headers();

// Zugriffsstufe (D5): Merkliste erst nach Verifizierung / Eltern-Verknüpfung.
$user = require_verified();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. GET: FAVORITEN DES NUTZERS ABRUFEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $stmt = $pdo->prepare('
        SELECT f.ad_id, f.created_at as favorited_at,
               a.*,
               p.display_name, p.first_name, p.last_name, p.avatar_url, p.avatar_type,
               p.banner_color, p.average_rating, p.is_verified, p.grade_level as user_grade
        FROM favorites f
        JOIN ads a ON a.id = f.ad_id
        JOIN profiles p ON p.id = a.user_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    ');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['subjects'] = json_decode($row['subjects'] ?? '[]', true) ?: [];
        $row['grade_levels'] = json_decode($row['grade_levels'] ?? '[]', true) ?: [];
        $row['locations'] = json_decode($row['locations'] ?? '[]', true) ?: [];
        $row['price_details'] = json_decode($row['price_details'] ?? '{}', true) ?: [];
        $row['is_boosted'] = !empty($row['boosted']) && !empty($row['boosted_until']) && strtotime($row['boosted_until']) > time();
        $row['profiles'] = [
            'id' => $row['user_id'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
            'avatar_type' => $row['avatar_type'],
            'average_rating' => (float)$row['average_rating'],
            'is_verified' => (bool)$row['is_verified'],
            'grade_level' => $row['user_grade']
        ];
    }

    json_response($rows);
}

// ------------------------------------------------------------------------------
// 2. POST: FAVORIT HINZUFÜGEN ODER ENTFERNEN (TOGGLE)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();
    $adId = $data['ad_id'] ?? null;

    if (!$adId) {
        json_error('ad_id ist erforderlich.');
    }

    // Prüfen, ob bereits favorisiert
    $check = $pdo->prepare('SELECT ad_id FROM favorites WHERE user_id = ? AND ad_id = ?');
    $check->execute([$user['id'], $adId]);
    $existing = $check->fetch();

    if ($existing) {
        // Entfernen
        $del = $pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND ad_id = ?');
        $del->execute([$user['id'], $adId]);
        json_response(['favorited' => false, 'message' => 'Aus Favoriten entfernt.']);
    } else {
        // Hinzufügen
        $add = $pdo->prepare('INSERT INTO favorites (user_id, ad_id) VALUES (?, ?)');
        $add->execute([$user['id'], $adId]);

        // E-Mail an den Eigentümer der Anzeige senden
        $ownerStmt = $pdo->prepare('
            SELECT p.first_name, p.display_name, u.email, a.short_description as ad_title, a.user_id as owner_id
            FROM ads a
            JOIN profiles p ON p.id = a.user_id
            JOIN users u ON u.id = p.id
            WHERE a.id = ?
        ');
        $ownerStmt->execute([$adId]);
        $owner = $ownerStmt->fetch();

        // Nur senden, wenn es nicht die eigene Anzeige ist
        if ($owner && $owner['owner_id'] !== $user['id']) {
            if (!empty($owner['email'])) {
                try {
                    send_email_ad_favorited(
                        $owner['email'],
                        $owner['first_name'] ?: $owner['display_name'] ?: 'Schüler/in',
                        $owner['ad_title'] ?: 'Deine Nachhilfe-Anzeige'
                    );
                } catch (Exception $e) {
                    error_log('Fehler beim E-Mail Versand: ' . $e->getMessage());
                }
            }

            // In-App Benachrichtigung anlegen
            try {
                $notifId = generate_uuid();
                $adTitle = $owner['ad_title'] ?: 'Deine Anzeige';
                $pdo->prepare('
                    INSERT INTO notifications (id, user_id, type, title, message, data)
                    VALUES (?, ?, "like", ?, ?, ?)
                ')->execute([
                    $notifId,
                    $owner['owner_id'],
                    "Anzeige gemerkt! ⭐",
                    "Jemand hat deine Anzeige „$adTitle“ auf die Merkliste gesetzt.",
                    json_encode(['ad_id' => $adId, 'link' => "/#/ad/$adId"])
                ]);
            } catch (Exception $e) {
                error_log('Fehler beim Anlegen der In-App Benachrichtigung: ' . $e->getMessage());
            }
        }

        json_response(['favorited' => true, 'message' => 'Zu Favoriten hinzugefügt.']);
    }
}

json_error('Methode nicht erlaubt.', 405);
