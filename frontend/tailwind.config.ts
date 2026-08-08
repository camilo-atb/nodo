import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07080d',
        panel: {
          DEFAULT: '#0d0f17',
          2: '#111420',
          3: '#151925',
        },
        border: 'rgba(255, 255, 255, 0.085)',
        muted: {
          DEFAULT: '#9299ad',
          2: '#656c7e',
        },
        accent: {
          DEFAULT: '#06b6d4',
          2: '#0891b2',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          2: '#6d5dfc',
        },
        cyan: '#22d3ee',
        green: '#34d399',
        amber: '#fbbf24',
        red: '#fb7185',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
