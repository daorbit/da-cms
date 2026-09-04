import React from 'react';
import ReactDOM from 'react-dom/client';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { CodeHighlightAdapterProvider, createHighlightJsAdapter } from '@mantine/code-highlight';
import hljs from 'highlight.js/lib/core';
import tsLang from 'highlight.js/lib/languages/typescript';
import jsLang from 'highlight.js/lib/languages/javascript';
import bashLang from 'highlight.js/lib/languages/bash';
import { App } from '@/app/App';
import { theme } from '@/app/theme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';

hljs.registerLanguage('typescript', tsLang);
hljs.registerLanguage('javascript', jsLang);
hljs.registerLanguage('bash', bashLang);
// tsx/ts/js all resolve to a registered grammar above.
hljs.registerAliases(['tsx', 'ts'], { languageName: 'typescript' });
hljs.registerAliases(['jsx'], { languageName: 'javascript' });

const codeHighlightAdapter = createHighlightJsAdapter(hljs);
import '@/styles/global.css';
import '@/styles/auth.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Writes the stored scheme onto <html> before first paint, so a dark-mode
        user never sees a white flash on load. */}
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <CodeHighlightAdapterProvider adapter={codeHighlightAdapter}>
        <Notifications position="top-right" />
        <App />
      </CodeHighlightAdapterProvider>
    </MantineProvider>
  </React.StrictMode>
);
