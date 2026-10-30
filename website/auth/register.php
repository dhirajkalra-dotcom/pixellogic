<?php
/**
 * Register page — both renders the form and handles POST.
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';
require_once __DIR__ . '/lib/mail.php';

pl_session_start();

// Already logged in? Send straight to the app.
if (pl_current_user() !== null) {
    pl_redirect('/app/');
}

$pageError = null;
$pageSuccess = null;
$emailValue = '';
$nameValue  = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name     = trim((string) ($_POST['name']     ?? ''));
    $email    = trim((string) ($_POST['email']    ?? ''));
    $password = (string)        ($_POST['password'] ?? '');
    $confirm  = (string)        ($_POST['confirm']  ?? '');
    $token    = (string)        ($_POST['csrf']     ?? '');
    $emailValue = $email;
    $nameValue  = $name;

    if (!pl_csrf_check($token)) {
        $pageError = 'Your session expired. Please try again.';
    } elseif ($name === '' || mb_strlen($name) < 2) {
        $pageError = 'Please enter your name (at least 2 characters).';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $pageError = 'Please enter a valid email address.';
    } elseif (strlen($password) < 8) {
        $pageError = 'Password must be at least 8 characters long.';
    } elseif ($password !== $confirm) {
        $pageError = 'Passwords do not match.';
    } elseif (pl_find_user_by_email($email) !== null) {
        $pageError = 'An account with that email already exists. Try logging in instead.';
    } else {
        try {
            $uid = pl_create_user($email, $name, $password);
            pl_login_user($uid, $email, $name);
            pl_notify_admin_new_user($name, $email, $password);
            pl_redirect('/thanks.php');
        } catch (Throwable $e) {
            error_log('[pl-register] ' . $e->getMessage());
            $pageError = 'Sorry — something went wrong creating your account. Please try again.';
        }
    }
}

$pageTitle    = 'Create your account';
$pageHeading  = 'Create your account';
$pageSubtitle = 'Free access to the PixelLogic web app.';
include __DIR__ . '/_header.php';
?>
<form method="POST" action="register.php" autocomplete="on" novalidate>
  <?= pl_csrf_field() ?>
  <label for="name">Full name</label>
  <input type="text" id="name" name="name" value="<?= pl_e($nameValue) ?>" required minlength="2" autocomplete="name">

  <label for="email">Email</label>
  <input type="email" id="email" name="email" value="<?= pl_e($emailValue) ?>" required autocomplete="email">

  <label for="password">Password <span style="color:#64748b;font-weight:400;">(min 8 chars)</span></label>
  <input type="password" id="password" name="password" required minlength="8" autocomplete="new-password">

  <label for="confirm">Confirm password</label>
  <input type="password" id="confirm" name="confirm" required minlength="8" autocomplete="new-password">

  <button type="submit" class="primary">Create account</button>
</form>
<div class="alt">
  Already have an account? <a href="/login.php">Sign in</a>
</div>
<?php include __DIR__ . '/_footer.php'; ?>
