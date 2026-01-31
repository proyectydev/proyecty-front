/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores Premium de Proyecty - Elegante e Inversionista
        primary: {
          50: '#fdfcf9',
          100: '#fbf7ed',
          200: '#f5ebcd',
          300: '#ecd9a3',
          400: '#dfc26e',
          500: '#C9A227', // Dorado Proyecty - Color principal
          600: '#b08d1f',
          700: '#8a6f18',
          800: '#6b5613',
          900: '#4a3c0d',
          950: '#2d240a',
        },
        accent: {
          50: '#fefefe',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#e5e5e5',
          400: '#a3a3a3',
          500: '#737373', // Gris elegante
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Colores adicionales para estados y acciones
        gold: {
          light: '#D4AF37',
          DEFAULT: '#C9A227',
          dark: '#B8860B',
        },
        dark: {
          50: '#f7f7f7',
          100: '#e3e3e3',
          200: '#c8c8c8',
          300: '#a4a4a4',
          400: '#818181',
          500: '#666666',
          600: '#515151',
          700: '#434343',
          800: '#383838',
          900: '#1f1f1f',
          950: '#141414',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 4px 14px 0 rgba(201, 162, 39, 0.25)',
        'gold-lg': '0 10px 40px 0 rgba(201, 162, 39, 0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
