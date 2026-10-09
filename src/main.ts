import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Chrome / Edge / Android offer installing once, early — keep it for the Install page.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as Window & { installPrompt?: Event }).installPrompt = e;
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));