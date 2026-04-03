/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'red-light': '#ff6666',
        'blue-light': '#6666ff',
        'red-soft': '#ff8888',
        'blue-soft': '#8888ff',
        'bg-dark': '#0a0a0f',
        'bg-card': 'rgba(20, 20, 40, 0.95)',
        'text-primary': '#e0e0e0',
        'text-secondary': '#888888',
        'text-muted': '#555555',
        'success': '#99ff99',
        'error': '#ff6666',
        'warning': '#ffcc66',
        'info': '#66ccff',
      },
      backgroundImage: {
        'gradient-red': 'linear-gradient(135deg, #ff6666, #ff8888)',
        'gradient-blue': 'linear-gradient(135deg, #6666ff, #8888ff)',
        'gradient-main': 'linear-gradient(135deg, #ff6666, #6666ff)',
        'gradient-bg': 'linear-gradient(135deg, #1a0a0a 0%, #0a0a1a 100%)',
      },
      animation: {
        'pulse': 'pulse 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};