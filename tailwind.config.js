module.exports = {
  content: ['./src/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Requires Google Fonts import in CSS
      },
      colors: {
        gray: {
          900: '#0f172a', // Slate 900 base
          950: '#020617', // Deep background
        },
        // Semantic Theme Colors
        main: 'var(--bg-main)',
        'text-main': 'var(--text-main)',
        'border-main': 'var(--border-main)',
        'card-main': 'var(--card-main)',

        violet: {
          500: '#8b5cf6',
          500: '#8b5cf6',
        },
        cyan: {
          500: '#06b6d4',
        },
        rose: {
          500: '#f43f5e',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    }
  },
  plugins: []
};
