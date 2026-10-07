import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';
import { Layout } from './layout/layout';
import { Login } from './login/login';
import { Schedule } from './schedule/schedule';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'schedule', component: Schedule },
      { path: '', pathMatch: 'full', redirectTo: 'schedule' },
    ],
  },
  { path: '**', redirectTo: '' },
];
