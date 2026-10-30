<?php
/**
 * PixelLogic auth config.
 *
 * Edit the values below for your deployment.
 *
 *   PL_ADMIN_EMAIL  — where new-signup notifications are sent
 *   PL_ADMIN_PASS   — password for the /admin.php user-management page
 *                     (use a long, random string — keep this file secret;
 *                     it is denied by .htaccess)
 *   PL_MAIL_FROM_ADDR — visible "From" address on outbound mail
 */

declare(strict_types=1);

const PL_ADMIN_EMAIL    = 'dhiraj.kalra@gmail.com';   // <-- where signup notifications are sent
const PL_ADMIN_PASS     = 'Rivu@kal2882';
const PL_MAIL_FROM_NAME = 'PixelLogic';
const PL_MAIL_FROM_ADDR = 'no-reply@pixelogic.co.in'; // <-- must exist on your domain

// One-time free Advanced-mode trial for the web app (seconds).
// Simple mode is unlimited. Paid users (is_paid=1) bypass this limit.
const PL_FREE_ADVANCED_SECONDS = 1200;
