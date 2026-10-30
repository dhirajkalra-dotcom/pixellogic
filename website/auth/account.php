<?php
/**
 * Simple account landing page.
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';

pl_require_login('/login.php');
$user = pl_current_user();

$pageTitle    = 'Your account';
$pageHeading  = 'Welcome, ' . ($user['name'] !== '' ? $user['name'] : $user['email']);
$pageSubtitle = '';
include __DIR__ . '/_header.php';
?>
<div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">
  <div style="font-size:13px;color:#94a3b8;">
    Signed in as <strong style="color:#e2e8f0;"><?= pl_e($user['email']) ?></strong>
  </div>
  <a href="/app/" class="primary"
     style="display:block;text-align:center;text-decoration:none;
            padding:12px 16px;font-size:15px;font-weight:600;color:#0b1220;
            background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:10px;">
    Launch the web app
  </a>
  <a href="/logout.php" style="display:block;text-align:center;
     padding:10px 16px;color:#fca5a5;text-decoration:none;
     border:1px solid rgba(239,68,68,.25);background:rgba(239,68,68,.08);
     border-radius:10px;font-size:14px;">
    Sign out
  </a>
</div>
<?php include __DIR__ . '/_footer.php'; ?>
