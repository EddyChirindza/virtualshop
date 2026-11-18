import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { PreferencesProvider } from './preferences';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PreferencesProvider>
  </StrictMode>
);