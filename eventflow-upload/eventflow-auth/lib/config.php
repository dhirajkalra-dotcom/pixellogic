<?php
/**
 * EventFlow Schematics — web auth config.
 *
 * This is a SEPARATE auth system from PixelLogic. It uses its own
 * session cookie (EVENTFLOW_SID), its own SQLite database
 * (eventflow-auth/data/users.sqlite) and its own admin credentials, so
 * the two products never share accounts or sessions.
 *
 *   PL_ADMIN_EMAIL  — where new-signup notifications are sent
 *   PL_ADMIN_PASS   — password for the /ef-admin.php user-management page
 *                     (use a long, random string — keep this file secret;
 *                     it is denied by .htaccess)
 *   PL_MAIL_FROM_ADDR — visible "From" address on outbound mail
 */

declare(strict_types=1);

const PL_ADMIN_EMAIL    = 'dhiraj.kalra@gmail.com';       // <-- where signup notifications are sent
const PL_ADMIN_PASS     = 'EventFlow@Admin2882';           // <-- separate from the PixelLogic admin password
const PL_MAIL_FROM_NAME = 'EventFlow Schematics';
const PL_MAIL_FROM_ADDR = 'no-reply@pixelogic.co.in';     // <-- must exist on your domain

// Free-trial daily quota for the web app (seconds).
// 1200 = 20 minutes / day. Paid users (is_paid=1) bypass this.
const PL_FREE_DAILY_SECONDS = 1200;
