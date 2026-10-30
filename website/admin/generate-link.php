<?php
/**
 * Admin page: Generate 24-hour download links for full versions.
 *
 * Protected by a simple password (change ADMIN_PASSWORD below).
 * Visit:  https://yoursite.com/admin/generate-link.php
 */

// ============================================================================
// CONFIGURATION  -- MUST MATCH download.php SECRET_KEY exactly
// ============================================================================
define('SECRET_KEY',     'CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARS_LONG_xY9!q');
define('ADMIN_PASSWORD', 'CHANGE_THIS_ADMIN_PASSWORD');
define('LINK_VALIDITY_HOURS', 24);
define('SITE_BASE_URL', '');  // e.g. 'https://yoursite.com'  — leave empty to auto-detect

session_start();

// ----------------------------------------------------------------------------
// Auth
// ----------------------------------------------------------------------------
if (isset($_POST['login_password'])) {
    if (hash_equals(ADMIN_PASSWORD, $_POST['login_password'])) {
        $_SESSION['admin_ok'] = true;
    } else {
        $loginError = 'Wrong password.';
    }
}
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: generate-link.php');
    exit;
}

if (empty($_SESSION['admin_ok'])) {
    ?>
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admin Login</title>
    <style>
      body{font-family:system-ui,Segoe UI,sans-serif;background:#0f172a;color:#e2e8f0;
           display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#1e293b;padding:30px;border-radius:12px;width:320px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
      h2{margin:0 0 20px}
      input{width:100%;padding:10px;border-radius:6px;border:1px solid #334155;
            background:#0f172a;color:#fff;margin-bottom:14px;box-sizing:border-box}
      button{width:100%;padding:10px;border:0;border-radius:6px;background:#6366f1;color:#fff;font-weight:600;cursor:pointer}
      .err{color:#f87171;margin-bottom:10px;font-size:14px}
    </style></head><body>
      <form class="card" method="POST">
        <h2>🔒 Admin Login</h2>
        <?php if (!empty($loginError)) echo '<div class="err">'.htmlspecialchars($loginError).'</div>'; ?>
        <input type="password" name="login_password" placeholder="Admin password" autofocus required>
        <button>Sign in</button>
      </form>
    </body></html>
    <?php
    exit;
}

// ----------------------------------------------------------------------------
// Generate link
// ----------------------------------------------------------------------------
$PRODUCTS = [
    'pixelogic'  => 'PixelLogic',
    'eventflow'  => 'EventFlow Schematics',
    'stagecue'   => 'StageCue',
];

$generated = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['user_email'])) {
    $email     = trim($_POST['user_email']);
    $products  = $_POST['products'] ?? [];
    $hours     = max(1, min(168, (int)($_POST['hours'] ?? LINK_VALIDITY_HOURS)));
    $expiry    = time() + ($hours * 3600);

    $base = SITE_BASE_URL ?: ((($_SERVER['HTTPS'] ?? '') ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST']);

    foreach ($products as $p) {
        if (!isset($PRODUCTS[$p])) continue;
        $payload = $p . '|' . $expiry . '|' . $email;
        $sig     = hash_hmac('sha256', $payload, SECRET_KEY);
        $url     = $base . '/download.php?p=' . urlencode($p)
                 . '&e=' . $expiry
                 . '&u=' . urlencode($email)
                 . '&s=' . $sig;
        $generated[] = [
            'name'   => $PRODUCTS[$p],
            'url'    => $url,
            'expiry' => date('Y-m-d H:i:s', $expiry),
        ];
    }
}
?>
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Generate Download Link</title>
<style>
  body{font-family:system-ui,Segoe UI,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:30px}
  .wrap{max-width:760px;margin:0 auto}
  h1{margin-top:0}
  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:20px}
  label{display:block;margin:12px 0 6px;font-weight:600}
  input[type=text],input[type=email],input[type=number]{width:100%;padding:10px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box}
  .check{display:flex;gap:14px;flex-wrap:wrap;margin-top:6px}
  .check label{display:flex;align-items:center;gap:6px;background:#0f172a;padding:8px 14px;border-radius:6px;border:1px solid #334155;cursor:pointer;margin:0;font-weight:500}
  button{margin-top:18px;padding:11px 22px;border:0;border-radius:6px;background:#6366f1;color:#fff;font-weight:600;cursor:pointer;font-size:15px}
  .link-row{background:#0f172a;padding:12px;border-radius:6px;margin:10px 0;border-left:3px solid #10b981}
  .link-row b{color:#10b981}
  .link-row code{display:block;word-break:break-all;background:#020617;padding:8px;border-radius:4px;margin:6px 0;font-size:12px;color:#cbd5e1}
  .meta{font-size:12px;color:#94a3b8}
  .copy{background:#10b981;color:#fff;border:0;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:6px}
  .logout{float:right;color:#f87171;text-decoration:none;font-size:14px}
</style></head><body><div class="wrap">
  <a class="logout" href="?logout=1">Log out</a>
  <h1>🔗 Generate Download Link</h1>

  <form method="POST" class="card">
    <label>Recipient email (binds the link to this user)</label>
    <input type="email" name="user_email" required placeholder="user@example.com"
           value="<?php echo htmlspecialchars($_POST['user_email'] ?? ''); ?>">

    <label>Products</label>
    <div class="check">
      <?php foreach ($PRODUCTS as $slug => $name):
        $checked = isset($_POST['products']) && in_array($slug, $_POST['products']) ? 'checked' : 'checked'; ?>
        <label><input type="checkbox" name="products[]" value="<?php echo $slug; ?>" <?php echo $checked; ?>> <?php echo $name; ?></label>
      <?php endforeach; ?>
    </div>

    <label>Validity (hours, 1–168)</label>
    <input type="number" name="hours" min="1" max="168" value="<?php echo (int)($_POST['hours'] ?? LINK_VALIDITY_HOURS); ?>">

    <button>Generate Links</button>
  </form>

  <?php if ($generated): ?>
    <div class="card">
      <h2 style="margin-top:0">✅ Links generated</h2>
      <?php foreach ($generated as $g): ?>
        <div class="link-row">
          <b><?php echo htmlspecialchars($g['name']); ?></b>
          <code id="lnk-<?php echo md5($g['url']); ?>"><?php echo htmlspecialchars($g['url']); ?></code>
          <button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('lnk-<?php echo md5($g['url']); ?>').innerText);this.innerText='Copied!'">Copy</button>
          <span class="meta">Expires: <?php echo $g['expiry']; ?></span>
        </div>
      <?php endforeach; ?>
      <p class="meta">Paste these into your reply email to the user. Links stop working after the expiry time above.</p>
    </div>
  <?php endif; ?>
</div></body></html>
