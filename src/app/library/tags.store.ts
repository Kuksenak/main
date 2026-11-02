import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { Observable, tap } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TAG_COLORS, TagColor, Toasts } from '../core/ui';

/** A tag of the account's: its name, its color. */
export interface Tag {
  id: string;
  name: string;
  color: TagColor;
}

/**
 * The account's tags (the API's /tags), by name: `load()`, `create` (a name, a color — none given:
 * the next one round). `byId` for the pages' rows. (Changing or deleting one: later.)
 */
@Injectable({ providedIn: 'root' })
export class TagsStore {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly toasts = inject(Toasts);
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

  /** A new tag's color: the next one round. */
  readonly nextColor = computed<TagColor>(() => TAG_COLORS[this.tags().length % TAG_COLORS.length]);

  create(name: string, color: TagColor = this.nextColor()): Observable<Tag> {
    return this.http.post<Tag>(this.url, { name: name.trim(), color }).pipe(
      tap({
        next: (tag) => this.tags.update((tags) => [...tags, tag].sort(byName)),
        error: () => this.toasts.error(this.i18n.t('tags.saveError')),
      }),
    );
  }
}

const byName = (a: Tag, b: Tag): number => a.name.localeCompare(b.name);
