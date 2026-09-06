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
          bg: '#0B0F17',
          surface: '#111622',
          card: '#161E2E',
          cardHover: '#1D273B',
          border: '#243047',
          borderLight: '#324260',
          textPrimary: '#F8FAFC',
          textSecondary: '#94A3B8',
          textMuted: '#64748B',
          accent: '#F59E0B',      // Primary Golden/Amber
          accentHover: '#D97706',
          accentGlow: 'rgba(245, 158, 11, 0.25)',
          safe: '#10B981',        // Emerald Green
          safeGlow: 'rgba(16, 185, 129, 0.25)',
          warning: '#F59E0B',     // Amber Warning
          danger: '#EF4444',      // Red Alert
          dangerGlow: 'rgba(239, 68, 68, 0.25)',
        },
        industrial: {
          950: '#070A10',
          900: '#0B0F17',
          850: '#111622',
          800: '#161E2E',
          750: '#1D273B',
          700: '#243047',
          600: '#324260',
          500: '#475E88',
          400: '#7288B0',
          300: '#A4B6D4',
          200: '#CBD7EC',
          100: '#E8EFFB',
        },
        safety: {
          safe: '#10B981',
          safeGlow: '#059669',
          caution: '#F59E0B',
          cautionGlow: '#D97706',
          warning: '#F97316',
          warningGlow: '#EA580C',
          critical: '#EF4444',
          criticalGlow: '#DC2626',
          cyan: '#0EA5E9',
          cyanGlow: '#0284C7',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(14, 165, 233, 0.35)',
      },
      animation: {
        'scan-line': 'scan 2.5s ease-in-out infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
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
