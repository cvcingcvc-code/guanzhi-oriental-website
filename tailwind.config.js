/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        'paper-deep': '#F5F2EC',
        ink: '#2A2A28',
        'ink-light': '#8B867C',
        'ink-muted': '#9E9A90',
        celadon: '#A4B5A4',
        cinnabar: '#B54A3F',
        border: '#C5C0B6',
        'border-light': 'rgba(197,192,182,0.3)',
      },
      fontFamily: {
        serif: ["'Noto Serif SC'", "'Source Han Serif SC'", "'SimSun'", 'serif'],
        sans: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "'PingFang SC'", "'Hiragino Sans GB'", 'sans-serif'],
        english: ["'Cormorant Garamond'", "'Playfair Display'", 'serif'],
      },
      maxWidth: {
        'content': '1100px',
      },
      backgroundImage: {
        'radial-hero': 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(247,245,240,0.3) 100%)',
      },
    },
  },
  plugins: [],
};
