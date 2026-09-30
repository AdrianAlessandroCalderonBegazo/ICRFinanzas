"""Installs the APK on the emulator, launches the app and stress-tests it with random touches.

Everything is reported as GitHub annotations so the result is readable on the run page.
Usage: python3 tour.py <apk> <label>
"""
import re, subprocess, sys, time

PKG = "com.icr.finanzas"
APK, LABEL = sys.argv[1], sys.argv[2]


def sh(*args):
    return subprocess.run(["adb", *args], capture_output=True, text=True).stdout


def note(level, title, body):
    body = body.replace("%", "%25").replace("\r", "").replace("\n", "%0A")[:60000]
    print(f"::{level} title={title}::{body}", flush=True)


def app_log():
    out = sh("logcat", "-d")
    keep = [l for l in out.splitlines() if re.search(r"AndroidRuntime|FATAL|ReactNativeJS|SoLoader|UnsatisfiedLink|couldn't find|Process: " + PKG + r"|F DEBUG|Fatal signal|ExpoModules|hermes|Hermes", l)]
    return "\n".join(keep[-120:])


def alive():
    return bool(sh("shell", "pidof", PKG).strip())


def fail(step, extra=""):
    crash = sh("logcat", "-d", "-b", "crash").strip()
    note("error", f"[{LABEL}] CRASH en: {step}", (crash or "el proceso terminó sin registro en el buffer de crash") + "\n" + extra + "\n\n--- logcat ---\n" + app_log())
    sys.exit(1)


abi = sh("shell", "getprop", "ro.product.cpu.abilist").strip()
ver = sh("shell", "getprop", "ro.build.version.release").strip()
print(f"Android {ver}, abis {abi}")
sh("install", "-r", APK)
sh("logcat", "-c")
sh("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1")
time.sleep(20)
if sh("logcat", "-d", "-b", "crash").strip() or not alive():
    fail("abrir la app")

# ~900 random touches with a pause between them, on whatever screen is showing.
out = sh("shell", "monkey", "-p", PKG, "-s", "7", "--throttle", "250", "--pct-touch", "85", "--pct-motion", "10",
         "--pct-syskeys", "0", "--pct-nav", "0", "--pct-majornav", "0", "--pct-appswitch", "0", "--pct-anyevent", "5",
         "--pct-trackball", "0", "-v", "900")
tail = "\n".join(out.strip().splitlines()[-25:])
if "// CRASH" in out or "ANR" in out or sh("logcat", "-d", "-b", "crash").strip() or not alive():
    fail("toques aleatorios", tail)

note("notice", f"[{LABEL}] Android {ver} ({abi}): abrió y aguantó 900 toques", tail + "\n\n--- logcat ---\n" + app_log())
