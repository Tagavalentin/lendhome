/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dfe9ff',
          500: '#3b5bdb',
          600: '#2f4ac7',
          700: '#2740a3',
        },
      },
    },
  },
  plugins: [],
};
