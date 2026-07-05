import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/_layouts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#38bdf8',
          hover: '#0ea5e9',
        },
        'accent-red': '#f43f5e',
        'accent-green': '#10b981',
        'accent-yellow': '#f59e0b',
        'accent-purple': '#a855f7',
        'bg-dark': '#07090e',
        'bg-panel': 'rgba(15, 23, 42, 0.4)',
        'bg-card': 'rgba(30, 41, 59, 0.2)',
        'border-color': 'rgba(255, 255, 255, 0.08)',
        'border-hover': 'rgba(255, 255, 255, 0.16)',
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
