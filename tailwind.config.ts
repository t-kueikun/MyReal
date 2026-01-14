import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101114',
        paper: '#f6f4f0',
        mist: '#e9e4dc',
        accent: '#5a9bd8',
        coral: '#f08f6f'
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'ui-sans-serif', 'system-ui'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 10px 30px rgba(16, 17, 20, 0.12)',
        lift: '0 8px 16px rgba(16, 17, 20, 0.16)'
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },

        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        floatIn: 'floatIn 0.6s ease-out',
        flexIn: 'floatIn 0.3s ease-out',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        scaleUp: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }
    }
  },
  plugins: []
};

export default config;
