/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — violet/purple (distinct from Tailwind's default blue, conveys AI + creativity)
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065'
        },
        // Surface layers — structured neutral with deliberate luminance steps
        app: {
          bg: '#0b0b10',
          surface: '#15151d',
          elevated: '#1c1c28'
        },
        // Semantic colors
        success: {
          DEFAULT: '#4ade80',
          surface: 'rgba(34,197,94,0.08)',
          border: 'rgba(34,197,94,0.15)',
          text: '#4ade80'
        },
        warning: {
          DEFAULT: '#fbbf24',
          surface: 'rgba(245,158,11,0.08)',
          border: 'rgba(245,158,11,0.15)',
          text: '#fbbf24'
        },
        danger: {
          DEFAULT: '#f87171',
          surface: 'rgba(239,68,68,0.10)',
          border: 'rgba(239,68,68,0.18)',
          text: '#f87171'
        },
        info: {
          DEFAULT: '#60a5fa',
          surface: 'rgba(59,130,246,0.08)',
          border: 'rgba(59,130,246,0.15)',
          text: '#60a5fa'
        }
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139,92,246,0.12)'
      },
      animation: {
        'page-enter': 'page-enter 200ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out'
      },
      keyframes: {
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(8px)' },
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
