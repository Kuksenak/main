import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { Area } from './permissions';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return !auth.isAuthenticated() || inject(Router).createUrlTree(['/']);
};


/** A section's page: only for those who can read its area (else the start page). */
export const areaGuard =
  (area: Area): CanActivateFn =>
  () =>
    inject(AuthStore).can(area, 'read') || inject(Router).createUrlTree(['/']);

/** Users (their access): only for the admins (else the start page). */
export const adminGuard: CanActivateFn = () => inject(AuthStore).isAdmin() || inject(Router).createUrlTree(['/']);
