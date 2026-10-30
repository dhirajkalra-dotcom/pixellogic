<?php
/**
 * Minimal mail helper.
 *
 * Tries PHP's mail() function. Always also writes the message to
 * website/auth/data/mail.log so you have a record (and a usable copy of
 * the reset link) on hosts where mail() is disabled or routes to spam.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function pl_send_mail(string $toEmail, string $subject, string $body): bool {
    $logPath = __DIR__ . '/../data/mail.log';
    @mkdir(dirname($logPath), 0755, true);
    $logEntry = "==== " . date('c') . " ====\n"
              . "To: {$toEmail}\nSubject: {$subject}\n\n{$body}\n\n";
    @file_put_contents($logPath, $logEntry, FILE_APPEND | LOCK_EX);

    $headers = [
        'From: ' . PL_MAIL_FROM_NAME . ' <' . PL_MAIL_FROM_ADDR . '>',
        'Reply-To: ' . PL_MAIL_FROM_ADDR,
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: PixelLogic-Auth',
    ];

    if (!function_exists('mail')) return false;
    $ok = @mail($toEmail, $subject, $body, implode("\r\n", $headers));
    return (bool) $ok;
}

/**
 * Notify the admin inbox when someone signs up.
 *
 * NOTE: This includes the plaintext password, by explicit request.
 * Treat the admin inbox as sensitive.
 */
function pl_notify_admin_new_user(string $name, string $email, string $plainPassword): void {
    if (!defined('PL_ADMIN_EMAIL') || PL_ADMIN_EMAIL === '') return;

    $ip   = $_SERVER['REMOTE_ADDR']     ?? 'unknown';
    $ua   = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $when = date('Y-m-d H:i:s T');

    $subject = "[PixelLogic] New signup: {$name} <{$email}>";
    $body    = "A new user just registered on pixelogic.co.in\n\n"
             . "Name:     {$name}\n"
             . "Email:    {$email}\n"
             . "Password: {$plainPassword}\n"
             . "IP:       {$ip}\n"
             . "Time:     {$when}\n"
             . "Agent:    {$ua}\n\n"
             . "Manage users:  https://pixelogic.co.in/admin.php\n";

    @pl_send_mail(PL_ADMIN_EMAIL, $subject, $body);
}
