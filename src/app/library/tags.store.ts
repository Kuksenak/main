import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { Observable, tap } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TAG_COLORS, TagColor, Toasts } from '../core/ui';
import { LibraryStore } from './library.store';

/** A tag of the account's: its name, its color. */
export interface Tag {
  id: string;
  name: string;
  color: TagColor;
}

/**
 * The account's tags (the API's /tags), by name: `load()`, `create` (a name, a color — none given:
 * the next one round), `update`, `remove` (off the pages too). `byId` for the pages' rows.
 */
@Injectable({ providedIn: 'root' })
export class TagsStore {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly toasts = inject(Toasts);
  private readonly library = inject(LibraryStore);
  private readonly url = `${environment.apiUrl}/tags`;

  readonly tags = signal<Tag[]>([]);
  readonly byId = computed(() => new Map(this.tags().map((t) => [t.id, t])));
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<Tag[]>(this.url).subscribe({
      next: (tags) => this.tags.set(tags),
      error: () => (this.loaded = false),
    });
  }

  /** A page's tags, as they are (gone ones left out). */
  of(tagIds: readonly string[] | undefined): Tag[] {
    const byId = this.byId();
    return (tagIds ?? []).map((id) => byId.get(id)).filter((t): t is Tag => !!t);
  }

  create(name: string, color: TagColor = TAG_COLORS[this.tags().length % TAG_COLORS.length]): Observable<Tag> {
    return this.http.post<Tag>(this.url, { name: name.trim(), color }).pipe(
      tap({
        next: (tag) => this.tags.update((tags) => [...tags, tag].sort(byName)),
        error: () => this.toasts.error(this.i18n.t('tags.saveError')),
      }),
    );
  }

  update(tag: Tag): void {
    const before = this.tags();
    this.tags.update((tags) => tags.map((t) => (t.id === tag.id ? tag : t)).sort(byName));
    this.http.put<Tag>(`${this.url}/${tag.id}`, { name: tag.name, color: tag.color }).subscribe({
      error: () => {
        this.tags.set(before);
        this.toasts.error(this.i18n.t('tags.saveError'));
      },
    });
  }

  remove(id: string): void {
    this.http.delete<void>(`${this.url}/${id}`).subscribe({
      next: () => {
        this.tags.update((tags) => tags.filter((t) => t.id !== id));
        this.library.untag(id);
      },
      error: () => this.toasts.error(this.i18n.t('tags.saveError')),
    });
  }
}

const byName = (a: Tag, b: Tag): number => a.name.localeCompare(b.name);
