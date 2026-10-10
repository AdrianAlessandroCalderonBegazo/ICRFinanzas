# ICR Finanzas — Caja de Obra

App para registrar **ingresos y egresos** de obra con el saldo de la cuenta **en vivo**, con el diseño claro de ICR (Manrope, teal #0E7490 · cyan #12A3B8 · navy #124C8C · tinta #0D2233). Corre como **APK Android** y como **app web** en [finanzas.inversionesicr.com](https://finanzas.inversionesicr.com), ambas conectadas al ERP de Inversiones ICR (ICR-LOGISTICA) — el ERP es el que manda: cada movimiento que se confirma acá queda registrado ahí y aparece al instante en Contabilidad → Flujo de caja, junto a Proyectos y Tienda.

```
app/              App Android + Web (Expo · React Native · TypeScript)
design/           Diseño original exportado de Claude Design (prototipo HTML + conversación)
.github/          GitHub Actions: tests/build web + APK
Dockerfile.web    Build de la app web para producción (Docker + nginx)
nginx.conf        Config de nginx usada por Dockerfile.web
docker-compose.yml Despliegue en el VPS (Docker + Traefik), ver "Desplegar la build web" abajo
```

## Qué hace

- **Inicio**: saldo en cuenta con indicador *EN VIVO* y animación al cambiar, nombre y número de la cuenta bancaria, totales de ingresos/egresos del mes, lista de movimientos con filtro (Todos / Ingresos / Egresos).
- **Cuenta y saldo**: toca la tarjeta del saldo (✎ Editar) para cambiar el nombre de la cuenta, el número de cuenta y el saldo actual. Cambiar el saldo no crea un movimiento.
- **Ingreso**: fecha, tipo (Obra / Proyecto, Venta, Otro), detalle opcional y monto. Muestra el nuevo saldo antes de confirmar.
- **Egreso** — dos formas:
  - **Manual**: fecha, ciudad (sugerencias: Moquegua y Arequipa), persona, descripción, categoría (Equipos, Caja chica, Movilidad, Material, Oficina, Fletes, Viáticos, Proveedores, Gastos fijos) y monto. Al elegir **Gastos fijos** se abre otro selector con **Sueldos, Alquiler o Servicios**.
  - **Con captura**: sube una foto (galería o cámara) de la boleta, factura, ticket o captura de Yape/Plin/transferencia. El texto se lee **en el dispositivo** — Google ML Kit en Android (offline, sin costo) o Tesseract.js en la web (motor WASM auto-hospedado, ver `app/public/tesseract/README.md`) — y el formulario se llena solo; los campos detectados llevan la marca **AUTO** y se pueden corregir.
- Ambos formularios terminan en una **hoja de confirmación** con el resumen y el saldo resultante antes de registrar.
- Los datos se guardan primero en el dispositivo (AsyncStorage) y se **empujan al ERP** en segundo plano — ver "Conectada al ERP" abajo.

## Conectada al ERP

Cada persona de campo entra con **su propia cuenta real del ERP** (Administración → Usuarios en ICR-LOGISTICA), no una cuenta compartida — mismo correo/clave que usaría para entrar al ERP desde una computadora. El rol decide qué puede registrar (ALMACENERO/VENTAS/COMPRAS/SUPERVISOR ya traen los permisos `income.*`/`expenses.*`).

Al confirmar un ingreso o un egreso:
1. Se guarda de inmediato en el teléfono/navegador (como siempre) — la pantalla nunca espera a la red.
2. En segundo plano se envía a `POST /income` o `POST /expenses` del ERP (`app/src/lib/api.ts`), traduciendo la categoría/tipo local al enum que espera el ERP.
3. Si el ERP no responde (sin señal, servidor caído), el movimiento queda marcado como pendiente — Home avisa cuántos faltan — y la app **reintenta sola** en cuanto vuelve a haber conexión (al abrir la app de nuevo). Nada se pierde ni bloquea al usuario.

La URL del ERP se configura con `EXPO_PUBLIC_ERP_API_URL` (ver `app/.env.example`); en la build web de producción se "hornea" en el bundle al compilar (ver `Dockerfile.web`), no se lee en runtime.

### Qué detecta el OCR

| Campo | Cómo |
|---|---|
| Monto | Línea de *TOTAL / IMPORTE TOTAL / Yapeaste…* (ignora subtotal, IGV, vuelto); si no hay, el mayor monto con `S/` |
| Fecha | `dd/mm/aaaa`, `aaaa-mm-dd`, `27 set. 2026`, `24 de septiembre de 2026`… (prioriza la línea "Fecha/Emisión") |
| Persona | Destinatario en Yape/Plin/transferencias; razón social (S.A.C., E.I.R.L., …) en boletas y facturas |
| Ciudad | Ciudades del Perú y distritos de Lima que aparezcan en la dirección |
| Categoría | Palabras clave (cemento → Material, combustible → Movilidad, flete → Fletes, menú → Viáticos, …) ; planilla → Gastos fijos › Sueldos, recibo de luz/agua/internet → Gastos fijos › Servicios, alquiler de local → Gastos fijos › Alquiler. "Proveedores" y "Caja chica" se eligen a mano |
| Descripción | Primera línea de producto relacionada con la categoría, o "Transferencia a …" |

Las reglas están en `app/src/lib/parseComprobante.ts` y tienen pruebas en `parseComprobante.test.ts`.

## Descargar el APK (GitHub Actions)

Cada `push` a `main` que toque `app/` genera el APK automáticamente:

1. En GitHub abre la pestaña **Actions → APK Android** y entra a la última ejecución.
2. Baja el archivo en **Artifacts** (`ICR-Finanzas-apk-N`), descomprime el `.zip` y pasa el `.apk` al teléfono.
3. En Android, permite "instalar apps de origen desconocido" y ábrelo.

También puedes lanzarlo a mano con **Run workflow**. Si subes un tag `v1.0.0`, el APK además queda adjunto en **Releases**.

> El APK está firmado con la clave de depuración: sirve para instalarlo directamente en los teléfonos del equipo. Para publicarlo en Google Play habría que configurar una clave de firma propia.

## Desarrollo

```bash
cd app
npm install
npm run typecheck
npm test
npx expo run:android     # requiere Android Studio / SDK instalado
npx expo start --web     # web, con recarga en caliente
```

El OCR de Android usa un módulo nativo, por eso **la app Android no funciona en Expo Go**; usa el APK o `expo run:android`. La web sí corre en cualquier navegador (Metro resuelve `DateField.web.tsx`/`ocr.ts` con Tesseract.js automáticamente para esa plataforma).

## Desplegar la build web (Docker + Traefik)

Mismo patrón que el ERP, ICR-TIENDA y el Cotizador en el VPS de Inversiones ICR: un contenedor nginx sirviendo la build estática de `expo export -p web`, detrás de Traefik.

```bash
# En el VPS, junto al docker-compose.yml de este repo:
cat > .env <<'EOF'
DOMAIN=finanzas.inversionesicr.com
ERP_API_URL=https://erp.inversionesicr.com/api
EOF

docker compose build
docker compose up -d
```

`ERP_API_URL` se pasa como **build arg** (no variable de entorno del contenedor) porque Expo inlinea `EXPO_PUBLIC_*` en el bundle JS al exportar, no lo lee en runtime — por eso hay que reconstruir la imagen (`docker compose build`) si cambia. `DOMAIN` sí es normal (lo usan las etiquetas de Traefik).

CI (`.github/workflows/tests.yml`) corre `typecheck`, los tests de `parseComprobante` y un `expo export -p web` en cada push/PR, para que un cambio que rompa la build web no pase desapercibido.
