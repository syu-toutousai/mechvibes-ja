#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--asar') out.asar = argv[++i];
    else if (a === '--map') out.map = argv[++i];
    else if (a === '--workdir') out.workdir = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!out.asar || !out.map) {
    throw new Error('usage: apply-ja.js --asar <app.asar> --map <ja.json> [--workdir <dir>]');
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text);
}

function asar(args) {
  const bin = process.env.ASAR_BIN || 'asar';
  execFileSync(bin, args, { stdio: 'inherit' });
}

function replaceBlock(src, file, startMarker, endMarker, replacement) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error(`block start not found: ${file}: ${startMarker}`);
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`block end not found: ${file}: ${endMarker}`);
  return src.slice(0, start) + replacement + src.slice(end + endMarker.length);
}

const args = parseArgs(process.argv.slice(2));
const asarPath = path.resolve(args.asar);
const mapPath = path.resolve(args.map);
const map = JSON.parse(read(mapPath));

if (!fs.existsSync(asarPath)) {
  throw new Error(`asar not found: ${asarPath}`);
}

const work = path.resolve(args.workdir || path.join(path.dirname(asarPath), '.mechvibes-ja-work'));
const extractDir = path.join(work, 'extract');
const outDir = path.join(work, 'out');

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(extractDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

console.log(`[ja] extract: ${asarPath}`);
asar(['extract', asarPath, extractDir]);

// ---------------------------------------------------------------------------
// Network / update behaviour patches
// ---------------------------------------------------------------------------
{
  const file = 'src/app.js';
  const p = path.join(extractDir, file);
  let s = read(p);

  s = replaceBlock(
    s,
    file,
    '    // check for new version',
    '      });',
    '    // 更新確認は pacman リポジトリ側で行うため、ここでは行わない。\n'
  );

  s = replaceBlock(
    s,
    file,
    '    // check if remote debugging can be enabled by user',
    '    });',
    '    // 上流サーバへの問い合わせは行わない（日本語版では詳細設定を常に非表示）。\n'
  );

  write(p, s);
}

{
  const file = 'src/app.html';
  const p = path.join(extractDir, file);
  let s = read(p);
  const block = `          <div id="update-available" class="hidden alert">
            New version of Mechvibes is available (<span id="new-version">-</span>)
            <div style="margin-top: 5px">
              <a href="https://mechvibes.com/download/" class="open-in-browser">Check it out</a>
            </div>
          </div>
`;
  if (!s.includes(block)) throw new Error(`update block not found: ${file}`);
  s = s.replace(block, '');
  write(p, s);
}

{
  const file = 'src/debug.html';
  const p = path.join(extractDir, file);
  let s = read(p);
  const block = `        <div id="update-available" class="hidden">
          New version of Mechvibes is available (<span id="new-version">-</span>)
          <div style="margin-top: 5px">
            <a href="https://mechvibes.com" class="open-in-browser">Check it out</a>
          </div>
        </div>
`;
  if (!s.includes(block)) throw new Error(`update block not found: ${file}`);
  s = s.replace(block, '');
  write(p, s);
}

{
  const file = 'package.json';
  const p = path.join(extractDir, file);
  let s = read(p);
  const pairs = [
    ['"version": "v2.3.6"', '"version": "v2.3.6.ja1"'],
    [
      '"description": "Play mechanical keyboard sounds as you type."',
      '"description": "メカニカルキーボードの打鍵音を再生します。"',
    ],
  ];
  for (const [from, to] of pairs) {
    if (!s.includes(from)) throw new Error(`package.json field not found: ${from}`);
    s = s.replace(from, to);
  }
  write(p, s);
}

// ---------------------------------------------------------------------------
// String translations
// ---------------------------------------------------------------------------
let replacementCount = 0;
for (const [file, replacements] of Object.entries(map.translations)) {
  const p = path.join(extractDir, file);
  let s = read(p);
  for (const [from, to] of Object.entries(replacements)) {
    if (!s.includes(from)) {
      throw new Error(`translation source not found: ${file}: ${JSON.stringify(from)}`);
    }
    s = s.split(from).join(to);
    replacementCount++;
  }
  write(p, s);
}

// ---------------------------------------------------------------------------
// <html lang="ja">
// ---------------------------------------------------------------------------
for (const file of map.html_lang) {
  const p = path.join(extractDir, file);
  let s = read(p);
  if (!s.includes('<html lang="en">')) {
    throw new Error(`html lang="en" not found: ${file}`);
  }
  s = s.replace('<html lang="en">', '<html lang="ja">');
  write(p, s);
}

// ---------------------------------------------------------------------------
// Repack. Native modules (iohook) stay in app.asar.unpacked as before.
// ---------------------------------------------------------------------------
console.log('[ja] pack (unpack: node_modules/iohook)');
asar([
  'pack',
  extractDir,
  path.join(outDir, 'app.asar'),
  '--unpack-dir',
  'node_modules/iohook',
]);

const packedAsar = path.join(outDir, 'app.asar');
const packedUnpacked = path.join(outDir, 'app.asar.unpacked');
if (!fs.existsSync(packedAsar)) {
  throw new Error('asar pack did not produce app.asar');
}

fs.copyFileSync(packedAsar, asarPath);

if (fs.existsSync(packedUnpacked)) {
  const destUnpacked = `${asarPath}.unpacked`;
  fs.rmSync(destUnpacked, { recursive: true, force: true });
  fs.cpSync(packedUnpacked, destUnpacked, { recursive: true });
  console.log(`[ja] unpacked: ${destUnpacked}`);
}

console.log(`[ja] done: ${replacementCount} string replacements, wrote ${asarPath}`);
