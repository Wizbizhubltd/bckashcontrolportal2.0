export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // DEFAULT kept identical to BCKashWebClient's brand green so bg-primary/text-primary
        // etc. read exactly the same — the numbered shades are additive, for the extra tonal
        // depth an enterprise console needs (sidebar gradients, hover/active surfaces) that a
        // single flat color can't give without washing everything out to the same green.
        primary: {
          DEFAULT: '#1A5745',
          50: '#eaf4f0',
          100: '#cfe6dc',
          200: '#a3d0bf',
          300: '#72b79f',
          400: '#479c81',
          500: '#237e63',
          600: '#1A5745',
          700: '#144435',
          800: '#0f342a',
          900: '#0a251e',
          950: '#06170f',
        },
        accent: '#ff5722',
      },
      fontFamily: {
        heading: ['Poppins'],
        body: ['"DM Sans"']
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        elevated: '0 4px 12px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.06)',
      },
    }
  }
}
