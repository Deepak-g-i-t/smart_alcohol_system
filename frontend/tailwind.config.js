/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        dark: {
          50: '#f0f1f5',
          100: '#d1d5e0',
          200: '#a3aac1',
          300: '#757fa2',
          400: '#4a5578',
          500: '#2d3555',
          600: '#1e2440',
          700: '#161b33',
          800: '#0f1226',
          900: '#0a0d1a',
          950: '#060810',
        },
        accent: {
          cyan: '#00e5ff',
          blue: '#2979ff',
          purple: '#7c4dff',
          pink: '#ff4081',
          green: '#00e676',
          amber: '#ffab00',
          red: '#ff1744',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-size': '40px 40px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.15)',
        'glow-blue': '0 0 20px rgba(41, 121, 255, 0.15)',
        'glow-purple': '0 0 20px rgba(124, 77, 255, 0.15)',
        'glow-green': '0 0 20px rgba(0, 230, 118, 0.15)',
        'glow-red': '0 0 20px rgba(255, 23, 68, 0.15)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 229, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
