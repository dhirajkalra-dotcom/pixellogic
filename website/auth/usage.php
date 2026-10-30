<?php
/**
 * /auth/usage.php — Advanced-mode trial tracker for the web app.
 *
 * GET  → returns current quota state for the logged-in user
 * POST → starts the one-time trial when body field `start=1` is present.
 *
 * Response shape (JSON):
 *   {
 *     ok: true,
 *     logged_in: true,
 *     paid: false,
 *     limit_seconds: 1200,
 *     used_seconds: 137,
 *     remaining_seconds: 1063,
 *     locked: false,
 *     day: "2026-05-08"
 *   }
 *
 * If not logged in → 401 with {ok:false, logged_in:false}.
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/session.php';
require_once __DIR__ . '/lib/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

$user = pl_current_user();
if ($user === null) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'logged_in' => false]);
    exit;
}

$uid    = (int) $user['id'];
$limit  = defined('PL_FREE_ADVANCED_SECONDS') ? (int) PL_FREE_ADVANCED_SECONDS : 1200;
$paid   = pl_user_is_paid($uid);

// Stamp activity so the admin panel can show online/offline status.
pl_touch_seen($uid);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Same-origin guard: require the request to come from our own site.
    // Compare host names WITHOUT the port (HTTP_HOST can include ":8000"
    // locally, while parse_url() strips the port from Origin/Referer).
    $origin   = $_SERVER['HTTP_ORIGIN']  ?? '';
    $referer  = $_SERVER['HTTP_REFERER'] ?? '';
    $host     = $_SERVER['HTTP_HOST']    ?? '';
    $hostOnly = parse_url('//' . $host, PHP_URL_HOST) ?: $host;
    $okSrc    = false;
    foreach ([$origin, $referer] as $src) {
        if ($src === '') continue;
        $h = parse_url($src, PHP_URL_HOST);
        if ($h !== null && strcasecmp($h, $hostOnly) === 0) { $okSrc = true; break; }
    }
    if (!$okSrc) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'cross-origin']);
        exit;
    }

    if (!$paid && (string) ($_POST['start'] ?? '') === '1') {
        pl_start_advanced_trial($uid);
    }
}

$started   = $paid ? false : pl_advanced_trial_started($uid);
$used      = pl_get_advanced_seconds($uid);
$remaining = $paid ? PHP_INT_MAX : ($started ? max(0, $limit - $used) : $limit);
$locked    = !$paid && $started && $remaining <= 0;

echo json_encode([
    'ok'                => true,
    'logged_in'         => true,
    'paid'              => $paid,
    'limit_seconds'     => $paid ? 0 : $limit,
    'used_seconds'      => $used,
    'remaining_seconds' => $paid ? 0 : $remaining,
    'trial_started'     => $started,
    'locked'            => $locked,
    'day'               => pl_today_key(),
]);
