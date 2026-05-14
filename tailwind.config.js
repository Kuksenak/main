/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'Helvetica Neue', 'system-ui', 'sans-serif'],
      },
      colors: {
        'apple-red': '#fa233b',
        'apple-red-hover': '#e01e34',
      },
      borderRadius: {
        'apple': '12px',
      }
    },
  },
  plugins: [],
}