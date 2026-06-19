/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Canvas
        background: '#151312',
        surface: '#151312',
        'surface-container-low': '#1d1b1a',
        'surface-container': '#221f1e',
        'surface-container-high': '#2c2928',
        'surface-container-highest': '#373433',
        'surface-bright': '#3c3837',
        // Text
        'on-surface': '#e8e1df',
        'on-surface-variant': '#d0c6ae',
        // Brand
        primary: '#fff2d6',
        'primary-container': '#fcd34d',
        'on-primary-container': '#715b00',
        // Success
        secondary: '#68dba9',
        'secondary-container': '#25a475',
        'on-secondary-container': '#00311f',
        // Error
        'on-tertiary': '#68001a',
        'on-tertiary-container': '#bc0036',
        'tertiary-container': '#ffcacc',
        // Border
        outline: '#99907b',
        'outline-variant': '#4d4635',
      },
      maxWidth: {
        challenge: '420px',
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      spacing: {
        base: '4px',
        md: '20px',
        'container-padding': '24px',
        gutter: '16px',
        xl: '48px',
        lg: '32px',
        xs: '8px',
        sm: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        'headline-md': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'display-word': ['Inter', 'sans-serif'],
        'display-sentence': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'display-word': [
          '48px',
          { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' },
        ],
        'display-sentence': [
          '24px',
          { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '500' },
        ],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'label-sm': ['13px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};