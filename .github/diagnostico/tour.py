"""Opens the installed app on the emulator, walks through the main screens and reports any crash.

Everything is reported as GitHub annotations so the result is readable on the run page.
Usage: python3 tour.py <apk>
"""
import re, subprocess, sys, time

PKG = "com.icr.finanzas"
APK = sys.argv[1]


def sh(*args, check=False):
    return subprocess.run(["adb", *args], capture_output=True, text=True, check=check).stdout


def note(level, title, body):
    body = body.replace("%", "%25").replace("\r", "").replace("\n", "%0A")[:60000]
    print(f"::{level} title={title}::{body}", flush=True)


def crash_log():
    return sh("logcat", "-d", "-b", "crash").strip()


def app_log():
    out = sh("logcat", "-d")
    keep = [l for l in out.splitlines() if re.search(r"AndroidRuntime|FATAL|ReactNativeJS|ReactNative|SoLoader|UnsatisfiedLink|ExpoModules|Process: " + PKG + "|F DEBUG|tombstone|libc\s+: Fatal", l)]
    return "\n".join(keep[-150:])


def screen():
    sh("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    xml = sh("shell", "cat", "/sdcard/ui.xml")
    items = []
    for m in re.finditer(r'<node[^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', xml):
        label = m.group(1) or m.group(2)
        if label:
            x1, y1, x2, y2 = map(int, m.groups()[2:])
            items.append((label, (x1 + x2) // 2, (y1 + y2) // 2))
    return items


def alive():
    return bool(sh("shell", "pidof", PKG).strip())


def check(step):
    crash = crash_log()
    if crash or not alive():
        note("error", f"CRASH en: {step}", (crash or "el proceso terminó sin registro en el buffer de crash") + "\n\n--- logcat ---\n" + app_log())
        sys.exit(1)


def tap(text, wait=2.5):
    for label, x, y in screen():
        if text.lower() in label.lower():
            sh("shell", "input", "tap", str(x), str(y))
            time.sleep(wait)
            return True
    return False


steps = []


def visit(name, action):
    ok = action()
    check(name)
    texts = " | ".join(l for l, _, _ in screen())[:600]
    steps.append(f"[{'OK' if ok else 'NO ENCONTRÉ EL BOTÓN'}] {name}\n    pantalla: {texts}")


print(sh("shell", "getprop", "ro.build.version.release").strip())
sh("install", "-r", APK)
sh("logcat", "-c")
sh("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1")
time.sleep(20)
check("abrir la app")
steps.append("[OK] abrir la app\n    pantalla: " + " | ".join(l for l, _, _ in screen())[:600])

visit("Ingreso", lambda: tap("INGRESO"))
visit("Ingreso · tipo", lambda: tap("Obra / Proyecto"))
visit("Volver (atrás)", lambda: (sh("shell", "input", "keyevent", "4"), time.sleep(2), True)[2])
visit("Egreso", lambda: tap("EGRESO"))
visit("Egreso · manual", lambda: tap("REGISTRO MANUAL"))
visit("Egreso · Gastos fijos", lambda: tap("Gastos fijos"))
visit("Volver", lambda: (sh("shell", "input", "keyevent", "4"), time.sleep(2), True)[2])
visit("Volver", lambda: (sh("shell", "input", "keyevent", "4"), time.sleep(2), True)[2])
visit("Egreso · captura", lambda: (tap("EGRESO"), tap("CON CAPTURA"))[1])
visit("Volver", lambda: (sh("shell", "input", "keyevent", "4"), time.sleep(2), True)[2])
visit("Volver a inicio", lambda: (sh("shell", "input", "keyevent", "4"), time.sleep(2), True)[2])
visit("Cuenta y saldo", lambda: tap("Editar"))

note("notice", "La app abrió y recorrió las pantallas sin crashear", "\n".join(steps) + "\n\n--- logcat ---\n" + app_log())
