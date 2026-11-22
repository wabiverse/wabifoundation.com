#!/bin/zsh
# regenerates the gallery frames in assets/img/scenes/
#
# these are real Akari renders, not screenshots. the engine renders headlessly,
# so no window ever opens. two scenes needed a better camera than the one in the
# file, so tools/shots/ holds override layers that sublayer the scene and add one.
#
# usage:  ./tools/render-scenes.sh [path to the Akari checkout]

set -u
AKARI="${1:-$HOME/wabi/Akari}"
# always the locally built bundle, never /Applications: the installed release lags
# the tree, and an old one renders glass and caustics wrong.
KRAKEN="$AKARI/.build/bundler/apps/Kraken/Kraken.app/Contents/MacOS/Kraken"
if [ ! -x "$KRAKEN" ]; then
  echo "no local build at $KRAKEN - run 'make bundle' in the Akari checkout first" >&2
  exit 1
fi
HERE="${0:A:h}"
SITE="${HERE:h}"
TMP=$(mktemp -d)

shoot () {  # name  scene  frame  camera
  echo "  $1"
  "$KRAKEN" --usd "$2" -b -f "$3" -F PNG -o "$TMP/$1.png" \
    --resolution 1600x1000 --quality cinematic --samples 96 --refine-level 3 --no-overlays --camera "$4" \
    2>&1 | grep -E "finished in|render failed"
  local src=$(ls "$TMP/$1.png"[0-9]* 2>/dev/null | head -1)
  local size=1200
  [ "$1" = "saber" ] && size=1600
  sips -s format jpeg -s formatOptions 76 -Z $size "$src" --out "$SITE/assets/img/scenes/$1.jpg" >/dev/null
}

cd "$AKARI"
echo "rendering from $AKARI"
shoot saber      Scenes/SaberShowcase.usda     1  /World/Main
shoot caustic    Scenes/CausticShowcase.usda   61 /World/Main   # 61 is the centred orbit frame
shoot cloud      Scenes/CloudShowcase.usda     1  /World/Reference

shoot arealight  Scenes/AreaLightShowcase.usda 1  /World/Main
shoot lens       Scenes/LensShowcase.usda      1  /World/Lens

# these three need the override cameras
shoot probe      "$HERE/shots/probe.usda" 102 /World/WebCam  # 102 puts the cube at the top of its arc
shoot reflection "$HERE/shots/refl.usda" 1  /World/WebCam
shoot motionblur "$HERE/shots/blur.usda" 12 /World/WebCam

rm -rf "$TMP"
echo "done -> $SITE/assets/img/scenes"
