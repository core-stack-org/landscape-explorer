/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      },
      fontSize: {
        'heading': ['32px', '40px'],
        'subheading': ['15px', '24px'],
        'body': ['14px', '22px'],
      },
      colors: {
        primary: {
          DEFAULT: '#8B5CF6',
          light: '#EDE9FE',
          hover: '#7C3AED',
        },
      },
    },
  },
  plugins: [],
}