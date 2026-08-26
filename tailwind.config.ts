import type { Config } from 'tailwindcss';


export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAFAFA',
          raised: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#17181A',
          soft: '#55585E',
          faint: '#8A8D93',
        },
        hairline: '#D8D6CF',
        mark: {
          DEFAULT: '#D2371F',
          hover: '#B22E19',
          tint: '#FBE7E2',
        },
        safelight: {
          DEFAULT: '#C4841F',
          tint: '#F7ECD8',
        },
        ok: {
          DEFAULT: '#2F6E4E',
          tint: '#E4F0E9',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,24,26,0.06), 0 1px 0 rgba(23,24,26,0.04)',
        lift: '0 8px 24px rgba(23,24,26,0.14)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
} satisfies Config;
