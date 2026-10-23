import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login), canActivate: [guestGuard] },
  {
    // The signed-in pages, in the layout (desktop: the sidebar beside them)
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [{ path: '', pathMatch: 'full', loadComponent: () => import('./home/home').then((m) => m.Home) }],
  },
  { path: '**', redirectTo: '' },
];
