import { ActionIcon, Button, createTheme, Pagination, rem, type MantineColorsTuple } from '@mantine/core';

/** Quantalog's blue ramp, so the two products share one accent. */
const brand: MantineColorsTuple = [
  '#eef3ff',
  '#dce6ff',
  '#b5c8ff',
  '#8fadff',
  '#5f8bff',
  '#4776ff',
  '#2f6bff',
  '#255fef',
  '#1f55d6',
  '#142c66',
];

/** Quantalog's neutral ramp; the dark-mode surfaces are remapped onto tokens.css. */
const dark: MantineColorsTuple = [
  '#d4d5da',
  '#b0b2ba',
  '#8a8c95',
  '#6b6d76',
  '#303137',
  '#222327',
  '#1c1d21',
  '#16171a',
  '#111214',
  '#0b0c0e',
];

const SOFT_HOVER = 'color-mix(in srgb, var(--text) 7%, var(--surface-2))';

const isBrand = (color?: string) => !color || color === 'brand';

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 6 },
  colors: { brand, dark },

  fontFamily: "'Google Sans Flex', ui-sans-serif, system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "ui-monospace, 'SF Mono', Menlo, monospace",

  headings: {
    fontFamily: "'Google Sans Flex', ui-sans-serif, system-ui, sans-serif",
    fontWeight: '650',
    sizes: {
      h1: { fontSize: rem(26), lineHeight: '1.2' },
      h2: { fontSize: rem(20), lineHeight: '1.25' },
      h3: { fontSize: rem(16), lineHeight: '1.35' },
    },
  },

  defaultRadius: 'md',
  radius: { xs: rem(4), sm: rem(6), md: rem(8), lg: rem(12), xl: rem(16) },
  cursorType: 'pointer',

  shadows: {
    md: 'var(--shadow)',
    lg: 'var(--shadow-lg)',
  },

  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Modal: {
      defaultProps: {
        radius: 'xl',
        overlayProps: { backgroundOpacity: 0.4, blur: 6 },
        transitionProps: { transition: 'pop', duration: 180 },
      },
    },
    Menu: {
      defaultProps: {
        radius: 'lg',
        shadow: 'lg',
        transitionProps: { transition: 'pop', duration: 140 },
      },
    },
    Popover: { defaultProps: { radius: 'lg', shadow: 'lg' } },
    Tooltip: { defaultProps: { radius: 'sm', openDelay: 300 } },
    TextInput: { defaultProps: { radius: 'md' } },
    Textarea: { defaultProps: { radius: 'md' } },
    PasswordInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },

    Button: Button.extend({
      defaultProps: { radius: 'md' },
      styles: { label: { fontWeight: 500, letterSpacing: '-0.005em' } },
      vars: (_theme, props) => {
        if (!isBrand(props.color)) return { root: {} };
        if (props.variant === undefined || props.variant === 'filled') {
          return {
            root: {
              '--button-bg': 'var(--cta)',
              '--button-hover': 'var(--cta-hover)',
              '--button-color': 'var(--cta-fg)',
              '--button-hover-color': 'var(--cta-fg)',
            },
          };
        }
        if (props.variant === 'light') {
          return {
            root: {
              '--button-bg': 'var(--surface-2)',
              '--button-hover': SOFT_HOVER,
              '--button-color': 'var(--text)',
              '--button-hover-color': 'var(--text)',
              '--button-bd': '1px solid var(--border)',
            },
          };
        }
        return { root: {} };
      },
    }),

    ActionIcon: ActionIcon.extend({
      vars: (_theme, props) => {
        if (!isBrand(props.color)) return { root: {} };
        if (props.variant === undefined || props.variant === 'filled') {
          return {
            root: {
              '--ai-bg': 'var(--cta)',
              '--ai-hover': 'var(--cta-hover)',
              '--ai-color': 'var(--cta-fg)',
              '--ai-hover-color': 'var(--cta-fg)',
            },
          };
        }
        if (props.variant === 'light') {
          return {
            root: {
              '--ai-bg': 'var(--surface-2)',
              '--ai-hover': SOFT_HOVER,
              '--ai-color': 'var(--text)',
              '--ai-hover-color': 'var(--text)',
              '--ai-bd': '1px solid var(--border)',
            },
          };
        }
        return { root: {} };
      },
    }),

    Pagination: Pagination.extend({
      vars: (_theme, props) =>
        isBrand(props.color)
          ? {
              root: {
                '--pagination-active-bg': 'var(--cta)',
                '--pagination-active-color': 'var(--cta-fg)',
              },
            }
          : { root: {} },
    }),
  },
});
