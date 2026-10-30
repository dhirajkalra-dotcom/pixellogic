<?php
/**
 * Simple secure download — single file.
 * Validates a 24h HMAC-signed link and serves the installer.
 */

// === CHANGE THIS to a long random string (must match link-generator.html) ===
$SECRET = 'CHANGE-ME-TO-A-LONG-RANDOM-STRING-1a2b3c4d5e6f7g8h9i0j';

$FILES = [
    'pixelogic' => 'downloads/Pixelogic-Setup-1.0.112.exe',
    'eventflow' => 'downloads/EventFlow Schematics_0.3.1_x64-setup.exe',
    'stagecue'  => 'downloads/StageCue-1.5.0-x64-Setup.exe',
];

$p = $_GET['p'] ?? '';
$e = (int)($_GET['e'] ?? 0);
$s = $_GET['s'] ?? '';

$expected = hash_hmac('sha256', $p . '|' . $e, $SECRET);

if (!isset($FILES[$p]) || !hash_equals($expected, $s) || time() > $e) {
    header('Location: /expired.html');
    exit;
}

$file = __DIR__ . '/' . $FILES[$p];
if (!file_exists($file)) { http_response_code(404); exit('Not found'); }

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . basename($file) . '"');
header('Content-Length: ' . filesize($file));
if (ob_get_level()) ob_end_clean();
readfile($file);
