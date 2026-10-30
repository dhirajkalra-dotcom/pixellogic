<?php
/**
 * Secure download handler for PixelLogic / EventFlow / StageCue full versions.
 *
 * URL format:
 *   /download.php?p=<product>&e=<expiryUnix>&u=<userIdOrEmail>&s=<signature>
 *
 * The signature is HMAC-SHA256 of "<p>|<e>|<u>" using SECRET_KEY.
 * Links are valid for 24 hours from the moment they were generated.
 *
 * Files are served from the downloads/ folder.
 */

// ============================================================================
// CONFIGURATION  -- CHANGE SECRET_KEY before deploying!
// ============================================================================
define('SECRET_KEY', 'CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARS_LONG_xY9!q');

// Map of product slug => actual filename inside downloads/
$PRODUCTS = [
    'pixelogic'  => 'Pixelogic-Setup-1.0.112.exe',
    'eventflow'  => 'EventFlow Schematics_0.3.1_x64-setup.exe',
    'stagecue'   => 'StageCue-1.5.0-x64-Setup.exe',
];

$FILES_DIR = __DIR__ . '/downloads/';

// ============================================================================
// VALIDATE REQUEST
// ============================================================================
$product = isset($_GET['p']) ? strtolower(trim($_GET['p'])) : '';
$expiry  = isset($_GET['e']) ? (int)$_GET['e'] : 0;
$user    = isset($_GET['u']) ? trim($_GET['u']) : '';
$sig     = isset($_GET['s']) ? trim($_GET['s']) : '';

function fail($reason = '') {
    // Redirect to a friendly expired/invalid link page
    header('Location: /expired.html' . ($reason ? '?r=' . urlencode($reason) : ''));
    exit;
}

if (!$product || !$expiry || !$user || !$sig) {
    fail('missing');
}

if (!isset($PRODUCTS[$product])) {
    fail('unknown');
}

// Verify signature (constant-time comparison)
$payload  = $product . '|' . $expiry . '|' . $user;
$expected = hash_hmac('sha256', $payload, SECRET_KEY);

if (!hash_equals($expected, $sig)) {
    fail('invalid');
}

// Check expiry (24h window enforced at generation time)
if (time() > $expiry) {
    fail('expired');
}

// ============================================================================
// SERVE FILE
// ============================================================================
$filename = $PRODUCTS[$product];
$fullPath = $FILES_DIR . $filename;

if (!file_exists($fullPath)) {
    http_response_code(404);
    echo 'File not found.';
    exit;
}

// Optional: log the download
@file_put_contents(
    __DIR__ . '/download-log.txt',
    sprintf("[%s] %s downloaded %s (ip=%s)\n",
        date('Y-m-d H:i:s'), $user, $product, $_SERVER['REMOTE_ADDR'] ?? '?'),
    FILE_APPEND
);

// Stream the file
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . basename($filename) . '"');
header('Content-Length: ' . filesize($fullPath));
header('Cache-Control: private, no-store');
header('Pragma: no-cache');

// Use chunked output for large files
if (ob_get_level()) ob_end_clean();
$fp = fopen($fullPath, 'rb');
while (!feof($fp)) {
    echo fread($fp, 8192);
    flush();
}
fclose($fp);
exit;
