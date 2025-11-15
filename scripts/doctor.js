#!/usr/bin/env node
try { require('dotenv').config(); } catch (_) {}
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork } = require('child_process');

const ROOT = __dirname ? path.resolve(__dirname, '..') : process.cwd();

function log(line) { console.log(line); }
function pass(name) { console.log(`OK  - ${name}`); }
function warn(name) { console.log(`WARN- ${name}`); }
function fail(name) { console.log(`FAIL- ${name}`); }

async function checkNode() {
  const v = process.versions.node;
  log(`Node.js: ${v}`);
  return true;
}

async function checkNpcap() {
  try {
    const cap = require('cap');
    const list = cap.Cap.deviceList();
    if (Array.isArray(list)) {
      pass(`Npcap detected (${list.length} interfaces)`);
      return true;
    }
    warn('Npcap not detected');
    return false;
  } catch (e) {
    warn('Npcap not detected');
    return false;
  }
}

function getPaths() {
  const p = require(path.join(ROOT, 'src', 'server', 'paths.js'));
  return p;
}

async function checkDataDir() {
  try {
    const { DATA_DIR } = getPaths();
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, 'doctor_probe.tmp');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    pass(`DATA_DIR accessible: ${DATA_DIR}`);
    return true;
  } catch (e) {
    fail(`DATA_DIR not accessible: ${e.message}`);
    return false;
  }
}

function httpGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { try { req.destroy(); } catch(_){}; reject(new Error('timeout')); });
  });
}

async function waitHealth(baseUrl, healthPath, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const code = await httpGet(baseUrl + healthPath, 2000);
      if (code === 200) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  let ok = true;
  log('=== BPSR Doctor ===');
  await checkNode();
  await checkNpcap();
  ok = (await checkDataDir()) && ok;

  const envPort = parseInt(process.env.BPSR_PORT || '', 10);
  const base = parseInt(process.env.BPSR_PORT_BASE || '8989', 10);
  const chosenPort = Number.isFinite(envPort) && envPort > 0 ? envPort : base;
  const healthPath = (process.env.BPSR_HEALTH_PATH && process.env.BPSR_HEALTH_PATH.trim()) || '/healthz';
  const timeoutMs = Number.isFinite(parseInt(process.env.BPSR_STARTUP_TIMEOUT_MS || '', 10)) ? parseInt(process.env.BPSR_STARTUP_TIMEOUT_MS, 10) : 15000;

  log(`Health target: http://localhost:${chosenPort}${healthPath}`);

  let child;
  try {
    const serverJs = path.join(ROOT, 'server.js');
    const env = { ...process.env, BPSR_SKIP_SNIFFER: '1', BPSR_PORT: String(chosenPort) };
    child = fork(serverJs, [chosenPort], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'], env });
  } catch (e) {
    fail('Failed to start server process: ' + e.message);
    process.exit(1);
  }

  const baseUrl = `http://localhost:${chosenPort}`;
  const healthy = await waitHealth(baseUrl, healthPath, timeoutMs);
  if (healthy) pass('/healthz ready');
  else { fail('/healthz not ready'); ok = false; }

  try { child.kill('SIGTERM'); } catch (_) {}
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { fail(e.message); process.exit(1); });
