import { booleanAttribute, Component, computed, input } from '@angular/core';
import { Icon } from '../core/ui';
import { marked, shown } from './marks';

/**
 * A page's block read only, on a card (the phones' page, the shared page, the assistant's answer):
 * its text, wrapped as typed; `locked` ("only for me"): a lock in its top right corner. Its marks
 * `shown` as they'd be read (bold, links, …), or (`faded`: the assistant's, still to be added) the
 * marks themselves, faded. Desktops: a lighter card, the smaller text.
 *   <app-read-block [text]="block.text" [locked]="block.private" />
 */
@Component({
  selector: 'app-read-block',
  imports: [Icon],
  host: {
    class:
      'relative block rounded-card bg-tint px-4 py-3 text-body leading-relaxed break-words whitespace-pre-wrap ' +
      'data-locked:pr-9 desktop:rounded-menu desktop:bg-tint/50 desktop:text-ui',
    '[attr.data-locked]': "locked() ? '' : null",
  },
  // (one line: the text keeps its spaces and line ends — the template's own would show)
  // prettier-ignore
  template: `@if (locked()) {<app-icon name="lock" class="absolute top-3 right-3 size-4 text-icon" />}@if (faded()) {@for (k of pieces(); track $index) {<span [class.opacity-30]="k.kind === 'syntax'" [class.text-accent]="k.kind === 'link'">{{ k.t }}</span>}} @else {@for (k of read(); track $index) {@if (k.href) {<a [href]="k.href" target="_blank" rel="noopener" class="text-accent underline-offset-2 hover:underline" [class.font-semibold]="k.bold" [class.italic]="k.italic">{{ k.t }}</a>} @else {<span [class.font-semibold]="k.bold" [class.italic]="k.italic" [class.underline]="k.underline" [class.line-through]="k.strike">{{ k.t }}</span>}}}`,
})
export class ReadBlock {
  readonly text = input<string | null | undefined>('');
  readonly locked = input(false, { transform: booleanAttribute });
  readonly faded = input(false, { transform: booleanAttribute });

  protected readonly read = computed(() => shown(this.text() ?? ''));
  protected readonly pieces = computed(() => marked(this.text() ?? ''));
}
