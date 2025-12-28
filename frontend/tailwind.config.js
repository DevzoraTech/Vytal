/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        mint: {
          DEFAULT: '#10B981',
          hover: '#059669',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        status: {
          success: '#16A34A',
          warning: '#F59E0B',
          critical: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.08)',
        subtle: '0 1px 2px rgba(15, 23, 42, 0.05)',
      },
      borderRadius: {
        card: '8px',
      },
      maxWidth: {
        'screen-2xl': '90rem',
      },
    },
  },
  plugins: [],
}
