<?php
/** Public status endpoint used only by installed PixelLogic applications. */
declare(strict_types=1);

require_once __DIR__ . '/licensing.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function pixelogic_json(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    pixelogic_json(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 16384) pixelogic_json(400, ['ok' => false, 'error' => 'Invalid request.']);

try {
    $input = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    if (($input['action'] ?? '') !== 'check') pixelogic_json(400, ['ok' => false, 'error' => 'Unsupported action.']);

    $machineId = strtoupper(trim((string) ($input['machineId'] ?? '')));
    $keyInfo = pixelogic_verify_v2_key((string) ($input['key'] ?? ''), $machineId);
    if ($keyInfo === null) pixelogic_json(403, ['ok' => false, 'error' => 'Invalid licence key.']);

    $db = pixelogic_license_db();
    $stmt = $db->prepare('SELECT * FROM licenses WHERE license_id = :id AND machine_id = :machine LIMIT 1');
    $stmt->execute([':id' => $keyInfo['licenseId'], ':machine' => $machineId]);
    $license = $stmt->fetch();
    if (!$license) pixelogic_json(403, ['ok' => false, 'error' => 'Licence is not registered.']);

    if ((int) $license['expires_at'] !== 0 && time() >= (int) $license['expires_at'] && $license['status'] === 'active') {
        $license['status'] = 'suspended';
        $update = $db->prepare("UPDATE licenses SET status = 'suspended', updated_at = datetime('now') WHERE license_id = :id");
        $update->execute([':id' => $license['license_id']]);
    }
    $touch = $db->prepare("UPDATE licenses SET last_checked_at = datetime('now') WHERE license_id = :id");
    $touch->execute([':id' => $license['license_id']]);

    pixelogic_json(200, ['ok' => true, 'status' => $license['status'], 'lease' => pixelogic_issue_lease($license)]);
} catch (Throwable $error) {
    error_log('PixelLogic licence API: ' . $error->getMessage());
    pixelogic_json(500, ['ok' => false, 'error' => 'Licence service is unavailable.']);
}
