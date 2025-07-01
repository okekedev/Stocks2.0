/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,jsx}"
  ],
  theme: {
    extend: {
      // 70s Sandbox Color Palette
      colors: {
        sand: {
          light: '#f5e6d3',
          medium: '#e8d5c4', 
          dark: '#d4c4b0',
        },
        brown: {
          light: '#c8a882',
          medium: '#a0845c',
          dark: '#8b6914',
        },
        orange: {
          warm: '#d2691e',
          bright: '#ff7f00',
        },
        cream: '#faf7f2',
        sepia: '#704214',
        'retro-green': '#228b22',
        glass: {
          warm: 'rgba(245, 230, 211, 0.15)',
          'border-warm': 'rgba(200, 168, 130, 0.2)',
        }
      },

      // Enhanced Animations (keeping the good ones + adding retro)
      animation: {
        'gradient': 'gradient 6s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'geometric-flow': 'geometricFlow 15s ease-in-out infinite',
        'floating-dots': 'floatingDots 20s linear infinite',
        'retro-pulse': 'retroPulse 3s infinite',
        'warm-glow': 'warmGlow 4s ease-in-out infinite',
      },

      // Enhanced Keyframes
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(210, 105, 30, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(210, 105, 30, 0.6)' },
        },
        slideInLeft: {
          'from': {
            opacity: '0',
            transform: 'translateX(-20px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        slideInRight: {
          'from': {
            opacity: '0',
            transform: 'translateX(30px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        geometricFlow: {
          '0%, 100%': { transform: 'translateX(0) translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateX(-20px) translateY(-20px) rotate(90deg)' },
          '50%': { transform: 'translateX(20px) translateY(-10px) rotate(180deg)' },
          '75%': { transform: 'translateX(-10px) translateY(20px) rotate(270deg)' }
        },
        floatingDots: {
          '0%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-20px) translateX(10px)' },
          '100%': { transform: 'translateY(0px) translateX(0px)' }
        },
        retroPulse: {
          '0%, 100%': { 
            opacity: '1', 
            transform: 'scale(1)',
            boxShadow: '0 0 15px currentColor'
          },
          '50%': { 
            opacity: '0.7', 
            transform: 'scale(1.2)',
            boxShadow: '0 0 25px currentColor'
          }
        },
        warmGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(210, 105, 30, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(210, 105, 30, 0.6), 0 0 40px rgba(255, 127, 0, 0.3)' }
        }
      },

      // Custom Fonts
      fontFamily: {
        'mono': ['Courier New', 'Monaco', 'Consolas', 'monospace'],
        'display': ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        'retro': ['Orbitron', 'system-ui', 'sans-serif'],
      },

      // Enhanced Shadows (70s theme)
      boxShadow: {
        'warm': '0 0 20px rgba(210, 105, 30, 0.3)',
        'retro': '0 4px 15px rgba(210, 105, 30, 0.3), inset 0 1px 0 rgba(245, 230, 211, 0.2)',
        'glass-warm': '0 8px 32px rgba(139, 105, 20, 0.1), inset 0 1px 0 rgba(245, 230, 211, 0.3)',
        'terminal-retro': '0 8px 32px rgba(139, 105, 20, 0.3), inset 0 2px 0 rgba(245, 230, 211, 0.1)',
      },

      // Custom Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Custom Border Radius
      borderRadius: {
        'retro': '0.5rem',
        'xl-retro': '1rem',
        '2xl-retro': '1.5rem',
      },

      // Background Images (70s theme)
      backgroundImage: {
        'warm-gradient': 'linear-gradient(135deg, #f5e6d3, #c8a882)',
        'retro-gradient': 'linear-gradient(135deg, #d2691e, #ff7f00)',
        'glass-warm': 'linear-gradient(135deg, rgba(245, 230, 211, 0.6) 0%, rgba(200, 168, 130, 0.4) 100%)',
        'terminal-retro': 'linear-gradient(135deg, #8b6914 0%, #704214 100%)',
        'sand-pattern': 'radial-gradient(2px 2px at 20px 30px, rgba(210, 105, 30, 0.3), transparent)',
      },

      // Custom Backdrop Blur
      backdropBlur: {
        'warm': '20px',
        'retro': '16px',
      },

      // Custom Z-Index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // Custom Filters
      dropShadow: {
        'warm': '0 0 10px rgba(210, 105, 30, 0.4)',
        'retro': '0 0 15px rgba(255, 127, 0, 0.5)',
      },

      // Custom Transformations
      scale: {
        '102': '1.02',
        '103': '1.03',
      },

      // Custom Transitions
      transitionDuration: {
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
      },

      // Custom Easing
      transitionTimingFunction: {
        'retro': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-soft': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [
    // Add custom utilities (70s theme)
    function({ addUtilities }) {
      const newUtilities = {
        '.text-warm-glow': {
          textShadow: '0 0 10px rgba(210, 105, 30, 0.4)',
        },
        '.text-retro-glow': {
          textShadow: '0 0 5px currentColor, 0 0 10px currentColor',
        },
        '.warm-glow': {
          boxShadow: '0 0 20px rgba(210, 105, 30, 0.3)',
        },
        '.glass-morphism-warm': {
          background: 'rgba(245, 230, 211, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(200, 168, 130, 0.2)',
        },
        '.retro-lift': {
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        },
        '.retro-lift:hover': {
          transform: 'translateY(-3px) rotate(1deg)',
          boxShadow: '0 8px 25px rgba(210, 105, 30, 0.2)',
        },
        '.sand-dots': {
          backgroundImage: 'radial-gradient(2px 2px at 20px 30px, rgba(210, 105, 30, 0.3), transparent), radial-gradient(2px 2px at 40px 70px, rgba(139, 105, 20, 0.2), transparent)',
          backgroundSize: '150px 100px',
          backgroundRepeat: 'repeat',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}