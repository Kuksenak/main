import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import type { JSONContent } from '@tiptap/core';
import { environment } from '@environments/environment';

/** A page in the library's list (no content). */
export interface PageItem {
  id: string;
  title: string;
  updatedAt: string;
}

/** A page as a whole: its content the editor's document (PageEditor; null — nothing written yet). */
export interface Page extends PageItem {
  content: JSONContent | null;
  createdAt: string;
}

/**
 * The library (the API's /pages): its pages, the last changed first (`load()`); a page `get`,
 * `create`d (empty, then opened), `save`d (its title and content as a whole — the list follows), deleted.
 */
@Injectable({ providedIn: 'root' })
export class LibraryStore {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pages`;

  readonly items = signal<PageItem[] | null>(null);
  readonly loadError = signal(false);

  load(): void {
    this.loadError.set(false);
    this.http.get<PageItem[]>(this.url).subscribe({
      next: (items) => this.items.set(items),
      error: () => this.loadError.set(true),
    });
  }

  get(id: string): Observable<Page> {
    return this.http.get<Page>(`${this.url}/${id}`);
  }

  create(title: string): Observable<Page> {
    return this.http.post<Page>(this.url, { title }).pipe(tap((page) => this.put(page)));
  }

  save(id: string, title: string, content: JSONContent | null): Observable<Page> {
    return this.http.put<Page>(`${this.url}/${id}`, { title, content }).pipe(tap((page) => this.put(page)));
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
