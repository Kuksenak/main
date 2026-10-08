import { Routes } from '@angular/router';
import { About } from './about/about';
import { authGuard, guestGuard } from './auth/auth.guard';
import { Layout } from './layout/layout';
import { Lessons } from './lessons/lessons';
import { Login } from './login/login';
import { Schedule } from './schedule/schedule';
import { Students } from './students/students';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'schedule', component: Schedule },
      { path: 'students', component: Students },
      { path: 'lessons', component: Lessons },
      { path: 'about', component: About },
      { path: '', pathMatch: 'full', redirectTo: 'schedule' },
    ],
  },
  { path: '**', redirectTo: '' },
];
