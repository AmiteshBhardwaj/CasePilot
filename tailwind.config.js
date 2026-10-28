/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: 'var(--forest)', sage: 'var(--sage)', 'pale-sage': 'var(--pale-sage)', cream: 'var(--cream)',
        paper: 'var(--paper)', mustard: 'var(--mustard)', terracotta: 'var(--terracotta)', rust: 'var(--rust)',
        blush: 'var(--blush)', oxblood: 'var(--oxblood)', ink: 'var(--ink)',
      },
      fontFamily: { heading: ['Fraunces', 'serif'], sans: ['Hanken Grotesk', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      boxShadow: { warm: '0 8px 28px rgba(69, 53, 35, .08)', 'warm-sm': '0 2px 10px rgba(69, 53, 35, .06)' },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}
