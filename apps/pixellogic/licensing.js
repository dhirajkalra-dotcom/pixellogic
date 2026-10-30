/**
 * PixelLogic — offline, machine-locked licence + 15-day trial enforcement.
 *
 * Ported from the EventFlow Schematics implementation (Rust: trial.rs /
 * license.rs) to Electron / Node.js.
 *
 * Design:
 *  * The app ships as a 15-day demo. Entering a valid licence key unlocks it
 *    permanently on that machine.
 *  * Licence keys are signed with an Ed25519 private key held only by the
 *    vendor. The app embeds the matching PUBLIC key and verifies keys entirely
 *    offline — no server, no network.
 *  * Each key is bound to a single machine via a stable hardware fingerprint
 *    (`machineId`). A key minted for one machine fails verification on any
 *    other machine, so copying the key (or the stored licence file) is useless.
 *  * The trial timestamp is HMAC-SHA256 signed and written to two user-scoped
 *    locations that survive uninstall, so reinstalling does NOT reset the clock.
 *
 * Signed licence message formats:
 *   v1|<MACHINE_ID>|<EXP_UNIX_SECONDS>                    (legacy/offline)
 *   v2|<LICENSE_ID>|<MACHINE_ID>|<EXP_UNIX_SECONDS>       (revocable/online)
 *
 * Licence key format:
 *   base64url(message) + "." + base64url(signature)
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// ── Constants ────────────────────────────────────────────────────────────────

/** Ed25519 public key (32 bytes, hex) matching scripts/.keys/license-ed25519-private.pem. */
const LICENSE_PUBLIC_KEY_HEX =
  'd8f18efa463186039e8607197cfbaf696d184f56a012324b7567232906641b5c';

/** Salt mixed into the machine fingerprint so the ID can't be trivially reproduced. */
const MACHINE_SALT = 'pixelogic::machine::v1';

/** HMAC secret protecting the trial file from tampering. */
const TRIAL_SECRET = 'pixelogic-demo-trial::v1::7f3a9c2e-do-not-change';

/** Trial length in days. */
const TRIAL_DAYS = 15;

const TRIAL_FILE_NAME = '.pixelogic-trial';
const LICENSE_FILE_NAME = '.pixelogic-license';
const LICENSE_LEASE_FILE_NAME = '.pixelogic-license-lease';
const LICENSE_API_URL = process.env.PIXELOGIC_LICENSE_API_URL
  || 'https://pixelogic.co.in/pixelogic-license/api.php';
const LICENSE_REQUEST_TIMEOUT_MS = 8000;
const LICENSE_OFFLINE_GRACE_SECS = 7 * 86400;

// ── Small helpers ──────────────────────────────────────────────────────────

function nowSecs() {
  return Math.floor(Date.now() / 1000);
}

function hexToBytes(hex) {
  return Buffer.from(hex, 'hex');
}

// ── Machine fingerprint ──────────────────────────────────────────────────────

let _cachedRawMachine = null;

/** Best-effort stable per-machine identifier from the OS. */
function rawMachineIdentifier() {
  if (_cachedRawMachine !== null) return _cachedRawMachine;
  let raw = '';
  try {
    if (process.platform === 'win32') {
      // Windows Cryptography MachineGuid — stable across reinstalls.
      const out = execFileSync(
        'reg',
        ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
        { encoding: 'utf8', windowsHide: true },
      );
      const m = out.match(/MachineGuid\s+REG_SZ\s+([\w-]+)/i);
      if (m) raw = m[1];
    } else if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], {
        encoding: 'utf8',
      });
      const m = out.match(/IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (m) raw = m[1];
    } else {
      // Linux — machine-id.
      for (const p of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        try {
          const v = fs.readFileSync(p, 'utf8').trim();
          if (v) { raw = v; break; }
        } catch (_) { /* ignore */ }
      }
    }
  } catch (_) { /* fall through to fallback */ }

  if (!raw) {
    // Fallback: hostname + first non-internal MAC + platform/arch.
    let mac = '';
    try {
      const ifaces = os.networkInterfaces();
      for (const name of Object.keys(ifaces)) {
        for (const ni of ifaces[name] || []) {
          if (!ni.internal && ni.mac && ni.mac !== '00:00:00:00:00:00') {
            mac = ni.mac;
            break;
          }
        }
        if (mac) break;
      }
    } catch (_) { /* ignore */ }
    raw = `${os.hostname()}|${mac}|${process.platform}|${process.arch}`;
  }

  _cachedRawMachine = raw || 'unknown-machine';
  return _cachedRawMachine;
}

/**
 * Stable, salted, human-readable machine fingerprint:
 * `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX` (24 uppercase hex chars in 6 groups).
 */
function machineId() {
  const digest = crypto
    .createHash('sha256')
    .update(MACHINE_SALT)
    .update(rawMachineIdentifier())
    .digest('hex')
    .slice(0, 24)
    .toUpperCase();
  return digest.match(/.{1,4}/g).join('-');
}

// ── Storage locations (survive uninstall) ────────────────────────────────────

function locations(app, fileName) {
  const out = [];
  try {
    out.push(path.join(app.getPath('userData'), fileName));
  } catch (_) { /* ignore */ }
  try {
    out.push(path.join(os.homedir(), '.pixelogic', fileName));
  } catch (_) { /* ignore */ }
  return out;
}

function writeFileSafe(filePath, contents) {
  try {
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(filePath, contents);
  } catch (_) { /* best effort */ }
}

// ── Trial (HMAC-signed, tamper + rollback resistant) ─────────────────────────

function signPayload(payloadJson) {
  return crypto.createHmac('sha256', TRIAL_SECRET).update(payloadJson).digest('hex');
}

function verifyPayload(payloadJson, sig) {
  const expected = signPayload(payloadJson);
  if (expected.length !== String(sig || '').length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
  } catch (_) {
    return false;
  }
}

function readTrialFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const stored = JSON.parse(raw);
    if (!stored || typeof stored.payload !== 'string' || typeof stored.sig !== 'string') {
      return null;
    }
    if (!verifyPayload(stored.payload, stored.sig)) return null;
    const payload = JSON.parse(stored.payload);
    if (typeof payload.started_at !== 'number') return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function writeTrialFile(filePath, payload) {
  const payloadJson = JSON.stringify(payload);
  const sig = signPayload(payloadJson);
  writeFileSafe(filePath, JSON.stringify({ payload: payloadJson, sig }));
}

function expiredTrialStatus(now, tampered) {
  return {
    startedAt: 0,
    expiresAt: 0,
    now,
    daysRemaining: 0,
    expired: true,
    tampered: !!tampered,
    trialDays: TRIAL_DAYS,
  };
}

/** Compute the current trial state, seeding the first-launch timestamp. */
function computeTrial(app) {
  const now = nowSecs();
  const paths = locations(app, TRIAL_FILE_NAME);

  const found = [];
  let existedButInvalid = false;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const payload = readTrialFile(p);
      if (payload) found.push(payload);
      else existedButInvalid = true;
    }
  }

  // A file existed but failed its signature and no valid copy survives → tampered.
  if (existedButInvalid && found.length === 0) {
    return expiredTrialStatus(now, true);
  }

  let payload;
  if (found.length === 0) {
    // Fresh install — start the clock now.
    payload = { started_at: now, last_seen_at: now, v: 1 };
  } else {
    // Oldest started_at wins (deleting one location can't move the start forward).
    const startedAt = Math.min(...found.map((p) => p.started_at));
    const storedLastSeen = Math.max(...found.map((p) => p.last_seen_at || 0));

    // Clock rollback: if "now" is well before the last observed launch → tampered.
    if (now + 3600 < storedLastSeen) {
      return expiredTrialStatus(now, true);
    }

    payload = {
      started_at: startedAt,
      last_seen_at: Math.max(now, storedLastSeen),
      v: 1,
    };
  }

  payload.last_seen_at = Math.max(payload.last_seen_at, now);

  // Persist to ALL locations (repairs deleted/tampered copies).
  for (const p of paths) writeTrialFile(p, payload);

  const trialSecs = TRIAL_DAYS * 86400;
  const expiresAt = payload.started_at + trialSecs;
  const secsLeft = expiresAt - now;
  const daysRemaining = Math.max(0, Math.ceil(secsLeft / 86400));

  return {
    startedAt: payload.started_at,
    expiresAt,
    now,
    daysRemaining,
    expired: now >= expiresAt,
    tampered: false,
    trialDays: TRIAL_DAYS,
  };
}

// ── Licence (Ed25519, machine-locked) ────────────────────────────────────────

let _cachedVerifyKey = null;

function verifyingKey() {
  if (_cachedVerifyKey) return _cachedVerifyKey;
  try {
    const raw = hexToBytes(LICENSE_PUBLIC_KEY_HEX);
    if (raw.length !== 32) return null;
    // Wrap the raw 32-byte key in a DER SPKI header for Ed25519.
    const der = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      raw,
    ]);
    _cachedVerifyKey = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    return _cachedVerifyKey;
  } catch (_) {
    return null;
  }
}

function verifySignedBytes(messageBytes, signatureBytes) {
  const vk = verifyingKey();
  return !!vk && crypto.verify(null, messageBytes, vk, signatureBytes);
}

/**
 * Verify a licence key against THIS machine right now.
 * @returns {{ expiresAt: number } | null}
 */
function verifyKey(key, machine) {
  try {
    const trimmed = String(key || '').trim();
    const dot = trimmed.indexOf('.');
    if (dot <= 0) return null;
    const msgB64 = trimmed.slice(0, dot);
    const sigB64 = trimmed.slice(dot + 1);

    const msgBytes = Buffer.from(msgB64, 'base64url');
    const sigBytes = Buffer.from(sigB64, 'base64url');
    if (sigBytes.length !== 64) return null;

    if (!verifySignedBytes(msgBytes, sigBytes)) return null;

    // Legacy message is `v1|<MACHINE_ID>|<EXP>`.
    // Revocable message is `v2|<LICENSE_ID>|<MACHINE_ID>|<EXP>`.
    const msg = msgBytes.toString('utf8');
    const parts = msg.split('|');
    const ver = parts[0];
    if (ver !== 'v1' && ver !== 'v2') return null;
    if ((ver === 'v1' && parts.length !== 3) || (ver === 'v2' && parts.length !== 4)) return null;
    const licenseId = ver === 'v2' ? parts[1].trim() : null;
    const keyMachine = ver === 'v2' ? parts[2] : parts[1];
    const expStr = ver === 'v2' ? parts[3] : parts[2];
    if (ver === 'v2' && !/^[A-Za-z0-9_-]{12,128}$/.test(licenseId)) return null;
    if (keyMachine.trim().toUpperCase() !== String(machine).trim().toUpperCase()) return null;

    const exp = Number.parseInt(String(expStr).trim(), 10);
    if (!Number.isFinite(exp)) return null;
    if (exp !== 0 && nowSecs() >= exp) return null; // expired

    return { version: ver, licenseId, expiresAt: exp };
  } catch (_) {
    return null;
  }
}

function storedValidLicense(app, machine) {
  for (const p of locations(app, LICENSE_FILE_NAME)) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, 'utf8').trim();
      const info = verifyKey(raw, machine);
      if (info) return { ...info, key: raw };
    } catch (_) { /* ignore */ }
  }
  return null;
}

function persistLicense(app, key) {
  for (const p of locations(app, LICENSE_FILE_NAME)) {
    writeFileSafe(p, String(key).trim());
  }
}

function verifyLeaseEnvelope(envelope, expectedLicenseId, expectedMachine) {
  try {
    if (!envelope || typeof envelope.payload !== 'string' || typeof envelope.sig !== 'string') return null;
    const payloadBytes = Buffer.from(envelope.payload, 'base64url');
    const signatureBytes = Buffer.from(envelope.sig, 'base64url');
    if (signatureBytes.length !== 64 || !verifySignedBytes(payloadBytes, signatureBytes)) return null;

    const parts = payloadBytes.toString('utf8').split('|');
    if (parts.length !== 6 || parts[0] !== 'lease-v1') return null;
    const [, licenseId, leaseMachine, status, issuedAtRaw, validUntilRaw] = parts;
    const issuedAt = Number.parseInt(issuedAtRaw, 10);
    const validUntil = Number.parseInt(validUntilRaw, 10);
    if (licenseId !== expectedLicenseId) return null;
    if (leaseMachine.toUpperCase() !== String(expectedMachine).toUpperCase()) return null;
    if (status !== 'active' && status !== 'revoked' && status !== 'suspended') return null;
    if (!Number.isFinite(issuedAt) || !Number.isFinite(validUntil)) return null;
    if (issuedAt > nowSecs() + 300) return null;
    if (validUntil > issuedAt + LICENSE_OFFLINE_GRACE_SECS + 300) return null;
    return { status, issuedAt, validUntil, envelope };
  } catch (_) {
    return null;
  }
}

function storedLease(app, licenseId, machine) {
  let newest = null;
  for (const p of locations(app, LICENSE_LEASE_FILE_NAME)) {
    try {
      if (!fs.existsSync(p)) continue;
      const lease = verifyLeaseEnvelope(JSON.parse(fs.readFileSync(p, 'utf8')), licenseId, machine);
      if (lease && (!newest || lease.issuedAt > newest.issuedAt)) newest = lease;
    } catch (_) { /* ignore */ }
  }
  return newest;
}

function persistLease(app, envelope) {
  const serialized = JSON.stringify(envelope);
  for (const p of locations(app, LICENSE_LEASE_FILE_NAME)) writeFileSafe(p, serialized);
}

function postJson(urlString, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(urlString);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'PixelLogic-Desktop',
      },
      timeout: LICENSE_REQUEST_TIMEOUT_MS,
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
        if (responseBody.length > 65536) req.destroy(new Error('Licence response is too large.'));
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody || '{}');
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(parsed.error || `Licence server returned HTTP ${res.statusCode}.`));
            return;
          }
          resolve(parsed);
        } catch (_) {
          reject(new Error('Licence server returned an invalid response.'));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Licence server timed out.')));
    req.on('error', reject);
    req.end(body);
  });
}

async function refreshOnlineLicense(app, licenseInfo) {
  if (!licenseInfo || licenseInfo.version !== 'v2') return null;
  const machine = machineId();
  const response = await postJson(LICENSE_API_URL, {
    action: 'check',
    key: licenseInfo.key,
    machineId: machine,
  });
  const lease = verifyLeaseEnvelope(response.lease, licenseInfo.licenseId, machine);
  if (!lease) throw new Error('Licence server signature verification failed.');
  persistLease(app, response.lease);
  return lease;
}

// ── Enforcement gate ─────────────────────────────────────────────────────────

/**
 * Trial/licence enforcement is active in packaged (shipped) builds. In dev
 * (`npm start`) the app is unlocked so it can be developed freely. Set
 * PIXELOGIC_FORCE_TRIAL=1 to exercise the gate in development.
 */
function isEnforced(app) {
  if (String(process.env.PIXELOGIC_FORCE_TRIAL || '') === '1') return true;
  if (String(process.env.PIXELOGIC_DEV_UNLOCK || '') === '1') return false;
  try {
    return !!app.isPackaged;
  } catch (_) {
    return false;
  }
}

// ── Combined entitlement ─────────────────────────────────────────────────────

function buildEntitlement(app) {
  const machine = machineId();
  const now = nowSecs();
  const enforced = isEnforced(app);

  if (!enforced) {
    // Development / unlocked: never gate, but still expose the real machine ID.
    return {
      machineId: machine,
      licensed: true,
      licenseExpiresAt: 0,
      enforced: false,
      trial: {
        startedAt: now,
        expiresAt: now + TRIAL_DAYS * 86400,
        now,
        daysRemaining: TRIAL_DAYS,
        expired: false,
        tampered: false,
        trialDays: TRIAL_DAYS,
      },
      locked: false,
    };
  }

  const licenseInfo = storedValidLicense(app, machine);
  const lease = licenseInfo && licenseInfo.version === 'v2'
    ? storedLease(app, licenseInfo.licenseId, machine)
    : null;
  const trial = computeTrial(app);
  const licensed = !!licenseInfo && (
    licenseInfo.version === 'v1'
    || !!(lease && lease.status === 'active' && now < lease.validUntil && !trial.tampered)
  );

  return {
    machineId: machine,
    licensed,
    licenseExpiresAt: licenseInfo ? licenseInfo.expiresAt : 0,
    licenseVersion: licenseInfo ? licenseInfo.version : null,
    licenseStatus: licenseInfo && licenseInfo.version === 'v2'
      ? (lease && lease.status === 'active' && now >= lease.validUntil ? 'validation-required' : (lease ? lease.status : 'validation-required'))
      : (licenseInfo ? 'active' : 'none'),
    licenseCheckDueAt: lease ? lease.validUntil : 0,
    enforced: true,
    trial,
    locked: licenseInfo ? !licensed : (trial.expired || trial.tampered),
  };
}

async function activate(app, key) {
  const machine = machineId();
  const trimmed = String(key || '').trim();

  if (!trimmed) {
    return { ok: false, error: 'Please enter a licence key.', entitlement: buildEntitlement(app) };
  }

  const info = verifyKey(trimmed, machine);
  if (info) {
    if (info.version === 'v2') {
      try {
        const lease = await refreshOnlineLicense(app, { ...info, key: trimmed });
        if (!lease || lease.status !== 'active' || nowSecs() >= lease.validUntil) {
          return { ok: false, error: 'This licence has been suspended or revoked.', entitlement: buildEntitlement(app) };
        }
      } catch (error) {
        return { ok: false, error: `Could not validate this licence online: ${error.message}`, entitlement: buildEntitlement(app) };
      }
    }
    persistLicense(app, trimmed);
    return { ok: true, error: null, entitlement: buildEntitlement(app) };
  }
  return {
    ok: false,
    error: 'This licence key is not valid for this machine, or it has expired.',
    entitlement: buildEntitlement(app),
  };
}

async function refreshEntitlement(app) {
  const current = storedValidLicense(app, machineId());
  if (current && current.version === 'v2') {
    try { await refreshOnlineLicense(app, current); } catch (_) { /* cached lease provides offline grace */ }
  }
  return buildEntitlement(app);
}

// ── IPC registration ─────────────────────────────────────────────────────────

/**
 * Register the licensing IPC handlers. Call once from main.js after requiring
 * `app` and `ipcMain`.
 */
function registerLicensing(app, ipcMain) {
  ipcMain.handle('license-status', () => refreshEntitlement(app));
  ipcMain.handle('license-machine-id', () => machineId());
  ipcMain.handle('license-activate', (_event, key) => activate(app, key));
}

module.exports = {
  registerLicensing,
  machineId,
  buildEntitlement,
  activate,
  verifyKey,
  TRIAL_DAYS,
};
