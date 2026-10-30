<?php
/**
 * GET /auth/me.php — JSON view of the current session.
 *
 * Used by the marketing site's nav (script.js) to swap "Get Demo"
 * for "Account / Sign out" once the visitor is logged in.
 *
 * Always 200 OK; the response shape tells you whether anyone is logged in.
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

$user = pl_current_user();
echo json_encode($user
    ? ['logged_in' => true,  'user' => $user]
    : ['logged_in' => false, 'user' => null],
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
