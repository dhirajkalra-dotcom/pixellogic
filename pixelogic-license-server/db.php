<?php
/** Standalone SQLite storage for PixelLogic desktop licences. */
declare(strict_types=1);

function pixelogic_license_db(): PDO {
    static $db = null;
    if ($db instanceof PDO) return $db;

    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir) && !mkdir($dataDir, 0750, true) && !is_dir($dataDir)) {
        throw new RuntimeException('Unable to create the licence data directory.');
    }
    $denyFile = $dataDir . '/.htaccess';
    if (!is_file($denyFile)) @file_put_contents($denyFile, "Require all denied\nDeny from all\n");

    $db = new PDO('sqlite:' . $dataDir . '/licenses.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $db->exec('PRAGMA journal_mode=WAL');
    $db->exec('PRAGMA foreign_keys=ON');
    $db->exec("
        CREATE TABLE IF NOT EXISTS licenses (
            license_id      TEXT PRIMARY KEY,
            machine_id      TEXT NOT NULL,
            customer_email  TEXT NOT NULL DEFAULT '',
            status          TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'suspended', 'revoked')),
            expires_at      INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
            last_checked_at TEXT
        )
    ");
    $db->exec('CREATE INDEX IF NOT EXISTS idx_licenses_machine ON licenses(machine_id)');
    return $db;
}
