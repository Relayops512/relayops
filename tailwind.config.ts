import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#f4efe6",
          soft: "#faf6ef",
        },
        ink: {
          DEFAULT: "#1f1a16",
          muted: "#6f675e",
          faint: "#9a9288",
        },
        line: "#e6ddd0",
        teal: {
          DEFAULT: "#01696f",
          dark: "#01545a",
          soft: "#e4f3f3",
          mist: "#f0f8f8",
        },
        peach: {
          DEFAULT: "#f4d7c4",
          text: "#8a4b22",
        },
        sage: {
          DEFAULT: "#dcecd8",
          text: "#2f6a38",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(31, 26, 22, 0.04), 0 8px 24px rgba(31, 26, 22, 0.04)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist)",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
