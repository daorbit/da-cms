import { Button, CopyButton } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

interface Props {
  value: string;
  label?: string;
}

/** A compact "Copy URL" button that confirms once the value is on the clipboard. */
export function CopyUrlButton({ value, label = 'Copy URL' }: Props) {
  return (
    <CopyButton value={value}>
      {({ copied, copy }) => (
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          onClick={copy}
        >
          {copied ? 'Copied' : label}
        </Button>
      )}
    </CopyButton>
  );
}
