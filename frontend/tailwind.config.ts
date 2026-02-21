import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-emerald-600/90",
    "bg-yellow-500/70",
    "bg-rose-600/70",
    "bg-slate-600/50",
    "text-emerald-600/90",
    "text-yellow-500/70",
    "text-rose-600/70",
    "text-slate-600/50",
    "stroke-green-600/50",
    "stroke-red-600/50",
    "stroke-blue-600/50",
    "stroke-purple-600/50",
    "stroke-yellow-400/50",
    "stroke-orange-500/50",
    "stroke-zinc-600/50",
    "stroke-lime-500/50",
    "stroke-pink-500/50",
    "bg-green-600/50",
    "bg-red-600/50",
    "bg-blue-600/50",
    "bg-purple-600/50",
    "bg-yellow-400/50",
    "bg-orange-500/50",
    "bg-zinc-600/50",
    "bg-lime-500/50",
    "bg-pink-500/50",
  ],
  theme: {
    extend: {
      colors: {
        code: "oklch(0.2491 0.0335 264.3)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          light: "var(--secondary-light)",
          dark: "var(--secondary-dark)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          dark: "var(--accent-dark)",
        },
        neutral: {
          DEFAULT: "var(--neutral)",
          light: "var(--neutral-light)",
          dark: "var(--neutral-dark)",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
