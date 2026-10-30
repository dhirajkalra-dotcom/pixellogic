#!/usr/bin/env node
/**
 * Mint a machine-locked PixelLogic licence key.
 *
 *   node scripts/generate-license.mjs --machine "ABCD-1234-EF56-7890-ABCD-1234"
 *   node scripts/generate-license.mjs --machine "<MACHINE_ID>" --days 365
 *
 * Options:
 *   --machine <ID>   (required) the Machine ID the customer copied from the app.
 *   --days <N>       (optional) licence validity in days. Omit for a perpetual key.
 *
 * The key is signed with the private key created by generate-keypair.mjs and is
 * only valid on the machine whose ID was supplied. Verification happens entirely
 * offline inside the app (licensing.js).
 *
 * Signed message format (must match licensing.js exactly):
 *   v1|<MACHINE_ID>|<EXP_UNIX_SECONDS>          (EXP = 0 means perpetual)
 *
 * Licence key format:
 *   base64url(message) + "." + base64url(signature)
 */
import { mintLicense, hasPrivateKey, PRIV_PATH } from './license/mint.mjs';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const machine = arg('--machine');
const daysStr = arg('--days');

if (!machine) {
  console.error('Error: --machine <MACHINE_ID> is required.');
  console.error('Usage: node scripts/generate-license.mjs --machine "<ID>" [--days N]');
  process.exit(1);
}
if (!hasPrivateKey()) {
  console.error(`Private key not found at ${PRIV_PATH}.`);
  console.error('Run `node scripts/generate-keypair.mjs` first.');
  process.exit(1);
}

let result;
try {
  result = mintLicense({ machineId: machine, days: daysStr });
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}

console.log('Licence minted.\n');
console.log('Machine ID :', result.machineId);
console.log('Expires    :', result.exp === 0 ? 'never (perpetual)' : new Date(result.exp * 1000).toISOString());
console.log('\nLicence key (send this to the customer):\n');
console.log(result.key);
console.log('');
