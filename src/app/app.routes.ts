import { Routes } from '@angular/router';
import { Auth } from './auth/auth';
import { authGuard } from './auth/auth-guard';
import { Home } from './home/home';

export const routes: Routes = [
    { path: 'login', component: Auth },
    { path: 'home', component: Home, canActivate: [authGuard] },
    { path: '', redirectTo: 'home', pathMatch: 'full' },
];
