# 日本語化メモ

## 対象

- 上流: `hainguyents13/mechvibes` v2.3.6（`mechvibes_2.3.6_hotfix_amd64.deb`）
- パッチ対象: `app.asar` 内の `src/*.html`、`src/*.js`、`package.json`
- パッチ方式: 完全一致の文字列置換（`ja.json`）＋限定されたコードブロック除去（`tools/apply-ja.js`）

## 置換方針

- UI に表示される文字列だけを日本語化する。
- 変数・関数名、DOM ID、CSS クラス、ファイルパスは変更しない。
- ブランド名（Mechvibes）、製品名（CherryMX、ABS など）、開発者名は原表記を残す。
- 開発者向けログ（`electron-log`、`console.log`）は英語のまま。UI ではないため。
- 同梱サウンドパックの `config.json` の `name` は変更しない。表示名の互換性を優先。
- 文字列は `ja.json` に集約し、置換元が見つからない場合はビルドを失敗させる。

## 上流への通信の除去

以下は日本語版では行わない。

1. GitHub Releases API による更新確認
   - 元: `https://api.github.com/repos/hainguyents13/mechvibes/releases/latest`
   - 理由: 更新は pacman リポジトリで管理する。上流の英語版へ誘導しない。
2. `beta.mechvibes.com/debug/status/` への問い合わせ
   - 理由: 起動時の外部通信を減らし、詳細設定の表示可否を上流サーバに依存させない。

これにより、起動時に上流へ送信されるリクエストはなくなる（ユーザーが明示的に開く外部リンクを除く）。

## 検証

`makepkg` の `check()` で `tools/verify-ja.js` を実行する。

- `ja.json` の `forbidden_after` に含まれる英語 UI 文字列・URL が残っていないこと
- `required_after` の日本語文字列が存在すること
- 4 つの HTML が `<html lang="ja">` であること
- `package.json` の `version` が `v2.3.6.ja1` であること

## 既知の制約

- 上流が UI を変更した場合、`ja.json` の置換元が一致せずビルドが失敗する。これは意図した安全側の挙動。
- `app.asar` の再パックにより、上流の asar とバイト単位では一致しない。ファイル内容と `app.asar.unpacked` のネイティブモジュールは保持する。
- 再パック時に `iohook` 配下の `node_modules/pump` が `app.asar.unpacked` 側へ移る。起動・サウンドパック読み込み・キー入力の動作確認済み。
- Electron 87 の asar には完全性検証（asar integrity fuse）がないため、再パックは起動に影響しない。
- 上流のウェブサイト・Wiki は日本語化しない。
