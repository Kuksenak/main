import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EventEditor } from '../cards/event-editor';
import { StackEntry } from '../core/services/nav-stack.service';
import { EventService } from './event.service';

/**
 * An event on a page of its own (desktop: its card's Open in full page): the same editor, not
 * floating; saved, deleted or closed — back to the schedule. `?at=` picks a repeat.
 */
@Component({
  selector: 'app-event-page',
  imports: [EventEditor],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <!-- (once the events are loaded: the editor takes the event when it opens) -->
    @for (e of entry(); track e.id + (e.at ?? '')) {
      <app-event-editor [entry]="e" [inline]="true" (closed)="router.navigate(['/schedule'])" />
    }
  `,
})
export class EventPage {
  protected readonly router = inject(Router);
  private readonly events = inject(EventService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly entry = computed<StackEntry[]>(() => {
    const id = this.params()?.get('id');
    if (!id || !this.events.events().some((e) => e.id === id)) return [];
    return [{ key: 0, kind: 'event', id, at: this.query()?.get('at') ?? undefined }];
  });

  constructor() {
    this.events.ensureLoaded();
    // (deleted here, a repeat or the series: gone from the events — back to the schedule)
    let seen = false;
    effect(() => {
      if (this.entry().length) seen = true;
      else if (seen) this.router.navigate(['/schedule']);
    });
  }
}
