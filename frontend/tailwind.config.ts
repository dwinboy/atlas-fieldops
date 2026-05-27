import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        field: "#0f766e",
        signal: "#b91c1c"
      }
    }
  },
  plugins: []
};

export default config;

