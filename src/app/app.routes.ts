import { Routes } from '@angular/router';
import { adminGuard, areaGuard, authGuard, guestGuard } from './auth/auth.guard';
import { desktop } from './core/device';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login), canActivate: [guestGuard] },
  {
    // The signed-in pages, in the device's own layout (desktop: the sidebar beside them; phones: a
    // top bar) — each device downloads only its own
    path: '',
    loadComponent: () =>
      desktop
        ? import('./layout/desktop-layout').then((m) => m.DesktopLayout)
        : import('./layout/mobile-layout').then((m) => m.MobileLayout),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./home/home').then((m) => m.Home) },
      {
        path: 'schedule',
        loadComponent: () => import('./schedule/schedule').then((m) => m.Schedule),
        canActivate: [areaGuard('schedule')],
      },
      { path: 'users', loadComponent: () => import('./users/users').then((m) => m.Users), canActivate: [adminGuard] },
    ],
  },
  { path: '**', redirectTo: '' },
];
