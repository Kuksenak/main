import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthStore } from './auth/auth.store';
import { loadingInterceptor } from './core/services/loading';
import { I18nService } from './core/i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // (no zone.js: the screen is redrawn by the signals, the template's events, the router)
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor])),
    provideAppInitializer(() => firstValueFrom(inject(AuthStore).initAuth())),
    // (the chosen language's words in before the first screen)
    provideAppInitializer(() => inject(I18nService).load()),
  ],
};
