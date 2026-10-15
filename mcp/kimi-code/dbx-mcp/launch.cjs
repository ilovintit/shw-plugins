#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const { spawn } = require('node:child_process');
const { configRoot, normalizedEnv, download } = require('../runtime/launcher.cjs');
const backend = require('./backend-version.json');
const fail = code => Object.assign(new Error(code), { code });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function configuration(source, platform = process.platform) {
  const env = normalizedEnv(source, platform);
  const p = platform === 'win32' ? path.win32 : path;
  const profile = env.SHW_DBX_PROFILE || '';
  if (profile && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(profile)) throw fail('INVALID_SHW_DBX_PROFILE');
  const file = p.join(configRoot(env, platform), 'shw-plugins', profile ? `dbx.${profile}.env` : 'dbx.env');
  let values = {};
  try {
    if (fs.statSync(file).size > 65536) throw fail('DBX_CONFIG_TOO_LARGE');
    for (const line of fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const match = /^(?:export )?(DBX_WEB_URL|DBX_WEB_PASSWORD)=(.*)$/.exec(line);
      if (!match) continue;
      let value = match[2];
      if (value.length >= 2 && ['"', "'"].includes(value[0]) && value.at(-1) === value[0]) value = value.slice(1, -1);
      values[match[1]] = value;
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // A profile or user file is a complete pair: never send an inherited password to a changed host.
  if (profile || Object.keys(values).length) {
    delete env.DBX_WEB_URL;
    delete env.DBX_WEB_PASSWORD;
    Object.assign(env, values);
  }
  if (!env.DBX_WEB_URL || !env.DBX_WEB_PASSWORD || /\$\{/.test(env.DBX_WEB_URL + env.DBX_WEB_PASSWORD)) throw fail('MISSING_DBX_WEB_CONFIG');
  let url;
  try { url = new URL(env.DBX_WEB_URL); } catch { throw fail('INVALID_DBX_WEB_URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw fail('INVALID_DBX_WEB_URL');
  // These settings could redirect to Desktop data or override authentication/TLS. Only Web credentials are supported.
  for (const key of ['DBX_DATA_DIR', 'DBX_MCP_BINARY', 'DBX_WEB_HEADERS', 'DBX_WEB_INSECURE_SKIP_VERIFY', 'DBX_WEB_CA_CERT']) delete env[key];
  return env;
}

function extractBinary(archive, integrity, platform) {
  if ('sha512-' + createHash('sha512').update(archive).digest('base64') !== integrity) throw fail('DBX_PACKAGE_CHECKSUM_MISMATCH');
  const tar = gunzipSync(archive, { maxOutputLength: 128 * 1024 * 1024 });
  const wanted = platform === 'win32' ? 'package/bin/dbx-mcp.exe' : 'package/bin/dbx-mcp';
  let binary;
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const name = header.subarray(0, 100).toString().replace(/\0.*$/s, '');
    const rawSize = header.subarray(124, 136).toString().replace(/\0.*$/s, '').trim();
    if (!/^[0-7]+$/.test(rawSize)) throw fail('INVALID_DBX_ARCHIVE');
    const size = parseInt(rawSize, 8);
    if (offset + 512 + size > tar.length) throw fail('INVALID_DBX_ARCHIVE');
    if (name === wanted) {
      if (binary || ![0, 48].includes(header[156]) || !size) throw fail('INVALID_DBX_BINARY');
      binary = tar.subarray(offset + 512, offset + 512 + size);
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (!binary) throw fail('DBX_BINARY_MISSING');
  return binary;
}

async function resolveBinary(env, platform = process.platform, arch = process.arch, fetcher = download) {
  const spec = backend.platforms[`${platform}-${arch}`];
  if (!spec) throw fail('UNSUPPORTED_DBX_PLATFORM');
  const root = env.XDG_CACHE_HOME || (platform === 'win32' ? env.LOCALAPPDATA : '') || path.join(env.HOME || env.USERPROFILE || require('node:os').homedir(), '.cache');
  if (!path.isAbsolute(root)) throw fail('DBX_CACHE_PATH_MUST_BE_ABSOLUTE');
  const directory = path.join(root, 'shw-plugins', 'dbx', backend.version, `${platform}-${arch}`);
  const file = path.join(directory, platform === 'win32' ? 'dbx-mcp.exe' : 'dbx-mcp');
  try {
    const info = fs.lstatSync(file);
    if (info.isFile() && info.size <= 128 * 1024 * 1024 && digest(fs.readFileSync(file)) === fs.readFileSync(file + '.sha256', 'utf8').trim()) {
      if (platform !== 'win32' && !(info.mode & 0o111)) fs.chmodSync(file, 0o755);
      return file;
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const binary = extractBinary(await fetcher(spec.tarball, 64 * 1024 * 1024), spec.integrity, platform);
  fs.mkdirSync(directory, { recursive: true });
  const staging = fs.mkdtempSync(path.join(directory, '.download-'));
  try {
    const temporary = path.join(staging, 'binary');
    fs.writeFileSync(temporary, binary, { mode: 0o755 });
    try { fs.renameSync(temporary, file); }
    catch (error) { if (!fs.lstatSync(file).isFile() || digest(fs.readFileSync(file)) !== digest(binary)) throw error; }
    fs.writeFileSync(path.join(staging, 'checksum'), digest(binary) + '\n', { mode: 0o600 });
    fs.renameSync(path.join(staging, 'checksum'), file + '.sha256');
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  return file;
}

async function main() {
  try {
    const env = configuration(process.env);
    const binary = await resolveBinary(env);
    const child = spawn(binary, process.argv.slice(2), { env, stdio: 'inherit', shell: false, windowsHide: true });
    const handlers = new Map();
    for (const signal of ['SIGINT', 'SIGTERM']) {
      const handler = () => child.kill(signal);
      handlers.set(signal, handler);
      process.on(signal, handler);
    }
    child.once('error', () => { console.error('shw-plugins: DBX_PROCESS_START_FAILED'); process.exitCode = 1; });
    child.once('close', (code, signal) => {
      for (const [name, handler] of handlers) process.off(name, handler);
      process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 143);
    });
  } catch (error) { console.error('shw-plugins: ' + (error.code || 'DBX_STARTUP_FAILED')); process.exitCode = 1; }
}
if (require.main === module) main();
module.exports = { configuration, extractBinary, resolveBinary };
