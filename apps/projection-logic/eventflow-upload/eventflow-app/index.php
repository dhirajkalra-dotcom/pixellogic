<?php
/**
 * EventFlow Schematics web-app gate.
 *
 * Requires the visitor to be logged in via the EventFlow auth system
 * (separate from PixelLogic). If not, redirects to /ef-login.php with
 * ?next=/eventflow-app/. Once authenticated, streams the static app.html
 * (the renamed index.html produced by `vite build`), with a small
 * <script> injected so the app knows who is signed in and so each user's
 * localStorage is namespaced.
 */

declare(strict_types=1);
require_once __DIR__ . '/../eventflow-auth/lib/session.php';

pl_require_login('/ef-login.php');
$user = pl_current_user();

$appHtmlPath = __DIR__ . '/app.html';
if (!file_exists($appHtmlPath)) {
    http_response_code(503);
    echo '<!DOCTYPE html><meta charset="utf-8"><title>App not deployed</title>';
    echo '<p style="font-family:sans-serif;padding:32px">';
    echo 'The EventFlow Schematics web app has not been deployed yet. Run <code>npm run deploy:web</code> from the SCHEMATICS project.';
    echo '</p>';
    exit;
}

// Inject user info + per-user localStorage isolation + logout hook.
$injection = '<script>'
    . 'window.EVENTFLOW_USER = '
    . json_encode([
        'id'    => $user['id'],
        'email' => $user['email'],
        'name'  => $user['name'],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
    . '; window.EVENTFLOW_LOGOUT_URL = "/ef-logout.php";'
    . ' window.EVENTFLOW_USAGE_URL = "/eventflow-auth/usage.php";'
    . ' window.EVENTFLOW_SUBSCRIBE_URL = "/ef-payment.php";';

// ── Per-user localStorage isolation ──────────────────────────────────
// Prefix every key with "u<userId>:" so two accounts on the same browser
// never see each other's projects, symbols, snapshots, etc. Runs as the
// FIRST inline script, before the app's bootstrap code.
$injection .= '(function(){try{'
    . 'var U=window.EVENTFLOW_USER;'
    . 'if(!U||!U.id)return;'
    . 'var P="u"+U.id+":";'
    . 'var ls=window.localStorage;'
    . 'var g=ls.getItem.bind(ls),s=ls.setItem.bind(ls),r=ls.removeItem.bind(ls);'
    . 'Object.defineProperty(ls,"getItem",{value:function(k){return g(P+k);},configurable:true});'
    . 'Object.defineProperty(ls,"setItem",{value:function(k,v){return s(P+k,v);},configurable:true});'
    . 'Object.defineProperty(ls,"removeItem",{value:function(k){return r(P+k);},configurable:true});'
    . 'window.__EF_NS__=P;'
    . '}catch(_){ }})();';
$injection .= '</script>';

$html = file_get_contents($appHtmlPath);
// Insert immediately after the opening <head ...> tag (case-insensitive).
$html = preg_replace('/<head(\s[^>]*)?>/i', '$0' . "\n" . $injection, $html, 1);

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
echo $html;
