import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * The brand ramp. Mantine needs all ten shades; these are a single blue hue
 * walked from near-white to near-black rather than ten hand-picked colours, so
 * the light and dark schemes stay in step with each other.
 */
const brand: MantineColorsTuple = [
  '#eef3ff',
  '#dce4f5',
  '#b9c7e2',
  '#94a8d0',
  '#748dc1',
  '#5f7cb8',
  '#5474b4',
  '#44639f',
  '#3a578f',
  '#2c4b80',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: { brand },

  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',

  headings: {
    // The serif that carries the auth screens, brought into the app so the two
    // read as one product rather than a landing page bolted to a dashboard.
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontWeight: '400',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.25' },
      h2: { fontSize: '1.6rem', lineHeight: '1.3' },
      h3: { fontSize: '1.3rem', lineHeight: '1.35' },
      // Small headings are labels, not display type — they stay in the UI face,
      // set by `.mantine-Title-root` overrides in global.css.
      h4: { fontSize: '1.05rem', lineHeight: '1.4' },
      h5: { fontSize: '0.95rem', lineHeight: '1.45' },
      h6: { fontSize: '0.85rem', lineHeight: '1.5' },
    },
  },

  defaultRadius: 'md',
  radius: { md: '10px', lg: '14px' },

  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg' } },
    Button: { defaultProps: { radius: 'md' } },
    TextInput: { defaultProps: { radius: 'md' } },
    Textarea: { defaultProps: { radius: 'md' } },
    PasswordInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
  },
});
