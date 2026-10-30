<?php
/**
 * /auth/usage.php — daily-quota tracker for the web app.
 *
 * GET  → returns current quota state for the logged-in user
 * POST → heartbeat: body field `delta` (seconds, 1..120). Adds to today's
 *        usage and returns the updated state.
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
$limit  = defined('PL_FREE_DAILY_SECONDS') ? (int) PL_FREE_DAILY_SECONDS : 1200;
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

    $delta = (int) ($_POST['delta'] ?? 0);
    if ($delta < 0)    $delta = 0;
    if ($delta > 1800) $delta = 1800;

    if (!$paid && $delta > 0) {
        // Only count usage for free users.
        pl_add_today_seconds($uid, $delta);
    }
}

$used      = pl_get_today_seconds($uid);
$remaining = $paid ? PHP_INT_MAX : max(0, $limit - $used);
$locked    = !$paid && $remaining <= 0;

echo json_encode([
    'ok'                => true,
    'logged_in'         => true,
    'paid'              => $paid,
    'limit_seconds'     => $paid ? 0 : $limit,
    'used_seconds'      => $used,
    'remaining_seconds' => $paid ? 0 : $remaining,
    'locked'            => $locked,
    'day'               => pl_today_key(),
]);
