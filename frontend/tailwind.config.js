/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        figma: {
          bg: '#F8FAFC',          // Light slate background
          surface: '#FFFFFF',     // Pure white surface
          card: '#FFFFFF',        // White cards
          cardHover: '#F1F5F9',   // Light gray hover
          border: '#E2E8F0',      // Crisp light-gray border
          borderLight: '#CBD5E1', // Intermediate border
          textPrimary: '#0F172A', // Dark charcoal text
          textSecondary: '#475569', // Slate-600 text
          textMuted: '#64748B',   // Slate-500 muted text
          accent: '#0284C7',      // Professional Industrial Cobalt/Teal Accent
          accentHover: '#0369A1',
          accentGlow: 'rgba(2, 132, 199, 0.15)',
          safe: '#059669',        // Occupational emerald
          safeGlow: 'rgba(5, 150, 105, 0.15)',
          warning: '#D97706',     // Amber Warning
          danger: '#DC2626',      // Alert Red
          dangerGlow: 'rgba(220, 38, 38, 0.15)',
        },
        industrial: {
          950: '#0F172A',
          900: '#1E293B',
          850: '#334155',
          800: '#475569',
          750: '#64748B',
          700: '#94A3B8',
          600: '#CBD5E1',
          500: '#E2E8F0',
          400: '#F1F5F9',
          300: '#F8FAFC',
          200: '#FFFFFF',
          100: '#FFFFFF',
        },
        safety: {
          safe: '#059669',
          safeGlow: 'rgba(5, 150, 105, 0.15)',
          caution: '#D97706',
          cautionGlow: 'rgba(217, 119, 6, 0.15)',
          warning: '#EA580C',
          warningGlow: 'rgba(234, 88, 12, 0.15)',
          critical: '#DC2626',
          criticalGlow: 'rgba(220, 38, 38, 0.15)',
          cyan: '#0284C7',
          cyanGlow: 'rgba(2, 132, 199, 0.15)',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'elevation': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
      },
      animation: {
        'scan-line': 'scan 2.5s ease-in-out infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
