# mechvibes-ja

Mechvibes 2.3.6 の**非公式・日本語版**パッケージです。AUR の `mechvibes` が孤児（maintainer 不在）になったため、AUR に依存せず、上流の公式成果物をハッシュで固定して自前の pacman リポジトリとして配布します。

- 上流: <https://github.com/hainguyents13/mechvibes>（MIT）
- このリポジトリ: <https://github.com/syu-toutousai/mechvibes-ja>
- 対象バージョン: Mechvibes 2.3.6（hotfix deb）
- パッケージ版: `mechvibes 2.3.6.ja1-1`

> 本プロジェクトは上流・AUR の公式プロジェクトではありません。上流の MIT ライセンスと著作権表示を保持したうえでの派生ビルドです。

## 特徴

- メイン画面・トレイメニュー・エディタ・サウンドパック導入画面・詳細設定・移行ダイアログ・desktop エントリを日本語化
- 上流への自動更新チェック（GitHub API）を除去
- 上流の `beta.mechvibes.com` へのデバッグ可否問い合わせを除去
- 上流の公式 `.deb` を **SHA-256 で固定**し、`app.asar` だけを監査可能な差分でパッチ
- `pacman` の同期リポジトリとして更新可能（AUR ヘルパー不要）
- ビルド時に日本語化の検証テストを実行

## インストール（pacman リポジトリ）

`/etc/pacman.conf` の末尾に以下を追加します。

```ini
[mechvibes-ja]
SigLevel = Optional TrustAll
Server = https://github.com/syu-toutousai/mechvibes-ja/releases/latest/download
```

その後:

```bash
sudo pacman -Sy
sudo pacman -S mechvibes
```

既に AUR 版の `mechvibes 2.3.6-1` が入っている場合、`2.3.6.ja1-1` が新しいので上書き更新されます。リポジトリを追加した時点で、`yay` などの AUR ヘルパーは `mechvibes` を同期リポジトリのパッケージとして扱います。

### リポジトリを外す場合

```bash
sudo pacman -Rns mechvibes
sudo sed -i '/^\[mechvibes-ja\]/,/^Server =/d' /etc/pacman.conf
sudo pacman -Sy
```

## ローカルビルド

```bash
sudo pacman -S --needed base-devel asar nodejs
git clone https://github.com/syu-toutousai/mechvibes-ja.git
cd mechvibes-ja
makepkg -si
```

`makepkg` は上流の `mechvibes_2.3.6_hotfix_amd64.deb` を取得し、SHA-256 を検証したうえで `app.asar` を日本語化します。ビルドの `check()` で以下を検証します。

- 置換対象の英語 UI 文字列が残っていないこと
- 必須の日本語文字列が存在すること
- 全 HTML が `lang="ja"` であること
- 上流の更新 API と `beta.mechvibes.com` への参照が消えていること
- `package.json` の版が `v2.3.6.ja1` であること

## 検証

リリースには以下を添付します。

- `mechvibes-2.3.6.ja1-1-x86_64.pkg.tar.zst`
- `mechvibes-ja.db` / `mechvibes-ja.db.tar.gz`
- `mechvibes-ja.files` / `mechvibes-ja.files.tar.gz`
- `mechvibes-ja.sha256`

手元での確認:

```bash
sha256sum -c mechvibes-ja.sha256
pacman -Qkk mechvibes
```

## 上流との差分

差分は次のファイルに限定しています。

| ファイル | 内容 |
| --- | --- |
| `src/app.html` | メイン画面の日本語化、更新通知ブロックの削除 |
| `src/app.js` | ローディング等の日本語化、GitHub 更新確認と beta 通信の削除 |
| `src/editor.html` / `src/editor.js` | エディタの日本語化 |
| `src/install.html` / `src/install.js` | サウンドパック導入画面の日本語化 |
| `src/debug.html` | 詳細設定画面の日本語化、更新通知の削除 |
| `src/main.js` | トレイメニュー・移行ダイアログの日本語化 |
| `package.json` | 版 `v2.3.6.ja1`、説明文の日本語化 |
| `mechvibes.desktop` | desktop エントリの日本語化（パッケージ側で差し替え） |

`app.asar.unpacked` のネイティブモジュール（`iohook`）の内容は変更しません。再パックの都合で `iohook` 配下の `node_modules/pump` が unpacked 側に移りますが、起動確認済みです。

### 日本語化しないもの

- `Mechvibes`、`CherryMX`、`ABS` などのブランド名・製品名
- 同梱サウンドパックの表示名（`config.json` の `name`）
- 開発者向けログ（`electron-log` / コンソール）
- 上流ウェブサイト（mechvibes.com）のコンテンツ

## セキュリティ方針

- 上流 `.deb` の SHA-256 を `PKGBUILD` に固定
- パッチはこのリポジトリの git 履歴で監査可能
- アプリ内の自動更新・上流へのテレメトリ的問い合わせを除去
- pacman のパッケージハッシュは `repo-add` が DB に記録

GPG 署名は未導入です。必要になったら、`repo-add --sign` と `SigLevel = Required DatabaseOptional` に切り替えます。

## 上流の更新に追従する場合

1. `pkgver` と `source` の URL を更新
2. `sha256sums` を更新
3. `ja.json` の置換元文字列を新しい UI に合わせて更新
4. `makepkg -si` で `check()` が通ることを確認
5. タグ `v<新pkgver>` を push し、GitHub Actions にリポジトリを更新させる

## ライセンス

MIT。上流の `Copyright (c) 2021 Hai Nguyen` を保持します。日本語化パッチとパッケージングの著作権は `syu-toutousai` に帰属します。詳細は [LICENSE](LICENSE) を参照してください。

## 将来構想

このリポジトリは、孤児パッケージを「上流直結＋ハッシュ固定＋CI 監査」で自前管理する **mini-AUR** の最初の実装例です。他の孤児パッケージへの展開可能性は [docs/mini-aur-feasibility.md](docs/mini-aur-feasibility.md) にまとめています（今回は Mechvibes 以外のパッケージには変更を加えていません）。
