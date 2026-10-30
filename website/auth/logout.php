<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/session.php';
pl_logout();
pl_redirect('/login.php');
