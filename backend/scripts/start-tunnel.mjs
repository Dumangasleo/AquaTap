/**
 * npm run tunnel
 *
 * Gives the local API a free, temporary public HTTPS address (Cloudflare Quick Tunnel), so the
 * AquaTap app on a phone can reach it from any network (mobile data, another Wi-Fi) without
 * firewall or router changes. DEVELOPMENT ONLY: the address changes every time this starts.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const API_PATH = '/api/v1';
const CLOUDFLARED_WINDOWS_DOWNLOAD_URL =
  'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
const TUNNEL_ADDRESS_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const toolsDirectory = resolve(backendDirectory, '..', '.tools');

try {
  process.loadEnvFile(join(backendDirectory, '.env'));
} catch {
  // No .env: fall back to the default port.
}
const apiPort = Number(process.env.PORT ?? 3000);
const localApiUrl = `http://localhost:${apiPort}`;

/** Uses ../.tools/cloudflared.exe on Windows (downloaded once from Cloudflare's official release). */
async function resolveCloudflaredPath() {
  if (process.platform !== 'win32') return 'cloudflared'; // macOS / Linux: install it first (e.g. brew install cloudflared)

  const binaryPath = join(toolsDirectory, 'cloudflared.exe');
  if (existsSync(binaryPath)) return binaryPath;

  console.log('Downloading cloudflared from Cloudflare (one time, about 55 MB)...');
  mkdirSync(toolsDirectory, { recursive: true });
  const response = await fetch(CLOUDFLARED_WINDOWS_DOWNLOAD_URL);
  if (!response.ok || !response.body) throw new Error(`cloudflared download failed (HTTP ${response.status}).`);
  const partialPath = `${binaryPath}.download`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partialPath));
  renameSync(partialPath, binaryPath);
  return binaryPath;
}

async function isReachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch {
    return false;
  }
}

/** A new trycloudflare.com address needs a few seconds before it answers. */
async function waitUntilReachable(url, attempts = 15) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await isReachable(url)) return true;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));
  }
  return false;
}

async function announcePublicAddress(tunnelAddress) {
  const apiBaseUrl = `${tunnelAddress}${API_PATH}`;
  console.log(`
  AquaTap API is public (development only):

      ${apiBaseUrl}

  On the phone: Sign-in screen > tap "Server" > paste the address above > Save.
  Keep this window open. Ctrl+C stops the tunnel. The address changes on every restart.
`);
  const isUp = await waitUntilReachable(`${apiBaseUrl}/health`);
  console.log(
    isUp
      ? '  Checked: the API answers through the tunnel.'
      : `  Warning: the API did not answer through the tunnel yet. Is "npm run start:dev" running on port ${apiPort}?`,
  );
}

async function main() {
  if (!(await isReachable(`${localApiUrl}${API_PATH}/health`))) {
    console.warn(`The API is not answering on ${localApiUrl} yet. Start it in another terminal: npm run start:dev`);
  }

  const cloudflaredPath = await resolveCloudflaredPath();
  const tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--no-autoupdate', '--url', localApiUrl], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let hasAnnounced = false;
  const handleOutput = (chunk) => {
    const text = chunk.toString();
    const match = text.match(TUNNEL_ADDRESS_PATTERN);
    if (match && !hasAnnounced) {
      hasAnnounced = true;
      void announcePublicAddress(match[0]);
    }
    for (const line of text.split('\n')) {
      if (/\bERR\b/.test(line)) console.error(line.trim());
    }
  };

  tunnelProcess.stdout.on('data', handleOutput);
  tunnelProcess.stderr.on('data', handleOutput);
  tunnelProcess.on('error', (error) => {
    console.error(`Could not start cloudflared: ${error.message}`);
    process.exit(1);
  });
  tunnelProcess.on('exit', (exitCode) => process.exit(exitCode ?? 0));
  process.on('SIGINT', () => tunnelProcess.kill('SIGINT'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
