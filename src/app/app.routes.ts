import { Routes } from '@angular/router';
import { About } from './about/about';
import { Install } from './install/install';
import { authGuard, guestGuard } from './auth/auth.guard';
import { Layout } from './layout/layout';
import { Lessons } from './lessons/lessons';
import { SharedLesson } from './lessons/shared-lesson';
import { Login } from './login/login';
import { Schedule } from './schedule/schedule';
import { Settings } from './settings/settings';
import { Students } from './students/students';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'l/:token', component: SharedLesson }, // a shared lesson: public, no sign-in
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'schedule', component: Schedule },
      { path: 'students', component: Students },
      { path: 'lessons', component: Lessons },
      { path: 'lessons/:id', component: Lessons }, // the list with that lesson open on top
      { path: 'settings', component: Settings },
      { path: 'about', component: About },
      { path: 'install', component: Install },
      { path: '', pathMatch: 'full', redirectTo: 'schedule' },
    ],
  },
  { path: '**', redirectTo: '' },
];
