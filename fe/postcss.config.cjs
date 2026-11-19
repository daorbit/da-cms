module.exports = {
  plugins: {
    // Tailwind first, so its output goes through the Mantine plugins like any
    // other stylesheet. Only theme + utilities are imported (see tailwind.css):
    // Tailwind's reset would restyle every Mantine component.
    '@tailwindcss/postcss': {},
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
