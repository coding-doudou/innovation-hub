/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Aptos",
          "Avenir Next",
          "Segoe UI Variable",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#EEF6FF",
          100: "#D9EBFF",
          200: "#B6D6FF",
          300: "#84B8FF",
          400: "#4D93F0",
          500: "#1E6FD0",
          600: "#0B5FB0",
          700: "#084B8F",
          800: "#093C70",
          900: "#0A2F57",
          950: "#061D38",
        },
        ink: {
          DEFAULT: "#0B1F3A",
          soft: "#334155",
          muted: "#64748B",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -20px rgb(15 23 42 / 0.28)",
        "card-hover":
          "0 18px 38px -18px rgb(11 95 176 / 0.22), 0 6px 14px -8px rgb(15 23 42 / 0.10)",
        soft: "0 2px 10px rgb(15 23 42 / 0.05)",
        "brand-sm": "0 2px 8px -1px rgb(11 95 176 / 0.35)",
        "brand-md": "0 8px 20px -6px rgb(11 95 176 / 0.45)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #1E6FD0 0%, #0B5FB0 55%, #084B8F 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #0A2F57 0%, #061D38 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease both",
      },
    },
  },
  plugins: [],
};
