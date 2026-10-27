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
  // (in the favorites: the sidebar's, the library's top)
  favorite: boolean;
}

/** A block of a page's content: a text right on it, or a card (set apart: material, what the AI wrote). */
export interface PageBlock {
  kind: 'text' | 'card';
  text: string | null;
  // (only for the teacher)
  private?: boolean;
}

/** A page as a whole (published: its public link's token). */
export interface Page extends PageItem {
  blocks: PageBlock[];
  createdAt: string;
  shareToken: string | null;
}

/** A page in the trash: when it went there. */
export interface TrashItem {
  id: string;
  title: string;
  deletedAt: string;
}

/** A published page, as anyone with its link sees it (its private blocks left out). */
export interface SharedPage {
  title: string;
  blocks: PageBlock[];
}

/** A published page's public link. */
export const shareUrl = (token: string): string => `${location.origin}/s/${token}`;

/**
 * The library (the API's /pages): its pages, the last changed first (`load()`); a page `get`,
 * `create`d (empty, then opened), `save`d (its title and blocks as a whole — the list follows),
 * published (`share`), a favorite or not, moved to the trash (`delete`: a toast with Undo). The
 * trash (`loadTrash()`): a page restored, deleted for good, all of it emptied.
 */
@Injectable({ providedIn: 'root' })
export class LibraryStore {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pages`;
  private readonly trashUrl = `${environment.apiUrl}/trash`;

  readonly items = signal<PageItem[] | null>(null);
  readonly trash = signal<TrashItem[] | null>(null);
  /** A page's content copied (its menu: Copy content), to paste into another one. */
  readonly clipboard = signal<PageBlock[] | null>(null);
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

  /** A published page by its link (no sign-in). */
  shared(token: string): Observable<SharedPage> {
    return this.http.get<SharedPage>(`${environment.apiUrl}/shared/${token}`);
  }

  create(title: string): Observable<Page> {
    return this.http.post<Page>(this.url, { title }).pipe(tap((page) => this.put(page)));
  }

  save(id: string, title: string, blocks: PageBlock[]): Observable<Page> {
    return this.http.put<Page>(`${this.url}/${id}`, { title, blocks }).pipe(tap((page) => this.put(page)));
  }

  /** Published (on: its link made — the same one again if it had one) or not. */
  share(id: string, on: boolean): Observable<Page> {
    return this.http.put<Page>(`${this.url}/${id}/shared`, { on });
  }

  /** In the favorites or not (the list follows at once; back as it was if that fails). */
  favorite(id: string, on: boolean): Observable<Page> {
    this.mark(id, on);
    return this.http.put<Page>(`${this.url}/${id}/favorite`, { on }).pipe(
      tap({ error: () => {
        this.mark(id, !on);
        this.toasts.error(this.i18n.t('library.saveError'));
      } }),
    );
  }

  /** To the trash: gone from the list; a toast — Undo puts it back. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => {
        this.items.update((items) => items?.filter((x) => x.id !== id) ?? null);
        this.trash.set(null); // (read again when it's opened)
        this.toasts.show(this.i18n.t('trash.moved'), { label: this.i18n.t('trash.undo'), run: () => this.restore(id) });
      }),
    );
  }

  loadTrash(): void {
    this.http.get<TrashItem[]>(this.trashUrl).subscribe({
      next: (items) => this.trash.set(items),
      error: () => this.toasts.error(this.i18n.t('trash.loadError')),
    });
  }

  /** Out of the trash, back in the library (`done`: then — the trash's list opens it). */
  restore(id: string, done?: () => void): void {
    this.http.post<PageItem>(`${this.trashUrl}/${id}/restore`, {}).subscribe({
      next: (item) => {
        this.trash.update((items) => items?.filter((x) => x.id !== id) ?? null);
        this.items.update((items) => (items ? [item, ...items.filter((x) => x.id !== id)].sort(byChanged) : items));
        done?.();
      },
      error: () => this.toasts.error(this.i18n.t('trash.restoreError')),
    });
  }

  /** Deleted for good (null: all of the trash). */
  deleteForever(id: string | null): void {
    const before = this.trash();
    this.trash.update((items) => (id ? (items?.filter((x) => x.id !== id) ?? null) : []));
    this.http.delete<void>(id ? `${this.trashUrl}/${id}` : this.trashUrl).subscribe({
      error: () => {
        this.trash.set(before);
        this.toasts.error(this.i18n.t('trash.deleteError'));
      },
    });
  }

  // (a page made or changed: to the top of the list, as the API orders it)
  private put(page: Page): void {
    const item: PageItem = { id: page.id, title: page.title, updatedAt: page.updatedAt, favorite: page.favorite };
    this.items.update((items) => (items ? [item, ...items.filter((x) => x.id !== item.id)] : items));
  }

  private mark(id: string, favorite: boolean): void {
    this.items.update((items) => items?.map((x) => (x.id === id ? { ...x, favorite } : x)) ?? null);
  }
}

// (the last changed first)
const byChanged = (a: PageItem, b: PageItem): number => b.updatedAt.localeCompare(a.updatedAt);
