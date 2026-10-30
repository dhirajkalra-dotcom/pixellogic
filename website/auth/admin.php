<?php
/**
 * Admin panel — list & delete registered users.
 *
 * Protected by HTTP Basic auth. The password is whatever you set in
 * auth/lib/config.php as PL_ADMIN_PASS. The username is "admin".
 *
 * URL:  https://pixelogic.co.in/admin.php
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/session.php'; // pulls db.php + config.php transitively
require_once __DIR__ . '/lib/config.php';

// ─── HTTP Basic auth gate ──────────────────────────────────────────────
$user = $_SERVER['PHP_AUTH_USER'] ?? '';
$pass = $_SERVER['PHP_AUTH_PW']   ?? '';

$expectedPass = defined('PL_ADMIN_PASS') ? PL_ADMIN_PASS : '';

if ($user !== 'admin'
    || $expectedPass === ''
    || $expectedPass === 'CHANGE-ME-to-a-long-random-string'
    || !hash_equals($expectedPass, $pass)) {
    header('WWW-Authenticate: Basic realm="PixelLogic Admin"');
    header('HTTP/1.1 401 Unauthorized');
    echo "Authentication required.";
    if ($expectedPass === 'CHANGE-ME-to-a-long-random-string') {
        echo "<br>(Server admin: edit auth/lib/config.php and set PL_ADMIN_PASS first.)";
    }
    exit;
}

// ─── Handle delete (POST only, with CSRF) ──────────────────────────────
pl_session_start();
$flash = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token  = (string) ($_POST['csrf'] ?? '');
    $action = (string) ($_POST['action'] ?? '');
    $uid    = (int)    ($_POST['uid']    ?? 0);

    if (!pl_csrf_check($token)) {
        $flash = ['err', 'CSRF token mismatch — refresh and try again.'];
    } elseif ($action === 'delete' && $uid > 0) {
        try {
            $stmt = pl_db()->prepare('DELETE FROM users WHERE id = :id');
            $stmt->execute([':id' => $uid]);
            // Cascade is on for password_resets; clean attempts manually.
            $del = pl_db()->prepare('DELETE FROM login_attempts WHERE email IN (SELECT email FROM users WHERE id=:id)');
            $del->execute([':id' => $uid]);
            $flash = ['ok', "Deleted user #{$uid}."];
        } catch (Throwable $e) {
            $flash = ['err', 'Delete failed: ' . $e->getMessage()];
        }
    } elseif (($action === 'paid_on' || $action === 'paid_off') && $uid > 0) {
        try {
            pl_set_user_paid($uid, $action === 'paid_on');
            $flash = ['ok', "User #{$uid} marked " . ($action === 'paid_on' ? 'paid' : 'free') . '.'];
        } catch (Throwable $e) {
            $flash = ['err', 'Update failed: ' . $e->getMessage()];
        }
    } elseif ($action === 'reset_usage' && $uid > 0) {
        try {
        $r = pl_db()->prepare('DELETE FROM usage_advanced WHERE user_id = :id');
        $r->execute([':id' => $uid]);
        $flash = ['ok', "Advanced trial reset for user #{$uid}."];
        } catch (Throwable $e) {
            $flash = ['err', 'Reset failed: ' . $e->getMessage()];
        }
    }
}

// ─── Load users ────────────────────────────────────────────────────────
$stmt = pl_db()->query("
    SELECT u.id, u.email, u.name, u.created_at, u.last_login_at, u.last_seen_at, u.is_paid,
          COALESCE(ua.seconds_used, 0) AS seconds_used_total, ua.started_at AS advanced_started_at
    FROM users u
        LEFT JOIN usage_advanced ua ON ua.user_id = u.id
    ORDER BY u.created_at DESC
");
$users = $stmt->fetchAll();

$totalUsers = count($users);
$csrfField  = pl_csrf_field();
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin · Users · PixelLogic</title>
<link rel="icon" href="/favicon.png">
<meta http-equiv="refresh" content="30">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; padding: 32px 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(circle at 18% 22%, rgba(56,189,248,.12), transparent 36%),
                radial-gradient(circle at 82% 78%, rgba(99,102,241,.12), transparent 36%),
                #0b1220;
    color: #e2e8f0;
  }
  .wrap { max-width: 1100px; margin: 0 auto; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; flex-wrap: wrap; }
  h1 { margin: 0; font-size: 22px; color: #f8fafc; }
  .meta { font-size: 13px; color: #94a3b8; }
  .meta a { color: #7dd3fc; text-decoration: none; }
  .card { background: rgba(15,23,42,.85); border: 1px solid rgba(148,163,184,.18);
          border-radius: 14px; box-shadow: 0 30px 80px rgba(0,0,0,.35); overflow: hidden; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid rgba(148,163,184,.10); }
  th { background: rgba(2,6,23,.5); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; font-weight: 600; }
  tr:last-child td { border-bottom: 0; }
  td.email { color: #f1f5f9; font-weight: 500; }
  td.muted { color: #94a3b8; font-size: 13px; }
  td.actions { text-align: right; }
  button.del {
    padding: 6px 12px; font-size: 12px; font-weight: 600;
    background: rgba(239,68,68,.10); color: #fca5a5;
    border: 1px solid rgba(239,68,68,.30); border-radius: 6px; cursor: pointer;
    transition: background .15s, border-color .15s;
  }
  button.del:hover { background: rgba(239,68,68,.20); border-color: rgba(239,68,68,.55); }
  button.btn-toggle, button.btn-reset {
    padding: 6px 12px; font-size: 12px; font-weight: 600;
    border-radius: 6px; cursor: pointer; margin-right: 6px;
    transition: background .15s, border-color .15s;
  }
  button.btn-toggle {
    background: rgba(124,58,237,.10); color: #c4b5fd;
    border: 1px solid rgba(124,58,237,.35);
  }
  button.btn-toggle:hover { background: rgba(124,58,237,.22); border-color: rgba(124,58,237,.55); }
  button.btn-reset {
    background: rgba(245,158,11,.10); color: #fcd34d;
    border: 1px solid rgba(245,158,11,.35);
  }
  button.btn-reset:hover { background: rgba(245,158,11,.22); border-color: rgba(245,158,11,.55); }
  .badge {
    display: inline-block; padding: 3px 9px; border-radius: 999px;
    font-size: 11px; font-weight: 600; letter-spacing: .02em;
  }
  .badge.paid { background: rgba(34,197,94,.14); color: #86efac; border: 1px solid rgba(34,197,94,.35); }
  .badge.free { background: rgba(148,163,184,.10); color: #cbd5e1; border: 1px solid rgba(148,163,184,.30); }
  .badge.online  { background: rgba(34,197,94,.14); color: #86efac; border: 1px solid rgba(34,197,94,.35); }
  .badge.offline { background: rgba(148,163,184,.08); color: #94a3b8; border: 1px solid rgba(148,163,184,.25); }
  .dot { display:inline-block; width:7px; height:7px; border-radius:999px; margin-right:5px; vertical-align:middle; }
  .dot.on  { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.18); animation: pulse 1.6s ease-in-out infinite; }
  .dot.off { background:#64748b; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.45;} }
  .empty { padding: 40px; text-align: center; color: #64748b; font-size: 14px; }
  .flash { padding: 10px 14px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
  .flash.ok  { background: rgba(34,197,94,.12);  color: #86efac; border: 1px solid rgba(34,197,94,.30); }
  .flash.err { background: rgba(239,68,68,.12);  color: #fca5a5; border: 1px solid rgba(239,68,68,.30); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Registered users <span style="color:#64748b;font-weight:400;">· <?= $totalUsers ?></span></h1>
    <div class="meta">
      Signed in as <strong>admin</strong> ·
      <a href="/admin.php?logout=1" onclick="return confirm('Sign out of admin?')">Sign out</a> ·
      <a href="/">Site</a>
    </div>
  </header>

  <?php
    // Force a re-prompt if ?logout=1
    if (isset($_GET['logout'])) {
        header('WWW-Authenticate: Basic realm="PixelLogic Admin"');
        header('HTTP/1.1 401 Unauthorized');
        echo "<p style='color:#94a3b8'>Signed out. <a href='/' style='color:#7dd3fc'>Back to site</a>.</p>";
        exit;
    }
  ?>

  <?php if ($flash): ?>
    <div class="flash <?= pl_e($flash[0]) ?>"><?= pl_e($flash[1]) ?></div>
  <?php endif; ?>

  <div class="card">
    <?php if ($totalUsers === 0): ?>
      <div class="empty">No users have registered yet.</div>
    <?php else: ?>
      <table>
        <thead>
          <tr>
            <th style="width:60px;">#</th>
            <th>Email</th>
            <th>Name</th>
            <th>Status</th>
            <th>Plan</th>
            <th>Advanced Trial</th>
            <th>Registered</th>
            <th>Last login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
        <?php foreach ($users as $u):
            $isPaid    = ((int) ($u['is_paid'] ?? 0)) === 1;
            $usedTotal = (int) ($u['seconds_used_total'] ?? 0);
            if (!empty($u['advanced_started_at'])) {
              $startedTs = strtotime((string) $u['advanced_started_at'] . ' UTC');
              if ($startedTs !== false) $usedTotal = max($usedTotal, time() - $startedTs);
            }
            $usedMin   = floor($usedTotal / 60);
            $usedSec   = $usedTotal % 60;
            $usedFmt   = sprintf('%d:%02d', $usedMin, $usedSec);
            $limitMin  = defined('PL_FREE_ADVANCED_SECONDS') ? (int) (PL_FREE_ADVANCED_SECONDS / 60) : 20;

            // Online if last_seen_at is within 60 seconds. usage.php
            // heartbeats every 15s, so a 60s window absorbs one missed beat.
            $seenRaw = (string) ($u['last_seen_at'] ?? '');
            $seenTs  = $seenRaw !== '' ? strtotime($seenRaw . ' UTC') : 0;
            $ageSec  = $seenTs > 0 ? (time() - $seenTs) : PHP_INT_MAX;
            $isOnline = $ageSec >= 0 && $ageSec <= 60;
            if ($ageSec === PHP_INT_MAX || $seenTs <= 0) {
                $seenLabel = '—';
            } elseif ($isOnline) {
                $seenLabel = 'now';
            } elseif ($ageSec < 60)        $seenLabel = $ageSec . 's ago';
            elseif ($ageSec < 3600)        $seenLabel = floor($ageSec / 60) . 'm ago';
            elseif ($ageSec < 86400)       $seenLabel = floor($ageSec / 3600) . 'h ago';
            else                            $seenLabel = floor($ageSec / 86400) . 'd ago';
        ?>
          <tr>
            <td class="muted"><?= (int) $u['id'] ?></td>
            <td class="email"><?= pl_e($u['email']) ?></td>
            <td><?= pl_e($u['name']) ?></td>
            <td>
              <?php if ($isOnline): ?>
                <span class="badge online" title="Active in the last 60 seconds"><span class="dot on"></span>Online</span>
              <?php else: ?>
                <span class="badge offline" title="<?= pl_e($seenLabel) ?>"><span class="dot off"></span>Offline<?= $seenLabel !== '—' ? ' · ' . pl_e($seenLabel) : '' ?></span>
              <?php endif; ?>
            </td>
            <td>
              <?php if ($isPaid): ?>
                <span class="badge paid">Paid</span>
              <?php else: ?>
                <span class="badge free">Free</span>
              <?php endif; ?>
            </td>
            <td class="muted">
              <?php if ($isPaid): ?>
                —
              <?php else: ?>
                <?= pl_e($usedFmt) ?> / <?= (int) $limitMin ?>:00
              <?php endif; ?>
            </td>
            <td class="muted"><?= pl_e($u['created_at'] ?? '') ?></td>
            <td class="muted"><?= pl_e($u['last_login_at'] ?? '—') ?></td>
            <td class="actions">
              <form method="POST" action="/admin.php" style="display:inline;">
                <?= $csrfField ?>
                <input type="hidden" name="action" value="<?= $isPaid ? 'paid_off' : 'paid_on' ?>">
                <input type="hidden" name="uid" value="<?= (int) $u['id'] ?>">
                <button type="submit" class="btn-toggle" title="<?= $isPaid ? 'Revoke paid access' : 'Grant unlimited access' ?>">
                  <?= $isPaid ? 'Revoke' : 'Mark paid' ?>
                </button>
              </form>
                <?php if (!$isPaid && $usedTotal > 0): ?>
              <form method="POST" action="/admin.php" style="display:inline;"
                  onsubmit="return confirm('Reset the Advanced trial for <?= pl_e($u['email']) ?>?');">
                <?= $csrfField ?>
                <input type="hidden" name="action" value="reset_usage">
                <input type="hidden" name="uid" value="<?= (int) $u['id'] ?>">
                <button type="submit" class="btn-reset" title="Reset Advanced trial">Reset</button>
              </form>
              <?php endif; ?>
              <form method="POST" action="/admin.php" style="display:inline;"
                    onsubmit="return confirm('Permanently delete <?= pl_e($u['email']) ?>?');">
                <?= $csrfField ?>
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="uid" value="<?= (int) $u['id'] ?>">
                <button type="submit" class="del">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
