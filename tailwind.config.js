/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        semiblack: "#1B1B1B",
        ymblue: "#B6CFF8",
        almostblack: "#0E0909",
      },
      fontFamily: {
        jura: ['Jura'],
        'jura-bold': ['JuraBold'],
        helvetica: ['Helvetica'],
        'helvetica-bold': ['HelveticaBold']
      },
      width: {
        "9/10" : "90%",
        "19/20" : "95%"
      }
    },
  },
  plugins: [],
}
