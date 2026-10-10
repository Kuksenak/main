import { HttpClient } from '@angular/common/http';
import { inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of } from 'rxjs';
import { environment } from '@environments/environment';
import { LoadingService } from './loading.service';

/**
 * A list kept in sync with a REST collection on the API:
 * GET {base} → { [listKey]: T[] }, POST {base} → { id }, PUT/DELETE {base}/{id}.
 * The list reloads after every change. Subclass with the path and the list key.
 */
export abstract class ResourceStore<T extends { id: string }, Input> {
  private http = inject(HttpClient);
  private loading = inject(LoadingService);
  private readonly base: string;

  private readonly _items = signal<T[]>([]);
  readonly items = this._items.asReadonly();
  private loaded = false;

  protected constructor(path: string, private readonly listKey: string) {
    this.base = `${environment.apiUrl}/${path}`;
  }

  /** Load the list unless something already did. */
  ensureLoaded(): void {
    if (!this.loaded) this.reload();
  }

  byId(id: string | null | undefined): T | null {
    return this._items().find((x) => x.id === id) ?? null;
  }

  /** Create; `onCreated` gets the new id. */
  create(input: Input, onCreated?: (id: string) => void): void {
    this.send(this.http.post<{ id: string }>(this.base, input), (res) => {
      if (res?.id) onCreated?.(res.id);
    });
  }

  update(id: string, input: Input): void {
    this.send(this.http.put(`${this.base}/${id}`, input));
  }

  /** PUT {base}/{id}/{sub} (e.g. a student's lessons); `local` shows the change right away. */
  protected putSub(id: string, sub: string, body: unknown, local?: Partial<T>): void {
    if (local) this._items.update((list) => list.map((x) => (x.id === id ? { ...x, ...local } : x)));
    this.send(this.http.put(`${this.base}/${id}/${sub}`, body));
  }

  remove(id: string): void {
    this.send(this.http.delete(`${this.base}/${id}`));
  }

  reload(): void {
    this.loaded = true;
    this.loading.begin();
    this.http
      .get<Record<string, T[]>>(this.base)
      .pipe(
        catchError(() => of({} as Record<string, T[]>)),
        finalize(() => this.loading.end()),
      )
      .subscribe((res) => this._items.set(res[this.listKey] ?? []));
  }

  // A change, then the list again (plus anything that depends on it, see afterChange).
  private send<R>(request: Observable<R>, then?: (res: R | null) => void): void {
    request.pipe(catchError(() => of(null))).subscribe((res) => {
      then?.(res);
      this.reload();
      this.afterChange();
    });
  }

  /** Hook for stores whose changes affect other data (e.g. deleting a student changes groups). */
  protected afterChange(): void {}
}
