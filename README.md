# fan-chat

## Requirements

- Node.js
- pnpm
- Xcode (for the iOS simulator) or Android Studio (for the Android emulator)

## Install

```bash
pnpm install
```

## Run the project

```bash
pnpm start
```

This opens the Metro bundler with Expo Dev Tools. From there you can pick a platform, or run directly:

```bash
pnpm ios      # opens the iOS simulator (requires Xcode installed)
pnpm android  # opens the Android emulator (requires Android Studio installed)
pnpm web      # opens in the browser
```

### iOS simulator, step by step

1. Install Xcode from the App Store (it includes the iOS simulator).
2. Open Xcode once and accept the license / install any "Additional Components" it asks for.
3. Run `pnpm ios` — Expo builds the app and opens the simulator automatically.

If the simulator doesn't open on its own, launch it manually from `Xcode > Open Developer Tool > Simulator`, then run `pnpm ios` with the simulator already open.

### Physical device (Expo Go)

1. Install the **Expo Go** app from the App Store or Play Store.
2. Run `pnpm start`.
3. Scan the QR code shown in the terminal/Dev Tools with your camera (iOS) or from the Expo Go app (Android).

## Other commands

```bash
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
```
