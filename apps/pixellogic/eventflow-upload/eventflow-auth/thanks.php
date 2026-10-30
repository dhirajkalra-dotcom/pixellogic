<?php
/**
 * Thank-you page shown after successful registration.
 * Requires the user to be logged in (the register flow logs them in
 * automatically before redirecting here).
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';

pl_session_start();
$user = pl_current_user();
if ($user === null) {
    pl_redirect('/ef-login.php');
}

$pageTitle    = 'Welcome to EventFlow Schematics';
$pageHeading  = 'You\'re all set, ' . (explode(' ', trim($user['name']))[0] ?: 'there') . '!';
$pageSubtitle = 'Your account is ready. Launch the app whenever you\'re ready.';
include __DIR__ . '/_header.php';
?>
<div style="text-align:center; margin: 6px 0 22px;">
  <div style="display:inline-flex; align-items:center; justify-content:center;
              width:64px; height:64px; border-radius:50%;
              background: linear-gradient(135deg, rgba(56,189,248,.18), rgba(129,140,248,.18));
              border: 1px solid rgba(56,189,248,.35); margin-bottom: 6px;">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  </div>
</div>

<div style="background: rgba(2,6,23,.5); border:1px solid rgba(148,163,184,.18);
            border-radius: 12px; padding: 14px 16px; font-size: 13.5px; color:#cbd5e1;">
  <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:6px;">
    <span style="color:#94a3b8;">Name</span>
    <span style="color:#f1f5f9; font-weight:500;"><?= pl_e($user['name']) ?></span>
  </div>
  <div style="display:flex; justify-content:space-between; gap:10px;">
    <span style="color:#94a3b8;">Email</span>
    <span style="color:#f1f5f9; font-weight:500;"><?= pl_e($user['email']) ?></span>
  </div>
</div>

<a href="/eventflow-app/" style="display:block; margin-top:22px; padding:12px 16px; text-align:center;
        font-size:15px; font-weight:600; color:#0b1220;
        background: linear-gradient(135deg, #38bdf8, #818cf8);
        border-radius:10px; text-decoration:none; transition: filter .15s;"
   onmouseover="this.style.filter='brightness(1.08)';"
   onmouseout="this.style.filter='';">
  Launch EventFlow Schematics web app  →
</a>

<div class="alt" style="margin-top: 16px;">
  Need to make changes? <a href="/ef-account.php">Go to your account</a>
</div>
<?php include __DIR__ . '/_footer.php'; ?>
