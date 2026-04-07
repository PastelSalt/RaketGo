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
          blue: "#A8C9DE",
          "blue-strong": "#86B1CA",
          red: "#DFA8B8",
          "red-strong": "#C98EA0",
          ink: "#395C74",
          "ink-soft": "#55748A"
        }
      }
    }
  },
  plugins: []
};

