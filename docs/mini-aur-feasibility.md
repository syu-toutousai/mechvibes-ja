# mini-AUR 実現可能性評価

> 本文書は Mechvibes 改造後の**将来構想**です。今回の作業では Mechvibes 以外の孤児パッケージには変更を加えていません。

## 結論

**技術的には実現可能。ただし「GitHub を監査センターにする」だけでは安全は完成せず、パッケージ署名・アカウント保護・クリーンビルド・手動レビューを組み合わせる必要がある。**

- 15 個程度の孤児パッケージなら、単一の monorepo ＋ CI ＋ 1 つの pacman リポジトリで運用可能。
- 「上流直結」はパッケージ種別ごとに方法が異なる（ソースビルド / バイナリ再梱包 / Arch 公式 PKGBUILD の再利用 / データのみ）。
- GitHub は「ビルドログ・差分・ハッシュ・テスト結果の監査証跡」には向くが、**信頼の根拠は最終的にあなたの GitHub アカウントと署名鍵**になる。AUR の乗っ取りリスクを、アカウント乗っ取りリスクに置き換える面がある。
- 配布基盤は GitHub Releases だけだと多数パッケージで扱いにくい。小規模なら Releases、拡大するなら Cloudflare R2 などのオブジェクトストレージ＋GitHub CI が現実的。

## 推奨アーキテクチャ

```
arch-mini-aur/
├── pkgs/
│   ├── mechvibes/
│   │   ├── PKGBUILD
│   │   ├── ja.json
│   │   ├── patches/
│   │   └── PROVENANCE.md
│   ├── webtorrent-mpv-hook/
│   └── ...
├── scripts/
│   ├── build-one.sh
│   ├── verify-one.sh
│   └── repo-add-all.sh
├── .github/workflows/
│   ├── build.yml          # 変更されたパッケージだけ matrix ビルド
│   ├── update-check.yml   # 上流の新リリースを検出して PR を作る
│   └── release.yml        # 署名済み成果物だけで DB を更新
└── README.md
```

- 1 パッケージ = 1 ディレクトリ。`PKGBUILD` とパッチと `PROVENANCE.md` を同じ場所に置く。
- `PROVENANCE.md` には次を記録する。
  - 上流 URL、バージョン、タグ/コミット
  - 取得物の SHA-256（必要なら GPG 署名検証）
  - ライセンスと再配布可否
  - 加えたパッチの一覧と理由
  - ビルド環境、テスト結果、`namcap` 結果
- パッケージ名は元の AUR 名を維持する。`pkgver` に `.<ja1>` などの接尾辞を付けるか `pkgrel` を上げて、既存インストールを自然に置き換える。

## セキュリティモデル

### GitHub 側の hardening

- 2FA（可能ならハードウェアキー）を必須化
- `main` の branch protection（直 push 禁止、PR 必須、署名付きコミット）
- Actions の権限を最小化（既定 `contents: read`、リリース job だけ `contents: write`）
- Actions をフル SHA でピン留め
- `pull_request_target` を使わない
- Release / 署名 job に Environment protection（手動承認）
- Dependabot で Actions を更新
- 監査ログのエクスポート（可能なら）

### 署名（最重要）

- **CI に長期署名鍵を置かない**のが理想。CI はビルドとテストだけを行い、成果物を artifact として出す。
- 手元のハードウェアトークン / オフライン鍵で `gpg --detach-sign` し、`repo-add --sign` で DB を署名して公開する。
- クライアント側は公開鍵をインポートし、`SigLevel = Required DatabaseOptional`（必要なら `TrustedOnly`）で検証する。
- これにより「GitHub アカウントが乗っ取られても、署名鍵がなければ pacman は更新を受け入れない」状態にできる。
- CI 自動署名にする場合は、専用鍵を GitHub Environment に置き、手動承認を必須にする。それでも CI 侵害時の影響は残る。

### ビルドの健全性

- `devtools` の `makechrootpkg` でクリーン chroot ビルド（コンテナ内 `makepkg` より強い）
- ネットワークは取得時だけ許可し、ビルド中は制限
- `namcap`、`pacman -Qkk`、インストール後の起動テスト
- 可能なら再ビルドして成果物ハッシュを比較（再現性）
- バイナリ配布物は「消毒」ではなく「来歴検証」。ソースがなければ悪意の有無は証明できない。

## パッケージ種別ごとの「上流直結」

| 種別 | 方法 | 例 |
| --- | --- | --- |
| ソース公开 | 上流タグ/コミットを取得し、クリーン chroot でビルド | `webtorrent-mpv-hook` |
| 公式バイナリ | 上流リリースを SHA-256 固定で再梱包 | `mechvibes`（今回） |
| Arch 公式パッケージの 32bit 版 | Arch GitLab の公式 PKGBUILD を基に multilib でビルド | `lib32-*` |
| バージョン固定ランタイム | 上流 tarball ＋ `SHASUMS256.txt` ＋ GPG 検証 | `nodejs-lts-iron` |
| データのみ | 上流配布物のハッシュとライセンスを確認 | `open-jtalk-voice-mei` |

### 注意すべきケース

- **lib32-* 11 個**: 多くは Arch 公式 `multilib` の再ビルドで、上流は Arch のパッケージングリポジトリ。AUR の孤児 PKGBUILD をそのまま信用せず、Arch GitLab の公式 PKGBUILD と差分比較する。
- **nodejs-lts-iron**: 複数 Node バージョンの共存はシステムパッケージより `fnm` / `nvm` の方が保守しやすい。本当に必要か再評価する。
- **open-jtalk-voice-mei**: 音声データのライセンス・再配布条件を確認。孤児化の理由がライセンス曖昧さの可能性もある。
- **webtorrent-mpv-hook**: スクリプトのみで簡単。良い最初の追加候補。
- **mechvibes**: 今回の実装をテンプレートにする。

## 配布基盤の選択肢

| 方式 | 長所 | 短所 |
| --- | --- | --- |
| GitHub Releases（`latest/download`） | 無料、CI と一体化、監査ログ | 1 リポジトリ 1 DB 向き。多数パッケージでは各リリースに全パッケージを入れる必要がある |
| GitHub Releases（固定タグ `repo` に上書き） | URL 安定 | アセットの削除・再アップロードが監査的に弱い。レース条件 |
| GitHub Pages | URL 安定、DB 向き | 1GB ソフトリミット。バイナリ多数だと厳しい |
| Cloudflare R2 / S3 互換 | 大容量、安価、CDN | GitHub 外の信頼点が増える。署名で補う |
| 自前 VPS | 完全制御 | 運用・可用性・証明書の負担 |

**推奨**: DB とパッケージを同じベース URL に置く必要があるため、小規模（数個）は Releases、15 個規模なら R2 などのオブジェクトストレージに置き、GitHub Actions はビルドと監査だけを担当する。GitHub を「配布」ではなく「検証・監査・CI」に特化させる方が、あなたの目的に合う。

## 運用フロー

1. `update-check.yml` が上流の新リリースを検出し、`pkgver` とハッシュ更新の PR を作る。
2. 人間が差分・ライセンス・パッチをレビューする。
3. `build.yml` がクリーン chroot でビルドし、`namcap` とテストを実行する。
4. 成果物を artifact として保存する。
5. 手元で署名し、`repo-add --sign` で DB を更新して公開する（または保護された Environment で自動署名）。
6. `pacman -Sy` でクライアントが署名検証して更新する。

## リスクと限界

- **信頼の移動**: AUR の乗っ取りリスクは、あなたの GitHub / 署名鍵 / CI のリスクに置き換わる。2FA とオフライン署名なしでは、安全性は向上しない。
- **「消毒」の限界**: バイナリ配布物は来歴とハッシュしか保証できない。ソースレビューと再ビルドができないものは、悪意の有無を証明できない。
- **保守負担**: 15 個でも上流の更新を追うのは相応の作業。使っていないパッケージは削除するのが最も安全。
- **ライセンス**: 再配布不可のデータ・フォント・音声・プロプライエタリアプリは公開リポジトリに置かない。個人利用のローカルビルドに留める。
- **可用性**: GitHub / ストレージ / ドメインの障害で `pacman -Sy` が失敗する。ミラーやローカルキャッシュを検討。
- **AUR との関係**: AUR のパッケージを引き継ぐわけではない。AUR 側が別の maintainer に乗っ取られても、あなたのリポジトリは独立して動作する。ただし同名パッケージの混在に注意し、`pacman.conf` のリポジトリ優先順位を管理する。

## 推奨ロードマップ

1. **Mechvibes を完成**（今回）: テンプレート、CI、リリース、検証、署名なしの pacman リポジトリ。
2. **`webtorrent-mpv-hook` を追加**: 最小のソースビルド例。monorepo と CI matrix を検証。
3. **`nodejs-lts-iron` を再評価**: 本当にシステムパッケージが必要か確認。必要なら上流 tarball + GPG 検証で追加。
4. **lib32-* を Arch GitLab と照合**: 11 個をまとめて追加する前に、公式 PKGBUILD との差分と multilib ビルドを検証。
5. **`open-jtalk-voice-mei` はライセンス確認後**: 再配布不可ならローカル専用にする。
6. **署名を導入**: ハードウェアトークンで `repo-add --sign`。クライアントを `Required DatabaseOptional` に。
7. **配布基盤を再評価**: パッケージ数とサイズが増えたら Releases から R2 へ。

## 今回の範囲

- 変更したのは `mechvibes` のみ。
- 他の孤児パッケージのインストール・削除・リポジトリ追加は行っていない。
- 本文書は設計評価であり、mini-AUR のリポジトリ作成やパッケージ追加は未実施。
