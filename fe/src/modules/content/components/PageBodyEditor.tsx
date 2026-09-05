import { useEffect, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { DaEditor, type DaEditorHandle } from 'da-text-editor';
import 'da-text-editor/styles.css';
import classes from './PageBodyEditor.module.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Rich body field backed by `da-text-editor`. It keeps the same
 * `value` / `onChange` HTML string contract every caller and the preview
 * already expect, so nothing downstream changes.
 */
export function PageBodyEditor({ value, onChange, placeholder = 'Start writing…' }: Props) {
  const ref = useRef<DaEditorHandle>(null);
  const lastHtml = useRef(value);
  const { colorScheme } = useMantineColorScheme();

  // The editor owns its document, so only push in changes that did not
  // originate here (page load, discard, switching pages).
  useEffect(() => {
    if (value === lastHtml.current) return;
    lastHtml.current = value;
    ref.current?.setHTML(value);
  }, [value]);

  return (
    <DaEditor
      ref={ref}
      className={classes.editor}
      defaultHtml={value}
      theme={colorScheme === 'auto' ? 'system' : colorScheme}
      placeholder={placeholder}
      onChange={() => {
        const html = ref.current?.getHTML() ?? '';
        lastHtml.current = html;
        onChange(html);
      }}
    />
  );
}
