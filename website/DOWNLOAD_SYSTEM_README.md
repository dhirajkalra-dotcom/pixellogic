# Secure Download Link System — Setup Guide

## What This Does

Generates **24-hour expiring download links** for the full versions of:
- PixelLogic (`Pixelogic-Setup-1.0.106.exe`)
- EventFlow Schematics (`EventFlow Schematics_0.2.4_x64-setup.exe`)
- StageCue (`StageCue-Demo-1.2.0-x64-Setup.exe`)

Links are **HMAC-signed** — they cannot be forged or modified. After 24 hours they stop working automatically. No database required.

---

## Files Created

| File | Purpose |
|---|---|
| `download.php` | Validates signed link & streams the installer |
| `admin/generate-link.php` | Password-protected admin page to generate links |
| `downloads/Fullversion/.htaccess` | Blocks direct access to the installers |
| `expired.html` | Friendly error page shown for expired/invalid links |

---

## ⚠️ BEFORE UPLOADING — Do These 3 Things

### 1. Set a strong SECRET_KEY (must match in BOTH files)

Open **`download.php`** and **`admin/generate-link.php`**.

Replace this line in **both files** with the **same** long random string:
```php
define('SECRET_KEY', 'CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARS_LONG_xY9!q');
```

Generate one at: https://passwordsgenerator.net/ (60+ chars, mixed)

### 2. Set your admin password

In **`admin/generate-link.php`**:
```php
define('ADMIN_PASSWORD', 'CHANGE_THIS_ADMIN_PASSWORD');
```

### 3. (Optional) Set your site URL

In **`admin/generate-link.php`**:
```php
define('SITE_BASE_URL', 'https://yoursite.com');  // your real domain
```

---

## Upload to GoDaddy

Upload via cPanel File Manager or FTP, preserving this structure inside `public_html/`:

```
public_html/
├── download.php
├── expired.html
├── admin/
│   └── generate-link.php
└── downloads/
    └── Fullversion/
        ├── .htaccess
        ├── Pixelogic-Setup-1.0.106.exe
        ├── EventFlow Schematics_0.2.4_x64-setup.exe
        └── StageCue-Demo-1.2.0-x64-Setup.exe
```

> **Important:** `.htaccess` must be uploaded too (it's hidden — enable "show hidden files" in cPanel File Manager).

---

## How to Use

### When someone emails requesting full access:

1. Go to: `https://yoursite.com/admin/generate-link.php`
2. Log in with your admin password
3. Enter the user's email
4. Tick which products they requested
5. Click **Generate Links**
6. Click **Copy** next to each link
7. Paste into your reply email

The user clicks the link → file downloads → after 24 hours the link returns the "expired" page.

---

## How It Works (Security)

Each link looks like:
```
/download.php?p=pixelogic&e=1761849600&u=user@x.com&s=a3f9b2c4...
```

- `p` = product slug
- `e` = Unix timestamp when link expires
- `u` = user's email (logged on download)
- `s` = HMAC-SHA256 signature of `p|e|u` using your SECRET_KEY

The server recomputes the signature. If it doesn't match → expired page. If `e` is in the past → expired page.

**Anyone trying to forge a link without the SECRET_KEY will fail.**

---

## Logs

Every successful download is appended to `download-log.txt` in the website root:
```
[2026-04-28 14:23:11] user@example.com downloaded pixelogic (ip=1.2.3.4)
```

Delete this file anytime to clear logs.

---

## Testing Locally (optional)

If you have PHP installed:
```powershell
cd d:\pixellogic\website
php -S localhost:8000
```
Then visit `http://localhost:8000/admin/generate-link.php`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Always redirects to expired page | SECRET_KEY differs between the two PHP files |
| 404 on download.php | PHP not enabled — check GoDaddy hosting plan supports PHP |
| Files in Fullversion are publicly accessible | `.htaccess` not uploaded or AllowOverride disabled |
| Big files time out | Increase `max_execution_time` in cPanel PHP settings |
