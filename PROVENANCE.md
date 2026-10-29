# 来歴（Provenance）

- パッケージ: `mechvibes 2.3.6.ja1-1`
- 上流: <https://github.com/hainguyents13/mechvibes>
- 上流リリース: `v2.3.6`（2025-01-02）
- 取得物: `mechvibes_2.3.6_hotfix_amd64.deb`
- 取得元: <https://github.com/hainguyents13/mechvibes/releases/download/v2.3.6/mechvibes_2.3.6_hotfix_amd64.deb>
- SHA-256: `fb6b3d0f530d1a355e71891119495cb7c5ebc1d9b425c062b44c44547b11b448`
- ライセンス: MIT（`Copyright (c) 2021 Hai Nguyen`）

## AUR との関係

- 元の AUR パッケージ `mechvibes` は、2026-10-29 時点で maintainer が不在（孤児）。
- 本リポジトリは AUR のパッケージを引き継がない。AUR アカウントの登録・maintainer 就任は行わない。
- パッケージ名は `mechvibes` のまま維持し、`pkgver=2.3.6.ja1` で既存インストールを置き換える。

## パッチ

- `ja.json`: UI 文字列の完全一致置換表
- `tools/apply-ja.js`: `app.asar` の展開・置換・再パック
- `tools/verify-ja.js`: ビルド後の検証
- `mechvibes.desktop`: 日本語 desktop エントリ

## 削除した通信

- GitHub Releases API による更新確認
- `beta.mechvibes.com/debug/status/` への問い合わせ

## ビルド・検証環境

- Arch Linux（x86_64）
- `asar` 4.3.1
- Node.js 22
- `makepkg` の `check()` で `tools/verify-ja.js` を実行
- Xvfb 上で起動し、メイン画面の日本語表示・サウンドパック読み込み・終了を確認（2026-10-29）
