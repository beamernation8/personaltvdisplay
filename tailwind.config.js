/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ]
      },
      colors: {
        glass: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)'
        }
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        glass:
          '0 10px 40px -10px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.08)'
      },
      backdropBlur: {
        xs: '2px'
      },
      keyframes: {
        meshShift: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(-2%, 1%) scale(1.05)' }
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        tickerSlide: {
          '0%, 28%': { transform: 'translateY(0)', opacity: 1 },
          '33%, 61%': { transform: 'translateY(-100%)', opacity: 1 },
          '66%, 94%': { transform: 'translateY(-200%)', opacity: 1 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        }
      },
      animation: {
        mesh: 'meshShift 18s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out both'
      }
    }
  },
  plugins: []
}
