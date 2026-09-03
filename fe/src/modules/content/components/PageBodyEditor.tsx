import { Textarea } from '@mantine/core';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Plain-text body field. The rich editor (TipTap) was removed; this is a
 * deliberate placeholder that keeps the same `value` / `onChange` HTML
 * string contract every caller and the preview already expect, so nothing
 * downstream had to change. A real editor replaces this later.
 */
export function PageBodyEditor({ value, onChange, placeholder = 'Start writing…' }: Props) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      autosize
      minRows={20}
      styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 14 } }}
    />
  );
}
