/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          strong: 'var(--accent-strong)',
          dim: 'var(--accent-dim)',
        },
        navy: {
          DEFAULT: 'var(--navy)',
          soft: 'var(--navy-soft)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          dim: 'var(--gold-dim)',
        },
        green: {
          DEFAULT: 'var(--green)',
          dim: 'var(--green-dim)',
        },
        red: {
          DEFAULT: 'var(--red)',
          dim: 'var(--red-dim)',
        },
        orange: {
          DEFAULT: 'var(--orange)',
          dim: 'var(--orange-dim)',
        },
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        }
      },
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        brand: ['var(--font-brand)', 'serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
      },
      boxShadow: {
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      }
    },
  },
  plugins: [],
}
