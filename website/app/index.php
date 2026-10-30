<?php
/**
 * PixelLogic web app gate.
 *
 * Requires the visitor to be logged in. If not, redirects to /login.php
 * with ?next=/app/. Once authenticated, streams the static app.html
 * (the renamed index.html produced by the web build), with a small
 * <script> injected so the app knows who is signed in.
 */

declare(strict_types=1);
require_once __DIR__ . '/../auth/lib/session.php';

pl_require_login('/login.php');
$user = pl_current_user();

$appHtmlPath = __DIR__ . '/app.html';
if (!file_exists($appHtmlPath)) {
    http_response_code(503);
    echo '<!DOCTYPE html><meta charset="utf-8"><title>App not deployed</title>';
    echo '<p style="font-family:sans-serif;padding:32px">';
    echo 'The web app has not been deployed yet. Run <code>npm run deploy:web</code> from the project root.';
    echo '</p>';
    exit;
}

// Build the inline default-template data URI so the PDF Export preview
// always shows artwork on first load (no async fetch / no race with the
// app's localStorage bootstrap).
$templateDataUri = '';
$templateFile = __DIR__ . '/external-files/default-template.png';
if (is_file($templateFile)) {
    $bytes = @file_get_contents($templateFile);
    if ($bytes !== false && $bytes !== '') {
        $templateDataUri = 'data:image/png;base64,' . base64_encode($bytes);
    }
}

// Inject user info + a logout link discovery hook just before </head>.
// Defined as window.PIXELOGIC_USER for any future UI integration.
$injection = '<script>'
    . 'window.PIXELOGIC_USER = '
    . json_encode([
        'id'    => $user['id'],
        'email' => $user['email'],
        'name'  => $user['name'],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
    . '; window.PIXELOGIC_LOGOUT_URL = "/logout.php";';

// ── Per-user localStorage isolation ──────────────────────────────────
// Every key the app reads/writes is silently prefixed with "u<userId>:"
// so two accounts on the same browser (or two sessions on a shared
// machine) never see each other's projects, devices, presets, etc.
// This runs as the FIRST inline script after <head>, before any of the
// app's bootstrap code, so all subsequent localStorage calls are namespaced.
$injection .= '(function(){try{'
    . 'var U=window.PIXELOGIC_USER;'
    . 'if(!U||!U.id)return;'
    . 'var P="u"+U.id+":";'
    . 'var ls=window.localStorage;'
    . 'var g=ls.getItem.bind(ls),s=ls.setItem.bind(ls),r=ls.removeItem.bind(ls);'
    . 'Object.defineProperty(ls,"getItem",{value:function(k){return g(P+k);},configurable:true});'
    . 'Object.defineProperty(ls,"setItem",{value:function(k,v){return s(P+k,v);},configurable:true});'
    . 'Object.defineProperty(ls,"removeItem",{value:function(k){return r(P+k);},configurable:true});'
    . 'window.__PL_NS__=P;'
    . '}catch(_){ }})();';

if ($templateDataUri !== '') {
    // 1) Expose as the embedded fallback the app already understands.
    $injection .= 'window.__EMBEDDED_DEFAULT_TEMPLATE__ = '
        . json_encode($templateDataUri, JSON_UNESCAPED_SLASHES) . ';';

    // 2) Force-replace any stale/placeholder template in localStorage
    //    BEFORE app.html boots, so the bootstrap reads the correct value.
    $injection .= 'try{var __pl_t=window.__EMBEDDED_DEFAULT_TEMPLATE__,'
        . '__pl_s=localStorage.getItem("pdfTemplateSrc"),'
        . '__pl_u=localStorage.getItem("pdfTemplateUserUploaded")==="1";'
        . 'if(!__pl_u && (!__pl_s || __pl_s.indexOf("data:image/svg")===0 ||'
        . ' __pl_s.indexOf("Default%20Template")!==-1 ||'
        . ' __pl_s.indexOf("Default Template")!==-1)){'
        . 'localStorage.setItem("pdfTemplateSrc",__pl_t);} }catch(_){}';
}
$injection .= '</script>';

$html = file_get_contents($appHtmlPath);
// Insert immediately after the opening <head ...> tag (case-insensitive).
$html = preg_replace('/<head(\s[^>]*)?>/i', '$0' . "\n" . $injection, $html, 1);

// Cache-bust web-shim.js so updated quota / template logic is picked up
// immediately after redeploy (browsers were aggressively caching it).
$shimPath = __DIR__ . '/web-shim.js';
$shimVer  = is_file($shimPath) ? (string)filemtime($shimPath) : (string)time();
$html = preg_replace(
    '#(<script[^>]*\bsrc=["\'])web-shim\.js(["\'][^>]*></script>)#i',
    '$1web-shim.js?v=' . $shimVer . '$2',
    $html,
    1
);

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
echo $html;
