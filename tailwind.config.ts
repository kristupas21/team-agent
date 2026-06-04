import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#e3eaea', 500: '#3c7e7e', 700: '#2c5f5f' },
        secondary: { 50: '#f9e2d3', 500: '#d97e4b', 700: '#a85d33' },
        neutral: {
          50: '#f5efe1',
          100: '#fbf7eb',
          200: '#e6dcc6',
          500: '#8a7d63',
          700: '#4a4030',
          900: '#2a2418',
        },
        danger: { 50: '#f3dcce', 500: '#b8543b', 700: '#8a3e2a' },
        success: { 50: '#e4e6cc', 500: '#8a8a3e', 700: '#666627' },
      },
      fontFamily: {
        sans: ['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-oleo)', 'cursive'],
      },
      fontSize: {
        xs: ['1.2rem', { lineHeight: '1.6rem' }],
        sm: ['1.4rem', { lineHeight: '2.0rem' }],
        base: ['1.6rem', { lineHeight: '2.4rem' }],
        lg: ['1.8rem', { lineHeight: '2.8rem' }],
        xl: ['2.0rem', { lineHeight: '2.8rem' }],
        '2xl': ['2.4rem', { lineHeight: '3.2rem' }],
        '3xl': ['3.0rem', { lineHeight: '3.6rem' }],
        '4xl': ['3.6rem', { lineHeight: '4.0rem' }],
      },
      spacing: {
        0: '0',
        1: '0.4rem',
        2: '0.8rem',
        3: '1.2rem',
        4: '1.6rem',
        5: '2.0rem',
        6: '2.4rem',
        8: '3.2rem',
        10: '4.0rem',
        12: '4.8rem',
        16: '6.4rem',
        20: '8.0rem',
        24: '9.6rem',
      },
    },
  },
  plugins: [],
}

export default config
