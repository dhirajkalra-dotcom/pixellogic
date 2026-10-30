<?php
/**
 * SQLite database bootstrap for the PixelLogic auth system.
 *
 * - Stores the DB file under website/auth/data/users.sqlite
 * - Creates schema on first run
 * - Returns a singleton PDO connection
 */

declare(strict_types=1);

function pl_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dataDir = __DIR__ . '/../data';
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0755, true);
    }

    // Drop a defence-in-depth .htaccess into the data dir so the SQLite
    // file cannot be downloaded directly even if the web server is
    // misconfigured.
    $ht = $dataDir . '/.htaccess';
    if (!file_exists($ht)) {
        @file_put_contents($ht, "Require all denied\nDeny from all\n");
    }

    $dbPath = $dataDir . '/users.sqlite';
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    $pdo->exec('PRAGMA journal_mode=WAL;');
    $pdo->exec('PRAGMA foreign_keys=ON;');

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT    UNIQUE NOT NULL COLLATE NOCASE,
            name          TEXT    NOT NULL DEFAULT '',
            password_hash TEXT    NOT NULL,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            last_login_at TEXT
        );
    ");
    // Lightweight migration: add is_paid + last_seen_at columns on existing DBs.
    try {
        $cols = $pdo->query("PRAGMA table_info(users)")->fetchAll();
        $hasPaid = false; $hasSeen = false;
        foreach ($cols as $c) {
            $n = $c['name'] ?? '';
            if ($n === 'is_paid')        $hasPaid = true;
            if ($n === 'last_seen_at')   $hasSeen = true;
        }
        if (!$hasPaid) {
            $pdo->exec("ALTER TABLE users ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0");
        }
        if (!$hasSeen) {
            $pdo->exec("ALTER TABLE users ADD COLUMN last_seen_at TEXT");
        }
    } catch (Throwable $e) { /* ignore */ }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS usage_daily (
            user_id      INTEGER NOT NULL,
            day          TEXT    NOT NULL,
            seconds_used INTEGER NOT NULL DEFAULT 0,
            updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (user_id, day),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS usage_advanced (
            user_id      INTEGER PRIMARY KEY,
            seconds_used INTEGER NOT NULL DEFAULT 0,
            started_at   TEXT,
            updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ");
    try {
        $cols = $pdo->query("PRAGMA table_info(usage_advanced)")->fetchAll();
        $hasStartedAt = false;
        foreach ($cols as $c) {
            if (($c['name'] ?? '') === 'started_at') $hasStartedAt = true;
        }
        if (!$hasStartedAt) {
            $pdo->exec("ALTER TABLE usage_advanced ADD COLUMN started_at TEXT");
        }
    } catch (Throwable $e) { /* ignore */ }
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS login_attempts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT    NOT NULL COLLATE NOCASE,
            ip         TEXT    NOT NULL,
            success    INTEGER NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_attempts_email_time ON login_attempts(email, created_at);");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS password_resets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            token_hash  TEXT    NOT NULL UNIQUE,
            expires_at  TEXT    NOT NULL,
            used_at     TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);");

    return $pdo;
}

function pl_find_user_by_email(string $email): ?array {
    $stmt = pl_db()->prepare('SELECT * FROM users WHERE email = :e LIMIT 1');
    $stmt->execute([':e' => $email]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function pl_create_user(string $email, string $name, string $password): int {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = pl_db()->prepare(
        'INSERT INTO users (email, name, password_hash) VALUES (:e, :n, :p)'
    );
    $stmt->execute([':e' => $email, ':n' => $name, ':p' => $hash]);
    return (int) pl_db()->lastInsertId();
}

function pl_record_attempt(string $email, bool $success): void {
    $stmt = pl_db()->prepare(
        'INSERT INTO login_attempts (email, ip, success) VALUES (:e, :ip, :s)'
    );
    $stmt->execute([
        ':e'  => $email,
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ':s'  => $success ? 1 : 0,
    ]);
}

function pl_recent_failed_attempts(string $email, int $minutes = 15): int {
    $stmt = pl_db()->prepare("
        SELECT COUNT(*) AS c FROM login_attempts
        WHERE email = :e AND success = 0
          AND created_at >= datetime('now', :w)
    ");
    $stmt->execute([':e' => $email, ':w' => "-{$minutes} minutes"]);
    return (int) ($stmt->fetch()['c'] ?? 0);
}

function pl_touch_login(int $userId): void {
    $stmt = pl_db()->prepare(
        "UPDATE users SET last_login_at = datetime('now'),
                          last_seen_at  = datetime('now')
         WHERE id = :id"
    );
    $stmt->execute([':id' => $userId]);
}

/** Update last_seen_at to now (call from any signed-in endpoint). */
function pl_touch_seen(int $userId): void {
    try {
        $stmt = pl_db()->prepare(
            "UPDATE users SET last_seen_at = datetime('now') WHERE id = :id"
        );
        $stmt->execute([':id' => $userId]);
    } catch (Throwable $e) { /* ignore */ }
}

function pl_create_password_reset(int $userId, int $ttlMinutes = 60): string {
    // Token returned to caller (sent via email); only the hash is stored.
    $token = bin2hex(random_bytes(32));
    $hash  = hash('sha256', $token);
    $expiresAt = (new DateTimeImmutable('now'))
        ->modify('+' . max(5, $ttlMinutes) . ' minutes')
        ->format('Y-m-d H:i:s');
    // Invalidate prior unused tokens for this user.
    $u = pl_db()->prepare(
        "UPDATE password_resets SET used_at = datetime('now')
         WHERE user_id = :id AND used_at IS NULL"
    );
    $u->execute([':id' => $userId]);
    $stmt = pl_db()->prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (:u, :h, :e)'
    );
    $stmt->execute([':u' => $userId, ':h' => $hash, ':e' => $expiresAt]);
    return $token;
}

function pl_consume_password_reset(string $token): ?array {
    // Returns the matching user row if the token is valid and unused; null otherwise.
    $hash = hash('sha256', $token);
    $stmt = pl_db()->prepare(
        "SELECT pr.id AS reset_id, pr.expires_at, pr.used_at, u.*
         FROM password_resets pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.token_hash = :h LIMIT 1"
    );
    $stmt->execute([':h' => $hash]);
    $row = $stmt->fetch();
    if (!$row) return null;
    if (!empty($row['used_at'])) return null;
    if (strtotime((string) $row['expires_at']) < time()) return null;
    return $row;
}

function pl_mark_reset_used(int $resetId): void {
    $stmt = pl_db()->prepare(
        "UPDATE password_resets SET used_at = datetime('now') WHERE id = :id"
    );
    $stmt->execute([':id' => $resetId]);
}

function pl_update_password(int $userId, string $newPassword): void {
    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = pl_db()->prepare('UPDATE users SET password_hash = :p WHERE id = :id');
    $stmt->execute([':p' => $hash, ':id' => $userId]);
}

// ── Usage / quota ──────────────────────────────────────────────────────

function pl_user_is_paid(int $userId): bool {
    $stmt = pl_db()->prepare('SELECT is_paid FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    $r = $stmt->fetch();
    return $r ? (((int) $r['is_paid']) === 1) : false;
}

function pl_set_user_paid(int $userId, bool $paid): void {
    $stmt = pl_db()->prepare('UPDATE users SET is_paid = :p WHERE id = :id');
    $stmt->execute([':p' => $paid ? 1 : 0, ':id' => $userId]);
}

function pl_today_key(): string {
    // Daily quota resets at local (IST) midnight, independent of the
    // host's default timezone. Falls back to server-local day if the
    // timezone is somehow unavailable.
    try {
        return (new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata')))
            ->format('Y-m-d');
    } catch (Throwable $e) {
        return date('Y-m-d');
    }
}

function pl_get_today_seconds(int $userId): int {
    $stmt = pl_db()->prepare(
        'SELECT seconds_used FROM usage_daily WHERE user_id = :u AND day = :d LIMIT 1'
    );
    $stmt->execute([':u' => $userId, ':d' => pl_today_key()]);
    $r = $stmt->fetch();
    return $r ? (int) $r['seconds_used'] : 0;
}

function pl_get_advanced_seconds(int $userId): int {
    $stmt = pl_db()->prepare(
        'SELECT seconds_used, started_at FROM usage_advanced WHERE user_id = :u LIMIT 1'
    );
    $stmt->execute([':u' => $userId]);
    $r = $stmt->fetch();
    if (!$r) return 0;
    $used = (int) $r['seconds_used'];
    if (!empty($r['started_at'])) {
        $started = strtotime((string) $r['started_at'] . ' UTC');
        if ($started !== false) $used = max($used, time() - $started);
    }
    return max(0, $used);
}

function pl_advanced_trial_started(int $userId): bool {
    $stmt = pl_db()->prepare(
        'SELECT started_at FROM usage_advanced WHERE user_id = :u LIMIT 1'
    );
    $stmt->execute([':u' => $userId]);
    $r = $stmt->fetch();
    return $r && !empty($r['started_at']);
}

function pl_start_advanced_trial(int $userId): void {
    $pdo = pl_db();
    $stmt = $pdo->prepare(
        'SELECT seconds_used, started_at FROM usage_advanced WHERE user_id = :u LIMIT 1'
    );
    $stmt->execute([':u' => $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        $insert = $pdo->prepare(
            "INSERT INTO usage_advanced (user_id, seconds_used, started_at, updated_at)
             VALUES (:u, 0, datetime('now'), datetime('now'))"
        );
        $insert->execute([':u' => $userId]);
        return;
    }
    if (empty($row['started_at'])) {
        $used = max(0, (int) $row['seconds_used']);
        $startedAt = gmdate('Y-m-d H:i:s', time() - $used);
        $update = $pdo->prepare(
            "UPDATE usage_advanced SET started_at = :started, updated_at = datetime('now')
             WHERE user_id = :u"
        );
        $update->execute([':started' => $startedAt, ':u' => $userId]);
    }
}

function pl_add_advanced_seconds(int $userId, int $delta): int {
    if ($delta < 0) $delta = 0;
    if ($delta > 1800) $delta = 1800;
    if ($delta === 0) return pl_get_advanced_seconds($userId);

    $pdo = pl_db();
    try {
        $sel = $pdo->prepare('SELECT seconds_used FROM usage_advanced WHERE user_id = :u LIMIT 1');
        $sel->execute([':u' => $userId]);
        if ($sel->fetch()) {
            $upd = $pdo->prepare(
                "UPDATE usage_advanced
                    SET seconds_used = seconds_used + :s, updated_at = datetime('now')
                  WHERE user_id = :u"
            );
            $upd->execute([':s' => $delta, ':u' => $userId]);
        } else {
            $ins = $pdo->prepare(
                "INSERT INTO usage_advanced (user_id, seconds_used, updated_at)
                 VALUES (:u, :s, datetime('now'))"
            );
            $ins->execute([':u' => $userId, ':s' => $delta]);
        }
    } catch (Throwable $e) {
        error_log('pl_add_advanced_seconds failed: ' . $e->getMessage());
    }
    return pl_get_advanced_seconds($userId);
}

function pl_add_today_seconds(int $userId, int $delta): int {
    if ($delta < 0) $delta = 0;
    if ($delta > 1800) $delta = 1800; // hard cap per call
    $day = pl_today_key();
    $pdo = pl_db();
    // Portable upsert: SELECT then UPDATE/INSERT. Avoids the SQLite
    // "ON CONFLICT ... DO UPDATE" (UPSERT) syntax, which is unavailable on
    // SQLite < 3.24 (2018) — still shipped by some shared hosts. Relying on
    // it there throws, the write silently fails, and today's usage never
    // persists (the timer appears to reset after every refresh).
    try {
        $sel = $pdo->prepare(
            'SELECT seconds_used FROM usage_daily WHERE user_id = :u AND day = :d LIMIT 1'
        );
        $sel->execute([':u' => $userId, ':d' => $day]);
        $row = $sel->fetch();
        if ($row) {
            $upd = $pdo->prepare(
                "UPDATE usage_daily
                    SET seconds_used = seconds_used + :s, updated_at = datetime('now')
                  WHERE user_id = :u AND day = :d"
            );
            $upd->execute([':s' => $delta, ':u' => $userId, ':d' => $day]);
        } else {
            $ins = $pdo->prepare(
                "INSERT INTO usage_daily (user_id, day, seconds_used, updated_at)
                 VALUES (:u, :d, :s, datetime('now'))"
            );
            $ins->execute([':u' => $userId, ':d' => $day, ':s' => $delta]);
        }
    } catch (Throwable $e) {
        error_log('pl_add_today_seconds failed: ' . $e->getMessage());
    }
    return pl_get_today_seconds($userId);
}