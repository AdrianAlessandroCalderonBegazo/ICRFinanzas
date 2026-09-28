# ICR Finanzas — Caja de Obra

App Android para registrar **ingresos y egresos** de obra con el saldo de la cuenta **en vivo**, en estilo *glassmorphism* (diseño "Caja de Obra Glass").

```
app/      App Android (Expo · React Native · TypeScript)
server/   Servidor que analiza fotos de comprobantes con Claude (Node · TypeScript)
design/   Diseño original exportado de Claude Design (prototipo HTML + conversación)
```

## Qué hace

- **Inicio**: saldo en cuenta con indicador *EN VIVO* y animación al cambiar, totales de ingresos/egresos del mes, lista de movimientos con filtro (Todos / Ingresos / Egresos).
- **Ingreso**: fecha, tipo (Obra / Proyecto, Venta, Otro), detalle opcional y monto. Muestra el nuevo saldo antes de confirmar.
- **Egreso** — dos formas:
  - **Manual**: fecha, ciudad, persona, descripción, categoría (Equipos, Caja chica, Movilidad, Material, Sueldo, Oficina, Fletes, Viáticos) y monto.
  - **Con captura**: sube una foto (galería o cámara) de la boleta, factura, voucher o transferencia. El servidor la analiza con Claude y el formulario se llena solo; los campos detectados llevan la marca **AUTO** y se pueden corregir.
- Ambos formularios terminan en una **hoja de confirmación** con el resumen y el saldo resultante antes de registrar.
- Los datos se guardan en el teléfono (AsyncStorage).

## 1. Servidor de análisis

La clave de la API de Anthropic vive solo en el servidor (nunca dentro del APK).

```bash
cd server
npm install
export ANTHROPIC_API_KEY=sk-ant-...
# opcional: exige este token en cada solicitud de la app
export APP_TOKEN=un-secreto
npm start            # escucha en http://0.0.0.0:8787
```

Endpoint: `POST /api/analizar-comprobante` con `{ "image": "<base64>", "mediaType": "image/jpeg" }` → `{ fecha, persona, descripcion, ciudad, categoria, monto }`.
Usa el modelo `claude-opus-5` con salida estructurada y *fallback* automático del servidor ante rechazos.

Para usarlo desde el celular, el servidor debe ser accesible desde la red del teléfono (misma Wi‑Fi usando la IP de tu PC, o desplegado en un servicio como Render, Railway o Fly.io).

## 2. App Android

```bash
cd app
npm install
cp .env.example .env     # pon la URL del servidor en EXPO_PUBLIC_API_URL
npx expo start           # escanea el QR con Expo Go en Android
```

Variables (`app/.env`):

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL del servidor, p. ej. `http://192.168.1.50:8787` |
| `EXPO_PUBLIC_APP_TOKEN` | Opcional. Debe coincidir con `APP_TOKEN` del servidor |

Sin servidor configurado, el botón **"Probar con comprobante de ejemplo"** sigue funcionando con datos de muestra.

### Generar el APK

```bash
cd app
npx eas-cli@latest build -p android --profile preview   # APK en la nube (requiere cuenta Expo)
# o, con Android Studio instalado:
npx expo run:android
```

## Desarrollo

```bash
cd app && npm run typecheck
cd server && npm run typecheck
```
