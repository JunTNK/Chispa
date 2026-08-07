import { spawn } from 'child_process';
import { resolve } from 'path';
import http from 'http';

const PROJECT = resolve(import.meta.dirname, '..');
const PORT = 3457;
const BASE = `http://localhost:${PORT}`;

function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve_, reject) => {
    const check = () => {
      http.get(url, () => resolve_(true)).on('error', () => {
        if (Date.now() - start > timeout) reject(new Error('Server timeout'));
        else setTimeout(check, 500);
      });
    };
    check();
  });
}

async function main() {
  console.log('Starting production server...');
  const server = spawn('node_modules/.bin/next', ['start', '-p', String(PORT)], {
    cwd: PROJECT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  });

  let log = '';
  server.stdout.on('data', d => { log += d.toString(); });
  server.stderr.on('data', d => { log += d.toString(); });

  try {
    await waitForServer(BASE, 25000);
    console.log('Server ready!');
  } catch {
    console.error('Server start failed:', log.substring(0, 300));
    server.kill();
    process.exit(1);
  }

  // Run Playwright tests
  const test = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
    cwd: PROJECT,
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: BASE },
  });

  const exitCode = await new Promise(res => { test.on('exit', res); });

  server.kill();
  process.exit(exitCode ?? 0);
}

main();
