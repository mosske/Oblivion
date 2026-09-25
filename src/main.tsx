import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AudioPlayerProvider } from './context/AudioPlayerContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AudioPlayerProvider>
        <App />
      </AudioPlayerProvider>
    </ErrorBoundary>
  </StrictMode>,
);

