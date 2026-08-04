import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#c89b08",
          dark: "#a67d07",
        },
        ink: {
          DEFAULT: "#0a0a0a",
          soft: "#1a1a1a",
          card: "#141414",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Songti SC"', "SimSun", "serif"],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
