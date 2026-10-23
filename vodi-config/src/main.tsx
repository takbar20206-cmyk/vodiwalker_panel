import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'vazirmatn/Vazirmatn-Variable-font-face.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', window.location.href).href;
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* offline support is a bonus, never block the app */
    });
  });
}
