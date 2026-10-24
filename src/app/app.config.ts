import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthStore } from './auth/auth.store';
import { desktop } from './core/device';
import { loadingInterceptor } from './core/services/loading';
import { routeWay, Slide } from './core/services/slide';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // (phones: a page opened slides in from the right, back to one from the left — Slide's CSS)
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          if (desktop) return transition.skipTransition();
          Slide.mark(routeWay(from, to), 'route');
          transition.finished.finally(() => Slide.mark(null));
        },
      }),
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor])),
    provideAppInitializer(() => firstValueFrom(inject(AuthStore).initAuth())),
  ],
};
