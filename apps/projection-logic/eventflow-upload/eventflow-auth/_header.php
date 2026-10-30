<?php
/**
 * Shared HTML chrome for auth pages. Set $pageTitle and $pageHeading
 * before including, then echo the form body, then include _footer.php.
 *
 * Variables expected:
 *   string $pageTitle
 *   string $pageHeading
 *   ?string $pageError    (optional inline error)
 *   ?string $pageSuccess  (optional inline success)
 */

require_once __DIR__ . '/lib/session.php';
$pageTitle   = $pageTitle   ?? 'EventFlow Schematics';
$pageHeading = $pageHeading ?? 'EventFlow Schematics';
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= pl_e($pageTitle) ?> · EventFlow Schematics</title>
<link rel="icon" href="/favicon.png">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(circle at 18% 22%, rgba(20,184,166,.16), transparent 36%),
                radial-gradient(circle at 82% 78%, rgba(14,165,233,.16), transparent 36%),
                #0b1220;
    color: #e2e8f0; display: flex; align-items: center; justify-content: center; padding: 32px 16px;
  }
  .auth-card {
    width: 100%; max-width: 420px; background: rgba(15,23,42,.85);
    backdrop-filter: blur(12px); border: 1px solid rgba(148,163,184,.18);
    border-radius: 18px; padding: 32px 28px; box-shadow: 0 30px 80px rgba(0,0,0,.45);
  }
  .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .auth-logo img { height: 28px; }
  .auth-logo span { font-weight: 700; font-size: 18px; color: #f1f5f9; }
  h1 { font-size: 22px; margin: 8px 0 4px; color: #f8fafc; }
  p.sub { margin: 0 0 22px; color: #94a3b8; font-size: 14px; }
  label { display: block; font-size: 13px; color: #cbd5e1; margin: 14px 0 6px; }
  input[type=text], input[type=email], input[type=password] {
    width: 100%; padding: 11px 13px; font-size: 15px;
    background: rgba(2,6,23,.7); color: #f1f5f9;
    border: 1px solid rgba(148,163,184,.25); border-radius: 10px; outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  input:focus { border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,.18); }
  button.primary {
    margin-top: 22px; width: 100%; padding: 12px 16px; font-size: 15px; font-weight: 600;
    color: #04241f; background: linear-gradient(135deg, #14b8a6, #0ea5e9);
    border: 0; border-radius: 10px; cursor: pointer;
    transition: transform .1s, filter .15s;
  }
  button.primary:hover { filter: brightness(1.08); }
  button.primary:active { transform: translateY(1px); }
  .alt { margin-top: 18px; text-align: center; font-size: 13px; color: #94a3b8; }
  .alt a { color: #5eead4; text-decoration: none; }
  .alt a:hover { text-decoration: underline; }
  .msg { padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; }
  .msg.error   { background: rgba(239,68,68,.12);  color: #fca5a5; border: 1px solid rgba(239,68,68,.25); }
  .msg.success { background: rgba(34,197,94,.12);  color: #86efac; border: 1px solid rgba(34,197,94,.25); }
  .footer-link { display: block; text-align: center; margin-top: 18px; padding-top: 14px;
    border-top: 1px solid rgba(148,163,184,.12); font-size: 12px; color: #64748b; }
  .footer-link a { color: #94a3b8; text-decoration: none; }
  .footer-link a:hover { color: #cbd5e1; text-decoration: underline; }
</style>
</head>
<body>
<div class="auth-card">
  <div class="auth-logo">
    <img src="/pixelogic-logo.png" alt="" onerror="this.style.display='none'">
    <span>EventFlow Schematics</span>
  </div>
  <h1><?= pl_e($pageHeading) ?></h1>
  <p class="sub"><?= pl_e($pageSubtitle ?? '') ?></p>

  <?php if (!empty($pageError)): ?>
    <div class="msg error"><?= pl_e($pageError) ?></div>
  <?php endif; ?>
  <?php if (!empty($pageSuccess)): ?>
    <div class="msg success"><?= pl_e($pageSuccess) ?></div>
  <?php endif; ?>
