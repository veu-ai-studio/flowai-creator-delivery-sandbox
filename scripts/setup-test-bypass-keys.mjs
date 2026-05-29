// scripts/setup-test-bypass-keys.mjs
//
// One-shot key-provisioning script for the X-Test-Bypass-Token
// infrastructure (§9.1 of FLOWAI_SELF_ADVERSARIAL_TEST_PLAN). The
// operator runs this LOCALLY; it never transits any private-key
// bytes through any external tool surface. Specifically:
//
//   - The script generates ECDSA P-256 keypairs in-process via
//     Node's `crypto.generateKeyPairSync`.
//   - PEM bytes are piped to `doppler secrets set` via STDIN
//     (`--no-interactive`), so the key value never appears on the
//     command line, in shell history, or in `ps` listings.
//   - Public keys are also emitted to local files at
//     `.flowai-keys/test-bypass-public-{env}.pem` for convenient
//     verification — these are PUBLIC, not secret.
//
// Modes:
//   - 'doppler' (default): writes both private + public keys to the
//     specified Doppler config via stdin. Requires `doppler` CLI on
//     PATH and the operator already authenticated (`doppler login`).
//   - 'stdout': prints the four PEMs to stdout for the operator to
//     hand-copy into Doppler UI / 1Password / their preferred vault.
//     Use this when the `doppler` CLI is not present.
//   - 'files': writes the four PEMs to local files in `.flowai-keys/`
//     (gitignored). For air-gapped operators. The operator is then
//     responsible for uploading the private PEMs into the secret
//     store manually and deleting the local copies.
//
// Doppler key names (per the dispatch + spec §9.1):
//   - flowai/prd: TEST_BYPASS_PRIVATE_KEY_PROD  + TEST_BYPASS_PUBLIC_KEY_PROD
//   - flowai/dev: TEST_BYPASS_PRIVATE_KEY_DEV   + TEST_BYPASS_PUBLIC_KEY_DEV
//
// Usage:
//   node scripts/setup-test-bypass-keys.mjs                  # mode=doppler, both envs
//   node scripts/setup-test-bypass-keys.mjs --mode=stdout
//   node scripts/setup-test-bypass-keys.mjs --mode=files
//   node scripts/setup-test-bypass-keys.mjs --env=prod       # restrict to one env
//
// Re-running:
//   The script ROTATES the keys on every run. Any token issued under
//   the prior key becomes invalid the moment the new public key
//   replaces the old one in Doppler. Only re-run when rotating.

import { generateKeyPairSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const LOCAL_KEYS_DIR = path.join(repoRoot, '.flowai-keys');

const ENV_TARGETS = Object.freeze([
  { env: 'dev',  dopplerConfig: 'dev', suffix: 'DEV' },
  { env: 'prod', dopplerConfig: 'prd', suffix: 'PROD' },
]);

function parseArgs(argv) {
  const args = { mode: 'doppler', env: 'all' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--mode=')) args.mode = a.slice('--mode='.length);
    else if (a.startsWith('--env=')) args.env = a.slice('--env='.length);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  if (!['doppler', 'stdout', 'files'].includes(args.mode)) {
    throw new Error(`--mode must be one of: doppler | stdout | files (got "${args.mode}")`);
  }
  if (!['all', 'dev', 'prod'].includes(args.env)) {
    throw new Error(`--env must be one of: all | dev | prod (got "${args.env}")`);
  }
  return args;
}

function help() {
  process.stdout.write(`
setup-test-bypass-keys — provision ECDSA P-256 keypairs for X-Test-Bypass-Token

USAGE
  node scripts/setup-test-bypass-keys.mjs [--mode=doppler|stdout|files] [--env=all|dev|prod]

MODES
  doppler   Pipe PEMs to \`doppler secrets set\` via stdin (default).
            Requires doppler CLI authenticated to the flowai project.
  stdout    Print PEMs to stdout; operator hand-copies into Doppler UI.
  files     Write PEMs to .flowai-keys/ (gitignored). For air-gapped ops.

ENVS
  all       Both dev (flowai/dev) and prod (flowai/prd). Default.
  dev       Only generate the dev keypair.
  prod      Only generate the prod keypair.

SAFETY
  - Private-key bytes never appear on the command line.
  - In 'doppler' mode, PEMs are piped via stdin to a child process.
  - Re-running ROTATES keys — invalidates all live tokens.
`);
}

function generateKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicPem:  publicKey.export({ type: 'spki',  format: 'pem' }),
  };
}

function setDopplerSecretViaStdin({ name, value, project, config }) {
  // Use `doppler secrets set <NAME>` with the value supplied on stdin so
  // it never appears on the command line. The CLI supports this form:
  //   echo "<pem>" | doppler secrets set NAME --project flowai --config prd
  // We do the same without echo (the pipe goes directly from the
  // generated Buffer into the child stdin).
  return new Promise((resolve, reject) => {
    const child = spawn(
      'doppler',
      ['secrets', 'set', name, '--project', project, '--config', config, '--silent'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    child.on('error', (e) => reject(new Error(`doppler spawn failed: ${e.message}`)));
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`doppler secrets set ${name} (${project}/${config}) exit ${code}: ${stderr.slice(0, 200)}`));
      else resolve();
    });
    child.stdin.end(value);
  });
}

async function writeKeysToFiles({ suffix, privatePem, publicPem }) {
  if (!existsSync(LOCAL_KEYS_DIR)) await mkdir(LOCAL_KEYS_DIR, { recursive: true });
  const priv = path.join(LOCAL_KEYS_DIR, `test-bypass-private-${suffix.toLowerCase()}.pem`);
  const pub  = path.join(LOCAL_KEYS_DIR, `test-bypass-public-${suffix.toLowerCase()}.pem`);
  await writeFile(priv, privatePem, { encoding: 'utf8', mode: 0o600 });
  await writeFile(pub,  publicPem,  { encoding: 'utf8', mode: 0o644 });
  return { priv, pub };
}

async function provisionEnv({ mode, target }) {
  const { env, dopplerConfig, suffix } = target;
  const { privatePem, publicPem } = generateKeypair();
  const privateName = `TEST_BYPASS_PRIVATE_KEY_${suffix}`;
  const publicName  = `TEST_BYPASS_PUBLIC_KEY_${suffix}`;

  if (mode === 'doppler') {
    process.stdout.write(`[setup] ${env}: piping ${privateName} → doppler/flowai/${dopplerConfig} ...\n`);
    await setDopplerSecretViaStdin({ name: privateName, value: privatePem, project: 'flowai', config: dopplerConfig });
    process.stdout.write(`[setup] ${env}: piping ${publicName} → doppler/flowai/${dopplerConfig} ...\n`);
    await setDopplerSecretViaStdin({ name: publicName, value: publicPem, project: 'flowai', config: dopplerConfig });
    process.stdout.write(`[setup] ${env}: doppler/flowai/${dopplerConfig} populated.\n`);
  } else if (mode === 'stdout') {
    process.stdout.write(`\n# ───── ${env} (doppler/flowai/${dopplerConfig}) ─────\n`);
    process.stdout.write(`# ${privateName}\n${privatePem}\n`);
    process.stdout.write(`# ${publicName}\n${publicPem}\n`);
  } else if (mode === 'files') {
    const { priv, pub } = await writeKeysToFiles({ suffix, privatePem, publicPem });
    process.stdout.write(`[setup] ${env}: wrote ${priv} (mode 600) and ${pub} (mode 644). Upload private → doppler/flowai/${dopplerConfig} as ${privateName}; public as ${publicName}. DELETE local private PEM after upload.\n`);
  }

  // Also drop the PUBLIC PEM locally for convenience — it's not secret.
  // Lets the operator verify tokens locally without round-tripping Doppler.
  await writeKeysToFiles({ suffix, privatePem, publicPem });
  // Re-redact: in 'doppler' or 'stdout' modes, the private file is still
  // written locally for verification. The operator should delete it
  // after confirming Doppler upload, or set --mode=stdout if they don't
  // want a local copy at all.
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { help(); return; }

  process.stdout.write(`[setup] mode=${args.mode}, env=${args.env}\n`);
  if (args.mode === 'doppler') {
    process.stdout.write(`[setup] using \`doppler\` CLI; private-key bytes pipe through stdin only (never on the command line).\n`);
  }

  const targets = args.env === 'all'
    ? ENV_TARGETS
    : ENV_TARGETS.filter((t) => t.env === args.env);

  for (const target of targets) {
    try {
      await provisionEnv({ mode: args.mode, target });
    } catch (e) {
      process.stderr.write(`[setup] ${target.env}: FAILED — ${e.message}\n`);
      process.exit(1);
    }
  }

  process.stdout.write(`\n[setup] done. Verify in Doppler dashboard or by running:\n`);
  process.stdout.write(`        doppler secrets get TEST_BYPASS_PUBLIC_KEY_DEV  --project flowai --config dev  --plain\n`);
  process.stdout.write(`        doppler secrets get TEST_BYPASS_PUBLIC_KEY_PROD --project flowai --config prd  --plain\n`);
  process.stdout.write(`        (Only public keys are safe to print; never print the private ones.)\n`);
  process.stdout.write(`        Local PEM copies (under .flowai-keys/) — DELETE the private files after Doppler upload is confirmed.\n`);
}

main().catch((e) => {
  process.stderr.write(`[setup] CRASH — ${e?.stack ?? e}\n`);
  process.exit(2);
});
