/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        serif: ['Tangerine', 'cursive'],
      },
      colors: {
        'brand-primary': '#1a237e', // Indigo 900
        'brand-secondary': '#ffc107', // Amber 500
        'brand-light': '#e8eaf6', // Indigo 50
        'brand-dark': '#0d113d',
        'brand-purple': '#7B61FF',
        'light-purple': '#F4F2FF',
        'background': '#F7F8FC',
        'dark-text': '#1F2937',
        'light-text': '#6B7280',
      }
    }
  },
  plugins: []
}