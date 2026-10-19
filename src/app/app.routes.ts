import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login), canActivate: [guestGuard] },
  { path: '', loadComponent: () => import('./home/home').then((m) => m.Home), canActivate: [authGuard], pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
