import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// --- SERVICE WORKER AUTO-UPDATE LOGIC ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Looks for your registered service worker file
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Force check Render for newer code updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60 * 1000);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Instantly swap to the new version and reload the page
                console.log('New build detected from Render. Reloading PWA...');
                installingWorker.postMessage({ action: 'skipWaiting' });
                window.location.reload();
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}