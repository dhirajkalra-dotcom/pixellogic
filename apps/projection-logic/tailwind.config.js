/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './templates/**/*.html'
  ],
  theme: {
    extend: {}
  },
  safelist: [
    // Colors toggled via JS
    'bg-teal-600','bg-pink-600','bg-yellow-600','bg-orange-600','bg-red-600','bg-indigo-600','bg-emerald-600','bg-green-600','bg-amber-600','bg-sky-600','bg-violet-600',
    // Utility combos used in JS
    'ring-2','ring-emerald-500','border-emerald-500'
  ],
};/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './templates/**/*.html'
  ],
  theme: {
    extend: {}
  },
  safelist: [
    // Colors toggled via JS
    'bg-teal-600','bg-pink-600','bg-yellow-600','bg-orange-600','bg-red-600','bg-indigo-600','bg-emerald-600','bg-green-600','bg-amber-600','bg-sky-600','bg-violet-600',
    // Utility combos used in JS
    'ring-2','ring-emerald-500','border-emerald-500'
  ],
};