import { Component, inject } from '@angular/core';
import { NavStack } from '../core/services/nav-stack.service';
import { GroupEditor } from './group-editor';
import { LessonEditor } from './lesson-editor';
import { StudentEditor } from './student-editor';

/**
 * Renders the NavStack: each open card in order, later ones on top. Placed once in the layout,
 * so any page or card can open a lesson / student / group over what's on screen.
 */
@Component({
  selector: 'app-stack-host',
  imports: [GroupEditor, LessonEditor, StudentEditor],
  template: `
    @for (e of stack.entries(); track e.key) {
      @switch (e.kind) {
        @case ('lesson') { <app-lesson-editor [entry]="e" (closed)="stack.remove(e.key)" /> }
        @case ('student') { <app-student-editor [entry]="e" (closed)="stack.remove(e.key)" /> }
        @case ('group') { <app-group-editor [entry]="e" (closed)="stack.remove(e.key)" /> }
      }
    }
  `,
})
export class StackHost {
  protected stack = inject(NavStack);
}
