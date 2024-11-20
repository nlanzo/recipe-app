/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FFC567", // Primary color
        secondary: "#046E1B", // Secondary color
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"], // Use Roboto for sans-serif
      },
    },
  },
  plugins: [],
}
