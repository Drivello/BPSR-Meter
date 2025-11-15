const path = require('path');
const fs = require('fs');
const os = require('os');

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (e) {}
}

function normalizeForCompare(p) {
  // On Windows, paths are case-insensitive
  const isWin = process.platform === 'win32';
  return isWin ? p.toLowerCase() : p;
}

function safeJoin(base, ...segments) {
  const basePath = path.resolve(base);
  const targetPath = path.resolve(basePath, ...segments);
  const baseCmp = normalizeForCompare(basePath.endsWith(path.sep) ? basePath : basePath + path.sep);
  const targetCmp = normalizeForCompare(targetPath + path.sep);
  if (!targetCmp.startsWith(baseCmp)) {
    throw new Error('Path traversal blocked');
  }
  return targetPath;
}

function getDefaultUserDataDir() {
  // Fallback when Electron's app.getPath('userData') is not available in this process
  // Prefer value forwarded by Electron main process
  if (process.env.BPSR_DATA_DIR_DEFAULT && process.env.BPSR_DATA_DIR_DEFAULT.trim()) {
    return path.resolve(process.env.BPSR_DATA_DIR_DEFAULT.trim());
  }
  const home = os.homedir();
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'BPSR-Meter', 'bpsr');
  }
  // Non-Windows fallback (dev/testing only)
  return path.join(home, '.config', 'bpsr-meter', 'bpsr');
}

function getDataDir() {
  const fromEnv = (process.env.BPSR_DATA_DIR || '').trim();
  const dataDir = fromEnv ? path.resolve(fromEnv) : getDefaultUserDataDir();
  ensureDir(dataDir);
  return dataDir;
}

const DATA_DIR = getDataDir();

function resolveInDataDir(...segments) {
  return safeJoin(DATA_DIR, ...segments);
}

function getSettingsPath() {
  return resolveInDataDir('settings.json');
}

function getLogsDir() {
  const p = resolveInDataDir('logs');
  ensureDir(p);
  return p;
}

function getDebugDir() {
  const p = resolveInDataDir('debug');
  ensureDir(p);
  return p;
}

module.exports = {
  DATA_DIR,
  getDataDir,
  safeJoin,
  resolveInDataDir,
  getSettingsPath,
  getLogsDir,
  getDebugDir,
  ensureDir,
};
