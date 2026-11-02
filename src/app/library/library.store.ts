import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { Confirm, Toasts } from '../core/ui';

/** A page in the library's list (no content). */
export interface PageItem {
  id: string;
  title: string;
  updatedAt: string;
  // (in the favorites: the sidebar's, the library's top)
  favorite: boolean;
  // (it has a public link)
  published?: boolean;
  // (its tags: TagsStore's, in the order given)
  tagIds?: string[];
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
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  /** A new page on its way (New page: off meanwhile). */
  readonly creating = signal(false);

  load(): void {
    this.http.get<PageItem[]>(this.url).subscribe({
      next: (items) => this.items.set(items),
      error: () => this.toasts.fail('library.loadError'),
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

  /** New page: an empty one ("Untitled"), opened with its name selected (one at a time). */
  createAndOpen(): void {
    if (this.creating()) return;
    this.creating.set(true);
    this.create(this.i18n.t('library.untitled')).subscribe({
      next: (page) => {
        this.creating.set(false);
        this.router.navigate(['/library', page.id], { state: { fresh: true } });
      },
      error: () => {
        this.creating.set(false);
        this.toasts.fail('library.createError');
      },
    });
  }

  /** Duplicate: a copy of a page ("… (copy)"; its blocks — given, else the saved ones), opened. */
  duplicate(id: string, title: string, blocks?: PageBlock[]): void {
    const name = this.i18n.t('library.copyOf').replace('{title}', title.trim() || this.i18n.t('library.untitled'));
    (blocks ? of(blocks) : this.get(id).pipe(map((p) => p.blocks)))
      .pipe(switchMap((content) => this.create(name).pipe(switchMap((copy) => this.save(copy.id, name, content)))))
      .subscribe({
        next: (copy) => this.router.navigate(['/library', copy.id]),
        error: () => this.toasts.fail('library.duplicateError'),
      });
  }

  save(id: string, title: string, blocks: PageBlock[]): Observable<Page> {
    return this.http.put<Page>(`${this.url}/${id}`, { title, blocks }).pipe(tap((page) => this.put(page)));
  }

  /** Published (on: its link made — the same one again if it had one) or not. */
  share(id: string, on: boolean): Observable<Page> {
    return this.http.put<Page>(`${this.url}/${id}/shared`, { on }).pipe(
      tap(() => this.items.update((items) => items?.map((x) => (x.id === id ? { ...x, published: on } : x)) ?? null)),
    );
  }

  /** A page's tags, as a whole (the list follows at once; back as it was if that fails). */
  setTags(id: string, tagIds: string[]): Observable<Page> {
    const before = this.items()?.find((x) => x.id === id)?.tagIds ?? [];
    const set = (ids: string[]) => this.items.update((items) => items?.map((x) => (x.id === id ? { ...x, tagIds: ids } : x)) ?? null);
    set(tagIds);
    return this.http.put<Page>(`${this.url}/${id}/tags`, { tagIds }).pipe(
      tap({
        error: () => {
          set(before);
          this.toasts.fail('library.saveError');
        },
      }),
    );
  }

  /** A tag gone: off the pages here too. */
  untag(tagId: string): void {
    this.items.update((items) => items?.map((x) => (x.tagIds?.includes(tagId) ? { ...x, tagIds: x.tagIds.filter((t) => t !== tagId) } : x)) ?? null);
  }

  /** In the favorites or not (the list follows at once; back as it was if that fails). */
  favorite(id: string, on: boolean): Observable<Page> {
    this.mark(id, on);
    return this.http.put<Page>(`${this.url}/${id}/favorite`, { on }).pipe(
      tap({ error: () => {
        this.mark(id, !on);
        this.toasts.fail('library.saveError');
      } }),
    );
  }

  /** To the trash (`done`: then — e.g. the page open left): gone from the list; a toast — Undo puts it back. */
  delete(id: string, done?: () => void): void {
    this.http.delete<void>(`${this.url}/${id}`).subscribe({
      next: () => {
        this.items.update((items) => items?.filter((x) => x.id !== id) ?? null);
        this.trash.set(null); // (read again when it's opened)
        this.toasts.show(this.i18n.t('trash.moved'), { label: this.i18n.t('trash.undo'), run: () => this.restore(id) });
        done?.();
      },
      error: () => this.toasts.fail('library.deleteError'),
    });
  }

  /** Several to the trash at once: gone from the list; one toast — Undo puts them all back. */
  deleteMany(ids: string[]): void {
    forkJoin(ids.map((id) => this.http.delete<void>(`${this.url}/${id}`))).subscribe({
      next: () => {
        this.items.update((items) => items?.filter((x) => !ids.includes(x.id)) ?? null);
        this.trash.set(null);
        this.toasts.show(this.i18n.t('trash.movedMany').replace('{n}', String(ids.length)), {
          label: this.i18n.t('trash.undo'),
          run: () => ids.forEach((id) => this.restore(id)),
        });
      },
      error: () => this.toasts.fail('library.deleteError'),
    });
  }

  loadTrash(): void {
    this.http.get<TrashItem[]>(this.trashUrl).subscribe({
      next: (items) => this.trash.set(items),
      error: () => this.toasts.fail('trash.loadError'),
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
      error: () => this.toasts.fail('trash.restoreError'),
    });
  }

  /** Delete forever / Empty trash (null: all of it) — asked first, at the button that asked (`at`). */
  async askDeleteForever(id: string | null, at: HTMLElement): Promise<void> {
    const yes = await this.confirm.ask(at, {
      text: this.i18n.t(id ? 'trash.confirmOne' : 'trash.confirmAll'),
      yes: this.i18n.t(id ? 'trash.deleteForever' : 'trash.emptyAll'),
      danger: true,
    });
    if (yes) this.deleteForever(id);
  }

  /** Deleted for good (null: all of the trash). */
  deleteForever(id: string | null): void {
    const before = this.trash();
    this.trash.update((items) => (id ? (items?.filter((x) => x.id !== id) ?? null) : []));
    this.http.delete<void>(id ? `${this.trashUrl}/${id}` : this.trashUrl).subscribe({
      error: () => {
        this.trash.set(before);
        this.toasts.fail('trash.deleteError');
      },
    });
  }

  // (a page made or changed: to the top of the list, as the API orders it)
  private put(page: Page): void {
    const item: PageItem = {
      id: page.id,
      title: page.title,
      updatedAt: page.updatedAt,
      favorite: page.favorite,
      published: !!page.shareToken,
      tagIds: page.tagIds,
    };
    this.items.update((items) => (items ? [item, ...items.filter((x) => x.id !== item.id)] : items));
  }

  private mark(id: string, favorite: boolean): void {
    this.items.update((items) => items?.map((x) => (x.id === id ? { ...x, favorite } : x)) ?? null);
  }
}

// (the last changed first)
const byChanged = (a: PageItem, b: PageItem): number => b.updatedAt.localeCompare(a.updatedAt);
