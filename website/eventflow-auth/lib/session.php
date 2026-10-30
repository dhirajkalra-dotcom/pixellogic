<?php
/**
 * Session + auth helpers.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/csrf.php';

function pl_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['SERVER_PORT'] ?? '') == 443;

    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('EVENTFLOW_SID');
    session_start();
}

function pl_login_user(int $userId, string $email, string $name): void {
    pl_session_start();
    // Regenerate to defeat session fixation
    session_regenerate_id(true);
    $_SESSION['uid']        = $userId;
    $_SESSION['email']      = $email;
    $_SESSION['name']       = $name;
    $_SESSION['logged_in']  = true;
    $_SESSION['login_time'] = time();
    pl_touch_login($userId);
}

function pl_logout(): void {
    pl_session_start();
    // Mark user offline immediately (before destroying session).
    if (!empty($_SESSION['uid'])) {
        try {
            $stmt = pl_db()->prepare("UPDATE users SET last_seen_at = NULL WHERE id = :id");
            $stmt->execute([':id' => (int) $_SESSION['uid']]);
        } catch (Throwable $e) { /* ignore */ }
    }
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function pl_current_user(): ?array {
    pl_session_start();
    if (empty($_SESSION['logged_in']) || empty($_SESSION['uid'])) return null;
    return [
        'id'    => (int) $_SESSION['uid'],
        'email' => (string) ($_SESSION['email'] ?? ''),
        'name'  => (string) ($_SESSION['name'] ?? ''),
    ];
}

function pl_require_login(string $redirectTo = '/ef-login.php'): void {
    if (pl_current_user() === null) {
        $back = $_SERVER['REQUEST_URI'] ?? '/';
        $url = $redirectTo . '?next=' . urlencode($back);
        header('Location: ' . $url);
        exit;
    }
}

function pl_redirect(string $url): void {
    header('Location: ' . $url);
    exit;
}

function pl_e(?string $s): string {
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
