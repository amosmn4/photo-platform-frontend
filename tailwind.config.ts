import type { Config } from 'tailwindcss';

/**
 * Design language: a photo lab's light table, not a generic SaaS dashboard.
 *   - `paper`   the cool-white surface of a lightbox/light table
 *   - `ink`     near-black text, like grease pencil on a contact sheet
 *   - `mark`    the red grease-pencil mark a photographer circles a keeper
 *               frame with — used for primary actions and selection
 *   - `safelight` a warm amber, used sparingly for in-progress/processing
 *               states (echoing a darkroom safelight)
 * Frame numbers, EXIF, timestamps and QR/token values are always set in the
 * monospace `mono` face — like the numbers printed along a film strip's
 * sprocket edge — so metadata is visually distinct from editorial content.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#EEEDE8',
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
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
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
