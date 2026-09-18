<?php
// ==============================================================================
// FWG Nachhilfebörse - File-basiertes Rate Limiting (Sliding Window)
// Shared-Hosting-tauglich (kein Redis/DB nötig). Fail-open bei IO-Problemen,
// damit ein volles tmp-Verzeichnis nie den Login lahmlegt.
// ==============================================================================

function fwg_rate_limit(string $action, int $limit, int $windowSec): bool {
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    $ip = $fwd !== '' ? trim(explode(',', (string)$fwd)[0]) : ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $ip = mb_substr((string)$ip, 0, 64);

    $dir = rtrim(sys_get_temp_dir(), '/') . '/fwg_rl';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        return true;
    }
    $safeAction = preg_replace('/[^a-z0-9_-]/i', '', $action);
    $file = $dir . '/' . $safeAction . '_' . md5($ip) . '.json';

    $fp = @fopen($file, 'c+');
    if (!$fp) {
        return true;
    }
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        return true;
    }
    $raw = stream_get_contents($fp);
    $decoded = $raw ? json_decode($raw, true) : [];
    $hits = is_array($decoded) ? $decoded : [];
    $now = time();
    $hits = array_values(array_filter($hits, function ($t) use ($now, $windowSec) {
        return is_numeric($t) && $t > $now - $windowSec;
    }));

    $allowed = count($hits) < $limit;
    if ($allowed) {
        $hits[] = $now;
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($hits));
    flock($fp, LOCK_UN);
    fclose($fp);

    return $allowed;
}

function fwg_require_rate_limit(string $action, int $limit, int $windowSec): void {
    if (!fwg_rate_limit($action, $limit, $windowSec)) {
        json_error('Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.', 429);
    }
}
