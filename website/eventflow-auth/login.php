<?php
/**
 * Login page — renders the form and handles POST.
 *
 * Supports a ?next=/eventflow-app/ query param to redirect after login.
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';

pl_session_start();

$next = (string) ($_GET['next'] ?? $_POST['next'] ?? '/eventflow-app/');
// Only allow same-origin redirects (defence against open-redirects)
if ($next === '' || $next[0] !== '/' || str_starts_with($next, '//')) {
    $next = '/eventflow-app/';
}

if (pl_current_user() !== null) {
    pl_redirect($next);
}

$pageError   = null;
$pageSuccess = null;
$emailValue  = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim((string) ($_POST['email']    ?? ''));
    $password = (string)        ($_POST['password'] ?? '');
    $token    = (string)        ($_POST['csrf']     ?? '');
    $emailValue = $email;

    if (!pl_csrf_check($token)) {
        $pageError = 'Your session expired. Please try again.';
    } elseif ($email === '' || $password === '') {
        $pageError = 'Please enter your email and password.';
    } elseif (pl_recent_failed_attempts($email, 15) >= 8) {
        $pageError = 'Too many failed attempts. Please wait 15 minutes and try again.';
    } else {
        $user = pl_find_user_by_email($email);
        $ok = $user && password_verify($password, $user['password_hash']);
        pl_record_attempt($email, $ok);

        if ($ok) {
            // Optionally upgrade the hash if PHP's default has changed.
            if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                $u = pl_db()->prepare('UPDATE users SET password_hash=:p WHERE id=:id');
                $u->execute([':p' => $newHash, ':id' => $user['id']]);
            }
            pl_login_user((int) $user['id'], (string) $user['email'], (string) $user['name']);
            pl_redirect($next);
        } else {
            $pageError = 'Incorrect email or password.';
        }
    }
}

$pageTitle    = 'Sign in';
$pageHeading  = 'Welcome back';
$pageSubtitle = 'Sign in to launch the EventFlow Schematics web app.';
include __DIR__ . '/_header.php';
?>
<form method="POST" action="/ef-login.php" autocomplete="on" novalidate>
  <?= pl_csrf_field() ?>
  <input type="hidden" name="next" value="<?= pl_e($next) ?>">

  <label for="email">Email</label>
  <input type="email" id="email" name="email" value="<?= pl_e($emailValue) ?>" required autocomplete="email" autofocus>

  <label for="password">Password</label>
  <input type="password" id="password" name="password" required autocomplete="current-password">

  <button type="submit" class="primary">Sign in</button>
</form>
<div class="alt">
  <a href="/ef-forgot.php">Forgot password?</a>
  <span style="opacity:.5;margin:0 6px;">·</span>
  New here? <a href="/ef-register.php">Create an account</a>
</div>
<?php include __DIR__ . '/_footer.php'; ?>
