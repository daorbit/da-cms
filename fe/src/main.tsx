import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { App } from '@/app/App';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
// The editor's styles must come after Mantine's core, or the toolbar controls
// lose their borders.
import '@mantine/tiptap/styles.css';
import '@/styles/global.css';
import '@/styles/auth.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>
);
