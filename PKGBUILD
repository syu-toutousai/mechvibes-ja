# Maintainer: syu-toutousai <167145022+syu-toutousai@users.noreply.github.com>
# 非公式の日本語版です。上流: https://github.com/hainguyents13/mechvibes (MIT)
# AUR の mechvibes は孤児化しているため、この PKGBUILD は AUR に依存しません。

pkgname=mechvibes
pkgver=2.3.6.ja1
pkgrel=1
pkgdesc="メカニカルキーボードの打鍵音を再生する（日本語版）"
arch=('x86_64')
url="https://github.com/syu-toutousai/mechvibes-ja"
license=('MIT')
depends=(
  'alsa-lib' 'atk' 'at-spi2-atk' 'at-spi2-core' 'cairo' 'dbus'
  'desktop-file-utils' 'expat' 'gdk-pixbuf2' 'glib2' 'gtk3'
  'hicolor-icon-theme' 'libappindicator-gtk3' 'libcups' 'libnotify'
  'libsecret' 'libx11' 'libxcb' 'libxcomposite' 'libxcursor'
  'libxdamage' 'libxext' 'libxfixes' 'libxi' 'libxrandr' 'libxrender'
  'libxss' 'libxtst' 'nspr' 'nss' 'pango' 'util-linux-libs' 'xdg-utils'
)
makedepends=('asar' 'nodejs')
options=('!strip' '!emptydirs')
install="${pkgname}.install"
noextract=("mechvibes_2.3.6_hotfix_amd64.deb")
source=(
  "https://github.com/hainguyents13/mechvibes/releases/download/v2.3.6/mechvibes_2.3.6_hotfix_amd64.deb"
  "ja.json"
  "mechvibes.desktop"
)
sha256sums=(
  'fb6b3d0f530d1a355e71891119495cb7c5ebc1d9b425c062b44c44547b11b448'
  'SKIP'
  'SKIP'
)

prepare() {
  cd "$srcdir"
  rm -rf deb stage ja-work
  mkdir -p deb stage

  # .deb は ar アーカイブ。data.tar.xz だけを展開する。
  ( cd deb && ar x "../mechvibes_2.3.6_hotfix_amd64.deb" )
  tar xf "deb/data.tar.xz" -C stage

  # app.asar の UI 文字列を日本語化し、上流への更新確認・beta 通信を除去する。
  ASAR_BIN="${ASAR_BIN:-asar}" node "$startdir/tools/apply-ja.js" \
    --asar "stage/opt/Mechvibes/resources/app.asar" \
    --map "ja.json" \
    --workdir "$srcdir/ja-work"

  # desktop エントリを日本語版に差し替える。
  install -Dm644 mechvibes.desktop \
    "stage/usr/share/applications/mechvibes.desktop"
}

check() {
  cd "$srcdir"
  rm -rf check-extract
  local asar_bin="${ASAR_BIN:-asar}"
  "$asar_bin" extract "stage/opt/Mechvibes/resources/app.asar" check-extract
  node "$startdir/tools/verify-ja.js" --dir check-extract --map ja.json
}

package() {
  cd "$srcdir/stage"
  cp -a --no-preserve=ownership . "$pkgdir"/

  # /usr/bin/mechvibes は旧 AUR 版と同じく .install で作成する。
  # パッケージ所有にすると、旧版が .install で作った未所有シンボリックリンクと
  # 衝突するため。

  local src_icon="$pkgdir/usr/share/icons/hicolor/0x0/apps/mechvibes.png"
  if [ -f "$src_icon" ]; then
    local i
    for i in 16x16 24x24 32x32 48x48 64x64 128x128 256x256; do
      install -Dm644 "$src_icon" \
        "$pkgdir/usr/share/icons/hicolor/$i/apps/mechvibes.png"
    done
  fi
}
