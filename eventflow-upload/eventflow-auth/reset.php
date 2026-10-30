<?php
/**
 * Reset password — validates the token (GET) and updates the password (POST).
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';

pl_session_start();

$pageError   = null;
$pageSuccess = null;
$showForm    = false;

$token = (string) ($_GET['token'] ?? $_POST['token'] ?? '');
if ($token === '' || strlen($token) > 128) {
    $pageError = 'This reset link is invalid or incomplete.';
} else {
    $row = pl_consume_password_reset($token);
    if (!$row) {
        $pageError = 'This reset link is invalid or has expired. Please request a new one.';
    } else {
        $showForm = true;

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $password = (string) ($_POST['password'] ?? '');
            $confirm  = (string) ($_POST['confirm']  ?? '');
            $csrf     = (string) ($_POST['csrf']     ?? '');

            if (!pl_csrf_check($csrf)) {
                $pageError = 'Your session expired. Please try again.';
            } elseif (strlen($password) < 8) {
                $pageError = 'Password must be at least 8 characters long.';
            } elseif ($password !== $confirm) {
                $pageError = 'Passwords do not match.';
            } else {
                pl_update_password((int) $row['id'], $password);
                pl_mark_reset_used((int) $row['reset_id']);
                pl_login_user((int) $row['id'], (string) $row['email'], (string) $row['name']);
                pl_redirect('/eventflow-app/');
            }
        }
    }
}

$pageTitle    = 'Choose a new password';
$pageHeading  = 'Choose a new password';
$pageSubtitle = $showForm ? 'You\'ll be signed in automatically once it\'s saved.' : '';
include __DIR__ . '/_header.php';

if ($showForm): ?>
<form method="POST" action="/ef-reset.php" autocomplete="on" novalidate>
  <?= pl_csrf_field() ?>
  <input type="hidden" name="token" value="<?= pl_e($token) ?>">

  <label for="password">New password <span style="color:#64748b;font-weight:400;">(min 8 chars)</span></label>
  <input type="password" id="password" name="password" required minlength="8" autocomplete="new-password" autofocus>

  <label for="confirm">Confirm new password</label>
  <input type="password" id="confirm" name="confirm" required minlength="8" autocomplete="new-password">

  <button type="submit" class="primary">Set new password</button>
</form>
<?php else: ?>
<div class="alt" style="margin-top:0;">
  <a href="/ef-forgot.php">Request a new reset link</a>
</div>
<?php endif; ?>
<?php include __DIR__ . '/_footer.php'; ?>
