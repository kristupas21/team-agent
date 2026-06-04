import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#e7f0ee', 500: '#7faaa3', 700: '#5f8b85' },
        secondary: { 50: '#f6e6e2', 500: '#c89b94', 700: '#a37b75' },
        neutral: {
          50: '#f7f5f2',
          200: '#e7e3dc',
          500: '#857c70',
          700: '#5a5247',
          900: '#2f2a23',
        },
        danger: { 50: '#f5e1dc', 500: '#c97c6d', 700: '#a35a4c' },
        success: { 50: '#e7eee0', 500: '#8aa775', 700: '#688553' },
      },
      fontFamily: {
        sans: ['var(--font-copse)', 'ui-serif', 'Georgia', 'serif'],
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
