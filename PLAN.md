# Plan — Test técnico Senior React Native @ Fans Holdings

Repo: `fan-chat`. Presupuesto: 6-7 horas. Entrega: zip + walkthrough 30 min.

Criterios de evaluación: mensajería y recuperación (30%), pagos/acceso pago
(25%), UI + performance (30%), testing/explicación (15%).

Enfoque: **funcionalidad primero, UI/estilos al final**. Cada fase deja algo
testeable antes de pasar a la siguiente.

> **Este archivo es la única fuente de verdad del progreso.** Sirve para
> retomar el trabajo con cualquier agente (Claude, otro modelo, otra
> sesión) sin perder contexto. Reglas de mantenimiento:
> - Cada vez que se termina algo, se marca `[x]` aquí **en el mismo turno**
>   en que se termina — no se deja para después.
> - La sección **"Work in progress"** de más abajo es el único lugar para
>   trabajo a medias / bugs siendo diagnosticados. Se agrega una entrada al
>   empezar a investigar algo no trivial, y se borra (no se archiva) en
>   cuanto se resuelve y se verifica — su contenido pasa a estar reflejado
>   como checkbox resuelto en la fase correspondiente.
> - Si algo de aquí queda desactualizado respecto al código, el código
>   manda; se corrige este archivo para que vuelva a ser verdad.

## Decisiones de arquitectura (confirmadas)

| Decisión | Elegido | Por qué |
|---|---|---|
| Plataforma de prueba | iOS Simulator + Web (Metro) | macOS local; web se usa además para iterar rápido en UI |
| Persistencia | `expo-sqlite` (todo: cola de mensajes, idempotencia, dataset de 50k) | Un solo motor, consultas paginadas eficientes, evita duplicar lógica de storage |
| Lista virtualizada | `@shopify/flash-list` | Mejor performance en listas invertidas tipo chat con 50k items |
| Fuente de diseño | Figma real (FanSuite), extraído vía "Copy as code → CSS (all layers)" + screenshots (desktop y mobile) pegados por el usuario, guardados en `docs/design/` | MCP de Figma no tiene acceso de editor; esta vía no lo requiere |
| Layout responsive | `useIsDesktopLayout` + `AppChrome` (`DesktopSidebar`/`MobileTabBar`) | Un solo `ChatWorkspace` que decide layout en runtime en vez de duplicar pantallas por plataforma |

## Design tokens extraídos del Figma (FanSuite, node 1:9)

Ya viven en `tailwind.config.js` (colores, `boxShadow`, `borderRadius`) —
**no se repiten valores hardcodeados aquí**; si hace falta ver el valor
exacto de un token, `tailwind.config.js` es la fuente. Fuente original:
CSS copiado del frame "Messages Fan /Mobile/" + capturas en
`docs/design/fansuite-desktop.jpg` y `docs/design/fansuite-mobile.jpg`.

Pendiente de tokens: fuente `Geist` no confirmada instalada (revisar si
`expo-font`/Google Fonts la trae o si se queda en fallback a system font —
anotar como limitación en el README si aplica).

## Fase 0 — Setup y arquitectura base ✅

- [x] Jest + jest-expo + @testing-library/react-native v14; `pnpm test`,
  `pnpm run typecheck`, `pnpm run lint` limpios.
- [x] `expo-sqlite`, `@shopify/flash-list` instalados.
- [x] Estructura de datos (`ClientMessage`/`ServerMessage`/`ThreadMessage`,
  `StorePurchase`/`PurchaseConfirmation`).
- [x] Esquema SQLite: `src/lib/database.ts` (conexión singleton),
  `chatDatabase.ts`, `purchasesDatabase.ts`. Inicializado en
  `src/app/_layout.tsx`.

**Nota de arquitectura**: capa `storage/` por feature module, separada de
`services/` — `storage/` es dueña del schema y CRUD crudo; `services/`
tiene la lógica de negocio (idempotencia, orden de reconciliación,
reintentos).

## Fase 1 — Mensajería confiable (30%) ✅ funcional + UI

- [x] Repro del bug de duplicados (respuesta perdida tras retry) antes de
  tocar código, documentado en `chatService.test.ts`.
- [x] Mensajes pendientes persistidos en SQLite antes de encolarlos,
  `clientId` estable (UUID vía `expo-crypto`).
- [x] Dedupe por `clientId` en el mock backend + `accepted_client_ids`.
- [x] `chatService.ts` completo, con `ChatStore` inyectable para tests en
  memoria.
- [x] Los 5 escenarios obligatorios cubiertos por tests
  (`chatService.test.ts`, verde) — force-quit resuelto vía
  `chatService.persistenceGuarantee.test.ts` (honestamente testeable en
  Jest) + checklist manual en `docs/manual-scenarios.md` para grabar en el
  Simulator (Jest no puede matar/reabrir un proceso nativo real).
- [x] `useChatThread` (`src/features/chat/hooks/useChatThread.ts`): thread
  confirmado + pendiente, `sendMessage` optimista, `retryMessage`,
  `loadOlderMessages` (ventana creciente), reconciliación periódica (5s) +
  al volver a foreground (`AppState`). Cubierto por
  `hooks/__tests__/useChatThread.test.ts`.
- [x] **UI conectada**: `ChatWorkspace` reemplazado por navegación basada en
  Expo Router (`src/app/index.tsx` = lista, `src/app/chat/[conversationId].tsx`
  = thread); cada ruta resuelve su propio layout responsive con
  `useIsDesktopLayout` (desktop: `DesktopSidebar` + lista (`Conversations`) +
  `ThreadPane`; mobile: `Conversations`/`ThreadPane` a pantalla completa +
  `MobileTabBar`). Componentes reorganizados por sub-feature:
  `features/chat/components/conversations/` (`Conversations`,
  `ConversationListItem`, `ConversationListView`, `ConversationSearch`,
  `ChatListHeader`) y `features/chat/components/chatDetail/` (`ThreadPane`,
  `MessagesList`, `MessageBubble`, `MessageInput`, `ChatThreadHeader`,
  `GiftRow`, `OfflineBanner`).
- [ ] Demo seeding (`ensureDemoConversationSeeded`) y flujo completo
  probados a mano end-to-end en Simulator/web tras el fix de SQLite en
  progreso (ver "Work in progress" abajo) — bloqueado por ese bug.

## Fase 2 — Pagos y acceso pago (25%) ✅ funcional + UI

- [x] `PurchaseStore` + `createSqlitePurchaseStore` (mismo patrón que
  chat).
- [x] `mockPurchaseBackend.ts`: `purchase()`, `confirmEntitlement()`
  (separada en el tiempo), `restorePurchases()`.
- [x] `purchaseService.ts`: `initiatePurchase`, `processPurchase`,
  `confirmPurchase`, `restorePurchases`, `getEntitlementStatus` — mismo
  patrón de DI que `chatService`.
- [x] Taps repetidos no duplican compra (idempotente por `productId`
  mientras hay una `Pending` en curso).
- [x] Cubierto por tests (`purchaseService.test.ts`, 11/11 verde): compra
  exitosa + confirmación separada, cancelación, fallo, restauración sin
  duplicar, confirmación demorada, taps repetidos, confirmación duplicada,
  aislamiento entre compras.
- [x] **UI conectada**: `GiftModal` (responsive, elige monto/medio de
  pago, muestra subtotal/fees/total) + `useGiftPurchase` hook
  (`pay`/`reset`, estados `idle/pending/confirmed/failed/canceled`) +
  `purchaseBackendRegistry.ts`. Disparado desde `MessageInput` → `ThreadPane`
  (`features/chat/components/chatDetail/`); al confirmar, inserta un mensaje
  de sistema en el thread vía `onGiftSent`.
- [ ] Probar a mano el flujo de gift end-to-end en Simulator/web (mismo
  bloqueo que Fase 1: SQLite en progreso).
- [ ] Para el README: explicar cómo conectaría a billing real (RevenueCat
  o StoreKit/Billing directo), validación server-side de recibos, manejo
  de expiración/reembolsos.

## Fase 3 — Datos a escala y performance

- [x] 50,000 mensajes mock repetibles (seed fija, PRNG mulberry32) para
  `conversationId = "perf-test"` — `generatePerfTestMessages.ts` +
  `ensurePerfTestMessagesSeeded()` (idempotente).
- [x] `ChatStore.getThreadMessagesPage` — paginación keyset por
  `(createdAt, serverId)`, en SQLite y en el fake en memoria, verificada
  contra los 50k reales sin huecos ni duplicados
  (`chatStorePagination.test.ts`).
- [x] UI de paginación: `MessagesList` usa `FlashList` con
  `onStartReached`/`onStartReachedThreshold` + `useChatThread.loadOlderMessages`
  (ventana creciente de a 30). Genérico, ya funciona para cualquier
  conversación con historial largo.
- [x] Conversación de 50k enganchada al flujo real de UI: entrada
  "Perf Test (50k messages)" agregada a `MOCK_CONVERSATIONS`
  (`id: PERF_TEST_CONVERSATION_ID`), visible en la lista como cualquier
  otra conversación. `src/app/chat/[conversationId].tsx` llama
  `ensurePerfTestMessagesSeeded()` en un `useEffect` cuando se abre esa
  conversación (idempotente, no reinserta en aperturas repetidas).
  **Nota**: el seed corre síncrono sobre SQLite la primera vez que se abre
  — puede sentirse como un freno momentáneo al entrar por primera vez;
  aceptable para este caso de uso (una sola vez), pero anotar en el README
  como limitación conocida en vez de ocultarlo.
- [ ] Definir y ejecutar a mano la secuencia repetible de scroll + tipeo
  sobre esa conversación para perfilar (guion fijo: scroll rápido al
  fondo, scroll lento leyendo, escribir en el input mientras se hace
  scroll) — esto requiere correr la app en el Simulator/dispositivo real,
  no se puede hacer desde este entorno de agente.

## Fase 4 — UI/UX/estilos

- [x] Tokens del Figma en `tailwind.config.js` (colores, sombras, radios) —
  nunca hardcodeados en componentes.
- [x] Layout responsive desktop/mobile: `useIsDesktopLayout` +
  `src/features/shell/components/` (`DesktopSidebar`, `MobileTabBar`,
  `SidebarItem`, `TabIcon`).
- [x] Componentes atómicos construidos: `Avatar`, `IconButton`,
  `ConversationListItem`, `ConversationSearch`, `ChatListHeader`,
  `ChatThreadHeader`, `OfflineBanner`, `MessageBubble`, `MessageInput`,
  `MessagesList`, `GiftModal`. Cada componente en su propio archivo (sin
  sub-componentes definidos inline) y todo `className` condicional vía
  `clsx` (ver `AGENTS.md`).
- [x] `KeyboardAvoidingView` en `ThreadPane` (iOS `padding`), `SafeAreaView`
  en las pantallas.
- [x] Design kit de color: primitivos + tokens semánticos (con pares
  `-foreground` estilo shadcn/ui) vía CSS variables en
  `src/design/colors.css`, importado en `src/global.css`, consumidos desde
  `tailwind.config.js` con el formato `rgb(var(--x) / <alpha-value>)` —
  `accent` renombrado a `primary` (única familia de marca real del Figma,
  se omitió `secondary` por no existir). Íconos (`Ionicons`) migrados a
  `className` vía `cssInterop` (`src/components/Icon.tsx`) en vez de
  `color="#hex"`, para que también lean los mismos tokens — ya no queda
  ningún hex de color hardcodeado en componentes.
- [x] Fuente Geist real cargada vía `@expo-google-fonts/geist` + `useFonts`
  en `src/app/_layout.tsx` (pesos 400/500/600, con `expo-splash-screen`
  bloqueando el primer render hasta que carguen). Verificado que compila
  y que los tres nombres de fuente llegan al bundle (`pnpm run web` /
  `expo export --platform web`).
- [x] Escala tipográfica por rol (`h1`–`h5`, `body`, `caption`) en
  `tailwind.config.js` (`theme.extend.fontSize`), anclada en los tamaños
  ya confirmados por el Figma (`h4`=16/24 = el actual `text-base`
  usado en headers/títulos de modal, `body`=14/20 = el actual `text-sm`
  del cuerpo de mensajes, `caption`=12/16 = el actual `text-xs` de
  timestamps/metadata); `h1`–`h3`/`h5` extienden la misma escala para
  pantallas que el Figma todavía no cubre. Como RN no puede simular
  variantes de peso sobre una fuente custom (cada peso es un archivo de
  fuente separado), cada tamaño se combina con una clase de familia
  (`font-sans`/`font-sans-medium`/`font-sans-semibold`), nunca con
  `font-medium`/`font-semibold` de NativeWind solos.
- [x] Migrados todos los `Text`/`TextInput` de `text-sm`/`text-xs`/`text-base`
  sueltos a `text-h4`/`text-h5`/`text-body`/`text-caption` +
  `font-sans*` en los ~16 componentes que los usaban. `h1`–`h3` quedan
  definidos pero sin ningún call site todavía — no hay pantalla en el
  Figma que los necesite hoy (settings/onboarding futuros).
- [x] `src/components/Text.tsx` y `src/components/TextInput.tsx`: wrappers
  que aplican `font-sans` (Geist regular) por defecto, mismo patrón que
  `src/components/Icon.tsx`. Necesarios porque NativeWind no aplica un
  font-family por defecto a los `Text`/`TextInput` sin `className`
  (`nativewind/nativewind#387`) — sin el wrapper, cada uso tendría que
  repetir `font-sans` a mano. Todo el código importa `Text`/`TextInput`
  desde `@/components/...`, nunca directo de `react-native`.
- [x] Tokens de texto renombrados de `text-*` a `foreground-*`
  (`--color-text-primary` → `--color-foreground-primary`, etc. en
  `src/design/colors.css` + `tailwind.config.js`) para eliminar la clase
  doble `text-text-primary` (prefijo `text-` de Tailwind + key `text-primary`
  del config) — ahora es `text-foreground-primary`. Aplicado en los 18
  componentes que los usaban.

- [x] Dark mode automático según el sistema — `darkMode: "media"` en
  `tailwind.config.js` (no `"class"`: no hay toggle manual en la app, solo
  seguir al SO, así que `"media"` es más simple y no necesita ningún hook
  de sincronización). Valores en
  `@media (prefers-color-scheme: dark) { :root { ... } }` dentro de
  `src/design/colors.css`, superficies zinc-900/800/700 (no vienen del
  Figma, inversión razonable, anotado en comentario). Si en el futuro hace
  falta un toggle manual, hay que volver a `"class"` y reintroducir un
  hook tipo `useSyncColorScheme` (ver historial de git).
- [x] Accesibilidad: auditados los 10 archivos con `Pressable`/
  `TouchableOpacity`. Agregado lo que faltaba: `TabIcon` (icon-only, sin
  `accessibilityLabel` — ahora recibe `label` desde `MobileTabBar`:
  "Home"/"Feed"/"Discover"/"Bookmarks"/"More"), `PaymentMethodChip`
  (`accessibilityRole` + `accessibilityState.selected`), reacciones
  rápidas de `MessageInput` (`accessibilityLabel="React with {emoji}"`,
  el emoji solo no es fiable como nombre accesible), chips de monto en
  `GiftModal` (`accessibilityRole` + `accessibilityState.selected`),
  botón de retry en `MessageBubble` (no tenía ni `accessibilityRole`),
  `ConversationListItem` (`accessibilityState.selected`). El resto
  (`IconButton`, `SidebarItem`, `DesktopSidebar`, header del chat) ya
  tenía label explícito o componía el nombre accesible de un `Text` hijo.
- [x] `guia-desktop.css` / `guia-mobile.css` eliminados de la raíz — ya no
  se necesitaban como referencia una vez extraídos los tokens a
  `tailwind.config.js`/`colors.css`.

### Pendiente en Fase 4

- [ ] Estados que el Figma no cubre explícitamente — revisar que
  pending/failed/offline/gift-pending ya tengan tratamiento visual
  consistente con el sistema de tokens (bubble con opacidad reducida +
  ícono de reloj para pending, borde rojo + texto de error para failed) —
  falta pasada de revisión visual una vez el bug de SQLite esté resuelto y
  se pueda ver la app corriendo.
- [x] "Reduced motion": `useReducedMotion` (`src/hooks/useReducedMotion.ts`,
  envuelve `AccessibilityInfo.isReduceMotionEnabled`/`reduceMotionChanged`)
  + `OfflineBanner` con fade-in de entrada (`Animated`, 200ms,
  `useNativeDriver: true`) que se salta cuando el sistema tiene reduced
  motion activado. Patrón queda listo para reusar en otras transiciones
  (gift modal, aparición de mensajes) si da tiempo — hoy solo aplicado al
  banner de offline.
- [ ] Revisión visual end-to-end del design kit (colores, tipografía,
  incluido el nuevo `.dark`) una vez la app corra en Simulator/web sin el
  bloqueo de SQLite — todo esto se hizo/verificó por typecheck, lint,
  tests y `expo export`, pero nunca se vio renderizado en pantalla.

## Fase 5 — Profiling con evidencia

- [ ] Correr la secuencia de scroll+tipeo de Fase 3 sobre los 50k mensajes
  (bloqueado por el punto pendiente de Fase 3: enganchar `perf-test` a la
  UI).
- [ ] Medir frame timing / dropped frames / memoria (Flipper, Perf Monitor
  de RN, o `react-native-performance`).
- [ ] Identificar un bottleneck concreto, mostrar antes/después.
- [ ] Ser honesto en el README si algo no se pudo medir y por qué.

## Fase 6 — Entregables

- [ ] Grabaciones de los escenarios obligatorios (Fase 1 y 2).
- [ ] `README.md`: bug encontrado, decisiones tomadas, tests, resultados
  de performance, limitaciones conocidas, tiempo invertido por fase.
- [ ] `AI.md`: qué se usó de asistencia de IA y cómo.
- [ ] Explicación escrita: resume de upload grande (background vs.
  force-quit).
- [ ] Reglas de App Store / Google Play sobre contenido de creadores y
  pagos, con links oficiales.
- [ ] Zip `Firstname_Lastname.zip` → enviar a `join@fansapi.com`.

## Work in progress (bugs / tareas a medias)

Nada abierto ahora mismo. Ver "Resueltos recientemente" en la Fase 1/0
para el historial del bug de SQLite en web.

### Resuelto: `expo-sqlite` en web — `SharedArrayBuffer` + `Sync operation timeout`

- **Síntoma**: al abrir la app en el navegador, `openDatabaseSync` en
  `src/lib/database.ts` fallaba primero con `SharedArrayBuffer is not
  defined`, y tras arreglar eso (headers COOP/COEP inyectados en
  `metro.config.js` parchando `http.Server.prototype.emit`, porque el
  middleware de manifest de Expo Router se antepone al
  `enhanceMiddleware` de Metro y nunca los recibía en `/`), pasó a fallar
  con `Sync operation timeout`.
- **Causa raíz**: el backend web de `expo-sqlite` (`wa-sqlite` sobre OPFS)
  implementa sus métodos "síncronos" con un busy-wait sobre `Atomics`
  esperando a un Web Worker (`invokeWorkerSync` en
  `expo-sqlite/web/WorkerChannel.ts`), con un límite fijo de iteraciones.
  El primer `openDatabaseSync` es lento de verdad (cargar el wasm +
  inicializar el worker + abrir el archivo OPFS) y se disparaba
  síncronamente y muy temprano (`initChatSchema()`/`initPurchasesSchema()`
  a nivel de módulo en `_layout.tsx`, antes de montar nada), sin margen
  para que el worker arrancara a tiempo.
- **Fix aplicado**: `src/app/_layout.tsx` ahora envuelve `<Stack>` en
  `<SQLiteProvider databaseName="myapp.db" onInit={async () => {
  initChatSchema(); initPurchasesSchema(); }}>`. `SQLiteProvider` abre su
  base con `openDatabaseAsync` internamente y no renderiza `children`
  hasta que resuelve — ese `await` le da tiempo al worker/wasm de
  terminar de inicializar antes de que corra cualquier llamada síncrona
  posterior (incluida la del singleton `getDatabase()` en
  `src/lib/database.ts`, que sigue igual). Confirmado que resuelve el
  error en el navegador.
- **Pendiente de limpieza, no bloqueante**: `SQLiteProvider` abre
  `"myapp.db"` (nombre de ejemplo de la doc de Expo) mientras
  `getDatabase()` sigue abriendo `"fan-chat.db"` — son dos archivos de
  DB distintos; `myapp.db` no se usa para nada más que forzar el
  warm-up async. Funciona así, pero conviene alinear el nombre (o
  documentar por qué son dos bases a propósito) antes de entregar.

## Reglas de identidad y git (siempre aplican)

- Nunca `Co-Authored-By` ni atribución de IA en commits/PRs.
- Commits/PRs bajo la identidad propia (`git config user.name/email`:
  Daniel Mejia / luisdanielmejia@outlook.com). Antes de `git push` o
  cualquier `gh` acción, verificar `gh auth status`; si la cuenta activa
  no es la del usuario, parar y pedir que la cambien.
- Mensajes de commit y PRs siempre en inglés, aunque el resto de la
  conversación esté en español.
- Estilo del repo (`AGENTS.md`): llaves multilínea siempre en
  `if`/`for`/`while`, nunca one-liners sin llaves (`curly: ["error", "all"]`
  en ESLint).
