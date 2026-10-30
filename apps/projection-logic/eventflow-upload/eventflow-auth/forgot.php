<?php
/**
 * Forgot password — collects email, issues a reset link.
 *
 * Always shows the same "if an account exists, we've sent a link"
 * response, regardless of whether the email is known. This prevents
 * account-existence enumeration.
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';
require_once __DIR__ . '/lib/mail.php';

pl_session_start();

$pageError = null;
$pageSuccess = null;
$emailValue = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim((string) ($_POST['email'] ?? ''));
    $token = (string) ($_POST['csrf'] ?? '');
    $emailValue = $email;

    if (!pl_csrf_check($token)) {
        $pageError = 'Your session expired. Please try again.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $pageError = 'Please enter a valid email address.';
    } else {
        $user = pl_find_user_by_email($email);
        if ($user) {
            try {
                $rawToken = pl_create_password_reset((int) $user['id'], 60);
                $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $resetLink = $scheme . '://' . $host . '/ef-reset.php?token=' . urlencode($rawToken);

                $name = trim((string) $user['name']);
                $greeting = $name !== '' ? "Hi {$name}," : 'Hi,';
                $body = $greeting . "\n\n"
                      . "We received a request to reset the password for your EventFlow Schematics account.\n\n"
                      . "Click the link below to choose a new password (valid for 60 minutes):\n"
                      . $resetLink . "\n\n"
                      . "If you didn't request this, you can safely ignore this email.\n\n"
                      . "— EventFlow Schematics\n";
                pl_send_mail((string) $user['email'], 'Reset your EventFlow Schematics password', $body);
            } catch (Throwable $e) {
                error_log('[pl-forgot] ' . $e->getMessage());
                // Still show the generic success message below.
            }
        }
        $pageSuccess = "If an account exists for {$email}, a password-reset link is on its way.";
    }
}

$pageTitle    = 'Forgot password';
$pageHeading  = 'Reset your password';
$pageSubtitle = 'Enter your email and we\'ll send you a reset link.';
include __DIR__ . '/_header.php';
?>
<form method="POST" action="/ef-forgot.php" autocomplete="on" novalidate>
  <?= pl_csrf_field() ?>
  <label for="email">Email</label>
  <input type="email" id="email" name="email" value="<?= pl_e($emailValue) ?>" required autocomplete="email" autofocus>
  <button type="submit" class="primary">Send reset link</button>
</form>
<div class="alt">
  Remembered it? <a href="/ef-login.php">Back to sign in</a>
</div>
<?php include __DIR__ . '/_footer.php'; ?>
