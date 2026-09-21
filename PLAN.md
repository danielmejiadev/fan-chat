# Plan — Test técnico Senior React Native @ Fans Holdings

Repo: `fan-chat`. Presupuesto: 6-7 horas. Entrega: zip + walkthrough 30 min.

Criterios de evaluación: mensajería y recuperación (30%), pagos/acceso pago
(25%), UI + performance (30%), testing/explicación (15%).

Enfoque: **funcionalidad primero, UI/estilos al final**. Cada fase deja algo
testeable antes de pasar a la siguiente.

## Decisiones de arquitectura (confirmadas)

| Decisión | Elegido | Por qué |
|---|---|---|
| Plataforma de prueba | iOS Simulator | macOS local, ruta más directa con Expo |
| Persistencia | `expo-sqlite` (todo: cola de mensajes, idempotencia, dataset de 50k) | Un solo motor, consultas paginadas eficientes, evita duplicar lógica de storage |
| Lista virtualizada | `@shopify/flash-list` | Mejor performance en listas invertidas tipo chat con 50k items |
| Fuente de diseño | Figma real (FanSuite), extraído vía "Copy as code → CSS (all layers)" + screenshots (desktop y mobile) pegados por el usuario | MCP de Figma no tiene acceso de editor; esta vía no lo requiere |

Pendiente instalar: `expo-sqlite`, `@shopify/flash-list` (no están en
`package.json` todavía).

## Design tokens extraídos del Figma (FanSuite, node 1:9)

Fuente: CSS copiado del frame "Messages Fan /Mobile/" + capturas desktop y
mobile. Van a `tailwind.config.js`, nunca hardcodeados en componentes
(regla del AGENTS.md).

- **Fuente**: `Geist` (buscar variante disponible vía `expo-font`/Google
  Fonts; si no está, fallback a system font y anotarlo en README como
  limitación).
- **Colores base**:
  - Fondo de canvas/app: `#EEEEEE`
  - Fondo de paneles/cards: `#FFFFFF`
  - Texto primario: `#18181B` (zinc-900)
  - Texto secundario/metadata: `#71717A` / `#737373` (zinc-500)
  - Bordes: `#E4E4E7`, `#E5E5E5`
  - Fila de mensaje resaltada/seleccionada (lista de chats): `#EAEBFB`
    (lavanda claro — probable variante del color de acento)
  - Status online: `#16A34A` (verde); status offline/away: `#A1A1AA` /
    `#D4D4D8`
  - **Acento primario**: `#5863DE` (índigo/violeta) — confirmado en botones
    activos (background + border) en desktop y mobile.
  - Acento secundario/focus: `#8258DE` (bordes/inset-shadow en estados
    hover o focus de iconos).
  - Acento translúcido (fondos sutiles/hover): `rgba(88, 99, 222, 0.05)`
    (mismo tono que el acento primario con alpha).
  - Error/failed: `#DC2626` (rojo).
- **Tipografía** (Tailwind `fontSize`/`lineHeight` custom):
  - `text-sm` medium, `leading-none`: 14px/14px (nombres, headers)
  - `text-sm` normal, `leading-normal`: 14px/20px (cuerpo de mensaje)
  - `text-xs` normal, `leading-none`: 12px/12px (timestamps, metadata)
- **Spacing/radios**: gaps de 4/8/12/16px; `border-radius` de 8px
  (bubbles/filas), 9999px (avatars), 6-10px (botones/inputs), 320px (status
  dot), 28px solo en esquinas superiores del bottom nav.
- **Sombras**: `shadow-xs` = `0px 1px 2px rgba(0,0,0,0.05)`;
  `inset-shadow-xs` en botones de icono.
- **Avatares**: 40px (principal en fila), 20px (badge secundario).
- **Bottom nav** (mobile): fondo `rgba(255,255,255,0.94)`, `backdrop-blur`,
  borde superior `#E4E4E7`, esquinas superiores redondeadas 28px.

Pantallas de referencia disponibles: lista de chats + thread (desktop y
mobile), modal de "Gift the creator" / paywall de pago (desktop). **Falta**:
capturas de los estados que vamos a construir nosotros — offline/pending
enviando, failed con retry, purchase pending/confirmed — el Figma no los
tiene explícitos, así que en Fase 4 se diseñan "lite" siguiendo el mismo
sistema de tokens (ej. bubble con opacidad reducida + ícono de reloj para
pending, borde rojo + texto de error para failed).

## Fase 0 — Setup y arquitectura base ✅

- Jest + jest-expo + @testing-library/react-native v14.
- `pnpm test`, `pnpm run typecheck`, `pnpm run lint` limpios.
- `pnpm-workspace.yaml` con `allowBuilds` para `unrs-resolver` y
  `@parcel/watcher`.
- [x] Instalar `expo-sqlite` y `@shopify/flash-list`.
- [x] Definir estructura de datos: `ClientMessage`/`ServerMessage`/
  `ThreadMessage` en `src/features/chat/types.ts`; `StorePurchase`/
  `PurchaseConfirmation` en `src/features/purchases/types.ts`.
- [x] Esquema SQLite: `src/lib/database.ts` (conexión singleton),
  `src/features/chat/storage/chatDatabase.ts` (`pending_messages`,
  `accepted_client_ids`, `messages`), `src/features/purchases/storage/purchasesDatabase.ts`
  (`store_purchases`, `purchase_confirmations`). Inicializado en
  `src/app/_layout.tsx`.
- [ ] `chatService.ts` / `purchaseService.ts` (la lógica mock en sí) se
  escriben en Fase 1 y Fase 2 respectivamente, junto con sus tests — crear
  el archivo vacío ahora sería un esqueleto sin comportamiento real.

**Nota de arquitectura**: dentro de cada feature module se añade una capa
`storage/` (ej. `src/features/chat/storage/`) separada de `services/`.
`storage/` es dueña del schema y del CRUD crudo contra SQLite — sin reglas
de negocio, igual que `utils/` no hace I/O. `services/` (Fase 1/2) consume
`storage/` y ahí vive la lógica: idempotencia, orden de reconciliación,
reintentos. Evita mezclar "crear tablas" con "reglas de negocio" bajo el
mismo folder, que es justamente lo que `services/` no debería ser según el
propio AGENTS.md ("Business rules live here").

## Fase 1 — Mensajería confiable (30%)

- [x] Reproducir el bug de duplicados (respuesta perdida tras retry) antes
  de tocar código — test dedicado en `chatService.test.ts` que documenta el
  repro con un backend mock sin dedupe (`createMockChatBackend(false)`).
- [x] Persistir mensajes pendientes en SQLite antes de encolarlos.
  `clientId` estable (UUID generado en `enqueueMessage`) que sobrevive
  reinicios de la app (persistencia ya implementada; el test de force-quit
  en sí queda pendiente, ver abajo).
- [x] Mock backend recuerda `clientId`s ya aceptados (dedupe por
  `clientId` en `mockChatBackend.ts`, más `accepted_client_ids` en SQLite).
- [x] `chatService.ts`: `enqueueMessage`, `flushPendingMessages`,
  `receiveMessages`, `syncThread`, `getConfirmedThread`,
  `getPendingMessages` — con `ChatStore` inyectable para poder testear la
  lógica en memoria sin depender del motor nativo de SQLite en Jest.
- [x] Escenarios obligatorios cubiertos por tests (`chatService.test.ts`,
  6/6 verdes):
  1. [x] 3 mensajes offline quedan en estado "esperando" (Pending), en orden.
  2. [ ] Esos 3 sobreviven un force-quit de la app — **pendiente**: requiere
     una prueba de integración contra SQLite real (no el store en memoria),
     ver más abajo.
  3. [x] 4 mensajes entrantes se reconcilian al reconectar sin duplicar
     (`receiveMessages` + `syncThread`, idempotentes por `serverId`).
  4. [x] Retry de una respuesta perdida deja una sola copia final — probado
     tanto el bug (backend sin dedupe → 2 copias) como el fix (backend con
     dedupe → 1 copia, incluso con 3 reintentos redundantes).
  5. [x] Fallos claros: texto preservado + estado Failed para retry manual.
- [x] Orden final del thread lo decide el mock backend
  (`listMessages`/`syncThread`); los salientes mantienen orden local en
  `pending_messages` hasta confirmarse.
- [ ] **Test obligatorio pendiente**: recuperación tras reinicio de la app
  contra SQLite real (no el `ChatStore` en memoria de los tests actuales).
- [ ] Conectar `chatService` a la UI: falta la capa `hooks/`
  (`src/features/chat/hooks/useChatThread.ts`) que los componentes van a
  consumir — hoy la lógica de negocio existe pero nada de React la llama
  todavía.

## Fase 2 — Pagos y acceso pago (25%)

- [ ] Paywall con mock de compra: producto/precio/estado visibles.
- [ ] Taps repetidos no duplican la compra (debounce/estado en vuelo).
- [ ] Cubrir: compra exitosa, cancelación, fallo, restauración.
- [ ] Separar "resultado de la compra" (respuesta del mock de la tienda) de
  "confirmación del backend mock" — estado `pending` honesto entre medio;
  acceso solo se otorga tras la confirmación.
- [ ] Eventos repetidos (ej. doble webhook simulado) no duplican efectos de
  acceso. Un intento fallido no relacionado no revoca un acceso ya válido.
- [ ] **Test obligatorio**: confirmación demorada (compra ok, confirmación
  llega después, UI refleja el estado intermedio correctamente).
- [ ] Para el README: explicar cómo conectaría a billing real (RevenueCat o
  StoreKit/Billing directo), validación server-side de recibos, manejo de
  expiración/reembolsos.

## Fase 3 — Datos a escala y performance (funcional, sin UI)

- [ ] Generar 50,000 mensajes mock repetibles (seed fija) en SQLite.
- [ ] Carga con paginación (ventaneo) + FlashList.
- [ ] Definir secuencia repetible de scroll + tipeo para perfilar después
  (guion fijo: scroll rápido al fondo, scroll lento leyendo, escribir en el
  input mientras se hace scroll).

## Fase 4 — UI/UX/estilos (al final)

- [ ] Aplicar tokens extraídos del Figma (ver tabla arriba) vía
  `tailwind.config.js`, nunca hardcodeado en componentes.
- [ ] Diseñar estados faltantes que el Figma no cubre: offline, pending,
  failed, purchase pending/confirmed — mismo sistema, sin inventar una
  paleta nueva.
- [ ] Teclado (`KeyboardAvoidingView`/`react-native-keyboard-controller` si
  hace falta), safe areas, accesibilidad (labels, tamaños de touch target),
  transiciones, respeto de "reduced motion".

## Fase 5 — Profiling con evidencia

- [ ] Correr la secuencia de scroll+tipeo de Fase 3 sobre los 50k mensajes.
- [ ] Medir frame timing / dropped frames / memoria (Flipper, Perf Monitor
  de RN, o `react-native-performance`).
- [ ] Identificar un bottleneck concreto, mostrar antes/después.
- [ ] Ser honesto en el README si algo no se pudo medir y por qué.

## Fase 6 — Entregables

- [ ] Grabaciones de los escenarios obligatorios (Fase 1 y 2).
- [ ] `README.md`: bug encontrado, decisiones tomadas, tests, resultados de
  performance, limitaciones conocidas, tiempo invertido por fase.
- [ ] `AI.md`: qué se usó de asistencia de IA y cómo.
- [ ] Explicación escrita: resume de upload grande (background vs.
  force-quit).
- [ ] Reglas de App Store / Google Play sobre contenido de creadores y
  pagos, con links oficiales.
- [ ] Zip `Firstname_Lastname.zip` → enviar a `join@fansapi.com`.

## Reglas de identidad y git (siempre aplican)

- Nunca `Co-Authored-By` ni atribución de IA en commits/PRs.
- Commits/PRs bajo la identidad propia (`git config user.name/email`:
  Daniel Mejia / luisdanielmejia@outlook.com). Antes de `git push` o
  cualquier `gh` acción, verificar `gh auth status`; si la cuenta activa no
  es la del usuario, parar y pedir que la cambien.
- Mensajes de commit y PRs siempre en inglés, aunque el resto de la
  conversación esté en español.
- Estilo del repo (`AGENTS.md`): llaves multilínea siempre en
  `if`/`for`/`while`, nunca one-liners sin llaves (`curly: ["error", "all"]`
  en ESLint).
