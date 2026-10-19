/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FCFBF9',
          100: '#FAF8F5',
          200: '#F4F1EA',
          300: '#EAE5D9',
        },
        ink: {
          900: '#1C1917',
          800: '#292524',
          700: '#44403C',
          500: '#78716C',
          400: '#A8A29E',
        },
        terracotta: {
          50: '#FDF6F2',
          100: '#FBECE5',
          200: '#F7D9CB',
          500: '#C25E38',
          600: '#A94E2B',
          700: '#8E3F20',
        },
        sage: {
          50: '#F2F7F4',
          100: '#E4EFE9',
          200: '#C8DFC2',
          500: '#4D7C5F',
          600: '#3D654C',
          700: '#2E4E3A',
        }
      }
    },
  },
  plugins: [],
}

