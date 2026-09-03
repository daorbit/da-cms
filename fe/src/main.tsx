import React from 'react';
import ReactDOM from 'react-dom/client';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { App } from '@/app/App';
import { theme } from '@/app/theme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@/styles/global.css';
import '@/styles/auth.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Writes the stored scheme onto <html> before first paint, so a dark-mode
        user never sees a white flash on load. */}
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>
);
