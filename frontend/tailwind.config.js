/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0f2742",
        ocean: "#1d74d8",
        skysoft: "#e8f3ff"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 39, 66, 0.08)"
      }
    }
  },
  plugins: []
};
