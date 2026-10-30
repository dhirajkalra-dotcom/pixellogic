<?php
/**
 * Lightweight CSRF token helper, scoped to the user's session.
 */

declare(strict_types=1);

function pl_csrf_token(): string {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        // session must already be started by the caller (session.php
        // bootstraps it); guard against being called too early.
        @session_start();
    }
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function pl_csrf_check(?string $token): bool {
    if (session_status() !== PHP_SESSION_ACTIVE) @session_start();
    return is_string($token)
        && !empty($_SESSION['csrf'])
        && hash_equals((string) $_SESSION['csrf'], $token);
}

function pl_csrf_field(): string {
    $t = pl_csrf_token();
    return '<input type="hidden" name="csrf" value="' . htmlspecialchars($t, ENT_QUOTES) . '">';
}
