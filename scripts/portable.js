#!/usr/bin/env node
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

async function pathExists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function ensureDir(p) { await fsp.mkdir(p, { recursive: true }); }

async function rmrf(p) { await fsp.rm(p, { recursive: true, force: true }); }

async function copyDir(src, dest) {
  if (fsp.cp) {
    await fsp.cp(src, dest, { recursive: true });
    return;
  }
  const entries = await fsp.readdir(src, { withFileTypes: true });
  await ensureDir(dest);
  for (const ent of entries) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      await copyDir(s, d);
    } else if (ent.isSymbolicLink()) {
      const target = await fsp.readlink(s);
      await fsp.symlink(target, d);
    } else {
      await ensureDir(path.dirname(d));
      await fsp.copyFile(s, d);
    }
  }
}

function findPkgBin(cwd) {
  const candidates = [
    path.join(cwd, 'node_modules', '.bin', 'pkg.cmd'),
    path.join(cwd, 'node_modules', '.bin', 'pkg.exe'),
    path.join(cwd, 'node_modules', '.bin', 'pkg'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'pkg';
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const unpackedDir = path.join(projectRoot, 'dist_electron', 'win-unpacked');
  const unpackedExe = path.join(unpackedDir, 'BPSR Meter.exe');

  if (!(await pathExists(unpackedExe))) {
    console.error('No se encontró dist_electron/win-unpacked/BPSR Meter.exe');
    console.error('Ejecuta primero: pnpm run dist (aunque falle la firma), o revisa que win-unpacked exista.');
    process.exit(1);
  }

  const outExe = path.join(projectRoot, 'BPSR-Meter-Portable.exe');
  const buildTmp = path.join(__dirname, '.portable_tmp');
  const payloadDir = path.join(buildTmp, 'payload');

  await rmrf(buildTmp);
  await ensureDir(buildTmp);
  await ensureDir(payloadDir);

  console.log('Copiando payload desde win-unpacked...');
  await copyDir(unpackedDir, payloadDir);

  const stubSource = `#!/usr/bin/env node\n` +
`const fs = require('fs');\n` +
`const path = require('path');\n` +
`const os = require('os');\n` +
`const { spawn } = require('child_process');\n` +
`function copyDirSync(src, dest) {\n` +
`  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });\n` +
`  for (const name of fs.readdirSync(src)) {\n` +
`    const s = path.join(src, name);\n` +
`    const d = path.join(dest, name);\n` +
`    const st = fs.lstatSync(s);\n` +
`    if (st.isDirectory()) { copyDirSync(s, d); }\n` +
`    else if (st.isSymbolicLink()) { try { fs.symlinkSync(fs.readlinkSync(s), d); } catch {} }\n` +
`    else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); }\n` +
`  }\n` +
`}\n` +
`(function run(){\n` +
`  try {\n` +
`    const here = __dirname;\n` +
`    const payload = path.join(here, 'payload');\n` +
`    if (!fs.existsSync(payload)) {\n` +
`      console.error('Payload no encontrado dentro del ejecutable.');\n` +
`      process.exit(1);\n` +
`    }\n` +
`    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'BPSR-Meter-'));\n` +
`    const dest = path.join(base, 'app');\n` +
`    copyDirSync(payload, dest);\n` +
`    const exe = path.join(dest, 'BPSR Meter.exe');\n` +
`    if (!fs.existsSync(exe)) {\n` +
`      console.error('No se encontró \'BPSR Meter.exe\' en el payload extraído.');\n` +
`      process.exit(1);\n` +
`    }\n` +
`    const child = spawn(exe, [], { cwd: dest, stdio: 'inherit' });\n` +
`    child.on('exit', (code) => process.exit(code || 0));\n` +
`    child.on('error', (err) => { console.error('Error al iniciar la app:', err); process.exit(1); });\n` +
`  } catch (e) {\n` +
`    console.error('Error en portable stub:', e);\n` +
`    process.exit(1);\n` +
`  }\n` +
`})();\n`;

  const stubPath = path.join(buildTmp, 'portable_stub.js');
  await fsp.writeFile(stubPath, stubSource, 'utf8');

  const pkgBin = findPkgBin(projectRoot);
  console.log('Compilando stub con pkg...');
  const args = [
    stubPath,
    '--targets', 'node22-win-x64',
    '--output', outExe,
    '--assets', 'payload/**/*'
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(pkgBin, args, { cwd: buildTmp, stdio: 'inherit', shell: true });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error('pkg exited with code ' + code)));
    child.on('error', reject);
  });

  console.log('\n✔ Portable generado en: ' + outExe);
  await rmrf(buildTmp);
}

main().catch((e) => {
  console.error('Error generando portable:', e);
  process.exit(1);
});
