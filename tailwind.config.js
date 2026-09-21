/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
          950: "rgb(var(--color-primary-950) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-primary-500) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",
        },
        ring: "rgb(var(--color-ring) / <alpha-value>)",
        background: {
          DEFAULT: "rgb(var(--color-background) / <alpha-value>)",
          foreground: "rgb(var(--color-background-foreground) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          foreground: "rgb(var(--color-surface-foreground) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)",
          "muted-foreground": "rgb(var(--color-surface-muted-foreground) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          light: "rgb(var(--color-border-light) / <alpha-value>)",
        },
        "foreground-primary": "rgb(var(--color-foreground-primary) / <alpha-value>)",
        "foreground-secondary": "rgb(var(--color-foreground-secondary) / <alpha-value>)",
        "foreground-muted": "rgb(var(--color-foreground-muted) / <alpha-value>)",
        "foreground-zinc": "rgb(var(--color-foreground-zinc) / <alpha-value>)",
        "foreground-ink": "rgb(var(--color-foreground-ink) / <alpha-value>)",
        "foreground-date": "rgb(var(--color-foreground-date) / <alpha-value>)",
        online: "rgb(var(--color-online) / <alpha-value>)",
        offline: "rgb(var(--color-offline) / <alpha-value>)",
        away: "rgb(var(--color-away) / <alpha-value>)",
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          foreground: "rgb(var(--color-error-foreground) / <alpha-value>)",
        },
        highlight: {
          DEFAULT: "rgb(var(--color-highlight) / <alpha-value>)",
          foreground: "rgb(var(--color-highlight-foreground) / <alpha-value>)",
        },
        bubble: {
          received: "rgb(var(--color-bubble-received) / <alpha-value>)",
          "received-foreground": "rgb(var(--color-bubble-received-foreground) / <alpha-value>)",
        },
      },
      fontFamily: {
        // React Native can't fake a font-weight on a custom font the way a
        // browser can — each weight is its own loaded font file, referenced
        // by its exact name (loaded via useFonts in src/app/_layout.tsx).
        // Pair a weight class with a text-* size below, e.g.
        // `text-h4 font-sans-medium`, never rely on font-medium/font-semibold
        // alone to pick the right Geist weight. A single string, not an
        // array — NativeWind only reads the first entry of a fontFamily
        // array on native, so a fallback list here would be dead weight.
        sans: "Geist_400Regular",
        "sans-medium": "Geist_500Medium",
        "sans-semibold": "Geist_600SemiBold",
      },
      fontSize: {
        // Type scale — named by role, not raw size, so a component reads
        // `text-h4`/`text-body`/`text-caption` instead of guessing a
        // px value. h4/body/caption values are the exact sizes already
        // confirmed from the Figma guides; h1–h3/h5 extend the same scale
        // for screens the Figma doesn't cover yet (settings, onboarding, …).
        // Always pair with a font-sans*/font-sans-medium/font-sans-semibold
        // weight class — see the fontFamily comment above.
        h1: ["24px", { lineHeight: "32px" }],
        h2: ["20px", { lineHeight: "28px" }],
        h3: ["18px", { lineHeight: "24px" }],
        h4: ["16px", { lineHeight: "24px" }], // matches the existing text-base usage (desktop "Chats" header, modal titles)
        h5: ["14px", { lineHeight: "20px" }], // matches the existing text-sm font-semibold usage (participant name)
        body: ["14px", { lineHeight: "20px" }], // matches the existing text-sm usage (message text, most UI copy)
        caption: ["12px", { lineHeight: "16px" }], // matches the existing text-xs usage (timestamps, metadata)
      },
      boxShadow: {
        xs: "0px 1px 2px rgba(0, 0, 0, 0.05)",
        "inset-xs": "inset 0px -2px 4px rgba(0, 0, 0, 0.1)",
        "inset-primary": "inset 0px -2px 4px #8258DE",
      },
      borderRadius: {
        bubble: "16px",
        nav: "28px",
      },
    },
  },
  plugins: [],
};
