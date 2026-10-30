/**
 * Shared licence-minting logic for PixelLogic.
 *
 * Used by both the CLI (`generate-license.mjs`) and the local browser tool
 * (`license-server.mjs`). The Ed25519 PRIVATE key never leaves this process —
 * it is read from disk and used only to sign locally.
 *
 * Signed message format (must match licensing.js verifyKey() exactly):
 *   v1|<MACHINE_ID>|<EXP_UNIX_SECONDS>          (EXP = 0 means perpetual)
 *
 * Licence key format:
 *   base64url(message) + "." + base64url(signature)
 */
import { createPrivateKey, sign as edSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the vendor Ed25519 private key (KEEP SECRET). */
export const PRIV_PATH = join(__dirname, '..', '.keys', 'license-ed25519-private.pem');

/** True if the signing key exists on disk. */
export function hasPrivateKey() {
  return existsSync(PRIV_PATH);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/**
 * Mint a machine-locked licence key.
 *
 * @param {object} opts
 * @param {string} opts.machineId  The Machine ID copied from the customer's app.
 * @param {number} [opts.days]     Validity in days. Omit / 0 for a perpetual key.
 * @returns {{ machineId: string, exp: number, key: string }}
 * @throws {Error} if inputs are invalid or the private key is missing.
 */
export function mintLicense({ machineId, days }) {
  if (!hasPrivateKey()) {
    throw new Error(
      `Private key not found at ${PRIV_PATH}. Run \`node scripts/generate-keypair.mjs\` first.`,
    );
  }

  const id = String(machineId ?? '').trim().toUpperCase();
  if (!id) {
    throw new Error('Machine ID is required.');
  }
  // Machine IDs are salted-SHA256 hex in 6 groups of 4 (XXXX-XXXX-...-XXXX).
  // Be lenient (accept any non-empty ID) but guard against absurd input.
  if (id.length > 128) {
    throw new Error('Machine ID looks invalid (too long).');
  }

  let exp = 0;
  if (days !== undefined && days !== null && String(days).trim().length > 0) {
    const n = Number(days);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('Days must be zero (perpetual) or a positive number.');
    }
    // n === 0 -> perpetual (exp stays 0); n > 0 -> expiry timestamp.
    if (n > 0) {
      exp = Math.floor(Date.now() / 1000) + Math.floor(n * 86400);
    }
  }

  const message = `v1|${id}|${exp}`;
  const privateKey = createPrivateKey(readFileSync(PRIV_PATH));
  const signature = edSign(null, Buffer.from(message, 'utf8'), privateKey);
  const key = `${b64url(message)}.${b64url(signature)}`;

  return { machineId: id, exp, key };
}
