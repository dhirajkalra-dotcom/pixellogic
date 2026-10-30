<?php
/** Standalone Ed25519 key and lease operations for PixelLogic desktop. */
declare(strict_types=1);

require_once __DIR__ . '/db.php';

const PIXELOGIC_LICENSE_PUBLIC_KEY_HEX = 'd8f18efa463186039e8607197cfbaf696d184f56a012324b7567232906641b5c';
const PIXELOGIC_LICENSE_LEASE_SECONDS = 604800;

function pixelogic_b64url_encode(string $bytes): string {
    return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
}

function pixelogic_b64url_decode(string $value) {
    $value = strtr($value, '-_', '+/');
    $padding = strlen($value) % 4;
    if ($padding !== 0) $value .= str_repeat('=', 4 - $padding);
    return base64_decode($value, true);
}

function pixelogic_load_config(): void {
    static $loaded = false;
    if ($loaded) return;
    $loaded = true;
    $path = __DIR__ . '/config.php';
    if (is_file($path)) require_once $path;
}

function pixelogic_admin_password(): string {
    pixelogic_load_config();
    $environmentValue = getenv('PIXELOGIC_LICENSE_ADMIN_PASSWORD');
    if (is_string($environmentValue) && $environmentValue !== '') return $environmentValue;
    return defined('PIXELOGIC_LICENSE_ADMIN_PASSWORD') ? (string) PIXELOGIC_LICENSE_ADMIN_PASSWORD : '';
}

function pixelogic_private_key_file(): string {
    pixelogic_load_config();
    $environmentValue = getenv('PIXELOGIC_LICENSE_PRIVATE_KEY_FILE');
    if (is_string($environmentValue) && $environmentValue !== '') return $environmentValue;
    return defined('PIXELOGIC_LICENSE_PRIVATE_KEY_FILE') ? (string) PIXELOGIC_LICENSE_PRIVATE_KEY_FILE : '';
}

function pixelogic_private_signing_key(): string {
    if (!function_exists('sodium_crypto_sign_seed_keypair')) {
        throw new RuntimeException('The PHP Sodium extension is required.');
    }
    $path = pixelogic_private_key_file();
    if ($path === '' || !is_readable($path)) {
        throw new RuntimeException('The PixelLogic private signing key is not configured or readable.');
    }
    $pem = (string) file_get_contents($path);
    $der = base64_decode((string) preg_replace('/-----[^-]+-----|\s+/', '', $pem), true);
    if ($der === false || strlen($der) < 32) throw new RuntimeException('The private signing key is invalid.');

    $seed = substr($der, -32);
    $keypair = sodium_crypto_sign_seed_keypair($seed);
    $publicKey = sodium_crypto_sign_publickey($keypair);
    if (!hash_equals(PIXELOGIC_LICENSE_PUBLIC_KEY_HEX, bin2hex($publicKey))) {
        throw new RuntimeException('The private key does not match the public key embedded in PixelLogic.');
    }
    return sodium_crypto_sign_secretkey($keypair);
}

function pixelogic_sign(string $message): string {
    return pixelogic_b64url_encode(sodium_crypto_sign_detached($message, pixelogic_private_signing_key()));
}

function pixelogic_verify_v2_key(string $key, string $machineId): ?array {
    $segments = explode('.', trim($key), 2);
    if (count($segments) !== 2) return null;
    $message = pixelogic_b64url_decode($segments[0]);
    $signature = pixelogic_b64url_decode($segments[1]);
    $publicKey = hex2bin(PIXELOGIC_LICENSE_PUBLIC_KEY_HEX);
    if ($message === false || $signature === false || $publicKey === false) return null;
    if (!sodium_crypto_sign_verify_detached($signature, $message, $publicKey)) return null;

    $parts = explode('|', $message);
    if (count($parts) !== 4 || $parts[0] !== 'v2') return null;
    [$version, $licenseId, $keyMachine, $expiresAtRaw] = $parts;
    if (!preg_match('/^[A-Za-z0-9_-]{12,128}$/', $licenseId) || !ctype_digit($expiresAtRaw)) return null;
    if (!hash_equals(strtoupper(trim($keyMachine)), strtoupper(trim($machineId)))) return null;
    $expiresAt = (int) $expiresAtRaw;
    if ($expiresAt !== 0 && time() >= $expiresAt) return null;
    return ['licenseId' => $licenseId, 'machineId' => strtoupper(trim($keyMachine)), 'expiresAt' => $expiresAt];
}

function pixelogic_mint_license(string $machineId, string $customerEmail, int $expiresAt = 0): array {
    $machineId = strtoupper(trim($machineId));
    if (!preg_match('/^[A-F0-9]{4}(?:-[A-F0-9]{4}){5}$/', $machineId)) {
        throw new InvalidArgumentException('Machine ID must use XXXX-XXXX-XXXX-XXXX-XXXX-XXXX format.');
    }
    if ($expiresAt < 0) throw new InvalidArgumentException('Expiry is invalid.');

    $licenseId = pixelogic_b64url_encode(random_bytes(18));
    $message = "v2|{$licenseId}|{$machineId}|{$expiresAt}";
    $key = pixelogic_b64url_encode($message) . '.' . pixelogic_sign($message);
    $stmt = pixelogic_license_db()->prepare(
        'INSERT INTO licenses (license_id, machine_id, customer_email, expires_at) VALUES (:id, :machine, :email, :expires)'
    );
    $stmt->execute([':id' => $licenseId, ':machine' => $machineId, ':email' => trim($customerEmail), ':expires' => $expiresAt]);
    return ['licenseId' => $licenseId, 'machineId' => $machineId, 'expiresAt' => $expiresAt, 'key' => $key];
}

function pixelogic_issue_lease(array $license): array {
    $issuedAt = time();
    $status = (string) $license['status'];
    $validUntil = $status === 'active' ? $issuedAt + PIXELOGIC_LICENSE_LEASE_SECONDS : $issuedAt;
    $payload = "lease-v1|{$license['license_id']}|{$license['machine_id']}|{$status}|{$issuedAt}|{$validUntil}";
    return ['payload' => pixelogic_b64url_encode($payload), 'sig' => pixelogic_sign($payload)];
}
