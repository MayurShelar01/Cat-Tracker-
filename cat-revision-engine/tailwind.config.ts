import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          hover: "var(--bg-hover)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        section: {
          quant: "var(--color-quant)",
          lrdi: "var(--color-lrdi)",
          varc: "var(--color-varc)",
        },
        round: {
          r1: "var(--color-r1)",
          r2: "var(--color-r2)",
          r3: "var(--color-r3)",
        },
        status: {
          done: "var(--color-solid)",
          okay: "var(--color-okay)",
          shaky: "var(--color-shaky)",
          overdue: "var(--color-overdue)",
          skipped: "var(--color-skipped)",
          deferred: "var(--color-deferred)",
        }
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        flash: {
          "0%, 100%": { borderColor: "transparent" },
          "50%": { borderColor: "var(--color-solid)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        flash: "flash 0.5s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
