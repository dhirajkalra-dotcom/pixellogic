<?php
/**
 * /ef-payment.php — EventFlow Schematics upgrade / subscribe page.
 *
 * Shown when a free user's 20-minute daily quota is exhausted, or from the
 * in-app "Subscribe" button. Presents Monthly and Yearly plans.
 *
 * Online checkout (Razorpay / Stripe / Gumroad) can be wired into the
 * plan buttons later. For now each plan opens a pre-filled email so the
 * account can be enabled manually, mirroring the PixelLogic flow.
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/session.php';
require_once __DIR__ . '/lib/config.php';

$user = pl_current_user();
$pageTitle = 'Subscribe';
require __DIR__ . '/_header.php';

$adminEmail = defined('PL_ADMIN_EMAIL') ? PL_ADMIN_EMAIL : '';

/** Build a mailto for a given plan. */
function ef_plan_mailto(string $adminEmail, ?array $user, string $plan): string {
    $subject = 'EventFlow Schematics — ' . $plan . ' subscription';
    $body    = "Hi,\n\nI'd like to subscribe to the EventFlow Schematics {$plan} plan.\n"
             . ($user ? ("Account: " . $user['email'] . "\n") : "")
             . "\nPlease send me the payment link / enable my account.\n\nThanks!";
    return 'mailto:' . rawurlencode($adminEmail)
         . '?subject=' . rawurlencode($subject)
         . '&body='    . rawurlencode($body);
}
?>
<div class="auth-card" style="max-width:560px;text-align:center;">
  <div style="font-size:42px;line-height:1;margin-bottom:8px;">⏱️</div>
  <h1 style="margin:0 0 8px;font-size:22px;color:#f8fafc;">Your free 20 minutes are up</h1>
  <p style="margin:0 0 22px;color:#94a3b8;font-size:14px;line-height:1.55;">
    Free accounts get <strong style="color:#e2e8f0;">20 minutes per day</strong> in the
    EventFlow Schematics web app. Subscribe for unlimited access — design signal
    flows, trace paths and export schematics without interruption.
  </p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;text-align:left;">
    <!-- Monthly -->
    <div style="background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.18);
                border-radius:12px;padding:18px;display:flex;flex-direction:column;">
      <div style="font-weight:700;color:#f1f5f9;font-size:15px;">Monthly</div>
      <div style="margin:6px 0 2px;color:#5eead4;font-size:26px;font-weight:800;">$25<span style="font-size:13px;color:#94a3b8;font-weight:500;">/mo</span></div>
      <div style="color:#94a3b8;font-size:12px;margin-bottom:14px;">Billed monthly · cancel anytime</div>
      <a href="<?= pl_e(ef_plan_mailto($adminEmail, $user, 'Monthly')) ?>"
         style="margin-top:auto;display:block;text-align:center;text-decoration:none;
                padding:10px 14px;font-size:14px;font-weight:600;color:#0b1220;
                background:linear-gradient(135deg,#14b8a6,#0ea5e9);border-radius:9px;">
        Choose Monthly
      </a>
    </div>
    <!-- Yearly -->
    <div style="background:rgba(20,184,166,.08);border:1px solid rgba(20,184,166,.35);
                border-radius:12px;padding:18px;display:flex;flex-direction:column;position:relative;">
      <div style="position:absolute;top:-10px;right:12px;background:#14b8a6;color:#04241f;
                  font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;">SAVE 17%</div>
      <div style="font-weight:700;color:#f1f5f9;font-size:15px;">Yearly</div>
      <div style="margin:6px 0 2px;color:#5eead4;font-size:26px;font-weight:800;">$250<span style="font-size:13px;color:#94a3b8;font-weight:500;">/yr</span></div>
      <div style="color:#94a3b8;font-size:12px;margin-bottom:14px;">Best value · 2 months free</div>
      <a href="<?= pl_e(ef_plan_mailto($adminEmail, $user, 'Yearly')) ?>"
         style="margin-top:auto;display:block;text-align:center;text-decoration:none;
                padding:10px 14px;font-size:14px;font-weight:600;color:#0b1220;
                background:linear-gradient(135deg,#14b8a6,#0ea5e9);border-radius:9px;">
        Choose Yearly
      </a>
    </div>
  </div>

  <div style="background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.18);
              border-radius:12px;padding:16px 18px;margin-bottom:8px;text-align:left;">
    <div style="font-weight:600;color:#f1f5f9;margin-bottom:8px;">Every plan includes</div>
    <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7;">
      <li>Unlimited daily usage</li>
      <li>490+ equipment symbols across 9 departments</li>
      <li>Signal path tracing &amp; protocol conflict detection</li>
      <li>PDF export &amp; cable schedules — no watermark</li>
      <li>Priority support</li>
    </ul>
  </div>

  <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
    Online checkout is coming soon. For now we'll enable your account
    manually within a few hours of your request.
  </p>

  <?php if ($user): ?>
    <p style="margin:14px 0 0;font-size:12px;color:#64748b;">
      Signed in as <?= pl_e($user['email']) ?> ·
      <a href="/ef-logout.php" style="color:#5eead4;">Sign out</a> ·
      <a href="/eventflow-app/" style="color:#5eead4;">Back to app</a>
    </p>
  <?php else: ?>
    <p style="margin:14px 0 0;font-size:12px;color:#64748b;">
      <a href="/ef-login.php" style="color:#5eead4;">Sign in</a> first so we can link the upgrade to your account.
    </p>
  <?php endif; ?>
</div>
<?php require __DIR__ . '/_footer.php';
