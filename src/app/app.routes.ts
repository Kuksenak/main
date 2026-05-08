import { Routes } from '@angular/router';
import { authGuard } from './_todo-core/auth/auth-guard';
import { Home } from './_todo-features/home/home';
import { Settings } from './_todo-features/settings/settings';

export const routes: Routes = [
    { path: 'home', component: Home, canActivate: [authGuard] },
    { path: 'settings', component: Settings, canActivate: [authGuard] },
    { path: 'server-error', redirectTo: 'home', pathMatch: 'full' },
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    // { path: 'devices', component: Devices, canActivate: [authGuard] },
    // {
    //     path: 'mfa',
    //     loadComponent: () =>
    //         import('./features/mfa/mfa-list/mfa').then((m) => m.Mfa),
    //     canActivate: [authGuard],
    // },
    // { path: '', redirectTo: 'home', pathMatch: 'full' },
];
