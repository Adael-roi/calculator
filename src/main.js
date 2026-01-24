import { initUI } from './ui.js';

// Create worker and pass messaging handle to UI
const worker = new Worker('/src/worker/calculatorWorker.js', { type: 'module' });

window.addEventListener('load', async () => {
  // Mount UI
  initUI(worker);

  // Register service worker for PWA/offline support
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service worker registered');
    } catch (err) {
      console.warn('SW registration failed', err);
    }
  }
});
