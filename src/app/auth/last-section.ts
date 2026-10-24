import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CanActivateFn, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthStore } from './auth.store';
import { AREAS, Area } from './permissions';

/**
 * The section the user used last (for now the schedule and the library — an area each), kept on
 * their account (PUT /me/last-section): it's noted as they open one (a page of the library counts
 * as the library), and the app opens it at the start (`lastSectionGuard`) if they may still open it.
 */
@Injectable({ providedIn: 'root' })
export class LastSection {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private noted: string | null = null;

  constructor() {
    inject(Router)
      .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.note(e.urlAfterRedirects));
  }

  /** The section to open at the start: the last one, if there's one and it may still be opened. */
  start(): Area | null {
    const last = this.auth.user()?.lastSection as Area | null | undefined;
    return last && AREAS.includes(last) && this.auth.can(last) ? last : null;
  }

  private note(url: string): void {
    const section = url.split(/[/?#]/)[1] as Area;
    if (!AREAS.includes(section) || !this.auth.isAuthenticated()) return;
    this.noted ??= this.auth.user()?.lastSection ?? null;
    if (section === this.noted) return;
    this.noted = section;
    this.http.put(`${environment.apiUrl}/me/last-section`, { section }).subscribe({ error: () => (this.noted = null) });
  }
}

/** The start page at the app's start: the last section instead, if there's one (later, the start page as it is). */
export const lastSectionGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (router.navigated) return true;
  const section = inject(LastSection).start();
  return section ? router.createUrlTree(['/', section]) : true;
};
