# PixelLogic Desktop Licence Server

This standalone PHP service is used only by the installed PixelLogic Electron application. It does not use or modify EventFlow accounts, sessions, configuration, or databases.

## Requirements

- HTTPS hosting at `pixelogic.co.in`
- PHP 7.4 or newer
- PHP PDO SQLite and Sodium extensions
- Write permission for this folder's `data` directory

## Deploy

1. Upload this folder as `pixelogic-license` under the website document root.
2. Copy `config.example.php` to `config.php` on the server.
3. Create a long random admin password in `config.php`.
4. Place `scripts/.keys/license-ed25519-private.pem` in a private directory outside the website document root.
5. Set `PIXELOGIC_LICENSE_PRIVATE_KEY_FILE` in `config.php` to that file's absolute server path.
6. Ensure the PHP process can read the key and write to `pixelogic-license/data`.
7. Open `https://pixelogic.co.in/pixelogic-license/api.php`. A GET request should return HTTP 405.
8. Open `https://pixelogic.co.in/pixelogic-license/admin.php` and sign in with username `admin`.

Never upload the private key inside `pixelogic-license` or commit `config.php`.

## Issue a customer licence

1. Send the customer the current PixelLogic installer.
2. Ask them to copy the Machine ID displayed by PixelLogic.
3. Open the licence admin page and enter their Machine ID and email.
4. Select Perpetual or a fixed validity period and issue the licence.
5. Copy the displayed key immediately and send it to the customer. Raw keys are not stored.
6. The customer pastes the key into PixelLogic while online.

Use the admin page to mark a licence Active, Suspended, or Revoked. Online applications check at startup and every six hours. A disconnected application can continue for up to seven days using its signed cached lease.

Existing v1 offline licences remain grandfathered and cannot be remotely revoked.
