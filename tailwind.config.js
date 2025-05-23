/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        orthoticaPink: "#F27497",
        orthoticaGray: "#5B6670",
        orthoticaBlack: "#000000",
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
