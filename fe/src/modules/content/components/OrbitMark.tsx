import { useComputedColorScheme } from '@mantine/core';

/**
 * The Orbit AI mark.
 *
 * Two files rather than one, because the artwork is not transparent — each is
 * drawn on its own ground, and using the dark one on a light panel would put a
 * black square in the corner of the page. `useComputedColorScheme` resolves
 * "auto" to whichever the user is actually seeing, which is the thing that has
 * to match.
 *
 * Rounded and clipped here rather than in the files: the square edge is what
 * makes a raster logo look pasted on, and the radius has to follow the size it
 * is rendered at.
 *
 * The same artwork as the analytics app, so the assistant is recognisably one
 * thing across both products.
 */
export function OrbitMark({ size = 20 }: { size?: number }) {
  // `getInitialValueInEffect: false` — the default defers to an effect, which
  // flashes the light mark on a dark page for a frame on first paint.
  const scheme = useComputedColorScheme('light', { getInitialValueInEffect: false });

  return (
    <img
      src={scheme === 'dark' ? '/da-ai-dark-mode.png' : '/da-ai-light-mode.png'}
      alt=""
      // Decorative everywhere it is used — each place already has a text label
      // or an aria-label, and "Orbit AI Orbit AI" is what a screen reader would
      // otherwise read out.
      aria-hidden="true"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        display: 'block',
        flexShrink: 0,
        objectFit: 'cover',
      }}
    />
  );
}
