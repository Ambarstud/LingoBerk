import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: { light: '#FAFAF8', dark: '#1A1A1A' },
        surface: { light: '#FFFFFF', dark: '#242424' },
        accent: '#2563EB',
        success: '#16A34A',
        error: '#DC2626',
        warning: '#D97706',
      },
      maxWidth: { app: '480px' },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
