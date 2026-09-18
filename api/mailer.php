<?php
// ==============================================================================
// FWG Nachhilfebörse - Moderner E-Mail Service (ALL-INKL)
// Sendet wunderschöne, responsive HTML-E-Mails mit Logo und Schul-Branding
// ==============================================================================

require_once __DIR__ . '/config.php';

/**
 * Escaped Benutzereingaben für E-Mail-HTML (verhindert HTML-Injektion via Namen/Titel/Nachrichten).
 */
function fwg_esc($value): string {
    return htmlspecialchars((string)($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Erzeugt ein responsives, modernes HTML-E-Mail-Layout
 */
function render_email_template(array $params): string {
    $category    = htmlspecialchars($params['category'] ?? 'BENACHRICHTIGUNG');
    $categoryBg  = $params['category_bg'] ?? '#FEF08A'; // Tailwind yellow-200
    $categoryColor = $params['category_color'] ?? '#854D0E'; // Tailwind yellow-800
    $title       = htmlspecialchars($params['title'] ?? 'Benachrichtigung');
    $subtitle    = htmlspecialchars($params['subtitle'] ?? '');
    $greeting    = htmlspecialchars($params['greeting'] ?? 'Hallo,');
    $bodyHtml    = $params['body_html'] ?? '';
    $quoteBox    = $params['quote_box'] ?? null;
    $ctaText     = htmlspecialchars($params['cta_text'] ?? 'Zur Nachhilfebörse');
    $ctaUrl      = htmlspecialchars($params['cta_url'] ?? APP_URL);
    $appUrl      = APP_URL;

    $quoteSection = '';
    if (!empty($quoteBox)) {
        $quoteTitle = htmlspecialchars($quoteBox['title'] ?? '');
        $quoteContent = nl2br(htmlspecialchars($quoteBox['content'] ?? ''));
        $quoteSection = "
        <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='margin: 20px 0; background-color: #F8FAFC; border-left: 4px solid #FACC15; border-radius: 8px;'>
            <tr>
                <td style='padding: 16px 20px;'>
                    " . ($quoteTitle ? "<div style='font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;'>$quoteTitle</div>" : "") . "
                    <div style='font-size: 15px; color: #1E293B; line-height: 1.5; font-style: italic;'>$quoteContent</div>
                </td>
            </tr>
        </table>";
    }

    return "
<!DOCTYPE html>
<html lang='de'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>$title</title>
    <style>
        body { margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { color: #2563EB; text-decoration: none; font-weight: 600; }
        .btn-primary:hover { background-color: #EAB308 !important; }
        @media only screen and (max-width: 600px) {
            .wrapper { width: 100% !important; padding: 12px !important; }
            .card { padding: 24px 20px !important; border-radius: 16px !important; }
            .headline { font-size: 22px !important; line-height: 1.3 !important; }
        }
    </style>
</head>
<body style='background-color: #F1F5F9; margin: 0; padding: 40px 0;'>
    <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%'>
        <tr>
            <td align='center' style='padding: 0 16px;'>
                <!-- Main Container -->
                <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='600' class='wrapper' style='max-width: 600px; width: 100%;'>
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td align='center' style='padding-bottom: 24px;'>
                            <table role='presentation' border='0' cellpadding='0' cellspacing='0'>
                                <tr>
                                    <td style='vertical-align: middle; padding-right: 12px;'>
                                        <!-- Gold Logo Badge -->
                                        <div style='width: 44px; height: 44px; background-color: #0F172A; border-radius: 12px; display: inline-block; text-align: center; line-height: 44px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.1);'>
                                            <span style='font-size: 22px;'>🦉</span>
                                        </div>
                                    </td>
                                    <td style='vertical-align: middle;'>
                                        <div style='font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;'>
                                            FWG <span style='background-color: #FACC15; padding: 2px 8px; border-radius: 6px; color: #000;'>Nachhilfe</span>
                                        </div>
                                        <div style='font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px;'>
                                            Friedrich-Wilhelms-Gymnasium Köln
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Card Body -->
                    <tr>
                        <td style='background-color: #FFFFFF; border-radius: 24px; padding: 40px 36px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02); border: 1px solid #E2E8F0;' class='card'>
                            
                            <!-- Category Badge -->
                            <div style='margin-bottom: 16px;'>
                                <span style='display: inline-block; background-color: $categoryBg; color: $categoryColor; font-size: 12px; font-weight: 800; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.6px; text-transform: uppercase;'>
                                    $category
                                </span>
                            </div>

                            <!-- Title -->
                            <h1 class='headline' style='margin: 0 0 8px 0; font-size: 26px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; line-height: 1.3;'>
                                $title
                            </h1>
                            " . ($subtitle ? "<p style='margin: 0 0 24px 0; font-size: 15px; color: #64748B; font-weight: 500;'>$subtitle</p>" : "<div style='height: 16px;'></div>") . "

                            <!-- Greeting & Content -->
                            <p style='margin: 0 0 16px 0; font-size: 16px; color: #334155; line-height: 1.6;'>
                                <strong>$greeting</strong>
                            </p>
                            
                            <div style='font-size: 15px; color: #334155; line-height: 1.6;'>
                                $bodyHtml
                            </div>

                            <!-- Optional Quote / Preview Box -->
                            $quoteSection

                            <!-- Call to Action Button -->
                            <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='margin-top: 32px;'>
                                <tr>
                                    <td align='center'>
                                        <a href='$ctaUrl' target='_blank' style='display: inline-block; background-color: #FACC15; color: #000000; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; text-align: center; box-shadow: 0 4px 14px rgba(250, 204, 21, 0.4); border: 1px solid rgba(0,0,0,0.05);'>
                                            $ctaText &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style='margin-top: 36px; padding-top: 24px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #94A3B8; text-align: center;'>
                                Link funktioniert nicht? Kopiere diese Adresse in deinen Browser:<br>
                                <a href='$ctaUrl' style='color: #64748B; word-break: break-all; font-weight: 500;'>$ctaUrl</a>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style='padding: 32px 16px; text-align: center; font-size: 12px; color: #64748B; line-height: 1.6;'>
                            <div style='font-weight: 700; color: #475569; margin-bottom: 4px;'>
                                FWG Nachhilfebörse – Eine Initiative der Schülervertretung (SV)
                            </div>
                            <div>
                                Friedrich-Wilhelms-Gymnasium Köln • Severinstraße • 50678 Köln
                            </div>
                            <div style='margin-top: 12px;'>
                                <a href='$appUrl' style='color: #64748B; margin: 0 8px;'>Plattform öffnen</a> • 
                                <a href='$appUrl/#/datenschutz' style='color: #64748B; margin: 0 8px;'>Datenschutz</a> • 
                                <a href='$appUrl/#/impressum' style='color: #64748B; margin: 0 8px;'>Impressum</a>
                            </div>
                            <div style='margin-top: 12px; font-size: 11px; color: #94A3B8;'>
                                Du erhältst diese automatische E-Mail zu deinen Aktivitäten auf nachhilfe-sv.de.<br>
                                Du kannst deine E-Mail-Einstellungen jederzeit in deinem Profil anpassen.
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
}

/**
 * Versendet eine HTML-E-Mail über den ALL-INKL Webserver
 */
function send_html_email(string $toEmail, string $subject, string $htmlContent): bool {
    // E-Mail-Adresse validieren
    $to = filter_var(trim($toEmail), FILTER_VALIDATE_EMAIL);
    if (!$to) {
        error_log("E-Mail Versand abgebrochen: Ungültige Adresse '$toEmail'");
        return false;
    }

    $fromEmail = MAIL_FROM_EMAIL;
    $fromName = MAIL_FROM_NAME;
    $replyTo = MAIL_REPLY_TO;

    // Header für UTF-8 HTML E-Mails
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';

    $headers = [
        "MIME-Version: 1.0",
        "Content-type: text/html; charset=UTF-8",
        "From: $encodedFromName <$fromEmail>",
        "Reply-To: $replyTo",
        "X-Mailer: PHP/" . phpversion(),
        "X-Priority: 3"
    ];

    // Zusätzlicher Parameter -f setzt auf ALL-INKL den Envelope Sender (wichtig gegen Spam)
    $params = "-f " . escapeshellarg($fromEmail);

    try {
        return @mail($to, $encodedSubject, $htmlContent, implode("\r\n", $headers), $params);
    } catch (Exception $e) {
        error_log("Fehler beim E-Mail-Versand: " . $e->getMessage());
        return false;
    }
}

// ------------------------------------------------------------------------------
// VORDEFINIERTE BENACHRICHTIGUNGS-TEMPLATES
// ------------------------------------------------------------------------------

/**
 * 1. Willkommens-Mail nach Registrierung
 */
function send_email_welcome(string $toEmail, string $userName, string $role): bool {
    $roleName = match($role) {
        'sv_admin' => 'SV-Administrator',
        'parent' => 'Elternteil',
        default => 'Schüler/in'
    };

    $html = render_email_template([
        'category' => '👋 WILLKOMMEN',
        'category_bg' => '#DCFCE7', // Grün
        'category_color' => '#166534',
        'title' => 'Willkommen an Bord!',
        'subtitle' => 'Dein Konto auf der FWG Nachhilfebörse ist bereit.',
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Wir freuen uns sehr, dass du Teil der neuen FWG Nachhilfebörse bist!<br><br>
            Dein Account wurde erfolgreich als <strong>$roleName</strong> eingerichtet. Ab sofort kannst du Nachhilfe anbieten, gezielt nach Unterstützung suchen oder dich mit anderen Schülerinnen und Schülern des FWG austauschen.
        ",
        'quote_box' => [
            'title' => '🚀 Tipp zum Start',
            'content' => 'Vervollständige dein Profil und erstelle direkt dein erstes Nachhilfe-Angebot oder -Gesuch, um schneller gefunden zu werden.'
        ],
        'cta_text' => 'Jetzt loslegen',
        'cta_url' => APP_URL
    ]);

    return send_html_email($toEmail, 'Willkommen bei der FWG Nachhilfebörse! 🦉', $html);
}

/**
 * 2. Passwort zurücksetzen
 */
function send_email_password_reset(string $toEmail, string $userName, string $resetToken): bool {
    $resetUrl = APP_URL . "/#/update-password?token=" . urlencode($resetToken);

    $html = render_email_template([
        'category' => '🔐 SICHERHEIT',
        'category_bg' => '#FEE2E2', // Rot
        'category_color' => '#991B1B',
        'title' => 'Passwort zurücksetzen',
        'subtitle' => 'Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.',
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Wir haben eine Anfrage erhalten, das Passwort für dein Konto zurückzusetzen.<br><br>
            Klicke auf den folgenden Button, um ein neues, sicheres Passwort festzulegen. Dieser Link ist aus Sicherheitsgründen für <strong>2 Stunden</strong> gültig.<br><br>
            <em>Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren. Dein Passwort bleibt unverändert.</em>
        ",
        'cta_text' => 'Neues Passwort festlegen',
        'cta_url' => $resetUrl
    ]);

    return send_html_email($toEmail, 'Passwort zurücksetzen – FWG Nachhilfebörse', $html);
}

/**
 * 3. Neue Chat-Nachricht
 */
function send_email_new_chat_message(string $toEmail, string $recipientName, string $senderName, string $messageSnippet, string $requestId): bool {
    $chatUrl = APP_URL . "/#/chat/" . urlencode($requestId);
    // Hinweis: title/greeting/quote_box escapet render_email_template selbst;
    // nur body_html ist ein Raw-HTML-Sink und braucht fwg_esc().
    $senderHtml = fwg_esc($senderName);

    $html = render_email_template([
        'category' => '💬 NEUE NACHRICHT',
        'category_bg' => '#E0E7FF', // Indigo
        'category_color' => '#3730A3',
        'title' => "$senderName hat dir geschrieben",
        'subtitle' => 'Du hast eine neue private Nachricht auf der Nachhilfebörse erhalten.',
        'greeting' => "Hallo $recipientName,",
        'body_html' => "
            Du hast eine neue Nachricht von <strong>$senderHtml</strong> zu eurer Nachhilfe-Absprache erhalten:
        ",
        'quote_box' => [
            'title' => "Nachricht von $senderName",
            'content' => mb_substr($messageSnippet, 0, 300, 'UTF-8') . (mb_strlen($messageSnippet, 'UTF-8') > 300 ? '...' : '')
        ],
        'cta_text' => 'Im Chat antworten',
        'cta_url' => $chatUrl
    ]);

    return send_html_email($toEmail, "Neue Nachricht von $senderName 💬", $html);
}

/**
 * 4. Neue Kontaktanfrage für eine Anzeige
 */
function send_email_new_ad_request(string $toEmail, string $ownerName, string $requesterName, string $adTitle, string $messageSnippet, string $requestId): bool {
    $requestUrl = APP_URL . "/#/social?tab=requests";

    $html = render_email_template([
        'category' => '🤝 NEUE ANFRAGE',
        'category_bg' => '#FEF08A', // Gelb
        'category_color' => '#854D0E',
        'title' => 'Neues Interesse an deiner Anzeige!',
        'subtitle' => "Jemand möchte Nachhilfe zu: $adTitle",
        'greeting' => "Hallo $ownerName,",
        'body_html' => "
            Gute Neuigkeiten! <strong>" . fwg_esc($requesterName) . "</strong> hat Interesse an deiner Nachhilfe-Anzeige gezeigt und dir eine Kontaktanfrage gesendet.
        ",
        'quote_box' => [
            'title' => "Nachricht von $requesterName",
            'content' => $messageSnippet ?: 'Hallo! Ich habe deine Anzeige gesehen und würde mich gerne mit dir austauschen.'
        ],
        'cta_text' => 'Anfrage ansehen & annehmen',
        'cta_url' => $requestUrl
    ]);

    return send_html_email($toEmail, "Neues Interesse von $requesterName an deiner Anzeige 🤝", $html);
}

/**
 * 5. Kontaktanfrage wurde angenommen oder abgelehnt
 */
function send_email_request_status_update(string $toEmail, string $recipientName, string $actorName, string $status, string $adTitle, string $requestId): bool {
    $isAccepted = ($status === 'accepted');
    $chatUrl = APP_URL . "/#/chat/" . urlencode($requestId);

    $category = $isAccepted ? '✅ ANFRAGE ANGENOMMEN' : 'ℹ️ ANFRAGEN-UPDATE';
    $catBg = $isAccepted ? '#DCFCE7' : '#F1F5F9';
    $catColor = $isAccepted ? '#166534' : '#475569';
    $title = $isAccepted ? "$actorName hat deine Anfrage angenommen!" : "Update zu deiner Nachhilfe-Anfrage";

    $body = $isAccepted 
        ? "Großartig! <strong>" . fwg_esc($actorName) . "</strong> hat deine Anfrage zu <em>" . fwg_esc($adTitle) . "</em> angenommen. Ihr könnt jetzt direkt im Chat Termine und Details vereinbaren!"
        : "<strong>" . fwg_esc($actorName) . "</strong> hat den Status deiner Anfrage zu <em>" . fwg_esc($adTitle) . "</em> aktualisiert.";

    $html = render_email_template([
        'category' => $category,
        'category_bg' => $catBg,
        'category_color' => $catColor,
        'title' => $title,
        'greeting' => "Hallo $recipientName,",
        'body_html' => $body,
        'cta_text' => $isAccepted ? 'Direkt zum Chat' : 'Übersicht ansehen',
        'cta_url' => $isAccepted ? $chatUrl : (APP_URL . "/#/social?tab=requests")
    ]);

    $subj = $isAccepted ? "Anfrage angenommen von $actorName! 🎉" : "Status-Update zu deiner Nachhilfe-Anfrage";
    return send_html_email($toEmail, $subj, $html);
}

/**
 * 6. Jemand hat deine Anzeige auf die Merkliste gesetzt
 */
function send_email_ad_favorited(string $toEmail, string $ownerName, string $adTitle): bool {
    $feedUrl = APP_URL . "/#/feed";

    $html = render_email_template([
        'category' => '⭐ MERKLISTE',
        'category_bg' => '#FEF3C7', // Amber
        'category_color' => '#B45309',
        'title' => 'Deine Anzeige wurde gemerkt!',
        'subtitle' => "Beliebt bei anderen Schülern: $adTitle",
        'greeting' => "Hallo $ownerName,",
        'body_html' => "
            Jemand am FWG hat deine Nachhilfe-Anzeige <strong>„" . fwg_esc($adTitle) . "“</strong> auf die persönliche Merkliste gesetzt!<br><br>
            Deine Anzeige weckt echtes Interesse. Achte in den kommenden Tagen auf neue Kontaktanfragen und Nachrichten in deinem Postfach.
        ",
        'cta_text' => 'Anzeige & Feed ansehen',
        'cta_url' => $feedUrl
    ]);

    return send_html_email($toEmail, "Jemand hat deine Anzeige auf die Merkliste gesetzt! ⭐", $html);
}

/**
 * 7. Neues Match gefunden (Auto-Matching)
 */
function send_email_new_match(string $toEmail, string $userName, string $subjectName, int $matchScore): bool {
    $matchesUrl = APP_URL . "/#/social?tab=matches";

    $html = render_email_template([
        'category' => '✨ NEUES MATCH',
        'category_bg' => '#F3E8FF', // Lila
        'category_color' => '#6B21A8',
        'title' => "Neues Match in $subjectName gefunden!",
        'subtitle' => "Match-Score: $matchScore% Übereinstimmung",
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Unser automatisches Matching-System hat eine passende Nachhilfe-Anzeige für dich im Fach <strong>" . fwg_esc($subjectName) . "</strong> gefunden!<br><br>
            Klasse, Fach und Unterrichtsform stimmen hervorragend überein. Sieh dir das Match jetzt direkt an und nimm mit nur einem Klick Kontakt auf.
        ",
        'cta_text' => 'Match jetzt ansehen',
        'cta_url' => $matchesUrl
    ]);

    return send_html_email($toEmail, "Neues Nachhilfe-Match in $subjectName für dich! ✨", $html);
}

/**
 * 8. Neue Errungenschaft freigeschaltet (Achievements)
 */
function send_email_achievement(string $toEmail, string $userName, string $badgeTitle, string $badgeDescription): bool {
    $profileUrl = APP_URL . "/#/profile";

    $html = render_email_template([
        'category' => '🏆 NEUE ERRUNGENSCHAFT',
        'category_bg' => '#FEF08A', // Gold
        'category_color' => '#854D0E',
        'title' => "Errungenschaft freigeschaltet: $badgeTitle",
        'subtitle' => 'Herzlichen Glückwunsch zu deinem Meilenstein!',
        'greeting' => "Glückwunsch $userName!",
        'body_html' => "
            Du hast auf der FWG Nachhilfebörse eine neue Errungenschaft verdient:<br><br>
            <strong>" . fwg_esc($badgeTitle) . "</strong><br>
            <span style='color: #64748B;'>" . fwg_esc($badgeDescription) . "</span><br><br>
            Dieses Abzeichen schmückt ab sofort dein öffentliches Profil und zeigt anderen Schülern dein Engagement!
        ",
        'cta_text' => 'Zum Profil & Abzeichen',
        'cta_url' => $profileUrl
    ]);

    return send_html_email($toEmail, "🏆 Neue Errungenschaft freigeschaltet: $badgeTitle!", $html);
}

/**
 * 9. Neues Feature oder SV-Ankündigung (News Broadcast)
 */
function send_email_announcement(string $toEmail, string $userName, string $title, string $content): bool {
    $html = render_email_template([
        'category' => '🚀 NEUIGKEITEN',
        'category_bg' => '#E0F2FE', // Hellblau
        'category_color' => '#0369A1',
        'title' => $title,
        'subtitle' => 'Neues von der FWG Nachhilfebörse & Schülervertretung',
        'greeting' => "Hallo $userName,",
        'body_html' => nl2br(htmlspecialchars($content)),
        'cta_text' => 'Jetzt ausprobieren',
        'cta_url' => APP_URL
    ]);

    return send_html_email($toEmail, "Neu bei der FWG Nachhilfebörse: $title 🚀", $html);
}

/**
 * 10. Allgemeine Push-Benachrichtigung (Fallback)
 */
function send_email_generic_notification(string $toEmail, string $userName, string $title, string $message, string $ctaText = 'Jetzt ansehen', string $ctaUrl = APP_URL): bool {
    $html = render_email_template([
        'category' => '🔔 BENACHRICHTIGUNG',
        'category_bg' => '#F1F5F9',
        'category_color' => '#334155',
        'title' => $title,
        'greeting' => "Hallo $userName,",
        'body_html' => nl2br(htmlspecialchars($message)),
        'cta_text' => $ctaText,
        'cta_url' => $ctaUrl
    ]);

    return send_html_email($toEmail, "$title – FWG Nachhilfebörse", $html);
}

/**
 * 11. Neue Bewertung erhalten
 */
function send_email_new_review(string $toEmail, string $userName, string $authorName, float $rating, string $comment, float $newAvg): bool {
    $profileUrl = APP_URL . "/#/profile";
    $stars = str_repeat('⭐', (int)round($rating));

    $html = render_email_template([
        'category' => '⭐ NEUE BEWERTUNG',
        'category_bg' => '#FEF08A',
        'category_color' => '#854D0E',
        'title' => "$authorName hat dir $stars ($rating von 5) gegeben!",
        'subtitle' => "Dein Bewertungsschnitt liegt jetzt bei $newAvg von 5 Sternen.",
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Du hast soeben ein neues Feedback von <strong>" . fwg_esc($authorName) . "</strong> auf der FWG Nachhilfebörse erhalten!
        ",
        'quote_box' => [
            'title' => "Bewertung von $authorName ($stars)",
            'content' => $comment ?: 'Kein schriftlicher Kommentar hinterlassen.'
        ],
        'cta_text' => 'Profil & Bewertungen ansehen',
        'cta_url' => $profileUrl
    ]);

    return send_html_email($toEmail, "Neue Bewertung von $authorName erhalten ($stars) ⭐", $html);
}
