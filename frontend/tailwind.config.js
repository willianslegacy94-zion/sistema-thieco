/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Extraídas da placa da Barbearia Thieco Leandro
        onix: {
          DEFAULT: '#0F0E0A',
          50:  '#2A2820',
          100: '#1E1C16',
          200: '#161410',
          300: '#0F0E0A',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light:   '#F0E6C8',
          dark:    '#C9A227',
          muted:   '#9C7B1E',
          shine:   '#F5D76E',
        },
        surface: {
          DEFAULT: '#161410',
          card:    '#1C1A14',
          hover:   '#242018',
          border:  '#2E2A1E',
        },
      },
      fontFamily: {
        serif:  ['"Playfair Display"', 'Georgia', 'serif'],
        sans:   ['"Inter"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A227 0%, #F5D76E 50%, #C9A227 100%)',
        'onix-gradient': 'linear-gradient(180deg, #161410 0%, #0F0E0A 100%)',
        'card-gradient': 'linear-gradient(135deg, #1C1A14 0%, #141210 100%)',
      },
      boxShadow: {
        'gold-sm':  '0 0 8px rgba(212, 175, 55, 0.25)',
        'gold':     '0 0 20px rgba(212, 175, 55, 0.35)',
        'gold-lg':  '0 0 40px rgba(212, 175, 55, 0.4)',
        'inset-gold': 'inset 0 1px 0 rgba(212, 175, 55, 0.2)',
        'card':     '0 4px 24px rgba(0,0,0,0.6)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(212,175,55,0.2)' },
          '50%':      { boxShadow: '0 0 24px rgba(212,175,55,0.5)' },
        },
      },
    },
  },
  plugins: [],
};
