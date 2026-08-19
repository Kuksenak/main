import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'events', loadComponent: () => import('./events/events').then((m) => m.Events) },
  { path: '**', redirectTo: '' },
];
