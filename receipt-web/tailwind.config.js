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
        bg: '#0e0e0c',
        'bg-2': '#161614',
        'bg-3': '#1e1e1b',
        text: '#f0f0e8',
        sub: '#999992',
        muted: '#666660',
        accent: '#e8c547',
        line: '#2c2c28',
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
