import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { Toasts } from '../core/ui';

/** A page in the library's list (no content). */
export interface PageItem {
  id: string;
  title: string;
  updatedAt: string;
}

/** A block of a page's content — for now a text. */
export interface PageBlock {
  kind: 'text';
  text: string | null;
}

/** A page as a whole. */
export interface Page extends PageItem {
  blocks: PageBlock[];
  createdAt: string;
}

/**
 * The library (the API's /pages): its pages, the last changed first (`load()`); a page `get`,
 * `create`d (empty, then opened), `save`d (its title and blocks as a whole — the list follows), deleted.
 */
@Injectable({ providedIn: 'root' })
export class LibraryStore {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pages`;

  readonly items = signal<PageItem[] | null>(null);
  private readonly toasts = inject(Toasts);
  private readonly i18n = inject(I18nService);

  load(): void {
    this.http.get<PageItem[]>(this.url).subscribe({
      next: (items) => this.items.set(items),
      error: () => this.toasts.error(this.i18n.t('library.loadError')),
    });
  }

  get(id: string): Observable<Page> {
    return this.http.get<Page>(`${this.url}/${id}`);
  }

  create(title: string): Observable<Page> {
    return this.http.post<Page>(this.url, { title }).pipe(tap((page) => this.put(page)));
  }

  save(id: string, title: string, blocks: PageBlock[]): Observable<Page> {
    return this.http.put<Page>(`${this.url}/${id}`, { title, blocks }).pipe(tap((page) => this.put(page)));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.url}/${id}`)
      .pipe(tap(() => this.items.update((items) => items?.filter((x) => x.id !== id) ?? null)));
  }

  // (a page made or changed: to the top of the list, as the API orders it)
  private put(page: Page): void {
    const item: PageItem = { id: page.id, title: page.title, updatedAt: page.updatedAt };
    this.items.update((items) => (items ? [item, ...items.filter((x) => x.id !== item.id)] : items));
  }
}
