import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';
import { Layout } from './layout/layout';
import { Schedule } from './schedule/schedule';

// The schedule (the start page) and the layout come with the app; every other page loads when
// it's first opened.
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login), canActivate: [guestGuard] },
  // A shared lesson: public, no sign-in
  { path: 'l/:token', loadComponent: () => import('./lessons/shared-lesson').then((m) => m.SharedLesson) },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'schedule', component: Schedule },
      // Students (desktop: students and groups side by side). Phones: students only, groups only,
      // or both behind Groups | Students tabs (see Students' `mode`).
      { path: 'students', loadComponent: () => import('./students/students').then((m) => m.Students), data: { mode: 'students' } },
      { path: 'groups', loadComponent: () => import('./students/students').then((m) => m.Students), data: { mode: 'groups' } },
      { path: 'people', loadComponent: () => import('./students/students').then((m) => m.Students), data: { mode: 'tabs' } },
      { path: 'lessons', loadComponent: () => import('./lessons/lessons').then((m) => m.Lessons) },
      // The list with that lesson open on top
      { path: 'lessons/:id', loadComponent: () => import('./lessons/lessons').then((m) => m.Lessons) },
      { path: 'about', loadComponent: () => import('./about/about').then((m) => m.About) },
      { path: 'install', loadComponent: () => import('./install/install').then((m) => m.Install) },
      { path: '', pathMatch: 'full', redirectTo: 'schedule' },
    ],
  },
  { path: '**', redirectTo: '' },
];
