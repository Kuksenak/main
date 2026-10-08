import { Component, inject } from '@angular/core';
import { NavStack } from '../core/services/nav-stack.service';
import { GroupEditor } from './group-editor';
import { EventEditor } from './event-editor';
import { StudentEditor } from './student-editor';

/**
 * Renders the NavStack: each open card in order, later ones on top. Placed once in the layout,
 * so any page or card can open an event / student / group over what's on screen.
 */
@Component({
  selector: 'app-stack-host',
  imports: [EventEditor, GroupEditor, StudentEditor],
  template: `
    @for (e of stack.entries(); track e.key) {
      @switch (e.kind) {
        @case ('event') { <app-event-editor [entry]="e" (closed)="stack.remove(e.key)" /> }
        @case ('student') { <app-student-editor [entry]="e" (closed)="stack.remove(e.key)" /> }
        @case ('group') { <app-group-editor [entry]="e" (closed)="stack.remove(e.key)" /> }
      }
    }
  `,
})
export class StackHost {
  protected stack = inject(NavStack);
}
