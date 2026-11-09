import { Button, CopyButton, Modal } from '@mantine/core';
import { IconArrowUpRight, IconCheck, IconCopy, IconLock, IconX } from '@tabler/icons-react';
import { BrandMark } from '@/components/BrandMark';
import { ClaudeIcon } from '@/components/ClaudeIcon';
import { CopyUrlButton } from '@/components/CopyUrlButton';
import { absoluteApiBase } from '@/modules/content/pageService';
import classes from './ConnectClaudeModal.module.css';

interface Props {
  opened: boolean;
  onClose: () => void;
}

const CLAUDE_CONNECTORS_URL = 'https://claude.ai/settings/connectors';

const STEPS = [
  {
    title: 'Add a custom connector',
    text: 'In claude.ai, open Settings → Connectors → Add custom connector.',
  },
  {
    title: 'Paste the connector URL',
    text: 'Name it da-cms and paste the URL above.',
  },
  {
    title: 'Sign in and allow',
    text: 'Claude opens da-cms. Sign in if asked, then choose Allow.',
  },
];

const EXAMPLE_PROMPTS = [
  'Write a blog post on remote team rituals, with a hero image and full SEO.',
  'Draft a 1,200-word guide to choosing a CRM and save it as a draft.',
  'Rewrite the SEO title and description of my latest post.',
];

/**
 * How to add da-cms to claude.ai as a remote MCP connector. The URL is the same
 * for everyone; who Claude acts as is decided by the OAuth sign-in it starts.
 */
export function ConnectClaudeModal({ opened, onClose }: Props) {
  const connectorUrl = `${absoluteApiBase().replace(/\/$/, '')}/mcp`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={520}
      radius="lg"
      padding={0}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.5, blur: 8 }}
      transitionProps={{ transition: 'pop', duration: 180 }}
      classNames={{ content: classes.content, body: classes.body }}
      aria-labelledby="connect-claude-title"
    >
      <button type="button" className={classes.close} aria-label="Close" onClick={onClose}>
        <IconX size={15} stroke={2} />
      </button>

      <header className={classes.hero}>
        <div className={classes.marks} aria-hidden="true">
          <span className={classes.mark}>
            <BrandMark size={22} />
          </span>
          <span className={classes.bridge}>
            <span className={classes.pulse} />
          </span>
          <span className={`${classes.mark} ${classes.markClaude}`}>
            <ClaudeIcon size={26} />
          </span>
        </div>
        <h2 id="connect-claude-title" className={classes.title}>
          Connect Claude
        </h2>
        <p className={classes.subtitle}>
          Ask Claude for a post and it writes the content, creates the images and fills in the SEO,
          right in this workspace.
        </p>
      </header>

      <div className={classes.scroll}>
        <section className={classes.section}>
          <span className={classes.label}>Connector URL</span>
          <div className={classes.urlField}>
            <code className={classes.url}>{connectorUrl}</code>
            <CopyUrlButton value={connectorUrl} label="Copy" />
          </div>
        </section>

        <section className={classes.section}>
          <span className={classes.label}>Set it up</span>
          <ol className={classes.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={classes.step}>
                <span className={classes.stepNumber}>{index + 1}</span>
                <div>
                  <p className={classes.stepTitle}>{step.title}</p>
                  <p className={classes.stepText}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={classes.section}>
          <span className={classes.label}>Then try asking</span>
          <div className={classes.prompts}>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <CopyButton key={prompt} value={prompt}>
                {({ copied, copy }) => (
                  <button
                    type="button"
                    className={classes.prompt}
                    data-copied={copied || undefined}
                    onClick={copy}
                  >
                    <span className={classes.promptText}>{prompt}</span>
                    <span className={classes.promptIcon}>
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </span>
                  </button>
                )}
              </CopyButton>
            ))}
          </div>
        </section>
      </div>

      <footer className={classes.footer}>
        <p className={classes.note}>
          <IconLock size={14} stroke={1.8} />
          Claude acts as you. Posts stay drafts until you publish.
        </p>
        <div className={classes.actions}>
          <Button variant="default" radius="md" onClick={onClose}>
            Done
          </Button>
          <Button
            component="a"
            href={CLAUDE_CONNECTORS_URL}
            target="_blank"
            rel="noopener noreferrer"
            radius="md"
            rightSection={<IconArrowUpRight size={15} />}
          >
            Open claude.ai
          </Button>
        </div>
      </footer>
    </Modal>
  );
}
