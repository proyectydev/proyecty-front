/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores de Proyecty
        primary: {
          50: '#e6f7fc',
          100: '#cceff9',
          200: '#99dff3',
          300: '#66cfed',
          400: '#33bfe7',
          500: '#26bdef', // Color principal de Proyecty
          600: '#1e97bf',
          700: '#17718f',
          800: '#0f4b60',
          900: '#082630',
        },
        accent: {
          50: '#fff8e6',
          100: '#fff1cc',
          200: '#ffe399',
          300: '#ffd566',
          400: '#ffc733',
          500: '#ffab00', // Color de acento de Proyecty
          600: '#cc8900',
          700: '#996700',
          800: '#664400',
          900: '#332200',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
