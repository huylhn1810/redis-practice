/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        canvas: "#131211",
        "surface-card": "#1c1b19",
        "surface-soft": "#242320",
        "surface-cream-strong": "#2e2c28",
        "surface-dark": "#0e0d0c",
        "surface-dark-elevated": "#1e1d1a",
        "surface-dark-soft": "#161513",
        primary: {
          DEFAULT: "#cc785c",
          active: "#a9583e",
          hover: "#db896e",
          disabled: "#36332f",
        },
        ink: "#faf9f5",
        body: {
          DEFAULT: "#d8d4cb",
          strong: "#faf9f5",
        },
        muted: {
          DEFAULT: "#969288",
          soft: "#66635c",
        },
        hairline: {
          DEFAULT: "#2d2a26",
          soft: "#22201d",
        },
        "on-dark": {
          DEFAULT: "#faf9f5",
          soft: "#969288",
        },
        accent: {
          teal: "#5db8a6",
          amber: "#e8a55a",
        },
        success: "#5db872",
        warning: "#d4a017",
        error: "#e05353",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Garamond", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
}
