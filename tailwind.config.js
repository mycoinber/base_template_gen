/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./layers/ui/components/**/*.{js,vue,ts}",
    "./layers/ui/layouts/**/*.vue",
    "./layers/ui/pages/**/*.vue",
    "./layers/base/plugins/**/*.{js,ts}",
    "./layers/ui/app.vue",
    "./layers/ui/error.vue",
  ],
  theme: {
    extend: {
      colors: {
        'background-01': 'var(--background-01)',
        'background-02': 'var(--background-02)',
        'color-white': 'var(--color-white)',
        'color-black': 'var(--color-black)',
        'color-01': 'var(--color-01)',
        'color-02': 'var(--color-02)',
        'color-03': 'var(--color-03)',
        'border': 'var(--border)',
      },
      borderColor: {
        'border': 'var(--border)',
      },
      fontFamily: {
        'font-01': ['var(--font-01)', 'sans-serif'],
        'font-02': ['var(--font-02)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
