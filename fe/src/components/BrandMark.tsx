interface Props {
  size?: number;
}

/** The da-cms glyph: three ruled lines, a page of text at a glance. */
export function BrandMark({ size = 18 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}
