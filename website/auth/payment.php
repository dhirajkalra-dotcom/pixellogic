<?php
/**
 * /auth/payment.php — upgrade landing page.
 *
 * Replace the body content with your real Razorpay / Stripe / Gumroad
 * checkout when ready. For now it explains the offer and gives a "Contact
 * us" mailto so users can pay manually.
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/session.php';
require_once __DIR__ . '/lib/config.php';

$user = pl_current_user();
$pageTitle = 'Upgrade · PixelLogic';
$navHide   = true;
require __DIR__ . '/_header.php';

$adminEmail = defined('PL_ADMIN_EMAIL') ? PL_ADMIN_EMAIL : '';

/** Build a mailto for a given plan. */
function pl_plan_mailto(string $adminEmail, ?array $user, string $plan): string {
    $subject = 'PixelLogic Web — ' . $plan . ' subscription';
    $body    = "Hi,\n\nI'd like to subscribe to the PixelLogic {$plan} plan.\n"
             . ($user ? ("Account: " . $user['email'] . "\n") : "")
             . "\nPlease send me the payment link / enable my account.\n\nThanks!";
    return 'mailto:' . rawurlencode($adminEmail)
         . '?subject=' . rawurlencode($subject)
         . '&body='    . rawurlencode($body);
}
?>
<div class="auth-card" style="max-width:560px;text-align:center;">
  <div style="font-size:42px;line-height:1;margin-bottom:8px;">⏱️</div>
  <h1 style="margin:0 0 8px;font-size:22px;color:#f8fafc;">Your Advanced trial is complete</h1>
  <p style="margin:0 0 22px;color:#94a3b8;font-size:14px;line-height:1.55;">
    Simple mode remains free with no time limit. Your account includes
    <strong style="color:#e2e8f0;">20 free minutes in Advanced mode</strong>.
    Subscribe to continue using Advanced tools without interruption.
  </p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;text-align:left;">
    <!-- Monthly -->
    <div style="background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.18);
                border-radius:12px;padding:18px;display:flex;flex-direction:column;">
      <div style="font-weight:700;color:#f1f5f9;font-size:15px;">Monthly</div>
      <div style="margin:6px 0 2px;color:#7dd3fc;font-size:26px;font-weight:800;">$25<span style="font-size:13px;color:#94a3b8;font-weight:500;">/mo</span></div>
      <div style="color:#94a3b8;font-size:12px;margin-bottom:14px;">Billed monthly · cancel anytime</div>
      <a href="<?= pl_e(pl_plan_mailto($adminEmail, $user, 'Monthly')) ?>"
         style="margin-top:auto;display:block;text-align:center;text-decoration:none;
                padding:10px 14px;font-size:14px;font-weight:600;color:#04121f;
                background:linear-gradient(135deg,#38bdf8,#0ea5e9);border-radius:9px;">
        Choose Monthly
      </a>
    </div>
    <!-- Yearly -->
    <div style="background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.35);
                border-radius:12px;padding:18px;display:flex;flex-direction:column;position:relative;">
      <div style="position:absolute;top:-10px;right:12px;background:#38bdf8;color:#04121f;
                  font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;">SAVE 17%</div>
      <div style="font-weight:700;color:#f1f5f9;font-size:15px;">Yearly</div>
      <div style="margin:6px 0 2px;color:#7dd3fc;font-size:26px;font-weight:800;">$250<span style="font-size:13px;color:#94a3b8;font-weight:500;">/yr</span></div>
      <div style="color:#94a3b8;font-size:12px;margin-bottom:14px;">Best value · 2 months free</div>
      <a href="<?= pl_e(pl_plan_mailto($adminEmail, $user, 'Yearly')) ?>"
         style="margin-top:auto;display:block;text-align:center;text-decoration:none;
                padding:10px 14px;font-size:14px;font-weight:600;color:#04121f;
                background:linear-gradient(135deg,#38bdf8,#0ea5e9);border-radius:9px;">
        Choose Yearly
      </a>
    </div>
  </div>

  <div style="background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.18);
              border-radius:12px;padding:16px 18px;margin-bottom:8px;text-align:left;">
    <div style="font-weight:600;color:#f1f5f9;margin-bottom:8px;">Every plan includes</div>
    <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7;">
      <li>Unlimited Advanced mode usage</li>
      <li>All Pixel Designer, Visualizer & LED Patching tools</li>
      <li>PDF / PPT export with no watermark</li>
      <li>Priority support</li>
    </ul>
  </div>

  <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
    Online checkout is coming soon. For now we'll enable your account
    manually within a few hours of your request.
  </p>

  <?php if ($user): ?>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
      Signed in as <?= pl_e($user['email']) ?> ·
      <a href="/auth/logout.php" style="color:#7dd3fc;">Sign out</a>
    </p>
  <?php else: ?>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
      <a href="/login.php" style="color:#7dd3fc;">Sign in</a> first so we can link the upgrade to your account.
    </p>
  <?php endif; ?>
</div>
<?php require __DIR__ . '/_footer.php';
