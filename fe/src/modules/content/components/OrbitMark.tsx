import { useComputedColorScheme } from '@mantine/core';

 
export function OrbitMark({ size = 20 }: { size?: number }) {

  const scheme = useComputedColorScheme('light', { getInitialValueInEffect: false });

  return (
    <img
      src={`${import.meta.env.BASE_URL}${scheme === 'dark' ? 'da-ai-dark-mode.png' : 'da-ai-light-mode.png'}`}
      alt=""
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
