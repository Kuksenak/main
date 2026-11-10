import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { Observable, tap } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TAG_CHOICES, TagColor, Toasts } from '../core/ui';
import { LibraryStore } from './library.store';

/** A tag of the account's: its name, its color. */
export interface Tag {
  id: string;
  name: string;
  color: TagColor;
}

/**
 * The account's tags (the API's /tags), by name: `load()`, `create` (a name, a color — none given:
 * the next one round), `update` (its color), `remove` (off the pages too) — the account's menu → Tags.
 * `byId` for the pages' rows.
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

  /** The tag by that name (any case), if there's one. */
  named(name: string): Tag | undefined {
    const words = name.trim().toLowerCase();
    return this.tags().find((t) => t.name.toLowerCase() === words);
  }

  /** How many of the library's pages have it (the library not loaded yet: undefined). */
  pagesWith(id: string): number | undefined {
    return this.library.items()?.filter((p) => p.tagIds?.includes(id)).length;
  }

  /** Delete's question: how many pages it comes off (none: no question — null). */
  deleteAsk(id: string): string | null {
    const pages = this.pagesWith(id);
    if (pages === 0) return null;
    return pages ? this.i18n.t('tags.deleteAskN').replace('{n}', String(pages)) : this.i18n.t('tags.deleteAsk');
  }

  /** A new tag's color: the next one round. */
  readonly nextColor = computed<TagColor>(() => TAG_CHOICES[this.tags().length % TAG_CHOICES.length]);

  create(name: string, color: TagColor = this.nextColor()): Observable<Tag> {
    return this.http.post<Tag>(this.url, { name: name.trim(), color }).pipe(
      tap({
        next: (tag) => this.tags.update((tags) => [...tags, tag].sort(byName)),
        error: () => this.toasts.fail('tags.saveError'),
      }),
    );
  }

  /** Its color (or name) changed: shown at once; back as it was if that fails. */
  update(tag: Tag): void {
    const before = this.tags();
    this.tags.update((tags) => tags.map((t) => (t.id === tag.id ? tag : t)).sort(byName));
    this.http.put<Tag>(`${this.url}/${tag.id}`, { name: tag.name, color: tag.color }).subscribe({
      error: () => {
        this.tags.set(before);
        this.toasts.fail('tags.saveError');
      },
    });
  }

  /** Renamed in place (Enter or away): saved — not empty, nor another tag's name (any case); false: not. */
  rename(tag: Tag, name: string): boolean {
    name = name.trim();
    if (!name || name === tag.name || this.tags().some((t) => t.id !== tag.id && t.name.toLowerCase() === name.toLowerCase())) return false;
    this.update({ ...tag, name });
    return true;
  }

  /** Its color picked. */
  recolor(tag: Tag, color: TagColor): void {
    if (tag.color !== color) this.update({ ...tag, color });
  }

  /** Deleted: off its pages too. */
  remove(id: string): void {
    this.http.delete<void>(`${this.url}/${id}`).subscribe({
      next: () => {
        this.tags.update((tags) => tags.filter((t) => t.id !== id));
        this.library.untag(id);
      },
      error: () => this.toasts.fail('tags.saveError'),
    });
  }
}

const byName = (a: Tag, b: Tag): number => a.name.localeCompare(b.name);
