/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Bambu Studio Color System
        bambu: {
          // Background Colors
          bg: {
            primary: '#0f0f0f',
            secondary: '#1a1a1a',
            tertiary: '#1f1f1f',
            hover: '#252525',
          },
          // Surface Colors
          surface: {
            DEFAULT: '#1f1f1f',
            elevated: '#2a2a2a',
            hover: '#2f2f2f',
            active: '#353535',
          },
          // Border Colors
          border: {
            subtle: '#1a1a1a',
            DEFAULT: '#2a2a2a',
            medium: '#3a3a3a',
            strong: '#4a4a4a',
            accent: '#5a5a5a',
          },
          // Text Colors
          text: {
            primary: '#ffffff',
            secondary: '#e5e7eb',
            tertiary: '#9ca3af',
            disabled: '#6b7280',
            muted: '#4b5563',
          },
          // Status Colors
          status: {
            active: '#26A057', // Bambu Green - Primary brand color
            success: '#26A057', // Bambu Green for success states
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
          },
          // Interactive Colors (Bambu Green - Primary Brand Color)
          interactive: {
            DEFAULT: '#26A057', // Bambu Green
            hover: '#208C4A',
            active: '#1A783D',
            disabled: '#3a3a3a',
            focus: '#26A057',
          },
          // Bambu Green (alias for interactive)
          green: {
            DEFAULT: '#26A057',
            hover: '#208C4A',
            active: '#1A783D',
          },
          // Filament Colors (from AMS)
          filament: {
            yellow: '#FFF144',
            gray: '#898989',
            orange: '#FF6A13',
            red: '#F72323',
          },
        },
      },
      borderRadius: {
        'bambu-sm': '4px',
        'bambu': '6px',
        'bambu-md': '8px',
        'bambu-lg': '12px',
      },
      boxShadow: {
        'bambu': '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        'bambu-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      },
      spacing: {
        'bambu-xs': '4px',
        'bambu-sm': '8px',
        'bambu-md': '12px',
        'bambu': '16px',
        'bambu-lg': '24px',
        'bambu-xl': '32px',
        'bambu-2xl': '48px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
