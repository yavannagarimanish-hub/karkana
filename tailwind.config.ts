import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "#000000",
        white: "#FFFFFF",
        kred: {
          DEFAULT: "#FF0033",
          hover: "#E5002D",
          dim: "#3A000A",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        widest: ".25em",
        ultra: ".35em",
      },
      boxShadow: {
        subtle: "0 0 0 1px rgba(255, 255, 255, 0.1)",
        redglow: "0 0 30px rgba(255, 0, 51, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
