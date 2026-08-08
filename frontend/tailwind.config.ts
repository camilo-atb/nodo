import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Nodo design system (from steering/ui-design-system.md)
        nodo: {
          cyan: '#12c7e5',
          green: '#21d69a',
        },
        // Legacy (used by existing components — migrate gradually)
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
          DEFAULT: '#12c7e5',
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
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
