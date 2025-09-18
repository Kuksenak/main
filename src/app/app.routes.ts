import { Routes } from '@angular/router';
import { Auth } from './auth/auth';
import { authGuard } from './auth/auth-guard';
import { Home } from './home/home';
import { AuthCallback } from './auth/auth-callback';

export const routes: Routes = [
    { path: 'signin', component: Auth },
    { path: 'auth/callback', component: AuthCallback },
    { path: 'home', component: Home, canActivate: [authGuard] },
    { path: '', redirectTo: 'home', pathMatch: 'full' },
];
