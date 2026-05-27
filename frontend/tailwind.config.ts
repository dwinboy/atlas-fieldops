import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  safelist: [
    "bg-primary",
    "bg-primary/10",
    "bg-panel",
    "bg-panel/95",
    "bg-muted",
    "text-primary",
    "text-primary-foreground",
    "text-foreground",
    "text-muted-foreground",
    "text-success",
    "text-warning",
    "text-danger",
    "border-primary",
    "border-primary/25",
    "border-border",
    "border-danger",
    "border-danger/25",
    "border-success/25",
    "border-warning/25",
    "bg-success/10",
    "bg-warning/10",
    "bg-danger",
    "bg-danger/10",
    "hover:bg-primary/92",
    "hover:bg-muted",
    "hover:bg-muted/60",
    "hover:bg-danger/90",
    "hover:text-foreground",
    "focus-visible:ring-ring/35"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        panel: {
          DEFAULT: "hsl(var(--panel))",
          foreground: "hsl(var(--panel-foreground))"
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))"
      },
      boxShadow: {
        line: "inset 0 0 0 1px hsl(var(--border))",
        elevated: "0 18px 50px -30px rgba(15, 23, 42, 0.35)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"]
      },
      transitionTimingFunction: {
        product: "cubic-bezier(0.2, 0.8, 0.2, 1)"
      }
    }
  },
  plugins: []
};

export default config;
