#!/usr/bin/env bash
# Installs the APK on the emulator, opens the app and fails if it crashes.
# Crash details are printed as GitHub annotations so they are visible on the run page.
set -uo pipefail
APK="$1"
PKG=com.icr.finanzas

annotate() { # level title file
  local body
  body=$(head -c 60000 "$3" | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}')
  echo "::$1 title=$2::$body"
}

echo "Android $(adb shell getprop ro.build.version.release) · página $(adb shell getconf PAGE_SIZE) bytes"
adb install -r "$APK" || { echo "::error title=Instalación::adb install falló"; exit 1; }
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 25

adb logcat -d -b crash > crash.txt || true
adb logcat -d -s ReactNativeJS:V ReactNative:V AndroidRuntime:E Expo:V > app-log.txt || true
adb exec-out screencap -p > screen.png || true

if adb shell pidof "$PKG" >/dev/null && [ ! -s crash.txt ]; then
  echo "La app sigue abierta después de 25 s."
  { echo "Android $(adb shell getprop ro.build.version.release), página $(adb shell getconf PAGE_SIZE)"; cat app-log.txt; } > ok.txt; mv ok.txt app-log.txt
  annotate notice "App abierta correctamente" app-log.txt
  exit 0
fi

echo "La app se cerró."
[ -s crash.txt ] && annotate error "Crash al abrir" crash.txt
grep -E "FATAL|Error|Exception|ReactNativeJS" app-log.txt > js-errors.txt || true
[ -s js-errors.txt ] && annotate error "Errores JS" js-errors.txt
exit 1
