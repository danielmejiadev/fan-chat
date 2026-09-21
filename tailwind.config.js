/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#EEEEEE",
        panel: "#FFFFFF",
        "text-primary": "#18181B",
        "text-secondary": "#71717A",
        border: {
          DEFAULT: "#E4E4E7",
          light: "#E5E5E5",
        },
        accent: {
          DEFAULT: "#5863DE",
          focus: "#8258DE",
          subtle: "rgba(88, 99, 222, 0.05)",
        },
        highlight: "#EAEBFB",
        online: "#16A34A",
        offline: "#A1A1AA",
        error: "#DC2626",
      },
    },
  },
  plugins: [],
};
