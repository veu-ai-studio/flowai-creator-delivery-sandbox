/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1f2937',
        accent: '#10b981',
        background: '#f8fafc',
        foreground: '#111827',
      },
    },
  },
  plugins: [],
};
