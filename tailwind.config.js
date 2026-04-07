/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#D7EBFA",
          "blue-strong": "#B5D8F2",
          red: "#F6CDD8",
          "red-strong": "#ECAEC0",
          ink: "#4E7A9A",
          "ink-soft": "#6D98B5"
        }
      }
    }
  },
  plugins: []
};

