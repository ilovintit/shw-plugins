'use strict';
// No shell, package install, or platform-specific download utilities at runtime.
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const https = require('node:https');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const VERSION = '10.3.5';
const prefixes = { gitea: 'gitea-mcp-shim', worktree: 'shw-worktree', kubernetes: 'shw-kubernetes' };

function failure(code) { return Object.assign(new Error(code), { code }); }
function assetName(kind, platform = process.platform, arch = process.arch) {
  const goos = { darwin: 'darwin', linux: 'linux', win32: 'windows' }[platform];
  const goarch = { x64: 'amd64', arm64: 'arm64' }[arch];
  if (!Object.hasOwn(prefixes, kind) || !goos || !goarch || (goos === 'linux' && goarch !== 'amd64')) {
    throw failure('UNSUPPORTED_MCP_PLATFORM');
  }
  return prefixes[kind] + '-' + goos + '-' + goarch + (goos === 'windows' ? '.exe' : '');
}
function normalizedEnv(source, platform = process.platform) {
  const env = { ...source };
  if (platform === 'win32') {
    for (const key of Object.keys(env)) {
      const upper = key.toUpperCase();
      if (/^(GITEA_|DBX_|SHW_|XDG_)/.test(upper) || ['HOME', 'USERPROFILE', 'LOCALAPPDATA'].includes(upper)) {
        if (key !== upper) { env[upper] = env[key]; delete env[key]; }
      }
    }
  }
  return env;
}
function userHome(env, platform = process.platform) {
  return (platform === 'win32' ? env.USERPROFILE : env.HOME) || env.HOME || os.homedir();
}
function absolutePath(root, platform) {
  const p = platform === 'win32' ? path.win32 : path;
  return p.isAbsolute(root) && !(platform === 'win32' && p.parse(root).root === '\\');
}
function configRoot(env, platform = process.platform) {
  const p = platform === 'win32' ? path.win32 : path;
  const root = env.XDG_CONFIG_HOME || p.join(userHome(env, platform), '.config');
  if (!absolutePath(root, platform)) throw failure('USER_CONFIG_PATH_MUST_BE_ABSOLUTE');
  return root;
}
function readEnvFile(file, env, advanced) {
  let content;
  try {
    if (fs.statSync(file).size > 1024 * 1024) throw failure('GITEA_ENV_TOO_LARGE');
    content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
  const loaded = {};
  for (let line of content.split(/\r?\n/)) {
    if (line.startsWith('export ')) line = line.slice(7);
    const match = /^(GITEA_[A-Za-z0-9_]+)=(.*)$/.exec(line);
    if (!match) continue;
    const [, key] = match;
    if (!advanced && key !== 'GITEA_HOST' && key !== 'GITEA_ACCESS_TOKEN') continue;
    let value = match[2];
    if (value.length >= 2 && ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))) {
      value = value.slice(1, -1);
    }
    env[key] = loaded[key] = value; // Literal data, never shell expansion.
  }
  return loaded;
}
function giteaEnv(source, cwd = process.cwd(), platform = process.platform, log = () => {}) {
  const env = normalizedEnv(source, platform);
  const p = platform === 'win32' ? path.win32 : path;
  readEnvFile(p.join(configRoot(env, platform), 'shw-plugins', 'gitea.env'), env, true);
  log('launcher_user_env_loaded');
  const originalHost = env.GITEA_HOST;
  const loaded = readEnvFile(p.join(env.SHW_MCP_WORKDIR || cwd, '.shw-plugins', 'gitea.env'), env, false);
  if (loaded.GITEA_HOST && !Object.hasOwn(loaded, 'GITEA_ACCESS_TOKEN') && loaded.GITEA_HOST !== originalHost) {
    delete env.GITEA_ACCESS_TOKEN;
  }
  log('launcher_workspace_env_loaded');
  return env;
}
function cacheRoot(env, version, platform = process.platform) {
  const p = platform === 'win32' ? path.win32 : path;
  const root = env.XDG_CACHE_HOME || (platform === 'win32' && env.LOCALAPPDATA) || p.join(userHome(env, platform), '.cache');
  if (!absolutePath(root, platform)) throw failure('CACHE_PATH_MUST_BE_ABSOLUTE');
  return p.join(root, 'shw-plugins', version);
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function ensureExecutable(file, platform) {
  if (platform !== 'win32' && !((await fsp.stat(file)).mode & 0o111)) await fsp.chmod(file, 0o755);
}

// Bound size, time and redirects. HTTPS redirects cannot silently downgrade.
async function download(url, limit, redirects = 5) {
  const parsed = new URL(url);
  if (parsed.protocol === 'file:') {
    const file = fileURLToPath(parsed);
    if ((await fsp.stat(file)).size > limit) throw failure('MCP_DOWNLOAD_TOO_LARGE');
    return fsp.readFile(file);
  }
  const transport = { 'http:': http, 'https:': https }[parsed.protocol];
  if (!transport) throw failure('MCP_DOWNLOAD_SCHEME');
  return new Promise((resolve, reject) => {
    const request = transport.get(parsed, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (!redirects || !response.headers.location) { reject(failure('MCP_DOWNLOAD_REDIRECT')); return; }
        const next = new URL(response.headers.location, parsed);
        if (parsed.protocol === 'https:' && next.protocol !== 'https:') { reject(failure('MCP_DOWNLOAD_DOWNGRADE')); return; }
        if (!['http:', 'https:'].includes(next.protocol)) { reject(failure('MCP_DOWNLOAD_SCHEME')); return; }
        download(next.href, limit, redirects - 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(failure('MCP_DOWNLOAD_HTTP_' + response.statusCode));
        return;
      }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > limit) response.destroy(failure('MCP_DOWNLOAD_TOO_LARGE'));
        else chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    const deadline = setTimeout(() => request.destroy(failure('MCP_DOWNLOAD_TIMEOUT')), 120000);
    deadline.unref();
    request.once('close', () => clearTimeout(deadline));
    request.setTimeout(120000, () => request.destroy(failure('MCP_DOWNLOAD_TIMEOUT')));
    request.on('error', reject);
  });
}
async function validCached(file) {
  try {
    const info = await fsp.lstat(file);
    if (!info.isFile() || info.size > 128 * 1024 * 1024) return false;
    const expected = (await fsp.readFile(file + '.sha256', 'utf8')).trim();
    return /^[a-f0-9]{64}$/.test(expected) && hash(await fsp.readFile(file)) === expected;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
async function resolveBinary(kind, directory, env, platform = process.platform, arch = process.arch) {
  const name = assetName(kind, platform, arch);
  const bundled = path.join(directory, 'bin', name);
  try {
    if ((await fsp.lstat(bundled)).isFile()) {
      await ensureExecutable(bundled, platform);
      return bundled;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const version = env.SHW_PLUGIN_VERSION || VERSION;
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version)) throw failure('INVALID_PLUGIN_VERSION');
  const root = cacheRoot(env, version, platform);
  const target = path.join(root, name);
  if (await validCached(target)) {
    await ensureExecutable(target, platform);
    return target;
  }
  await fsp.mkdir(root, { recursive: true });
  const base = (env.SHW_PLUGIN_RELEASE_BASE_URL || 'https://github.com/ilovintit/shw-plugins/releases/download/v' + version).replace(/\/+$/, '');
  const sums = (await download(base + '/SHA256SUMS', 1024 * 1024)).toString('utf8');
  const rows = sums.split(/\r?\n/).map(line => line.trim().split(/\s+/)).filter(parts => parts[1]?.replace(/^\*/, '') === name);
  if (rows.length !== 1 || !/^[a-f0-9]{64}$/i.test(rows[0][0])) throw failure('MCP_CHECKSUM_MISSING_OR_DUPLICATE');
  const bytes = await download(base + '/' + name, 128 * 1024 * 1024);
  const expected = rows[0][0].toLowerCase();
  if (hash(bytes) !== expected) throw failure('MCP_CHECKSUM_MISMATCH');
  const staging = await fsp.mkdtemp(path.join(root, '.download-'));
  try {
    const tmp = path.join(staging, name);
    await fsp.writeFile(tmp, bytes, { mode: 0o755 });
    try { await fsp.rename(tmp, target); }
    catch (error) {
      // Windows cannot replace an executing .exe; a concurrent verified
      // installer may already have committed exactly these bytes.
      if (!(await fsp.lstat(target)).isFile() || hash(await fsp.readFile(target)) !== expected) throw error;
    }
    const sum = path.join(staging, 'sha256');
    await fsp.writeFile(sum, expected + '\n', { mode: 0o600 });
    await fsp.rename(sum, target + '.sha256');
  } finally {
    await fsp.rm(staging, { recursive: true, force: true });
  }
  return target;
}
async function main(kind, directory) {
  const log = kind === 'gitea' ? event => console.error('[gitea-mcp-launch] time=' + new Date().toISOString() + ' pid=' + process.pid + ' event=' + event) : () => {};
  try {
    log('launcher_start');
    const env = kind === 'gitea' ? giteaEnv(process.env, process.cwd(), process.platform, log) : normalizedEnv(process.env);
    if (kind === 'kubernetes') {
      const profile = env.SHW_K8S_PROFILE || '';
      if (profile && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(profile)) throw failure('INVALID_SHW_K8S_PROFILE');
      const file = path.join(configRoot(env), 'shw-plugins', profile ? 'kubernetes.' + profile + '.env' : 'kubernetes.env');
      if (!fs.existsSync(file)) throw failure('MISSING_USER_KUBERNETES_CONFIG');
    }
    const binary = await resolveBinary(kind, directory, env);
    log('launcher_exec');
    const child = spawn(binary, process.argv.slice(2), { env, stdio: 'inherit', shell: false, windowsHide: true });
    const handlers = new Map();
    for (const signal of ['SIGINT', 'SIGTERM']) {
      const handler = () => child.kill(signal);
      handlers.set(signal, handler);
      process.on(signal, handler);
    }
    child.once('error', () => { console.error('shw-plugins: MCP_PROCESS_START_FAILED'); process.exitCode = 1; });
    child.once('close', (code, signal) => {
      for (const [name, handler] of handlers) process.off(name, handler);
      process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 143);
    });
  } catch (error) {
    console.error('shw-plugins: ' + (error.code || 'MCP_STARTUP_FAILED'));
    process.exitCode = 1;
  }
}
module.exports = { assetName, configRoot, normalizedEnv, giteaEnv, resolveBinary, download, main };
