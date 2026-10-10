/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kmutnb: {
          orange: '#e4572e',
          red: '#c0392b',
        }
      }
    },
  },
  plugins: [],
}
