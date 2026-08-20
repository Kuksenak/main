import { Routes } from '@angular/router';
import { Home } from './home/home';
import { adminGuard } from './admin/admin.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'events', loadComponent: () => import('./events/events').then((m) => m.Events) },
  { path: 'telegram', loadComponent: () => import('./telegram/telegram').then((m) => m.Telegram) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin').then((m) => m.Admin),
  },
  { path: '**', redirectTo: '' },
];
