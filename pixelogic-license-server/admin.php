<?php
/** Standalone PixelLogic desktop licence administration. */
declare(strict_types=1);

require_once __DIR__ . '/licensing.php';

$expectedPassword = pixelogic_admin_password();
$user = $_SERVER['PHP_AUTH_USER'] ?? '';
$password = $_SERVER['PHP_AUTH_PW'] ?? '';
if ($user !== 'admin' || $expectedPassword === '' || strncmp($expectedPassword, 'CHANGE-ME', 9) === 0 || !hash_equals($expectedPassword, $password)) {
    header('WWW-Authenticate: Basic realm="PixelLogic Licence Admin"');
    header('HTTP/1.1 401 Unauthorized');
    echo 'Authentication required.';
    exit;
}

session_name('PIXELOGIC_LICENSE_ADMIN');
session_start();
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
$csrf = (string) $_SESSION['csrf'];
$flash = null;
$issued = null;
$db = pixelogic_license_db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postedToken = (string) ($_POST['csrf'] ?? '');
    if ($postedToken === '' || !hash_equals($csrf, $postedToken)) {
        $flash = ['err', 'Security token mismatch. Refresh and try again.'];
    } else {
        $action = (string) ($_POST['action'] ?? '');
        try {
            if ($action === 'issue') {
                $days = max(0, (int) ($_POST['days'] ?? 0));
                $issued = pixelogic_mint_license(
                    (string) ($_POST['machine_id'] ?? ''),
                    (string) ($_POST['customer_email'] ?? ''),
                    $days > 0 ? time() + ($days * 86400) : 0
                );
                $flash = ['ok', 'Licence issued. Copy it now because raw keys are not stored.'];
            } elseif (in_array($action, ['active', 'suspended', 'revoked'], true)) {
                $stmt = $db->prepare("UPDATE licenses SET status = :status, updated_at = datetime('now') WHERE license_id = :id");
                $stmt->execute([':status' => $action, ':id' => (string) ($_POST['license_id'] ?? '')]);
                $flash = ['ok', 'Licence changed to ' . $action . '.'];
            }
        } catch (Throwable $error) {
            $flash = ['err', $error->getMessage()];
        }
    }
}

$licenses = $db->query('SELECT * FROM licenses ORDER BY created_at DESC')->fetchAll();
function pixelogic_e($value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PixelLogic Desktop Licences</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;padding:28px;background:#0b1220;color:#e2e8f0;font-family:system-ui,sans-serif}.wrap{max-width:1180px;margin:auto}h1{font-size:24px;margin:0 0 20px}.panel{background:#111827;border:1px solid #334155;border-radius:8px;padding:18px;margin-bottom:20px}.grid{display:grid;grid-template-columns:2fr 2fr 1fr auto;gap:12px;align-items:end}label{display:block;font-size:12px;color:#94a3b8;margin-bottom:5px}input,select,button{width:100%;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#e2e8f0;padding:9px 10px}button{cursor:pointer;background:#0369a1;border-color:#0284c7;font-weight:600}.flash{padding:10px 12px;border-radius:6px;margin-bottom:16px}.ok{background:#052e16;color:#86efac}.err{background:#450a0a;color:#fecaca}.key{font-family:monospace;word-break:break-all;background:#020617;border:1px solid #16a34a;padding:12px;border-radius:6px;color:#86efac}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px;border-bottom:1px solid #263244;text-align:left}th{color:#94a3b8}td form{display:inline-block}td button{width:auto;padding:5px 8px;margin:2px;background:#1e293b}.active{color:#86efac}.suspended{color:#fde68a}.revoked{color:#fca5a5}@media(max-width:760px){.grid{grid-template-columns:1fr}.panel{overflow:auto}}
</style></head><body><main class="wrap">
<h1>PixelLogic Desktop Licences</h1>
<?php if ($flash): ?><div class="flash <?= pixelogic_e($flash[0]) ?>"><?= pixelogic_e($flash[1]) ?></div><?php endif; ?>
<?php if ($issued): ?><section class="panel"><label>New licence key</label><div class="key" id="issued-key"><?= pixelogic_e($issued['key']) ?></div><button style="width:auto;margin-top:10px" onclick="navigator.clipboard.writeText(document.getElementById('issued-key').textContent)">Copy key</button></section><?php endif; ?>
<section class="panel"><form method="post"><input type="hidden" name="csrf" value="<?= pixelogic_e($csrf) ?>"><input type="hidden" name="action" value="issue"><div class="grid">
<div><label>Machine ID</label><input name="machine_id" required placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"></div>
<div><label>Customer email</label><input name="customer_email" type="email" placeholder="customer@example.com"></div>
<div><label>Validity</label><select name="days"><option value="0">Perpetual</option><option value="365">1 year</option><option value="730">2 years</option><option value="90">90 days</option><option value="30">30 days</option></select></div>
<div><button type="submit">Issue licence</button></div></div></form></section>
<section class="panel"><table><thead><tr><th>Customer</th><th>Machine</th><th>Licence ID</th><th>Status</th><th>Last check</th><th>Actions</th></tr></thead><tbody>
<?php if (!$licenses): ?><tr><td colspan="6">No licences issued.</td></tr><?php endif; ?>
<?php foreach ($licenses as $license): ?><tr><td><?= pixelogic_e($license['customer_email']) ?></td><td><?= pixelogic_e($license['machine_id']) ?></td><td><?= pixelogic_e($license['license_id']) ?></td><td class="<?= pixelogic_e($license['status']) ?>"><?= pixelogic_e(ucfirst($license['status'])) ?></td><td><?= pixelogic_e($license['last_checked_at'] ?: 'Never') ?></td><td>
<?php foreach (['active','suspended','revoked'] as $status): if ($status === $license['status']) continue; ?><form method="post"><input type="hidden" name="csrf" value="<?= pixelogic_e($csrf) ?>"><input type="hidden" name="license_id" value="<?= pixelogic_e($license['license_id']) ?>"><input type="hidden" name="action" value="<?= $status ?>"><button type="submit"><?= pixelogic_e(ucfirst($status)) ?></button></form><?php endforeach; ?>
</td></tr><?php endforeach; ?></tbody></table></section></main></body></html>
