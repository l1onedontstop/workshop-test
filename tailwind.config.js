/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand: Forge Cognac (warm amber, evokes forge fire) ──
        brand: {
          50: '#FDF6F1',
          100: '#FBEBDE',
          200: '#F5D3B8',
          300: '#ECB090',
          400: '#E0885E',
          500: '#D06838',
          600: '#B8522C',
          700: '#9A3F22',
          800: '#7C311B',
          900: '#5E2414',
          950: '#34120A'
        },

        // ── Surface layers (paper metaphor: tabletop → notebook → page → fresh sheet → spotlight) ──
        app: {
          bg: '#F7F4ED',        // page background (cream paper)
          surface: '#FCFAF5',    // card background (fresh sheet)
          elevated: '#FFFFFF',    // dialog/modal (pure white)
          sidebar: '#EFEBE0',    // sidebar (leather cover)
          titlebar: '#EBE6DA'    // titlebar (top edge of portfolio)
        },

        // ── Text hierarchy (warm browns, like ink on paper) ──
        ink: {
          primary: '#342B20',    // headings, body — ~13:1 on app-bg
          secondary: '#6B5F50',  // descriptions, labels — ~5.5:1
          tertiary: '#9B8E7E',   // captions, helpers — ~3.2:1
          disabled: '#C4B8A8',   // disabled, placeholders
          inverse: '#FCFAF5'      // on dark brand backgrounds
        },

        // ── Border tokens (warm pencil-line greys, opaque not transparent) ──
        rule: {
          subtle: '#EBE5DA',     // list dividers, internal separators
          DEFAULT: '#D9D1C5',    // card/input borders
          strong: '#C4BBAF'      // elevated/active borders
        },

        // ── Semantic colors (warm-shifted for palette harmony) ──
        success: {
          DEFAULT: '#5B8C58',
          surface: '#EDF5EC',
          border: '#C5DFC2',
          text: '#4A7A47'
        },
        warning: {
          DEFAULT: '#C89628',
          surface: '#FDF5E8',
          border: '#F0D8A0',
          text: '#8B6918'
        },
        danger: {
          DEFAULT: '#D45A4E',
          surface: '#FDF2F0',
          border: '#F0C4BE',
          text: '#B8453A'
        },
        info: {
          DEFAULT: '#5B8A9F',
          surface: '#F2F6F8',
          border: '#C4D8E0',
          text: '#4A7288'
        }
      },

      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace']
      },

      boxShadow: {
        // Warm-brown shadows — uses text-primary (#342B20) not pure black
        'xs': '0 1px 2px rgba(52,43,32,0.04)',
        'sm': '0 1px 3px rgba(52,43,32,0.06), 0 0 0 1px rgba(52,43,32,0.03)',
        'md': '0 4px 16px rgba(52,43,32,0.08), 0 0 0 1px rgba(52,43,32,0.04)',
        'lg': '0 8px 32px rgba(52,43,32,0.12), 0 0 0 1px rgba(52,43,32,0.05)',
        // Brand glow (cognac amber)
        'glow': '0 0 24px rgba(208,104,56,0.18)',
        'glow-lg': '0 0 40px rgba(208,104,56,0.22)'
      },

      animation: {
        'page-enter': 'page-enter 250ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out'
      },

      transitionDuration: {
        '250': '250ms'
      },

      keyframes: {
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
