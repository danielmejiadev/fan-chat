/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
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
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        "text-zinc": "rgb(var(--color-text-zinc) / <alpha-value>)",
        "text-ink": "rgb(var(--color-text-ink) / <alpha-value>)",
        "text-date": "rgb(var(--color-text-date) / <alpha-value>)",
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
        // Geist isn't actually loaded yet (no expo-font/useFonts call) — this
        // falls back to the system stack until that's wired up.
        sans: [
          "Geist",
          "-apple-system",
          "System",
          "Roboto",
          "sans-serif",
        ],
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
