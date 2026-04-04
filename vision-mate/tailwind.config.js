/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'eyefi-bg': '#000000',
        'eyefi-primary': '#FFD700',
        'eyefi-secondary': '#FFFFFF',
        'eyefi-alert': '#FF4444',
      },
      fontFamily: {
        sans: ['Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
}