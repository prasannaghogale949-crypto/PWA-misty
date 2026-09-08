/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#17140F",
          soft: "#211D16",
          line: "#332C21",
        },
        kraft: {
          DEFAULT: "#C9A876",
          dark: "#8A6F4C",
          light: "#E3CFA3",
        },
        forest: {
          DEFAULT: "#1E3B2C",
          deep: "#132A1F",
        },
        gold: {
          DEFAULT: "#C9A227",
          bright: "#E4C455",
          dim: "#8C7220",
        },
        parchment: "#EFE6D3",
        rust: "#8B4A2B",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        "kraft-fiber":
          "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.08) 0%, transparent 45%)",
        "gold-foil":
          "linear-gradient(135deg, #8C7220 0%, #E4C455 35%, #C9A227 55%, #E4C455 75%, #8C7220 100%)",
      },
      boxShadow: {
        stamp: "0 6px 0 rgba(0,0,0,0.35), 0 10px 18px rgba(0,0,0,0.35)",
        embossed:
          "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 4px rgba(0,0,0,0.35)",
      },
      animation: {
        unlock: "unlock 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scan-line": "scan-line 2.2s ease-in-out infinite",
      },
      keyframes: {
        unlock: {
          "0%": { transform: "scale(0.85) rotateY(90deg)", opacity: "0" },
          "60%": { transform: "scale(1.03) rotateY(0deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotateY(0deg)", opacity: "1" },
        },
        "scan-line": {
          "0%, 100%": { transform: "translateY(0%)" },
          "50%": { transform: "translateY(calc(100% - 2px))" },
        },
      },
    },
  },
  plugins: [],
};
