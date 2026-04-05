/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'gsrp': {
          'orange': '#F97316',
          'orange-light': '#FB923C',
          'gold': '#FBBF24',
          'teal': '#0D9488',
          'teal-light': '#14B8A6',
          'cyan': '#06B6D4',
          'sky': '#0891B2',
          'dark': '#0A0E1A',
          'dark-card': '#0F1629',
          'dark-surface': '#151D35',
          'dark-border': '#1E2A4A',
          'warm': '#F59E0B',
          'sunset': '#EF4444',
          'forest': '#1B4332',
          'earth': '#78350F',
        },
      },
      fontFamily: {
        'syne': ['Syne', 'sans-serif'],
        'dm': ['DM Sans', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'fredoka': ['Fredoka', 'sans-serif'],
        'nunito': ['Nunito', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-down': 'fadeDown 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(249, 115, 22, 0.3), 0 0 20px rgba(249, 115, 22, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'sunset-gradient': 'linear-gradient(135deg, #F97316 0%, #EF4444 50%, #8B5CF6 100%)',
        'warm-gradient': 'linear-gradient(135deg, #FBBF24 0%, #F97316 50%, #EF4444 100%)',
        'teal-gradient': 'linear-gradient(135deg, #0D9488 0%, #06B6D4 100%)',
        'ocean-gradient': 'linear-gradient(180deg, #0A0E1A 0%, #0F1629 50%, #151D35 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(15, 22, 41, 0.8) 0%, rgba(21, 29, 53, 0.6) 100%)',
      },
    },
  },
  plugins: [],
}
