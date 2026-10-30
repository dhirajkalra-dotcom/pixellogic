#!/usr/bin/env node
/**
 * Generate an Ed25519 signing key-pair for PixelLogic licences.
 *
 *   node scripts/generate-keypair.mjs
 *
 * Outputs:
 *   scripts/.keys/license-ed25519-private.pem  — the PRIVATE key (KEEP SECRET, never ship / commit)
 *   scripts/.keys/license-public-hex.txt       — the 32-byte PUBLIC key as hex
 *
 * The public hex must be embedded in licensing.js (LICENSE_PUBLIC_KEY_HEX).
 * The private key is used by generate-license.mjs to mint machine-locked keys.
 *
 * Run this ONCE. If you re-run it you invalidate every licence already issued.
 */
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = join(__dirname, '.keys');
const PRIV_PATH = join(KEYS_DIR, 'license-ed25519-private.pem');
const PUB_HEX_PATH = join(KEYS_DIR, 'license-public-hex.txt');

if (existsSync(PRIV_PATH) && !process.argv.includes('--force')) {
  console.error(
    `A private key already exists at:\n  ${PRIV_PATH}\n` +
    `Refusing to overwrite (this would invalidate all issued licences).\n` +
    `Pass --force only if you are absolutely sure.`,
  );
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

// Raw 32-byte public key: take it from the JWK 'x' field (base64url).
const jwk = publicKey.export({ format: 'jwk' });
const rawPub = Buffer.from(jwk.x, 'base64url');
const pubHex = rawPub.toString('hex');

const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

mkdirSync(KEYS_DIR, { recursive: true });
writeFileSync(PRIV_PATH, privPem, { mode: 0o600 });
writeFileSync(PUB_HEX_PATH, pubHex + '\n');

console.log('Ed25519 key-pair generated.\n');
console.log('Public key (hex), embed in licensing.js (LICENSE_PUBLIC_KEY_HEX):');
console.log('  ' + pubHex + '\n');
console.log('Private key written to (KEEP SECRET):');
console.log('  ' + PRIV_PATH);
console.log('\nNext: run `node scripts/generate-license.mjs --machine <MACHINE_ID>` to mint a licence.');
