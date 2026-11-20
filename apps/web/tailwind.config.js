/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charte LENDHOME (maquette TAGA Campus) : teal profond monochrome
        brand: {
          50: '#eef6f6',
          100: '#d8eded',
          200: '#b0d9d9',
          300: '#7fbfbf',
          400: '#4d9a9d',
          500: '#12777b',
          600: '#0c6b6f',
          700: '#095a5d',
          800: '#07474a',
          900: '#05383a',
        },
        canvas: '#f6f6f4',
        line: '#e8eceb',
        surface: '#ffffff',
        accent: {
          50: '#fdf3ec',
          100: '#fbe8d9',
          500: '#e8a06b',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};
