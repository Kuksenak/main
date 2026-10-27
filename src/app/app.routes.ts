import { Routes } from '@angular/router';
import { adminGuard, areaGuard, authGuard, guestGuard } from './auth/auth.guard';
import { lastSectionGuard } from './auth/last-section';
import { desktop } from './core/device';

export const routes: Routes = [
  // A published page, for anyone with its link (no sign-in)
  { path: 's/:token', loadComponent: () => import('./library/shared-page').then((m) => m.SharedPageView) },
  // A page as it'd be read (published or not): its own, signed in
  { path: 'preview/:id', loadComponent: () => import('./library/shared-page').then((m) => m.SharedPageView), canActivate: [authGuard] },
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
      // (at the app's start: the section used last instead, if there's one — LastSection)
      { path: '', pathMatch: 'full', loadComponent: () => import('./home/home').then((m) => m.Home), canActivate: [lastSectionGuard] },
      {
        path: 'schedule',
        loadComponent: () => import('./schedule/schedule').then((m) => m.Schedule),
        canActivate: [areaGuard('schedule')],
      },
      {
        path: 'library',
        loadComponent: () => import('./library/library').then((m) => m.Library),
        canActivate: [areaGuard('library')],
      },
      {
        path: 'library/:id',
        loadComponent: () => import('./library/page').then((m) => m.PageView),
        canActivate: [areaGuard('library')],
      },
      {
        path: 'favorites',
        loadComponent: () => import('./favorites/favorites').then((m) => m.Favorites),
        canActivate: [areaGuard('library')],
      },
      {
        path: 'trash',
        loadComponent: () => import('./library/trash').then((m) => m.Trash),
        canActivate: [areaGuard('library')],
      },
      { path: 'users', loadComponent: () => import('./users/users').then((m) => m.Users), canActivate: [adminGuard] },
    ],
  },
  { path: '**', redirectTo: '' },
];
