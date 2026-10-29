#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') out.dir = argv[++i];
    else if (a === '--map') out.map = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!out.dir || !out.map) {
    throw new Error('usage: verify-ja.js --dir <extracted-asar-dir> --map <ja.json>');
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.dir);
const map = JSON.parse(fs.readFileSync(path.resolve(args.map), 'utf8'));

const scanned = map.scan_files.map((file) => {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) throw new Error(`scan file missing: ${file}`);
  return { file, text: fs.readFileSync(p, 'utf8') };
});

let failed = 0;
const fail = (message) => {
  failed++;
  console.error(`NG: ${message}`);
};

for (const needle of map.forbidden_after) {
  for (const { file, text } of scanned) {
    if (text.includes(needle)) {
      fail(`残留 English/URL: ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

for (const needle of map.required_after) {
  if (!scanned.some(({ text }) => text.includes(needle))) {
    fail(`欠落 Japanese: ${JSON.stringify(needle)}`);
  }
}

for (const file of map.html_lang) {
  const p = path.join(root, file);
  const text = fs.readFileSync(p, 'utf8');
  if (!text.includes('<html lang="ja">')) {
    fail(`lang="ja" がない: ${file}`);
  }
  if (text.includes('<html lang="en">')) {
    fail(`lang="en" が残っている: ${file}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== 'v2.3.6.ja1') {
  fail(`package.json version: ${pkg.version}`);
}

if (failed > 0) {
  console.error(`\n検証失敗: ${failed} 件`);
  process.exit(1);
}

console.log(`検証成功: ${scanned.length} ファイル、禁止文字列 ${map.forbidden_after.length} 件、必須文字列 ${map.required_after.length} 件`);
