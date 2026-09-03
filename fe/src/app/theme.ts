import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * The brand ramp.
 *
 * Shades 5-6 are the ones that end up on filled buttons and the active nav
 * pill, so they are a genuinely bright blue rather than the desaturated navy
 * a naively-walked ramp produces — on a near-black sidebar that navy read as
 * grey rather than as a selection.
 */
const brand: MantineColorsTuple = [
  '#e7f0ff',
  '#cfdeff',
  '#9ebbff',
  '#6a95ff',
  '#4175fe',
  '#2b62fe',
  '#1d58fe',
  '#1148e4',
  '#043fcc',
  '#0036b4',
];

/**
 * The neutral ramp, overridden because Mantine's default `dark` is a blue-grey
 * that never gets darker than #1a1b1e — which is what made the app read as
 * charcoal rather than black.
 *
 * Indices matter: 7 is the app background, 6 the borders, 5 the dimmed text.
 * These are near-neutral with a trace of warmth so large fills don't look
 * digital-blue.
 */
const dark: MantineColorsTuple = [
  '#c9c9c9',
  '#b8b8b8',
  '#828282',
  '#696969',
  '#424242',
  '#3b3b3b',
  '#2a2a2b',
  '#161617',
  '#0e0e0f',
  '#080809',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  colors: { brand, dark },

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
