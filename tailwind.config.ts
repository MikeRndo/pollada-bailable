import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        noche: {
          950: '#07051a',
          900: '#0e0a26',
          800: '#171036',
          700: '#231a4f',
          600: '#33276e',
        },
        oro: { DEFAULT: '#ffd60a', 300: '#ffe566', 600: '#e0a800' },
        rojo: { DEFAULT: '#e11d2e', 700: '#b3121f' },
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        display: ['var(--font-luckiest)', 'Impact', 'sans-serif'],
        script: ['var(--font-pacifico)', 'cursive'],
        cond: ['var(--font-anton)', 'Impact', 'sans-serif'],
      },
      keyframes: {
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        subir: { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        pop: { '0%': { transform: 'scale(.85)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        barrido: { '0%,100%': { top: '8%' }, '50%': { top: '88%' } },
      },
      animation: {
        fade: 'fade .18s ease-out',
        subir: 'subir .26s cubic-bezier(.2,.8,.2,1)',
        pop: 'pop .22s cubic-bezier(.2,.8,.2,1)',
        barrido: 'barrido 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
