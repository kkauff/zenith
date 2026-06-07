import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '560px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        rest: {
          DEFAULT: 'hsl(var(--rest))',
          foreground: 'hsl(var(--rest-foreground))',
        },
        surface2: 'hsl(var(--surface-2))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        brand: ['Comfortaa', 'sans-serif'],
        display: ['Knewave', 'cursive'],
      },
      boxShadow: {
        'glow-primary': '0 0 24px -4px hsl(var(--primary) / 0.55)',
        'glow-primary-sm': '0 0 12px -2px hsl(var(--primary) / 0.45)',
        'glow-accent': '0 0 24px -4px hsl(var(--accent) / 0.55)',
        'glow-accent-sm': '0 0 12px -2px hsl(var(--accent) / 0.45)',
        'glow-rest': '0 0 24px -4px hsl(var(--rest) / 0.55)',
        'glow-rest-sm': '0 0 12px -2px hsl(var(--rest) / 0.45)',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 18px -4px hsl(var(--primary) / 0.4)' },
          '50%': { boxShadow: '0 0 28px -2px hsl(var(--primary) / 0.7)' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
