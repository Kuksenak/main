import { Routes } from '@angular/router';
import { authGuard } from './_todo-core/auth/auth-guard';
import { Home } from './_todo-features/home/home';

export const routes: Routes = [
    { path: '', component: Home, canActivate: [authGuard] },
    { path: 'server-error', redirectTo: '', pathMatch: 'full' },
    {
        path: 'settings',
        loadComponent: () =>
            import('./features/settings/settings').then((m) => m.Settings),
        canActivate: [authGuard],
    },
    {
        path: 'events',
        loadComponent: () =>
            import('./features/events/events').then((m) => m.Events),
        canActivate: [authGuard],
    },
    {
        path: 'events-calendar',
        loadComponent: () =>
            import('./features/events/events-calendar').then((m) => m.EventsCalendar),
        canActivate: [authGuard],
    },
    {
        path: 'elements',
        loadComponent: () =>
            import('./features/elements/elements').then((m) => m.Elements),
        canActivate: [authGuard],
    },
    // { path: '', redirectTo: 'home', pathMatch: 'full' },
];
