<?php
// ==============================================================================
// FWG Nachhilfebörse - E-Mail-Service (ALL-INKL)
// ------------------------------------------------------------------------------
// Deliverability-Rewrite:
//  - multipart/alternative (text/plain + text/html, UTF-8, base64, chunk_split)
//  - korrekte RFC-Header mit \r\n, bereinigt gegen Header-Injection
//  - kein X-Priority/X-Mailer (Bulk-Signale), List-Unsubscribe nur als mailto
//  - HTML in Tabellenoptik, max-width 600px, Inline-Styles, Dark-Mode-safe
//  - Logo als reines HTML/CSS-Badge (keine externen Bilder/SVGs)
// ==============================================================================

require_once __DIR__ . '/config.php';

// Design-Tokens der E-Mail-Vorlagen (nur Web-Font-Fallbacks, keine externen
// Bilder/Fonts/SVGs - E-Mail-Clients blocken oder strippen diese ohnehin).
const FWG_MAIL_FONT_BODY    = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
const FWG_MAIL_FONT_DISPLAY = "'Anton','Arial Narrow','Arial Black',Arial,sans-serif";
const FWG_MAIL_FONT_MONO    = "ui-monospace,Menlo,Consolas,'Courier New',monospace";

const FWG_MAIL_YELLOW = '#FACC15';
const FWG_MAIL_BLACK  = '#09090b';
const FWG_MAIL_PAPER  = '#faf7ef';

/**
 * Escaped Benutzereingaben für E-Mail-HTML (verhindert HTML-Injektion via Namen/Titel/Nachrichten).
 */
function fwg_esc($value): string {
    return htmlspecialchars((string)($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// ------------------------------------------------------------------------------
// Interne Helfer: Header, MIME, Text
// ------------------------------------------------------------------------------

/**
 * Entfernt Steuerzeichen/Zeilenumbrüche aus einem Header-Wert (Header-Injection).
 */
function mail_sanitize_header(string $value): string {
    $value = str_replace(["\r", "\n", "\0"], ' ', $value);
    return trim(preg_replace('/[ \t]+/', ' ', $value) ?? $value);
}

/**
 * Erlaubt nur einfache Hex-Farben, sonst Fallback (kein Style-Ausbruch möglich).
 */
function mail_sanitize_color(string $value, string $fallback): string {
    $value = trim($value);
    return preg_match('/^#[0-9a-fA-F]{3,8}$/', $value) ? $value : $fallback;
}

/**
 * Zusätzliche Härtung für Anzeigenamen (From): entfernt Zeichen, die eine
 * Header-Phrase zerlegen könnten.
 */
function mail_sanitize_display_name(string $value): string {
    $value = mail_sanitize_header($value);
    return trim(str_replace(['<', '>', ':', ';', '"', '\\'], '', $value));
}

/**
 * RFC-2047-kodierter Header-Text (Betreff, Absendername). Faltet nur mit
 * gültigem CRLF + Leerzeichen (kein Header-Bruch).
 */
function mail_encode_header_text(string $text): string {
    return mb_encode_mimeheader(mail_sanitize_header($text), 'UTF-8', 'B', "\r\n", 0);
}

/**
 * Zufällige UUID v4 für die Message-ID.
 */
function mail_generate_uuid(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Baut die vollständigen MIME-Header der Nachricht (Reihenfolge s. u.).
 * In-Reply-To wird nur gesetzt, wenn ein Kontext übergeben wird.
 */
function mail_build_headers(string $boundary, string $fromEmail, string $fromName, string $replyTo, ?string $inReplyTo = null): string {
    $eol = "\r\n";

    $domain = 'nachhilfe-sv.de';
    $at = strrpos($fromEmail, '@');
    if ($at !== false && substr($fromEmail, $at + 1) !== '') {
        $domain = substr($fromEmail, $at + 1);
    }

    $headers   = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Date: ' . date('r');
    $headers[] = 'Message-ID: <' . mail_generate_uuid() . '@' . $domain . '>';
    $headers[] = 'From: ' . mail_encode_header_text(mail_sanitize_display_name($fromName)) . ' <' . $fromEmail . '>';
    if ($replyTo !== '') {
        $headers[] = 'Reply-To: ' . $replyTo;
    }

    // Kein List-Unsubscribe-Post: Es existiert kein HTTPS-One-Click-Endpoint.
    $unsubscribeTo = $replyTo !== '' ? $replyTo : $fromEmail;
    $headers[] = 'List-Unsubscribe: <mailto:' . $unsubscribeTo . '?subject=Abmelden>';

    if ($inReplyTo !== null && $inReplyTo !== '') {
        $headers[] = 'In-Reply-To: <' . str_replace(['<', '>'], '', mail_sanitize_header($inReplyTo)) . '>';
    }

    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

    return implode($eol, $headers);
}

/**
 * Baut den MIME-Body: text/plain zuerst, danach text/html, beide als
 * UTF-8 base64 mit 76-Zeichen-Zeilen (chunk_split).
 */
function mail_build_message(string $plainText, string $htmlContent, string $boundary): string {
    $eol = "\r\n";

    $message  = '--' . $boundary . $eol;
    $message .= 'Content-Type: text/plain; charset=UTF-8' . $eol;
    $message .= 'Content-Transfer-Encoding: base64' . $eol . $eol;
    $message .= chunk_split(base64_encode($plainText), 76, $eol);

    $message .= '--' . $boundary . $eol;
    $message .= 'Content-Type: text/html; charset=UTF-8' . $eol;
    $message .= 'Content-Transfer-Encoding: base64' . $eol . $eol;
    $message .= chunk_split(base64_encode($htmlContent), 76, $eol);

    $message .= '--' . $boundary . '--' . $eol;

    return $message;
}

/**
 * Erzeugt aus dem HTML einen lesbaren text/plain-Teil. Links werden mit
 * sichtbarer Ziel-URL übernommen, der versteckte Preheader wird entfernt.
 */
function html_to_plain_text(string $html): string {
    $html = preg_replace('/<head\b[^>]*>.*?<\/head>/is', '', $html) ?? $html;
    $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $html) ?? $html;
    $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;
    $html = preg_replace('/<!--.*?-->/s', '', $html) ?? $html;

    // Versteckten Preheader (display:none) nicht in den Textteil übernehmen.
    $html = preg_replace('/<div\b[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>.*?<\/div>/is', '', $html) ?? $html;

    // Links als "Text (URL)" übernehmen (CTA-URL bleibt sichtbar; runde
    // Klammern überleben strip_tags, spitze nicht).
    $html = preg_replace_callback('/<a\b[^>]*href=(["\'])(.*?)\1[^>]*>(.*?)<\/a>/is', function (array $m): string {
        $href = trim(html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $text = trim(html_entity_decode(strip_tags($m[3]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if ($href === '') {
            return $text;
        }
        if (stripos($href, 'mailto:') === 0) {
            return $text !== '' ? $text . ' (' . substr($href, 7) . ')' : substr($href, 7);
        }
        if ($text === '' || $text === $href) {
            return $href;
        }
        return $text . ' (' . $href . ')';
    }, $html) ?? $html;

    $html = preg_replace('/<br\s*\/?>/i', "\n", $html) ?? $html;
    $html = preg_replace('/<\/(p|div|tr|table|h[1-6]|li|blockquote)>/i', "\n", $html) ?? $html;
    $html = preg_replace('/<li\b[^>]*>/i', '- ', $html) ?? $html;

    $plain = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $plain = str_replace(["\r\n", "\r"], "\n", $plain);
    $plain = preg_replace('/[ \t]+/', ' ', $plain) ?? $plain;
    $plain = preg_replace('/ *\n */', "\n", $plain) ?? $plain;
    $plain = preg_replace('/\n{3,}/', "\n\n", $plain) ?? $plain;

    return trim($plain);
}

// ------------------------------------------------------------------------------
// Interne Helfer: HTML-Bausteine (Tabellen, Inline-Styles)
// ------------------------------------------------------------------------------

/**
 * Logo als HTML/CSS-Badge: schwarzes Quadrat mit gelbem "FWG",
 * daneben der "Nachhilfe"-Chip und die Schulzeile.
 */
function mail_render_logo(): string {
    $fontDisplay = FWG_MAIL_FONT_DISPLAY;
    $fontBody    = FWG_MAIL_FONT_BODY;

    return "
    <table role='presentation' border='0' cellpadding='0' cellspacing='0'>
        <tr>
            <td width='52' height='52' align='center' valign='middle' bgcolor='" . FWG_MAIL_BLACK . "' style='width:52px;height:52px;background-color:" . FWG_MAIL_BLACK . ";font-family:$fontDisplay;font-size:20px;font-weight:900;letter-spacing:0.05em;line-height:52px;color:" . FWG_MAIL_YELLOW . ";text-transform:uppercase;'>FWG</td>
            <td class='stack' style='padding-left:14px;vertical-align:middle;'>
                <table role='presentation' border='0' cellpadding='0' cellspacing='0'>
                    <tr>
                        <td bgcolor='" . FWG_MAIL_BLACK . "' style='background-color:" . FWG_MAIL_BLACK . ";padding:4px 10px;font-family:$fontDisplay;font-size:15px;font-weight:900;letter-spacing:0.12em;line-height:1.2;color:" . FWG_MAIL_YELLOW . ";text-transform:uppercase;'>Nachhilfe</td>
                    </tr>
                    <tr>
                        <td style='padding-top:6px;font-family:$fontBody;font-size:10px;font-weight:700;letter-spacing:0.16em;line-height:1.3;color:#3f3f46;text-transform:uppercase;'>Friedrich-Wilhelm-Gymnasium Köln</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>";
}

/**
 * Kategorie-Badge: schwarzer Chip mit gelbem Akzentstreifen,
 * Textfarbe je Anlass (category_bg).
 */
function mail_render_chip(string $label, string $textColor): string {
    $label     = fwg_esc($label);
    $textColor = mail_sanitize_color($textColor, FWG_MAIL_YELLOW);
    $fontMono  = FWG_MAIL_FONT_MONO;

    return "
    <table role='presentation' border='0' cellpadding='0' cellspacing='0' style='margin:0 0 18px 0;'>
        <tr>
            <td width='6' bgcolor='" . FWG_MAIL_YELLOW . "' style='width:6px;background-color:" . FWG_MAIL_YELLOW . ";font-size:0;line-height:0;'>&nbsp;</td>
            <td bgcolor='" . FWG_MAIL_BLACK . "' style='background-color:" . FWG_MAIL_BLACK . ";padding:6px 12px;font-family:$fontMono;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:$textColor;'>$label</td>
        </tr>
    </table>";
}

/**
 * Bulletproof-Button als Tabelle mit bgcolor (kein VML, kein Gradient).
 */
function mail_render_button(string $text, string $url): string {
    $label = fwg_esc($text !== '' ? $text : 'Zur Nachhilfebörse');
    $href  = fwg_esc($url !== '' ? $url : APP_URL);
    $fontBody = FWG_MAIL_FONT_BODY;

    return "
    <table role='presentation' border='0' cellpadding='0' cellspacing='0' style='margin:0;'>
        <tr>
            <td align='center' bgcolor='" . FWG_MAIL_YELLOW . "' style='background-color:" . FWG_MAIL_YELLOW . ";border:2px solid " . FWG_MAIL_BLACK . ";'>
                <a href='$href' target='_blank' style='display:inline-block;padding:14px 30px;font-family:$fontBody;font-size:15px;font-weight:900;letter-spacing:0.06em;text-transform:uppercase;color:" . FWG_MAIL_BLACK . ";text-decoration:none;'>$label &rarr;</a>
            </td>
        </tr>
    </table>";
}

// ------------------------------------------------------------------------------
// Basis-Layout
// ------------------------------------------------------------------------------

/**
 * Erzeugt das HTML-E-Mail-Layout (Papier-Hintergrund, Poster-Karte,
 * gelbes Kopfband mit Logo, schwarzes Fussband mit Rechtliches).
 * Parameter-Keys unverändert: category, category_bg, category_color, title,
 * subtitle, greeting, body_html, quote_box, cta_text, cta_url, preheader.
 */
function render_email_template(array $params): string {
    $categoryRaw   = (string)($params['category'] ?? 'BENACHRICHTIGUNG');
    $categoryBg    = mail_sanitize_color((string)($params['category_bg'] ?? '#FEF08A'), '#FEF08A');
    $categoryColor = mail_sanitize_color((string)($params['category_color'] ?? '#854D0E'), '#854D0E');
    $title         = fwg_esc($params['title'] ?? 'Benachrichtigung');
    $subtitle      = fwg_esc($params['subtitle'] ?? '');
    $greeting      = fwg_esc($params['greeting'] ?? 'Hallo,');
    $bodyHtml      = (string)($params['body_html'] ?? '');
    $quoteBox      = $params['quote_box'] ?? null;

    $appUrl      = fwg_esc(APP_URL);
    $fontBody    = FWG_MAIL_FONT_BODY;
    $fontDisplay = FWG_MAIL_FONT_DISPLAY;
    $fontMono    = FWG_MAIL_FONT_MONO;
    $year        = date('Y');

    $logo          = mail_render_logo();
    $categoryChip  = mail_render_chip($categoryRaw, $categoryBg);
    $ctaSection    = mail_render_button((string)($params['cta_text'] ?? 'Zur Nachhilfebörse'), (string)($params['cta_url'] ?? APP_URL));
    $ctaUrl        = fwg_esc($params['cta_url'] ?? APP_URL);

    // Preheader (versteckt) inkl. Füllzeichen gegen Durchbluten des Inhalts.
    $preheaderText    = fwg_esc(mb_substr((string)($params['preheader'] ?? ''), 0, 140, 'UTF-8'));
    $preheaderSection = '';
    if ($preheaderText !== '') {
        $filler = str_repeat('&zwnj;&nbsp;', 30);
        $preheaderSection = "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;\">$preheaderText$filler</div>";
    }

    $subtitleSection = $subtitle !== ''
        ? "<p style='margin:0 0 22px 0;font-family:$fontBody;font-size:15px;font-weight:500;line-height:1.5;color:#52525b;'>$subtitle</p>"
        : "<div style='height:8px;'></div>";

    $quoteSection = '';
    if (!empty($quoteBox) && is_array($quoteBox)) {
        $quoteTitle   = fwg_esc($quoteBox['title'] ?? '');
        $quoteContent = nl2br(fwg_esc($quoteBox['content'] ?? ''));
        $quoteTitleBlock = $quoteTitle !== ''
            ? "<div style='margin-bottom:8px;font-family:$fontMono;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#52525b;'>$quoteTitle</div>"
            : '';
        $quoteSection = "
            <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='margin:24px 0 0 0;background-color:" . FWG_MAIL_PAPER . ";border:1px solid " . FWG_MAIL_BLACK . ";border-left:5px solid $categoryColor;'>
                <tr>
                    <td style='padding:16px 18px;'>
                        $quoteTitleBlock
                        <div style='font-family:$fontBody;font-size:15px;line-height:1.6;color:#27272a;'>$quoteContent</div>
                    </td>
                </tr>
            </table>";
    }

    return <<<HTML
<!DOCTYPE html>
<html lang='de'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <meta http-equiv='X-UA-Compatible' content='IE=edge'>
    <meta name='x-apple-disable-message-reformatting'>
    <meta name='color-scheme' content='light only'>
    <meta name='supported-color-schemes' content='light only'>
    <title>$title</title>
    <style>
        body { margin:0; padding:0; background-color:#faf7ef; }
        table { border-collapse:collapse; }
        a { color:#1d4ed8; }
        @media only screen and (max-width:600px) {
            .wrapper { width:100% !important; }
            .card-pad { padding:28px 20px !important; }
            .headline { font-size:22px !important; }
            .stack { display:block !important; width:100% !important; padding-left:0 !important; padding-top:12px !important; }
        }
    </style>
</head>
<body style='margin:0;padding:32px 12px;background-color:#faf7ef;'>
$preheaderSection
<table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%'>
    <tr>
        <td align='center'>
            <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='600' class='wrapper' style='width:100%;max-width:600px;background-color:#ffffff;border:2px solid #09090b;'>
                <tr>
                    <td bgcolor='#FACC15' style='background-color:#FACC15;padding:20px 28px;border-bottom:2px solid #09090b;'>
                        $logo
                    </td>
                </tr>
                <tr>
                    <td class='card-pad' style='background-color:#ffffff;padding:36px 32px 32px 32px;'>
                        $categoryChip
                        <h1 class='headline' style='margin:0 0 14px 0;font-family:$fontDisplay;font-size:26px;line-height:1.18;font-weight:900;letter-spacing:0.01em;text-transform:uppercase;color:#09090b;'>$title</h1>
                        <table role='presentation' border='0' cellpadding='0' cellspacing='0' style='margin:0 0 20px 0;'>
                            <tr>
                                <td width='48' height='5' bgcolor='#FACC15' style='width:48px;height:5px;background-color:#FACC15;font-size:0;line-height:0;'>&nbsp;</td>
                            </tr>
                        </table>
                        $subtitleSection
                        <p style='margin:0 0 14px 0;font-family:$fontBody;font-size:16px;line-height:1.6;font-weight:700;color:#09090b;'>$greeting</p>
                        <div style='font-family:$fontBody;font-size:15px;line-height:1.65;color:#27272a;'>$bodyHtml</div>
                        $quoteSection
                        <div style='margin-top:30px;'>$ctaSection</div>
                        <div style='margin-top:32px;padding-top:20px;border-top:1px solid #e4e0d5;font-family:$fontBody;font-size:12px;line-height:1.6;color:#71717a;'>
                            Link funktioniert nicht? Kopiere diese Adresse in deinen Browser:<br>
                            <a href='$ctaUrl' style='color:#52525b;word-break:break-all;'>$ctaUrl</a>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td height='6' bgcolor='#FACC15' style='height:6px;background-color:#FACC15;font-size:0;line-height:0;'>&nbsp;</td>
                </tr>
                <tr>
                    <td bgcolor='#09090b' style='background-color:#09090b;padding:24px 28px 26px 28px;'>
                        <div style='font-family:$fontDisplay;font-size:13px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#FACC15;'>FWG Nachhilfebörse</div>
                        <div style='padding-top:8px;font-family:$fontBody;font-size:12px;line-height:1.6;color:#a1a1aa;'>
                            Eine Initiative der Schülervertretung (SV)<br>
                            Friedrich-Wilhelm-Gymnasium Köln &middot; Severinstraße 241 &middot; 50676 Köln
                        </div>
                        <div style='padding-top:12px;font-family:$fontBody;font-size:12px;line-height:1.6;'>
                            <a href='$appUrl' style='color:#FACC15;text-decoration:underline;'>Plattform öffnen</a>
                            <span style='color:#3f3f46;'>&nbsp;&middot;&nbsp;</span>
                            <a href='$appUrl/#/datenschutz' style='color:#FACC15;text-decoration:underline;'>Datenschutz</a>
                            <span style='color:#3f3f46;'>&nbsp;&middot;&nbsp;</span>
                            <a href='$appUrl/#/impressum' style='color:#FACC15;text-decoration:underline;'>Impressum</a>
                        </div>
                        <div style='padding-top:14px;font-family:$fontBody;font-size:11px;line-height:1.6;color:#71717a;'>
                            Du erhältst diese automatische E-Mail zu deinen Aktivitäten auf nachhilfe-sv.de.<br>
                            Fragen dazu? Schreib uns an <a href='mailto:info@nachhilfe-sv.de' style='color:#FACC15;'>info@nachhilfe-sv.de</a>.
                        </div>
                        <div style='padding-top:10px;font-family:$fontBody;font-size:11px;color:#52525b;'>&copy; $year SV Friedrich-Wilhelm-Gymnasium Köln</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
HTML;
}

// ------------------------------------------------------------------------------
// Versand
// ------------------------------------------------------------------------------

/**
 * Versendet eine HTML-E-Mail über den ALL-INKL Webserver als korrekte
 * multipart/alternative-Nachricht (Text- und HTML-Teil, UTF-8, base64).
 */
function send_html_email(string $toEmail, string $subject, string $htmlContent): bool {
    $to = filter_var(trim($toEmail), FILTER_VALIDATE_EMAIL);
    if (!$to) {
        error_log('E-Mail Versand abgebrochen: Ungültige Empfängeradresse');
        return false;
    }

    $fromEmail = mail_sanitize_header(MAIL_FROM_EMAIL);
    $fromName  = mail_sanitize_header(MAIL_FROM_NAME);
    $replyTo   = mail_sanitize_header(MAIL_REPLY_TO);

    if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
        error_log('E-Mail Versand abgebrochen: Ungültige Absenderadresse in MAIL_FROM_EMAIL');
        return false;
    }
    if (!filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $replyTo = '';
    }

    $subject = mail_sanitize_header($subject);

    // Fragmente (z. B. Testmail aus health.php) in ein vollständiges Dokument hüllen.
    $html = $htmlContent;
    if (stripos($html, '<html') === false) {
        $fontBody = FWG_MAIL_FONT_BODY;
        $html = "<!DOCTYPE html>\n<html lang='de'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>"
              . "<body style='margin:0;padding:24px;background-color:" . FWG_MAIL_PAPER . ";font-family:$fontBody;font-size:15px;line-height:1.6;color:#27272a;'>"
              . $htmlContent
              . '</body></html>';
    }

    try {
        $boundary  = '=_fwg_' . bin2hex(random_bytes(16));
        $plainText = html_to_plain_text($html);
        if (trim($plainText) === '') {
            $plainText = trim(strip_tags($html));
        }

        $headers = mail_build_headers($boundary, $fromEmail, $fromName, $replyTo);
        $body    = mail_build_message($plainText, $html, $boundary);

        // Der -f Parameter setzt auf ALL-INKL den Envelope-Sender (wichtig gegen Spam).
        $params = '-f ' . escapeshellarg($fromEmail);

        return @mail($to, mail_encode_header_text($subject), $body, $headers, $params);
    } catch (Throwable $e) {
        error_log('Fehler beim E-Mail-Versand: ' . $e->getMessage());
        return false;
    }
}

// ------------------------------------------------------------------------------
// VORDEFINIERTE BENACHRICHTIGUNGS-TEMPLATES
// ------------------------------------------------------------------------------

/**
 * 0. Bestätigungs-Code nach Registrierung (Spam-Schutz: erst nach Code-Eingabe gibt es ein Login)
 */
function send_email_verification(string $toEmail, string $userName, string $code): bool {
    $digits = implode('', array_map(
        fn($d) => '<span style="display:inline-block;min-width:40px;padding:10px 0;margin:0 3px;background-color:' . FWG_MAIL_YELLOW . ';border:2px solid ' . FWG_MAIL_BLACK . ';border-radius:4px;font-family:' . FWG_MAIL_FONT_MONO . ';font-size:26px;font-weight:900;color:' . FWG_MAIL_BLACK . ';">' . fwg_esc($d) . '</span>',
        str_split($code)
    ));

    $html = render_email_template([
        'category' => 'BESTÄTIGUNG',
        'category_bg' => '#FEF9C3', // Gelb
        'category_color' => '#713F12',
        'title' => 'Bestätige deine E-Mail',
        'subtitle' => 'Ein Schritt noch – dann kann es losgehen.',
        'preheader' => 'Dein Bestätigungs-Code für die FWG Nachhilfebörse.',
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Danke für deine Registrierung bei der FWG Nachhilfebörse! Zum Schutz vor Spam-Accounts musst du deine E-Mail-Adresse kurz bestätigen.<br><br>
            <strong>Dein Bestätigungs-Code (30 Minuten gültig):</strong><br><br>
            <div style=\"text-align:center;margin:8px 0 4px;\">$digits</div><br>
            Gib den Code einfach auf der Bestätigungs-Seite ein.<br><br>
            <em>Falls du dich nicht registriert hast, ignoriere diese E-Mail – es wird kein Konto ohne Code-Bestätigung freigeschaltet.</em>
        ",
        'quote_box' => [
            'title' => 'Kein Code angekommen?',
            'content' => 'Prüfe deinen Spam-Ordner. Auf der Bestätigungs-Seite kannst du dir kostenlos einen neuen Code zuschicken lassen.'
        ],
        'cta_text' => 'Code jetzt eingeben',
        'cta_url' => APP_URL . '/#/verify-email'
    ]);

    return send_html_email($toEmail, 'Dein Bestätigungs-Code – FWG Nachhilfebörse', $html);
}

/**
 * 1. Willkommens-Mail nach Registrierung
 */
function send_email_welcome(string $toEmail, string $userName, string $role): bool {
    $roleName = match($role) {
        'sv_admin' => 'SV-Administrator',
        'coach_admin' => 'Schüler-Coach (AG-Leitung)',
        'parent' => 'Elternteil',
        default => 'Schüler/in'
    };

    $html = render_email_template([
        'category' => 'WILLKOMMEN',
        'category_bg' => '#DCFCE7', // Grün
        'category_color' => '#166534',
        'title' => 'Willkommen an Bord!',
        'subtitle' => 'Dein Konto auf der FWG Nachhilfebörse ist bereit.',
        'preheader' => 'Dein Konto ist bereit – jetzt Profil vervollständigen und loslegen.',
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Wir freuen uns sehr, dass du Teil der neuen FWG Nachhilfebörse bist!<br><br>
            Dein Account wurde erfolgreich als <strong>$roleName</strong> eingerichtet. Ab sofort kannst du Nachhilfe anbieten, gezielt nach Unterstützung suchen oder dich mit anderen Schülerinnen und Schülern des FWG austauschen.
        ",
        'quote_box' => [
            'title' => 'Tipp zum Start',
            'content' => 'Vervollständige dein Profil und erstelle direkt dein erstes Nachhilfe-Angebot oder -Gesuch, um schneller gefunden zu werden.'
        ],
        'cta_text' => 'Jetzt loslegen',
        'cta_url' => APP_URL
    ]);

    return send_html_email($toEmail, 'Willkommen bei der FWG Nachhilfebörse!', $html);
}

/**
 * 2. Passwort zurücksetzen
 */
function send_email_password_reset(string $toEmail, string $userName, string $resetToken): bool {
    $resetUrl = APP_URL . "/#/update-password?token=" . urlencode($resetToken);

    $html = render_email_template([
        'category' => 'SICHERHEIT',
        'category_bg' => '#FEE2E2', // Rot
        'category_color' => '#991B1B',
        'title' => 'Passwort zurücksetzen',
        'subtitle' => 'Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.',
        'preheader' => 'Lege in 2 Stunden ein neues Passwort fest.',
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
        'category' => 'NEUE NACHRICHT',
        'category_bg' => '#E0E7FF', // Indigo
        'category_color' => '#3730A3',
        'title' => "$senderName hat dir geschrieben",
        'subtitle' => 'Du hast eine neue private Nachricht auf der Nachhilfebörse erhalten.',
        'preheader' => "$senderName hat dir geschrieben – antworte direkt im Chat.",
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

    return send_html_email($toEmail, "Neue Nachricht von $senderName", $html);
}

/**
 * 4. Neue Kontaktanfrage für eine Anzeige
 */
function send_email_new_ad_request(string $toEmail, string $ownerName, string $requesterName, string $adTitle, string $messageSnippet, string $requestId): bool {
    $requestUrl = APP_URL . "/#/social?tab=requests";

    $html = render_email_template([
        'category' => 'NEUE ANFRAGE',
        'category_bg' => '#FEF08A', // Gelb
        'category_color' => '#854D0E',
        'title' => 'Neues Interesse an deiner Anzeige!',
        'subtitle' => "Jemand möchte Nachhilfe zu: $adTitle",
        'preheader' => "Jemand interessiert sich für deine Anzeige: $adTitle.",
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

    return send_html_email($toEmail, "Neues Interesse von $requesterName an deiner Anzeige", $html);
}

/**
 * 5. Kontaktanfrage wurde angenommen oder abgelehnt
 */
function send_email_request_status_update(string $toEmail, string $recipientName, string $actorName, string $status, string $adTitle, string $requestId): bool {
    $isAccepted = ($status === 'accepted');
    $chatUrl = APP_URL . "/#/chat/" . urlencode($requestId);

    $category = $isAccepted ? 'ANFRAGE ANGENOMMEN' : 'ANFRAGEN-UPDATE';
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

    $subj = $isAccepted ? "Anfrage angenommen von $actorName!" : "Status-Update zu deiner Nachhilfe-Anfrage";
    return send_html_email($toEmail, $subj, $html);
}

/**
 * 6. Jemand hat deine Anzeige auf die Merkliste gesetzt
 */
function send_email_ad_favorited(string $toEmail, string $ownerName, string $adTitle): bool {
    $feedUrl = APP_URL . '/#/';

    $html = render_email_template([
        'category' => 'MERKLISTE',
        'category_bg' => '#FEF3C7', // Amber
        'category_color' => '#B45309',
        'title' => 'Deine Anzeige wurde gemerkt!',
        'subtitle' => "Beliebt bei anderen Schülern: $adTitle",
        'preheader' => 'Deine Anzeige weckt Interesse – sieh nach, wer sie gemerkt hat.',
        'greeting' => "Hallo $ownerName,",
        'body_html' => "
            Jemand am FWG hat deine Nachhilfe-Anzeige <strong>„" . fwg_esc($adTitle) . "“</strong> auf die persönliche Merkliste gesetzt!<br><br>
            Deine Anzeige weckt echtes Interesse. Achte in den kommenden Tagen auf neue Kontaktanfragen und Nachrichten in deinem Postfach.
        ",
        'cta_text' => 'Anzeige ansehen',
        'cta_url' => $feedUrl
    ]);

    return send_html_email($toEmail, 'Jemand hat deine Anzeige auf die Merkliste gesetzt', $html);
}

/**
 * 7. Neues Match gefunden (Auto-Matching)
 */
function send_email_new_match(string $toEmail, string $userName, string $subjectName, int $matchScore): bool {
    $matchesUrl = APP_URL . "/#/social?tab=matches";

    $html = render_email_template([
        'category' => 'NEUES MATCH',
        'category_bg' => '#F3E8FF', // Lila
        'category_color' => '#6B21A8',
        'title' => "Neues Match in $subjectName gefunden!",
        'subtitle' => "Match-Score: $matchScore% Übereinstimmung",
        'preheader' => 'Eine passende Nachhilfe-Anzeige wartet auf dich.',
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Unser automatisches Matching-System hat eine passende Nachhilfe-Anzeige für dich im Fach <strong>" . fwg_esc($subjectName) . "</strong> gefunden!<br><br>
            Klasse, Fach und Unterrichtsform stimmen hervorragend überein. Sieh dir das Match jetzt direkt an und nimm mit nur einem Klick Kontakt auf.
        ",
        'cta_text' => 'Match jetzt ansehen',
        'cta_url' => $matchesUrl
    ]);

    return send_html_email($toEmail, "Neues Nachhilfe-Match in $subjectName für dich", $html);
}

/**
 * 8. Neue Errungenschaft freigeschaltet (Achievements)
 */
function send_email_achievement(string $toEmail, string $userName, string $badgeTitle, string $badgeDescription): bool {
    $profileUrl = APP_URL . "/#/profile";

    $html = render_email_template([
        'category' => 'NEUE ERRUNGENSCHAFT',
        'category_bg' => '#FEF08A', // Gold
        'category_color' => '#854D0E',
        'title' => "Errungenschaft freigeschaltet: $badgeTitle",
        'subtitle' => 'Herzlichen Glückwunsch zu deinem Meilenstein!',
        'preheader' => 'Du hast ein neues Abzeichen auf der Nachhilfebörse verdient.',
        'greeting' => "Glückwunsch $userName!",
        'body_html' => "
            Du hast auf der FWG Nachhilfebörse eine neue Errungenschaft verdient:<br><br>
            <strong>" . fwg_esc($badgeTitle) . "</strong><br>
            <span style='color: #52525b;'>" . fwg_esc($badgeDescription) . "</span><br><br>
            Dieses Abzeichen schmückt ab sofort dein öffentliches Profil und zeigt anderen Schülern dein Engagement!
        ",
        'cta_text' => 'Zum Profil & Abzeichen',
        'cta_url' => $profileUrl
    ]);

    return send_html_email($toEmail, "Neue Errungenschaft freigeschaltet: $badgeTitle", $html);
}

/**
 * 9. Neues Feature oder SV-Ankündigung (News Broadcast)
 */
function send_email_announcement(string $toEmail, string $userName, string $title, string $content): bool {
    $html = render_email_template([
        'category' => 'NEUIGKEITEN',
        'category_bg' => '#E0F2FE', // Hellblau
        'category_color' => '#0369A1',
        'title' => $title,
        'subtitle' => 'Neues von der FWG Nachhilfebörse & Schülervertretung',
        'preheader' => 'Neuigkeiten von deiner Nachhilfebörse.',
        'greeting' => "Hallo $userName,",
        'body_html' => nl2br(fwg_esc($content)),
        'cta_text' => 'Jetzt ausprobieren',
        'cta_url' => APP_URL
    ]);

    return send_html_email($toEmail, "Neu bei der FWG Nachhilfebörse: $title", $html);
}

/**
 * 10. Allgemeine Push-Benachrichtigung (Fallback)
 */
function send_email_generic_notification(string $toEmail, string $userName, string $title, string $message, string $ctaText = 'Jetzt ansehen', string $ctaUrl = APP_URL): bool {
    $html = render_email_template([
        'category' => 'BENACHRICHTIGUNG',
        'category_bg' => '#F1F5F9',
        'category_color' => '#334155',
        'title' => $title,
        'preheader' => 'Es gibt etwas Neues für dich auf der Nachhilfebörse.',
        'greeting' => "Hallo $userName,",
        'body_html' => nl2br(fwg_esc($message)),
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
    $ratingText = rtrim(rtrim(number_format($rating, 1, ',', ''), '0'), ',') . ' von 5 Sternen';

    $html = render_email_template([
        'category' => 'NEUE BEWERTUNG',
        'category_bg' => '#FEF08A',
        'category_color' => '#854D0E',
        'title' => "$authorName hat dir $ratingText gegeben!",
        'subtitle' => "Dein Bewertungsschnitt liegt jetzt bei $newAvg von 5 Sternen.",
        'preheader' => 'Du hast eine neue Bewertung erhalten.',
        'greeting' => "Hallo $userName,",
        'body_html' => "
            Du hast soeben ein neues Feedback von <strong>" . fwg_esc($authorName) . "</strong> auf der FWG Nachhilfebörse erhalten!
        ",
        'quote_box' => [
            'title' => "Bewertung von $authorName ($ratingText)",
            'content' => $comment ?: 'Kein schriftlicher Kommentar hinterlassen.'
        ],
        'cta_text' => 'Profil & Bewertungen ansehen',
        'cta_url' => $profileUrl
    ]);

    return send_html_email($toEmail, "Neue Bewertung von $authorName erhalten ($ratingText)", $html);
}
