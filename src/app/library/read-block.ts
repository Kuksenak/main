import { booleanAttribute, Component, computed, input } from '@angular/core';
import { Icon } from '../core/ui/icon/icon';
import { imageOf, marked, shown } from './marks';

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
    '[class.line-through]': "todo() === 'done'",
    '[class.text-fg-secondary]': "todo() === 'done'",
  },
  // (one line: the text keeps its spaces and line ends — the template's own would show)
  // prettier-ignore
  template: `@if (locked()) {<app-icon name="lock" class="absolute top-3 right-3 size-4 text-icon" />}@if (todo()) {<span class="mr-2 inline-grid size-4 translate-y-0.5 place-items-center rounded-[0.25rem] border-[1.5px] border-icon align-baseline text-on-accent data-done:border-accent data-done:bg-accent" [attr.data-done]="todo() === 'done' ? '' : null">@if (todo() === 'done') {<app-icon name="check" class="size-3.5" />}</span>}@if (image(); as src) {<img [src]="src" alt="" class="max-w-full rounded-menu" />} @else if (faded()) {@for (k of pieces(); track $index) {<span [class.opacity-30]="k.kind === 'syntax'" [class.text-accent]="k.kind === 'link'">{{ k.t }}</span>}} @else {@for (k of read(); track $index) {@if (k.href) {<a [href]="k.href" target="_blank" rel="noopener" class="text-accent underline-offset-2 hover:underline" [class.font-semibold]="k.bold" [class.italic]="k.italic">{{ k.t }}</a>} @else {<span [class.font-semibold]="k.bold" [class.italic]="k.italic" [class.underline]="k.underline" [class.line-through]="k.strike">{{ k.t }}</span>}}}`,
})
export class ReadBlock {
  readonly text = input<string | null | undefined>('');
  readonly locked = input(false, { transform: booleanAttribute });
  readonly faded = input(false, { transform: booleanAttribute });

  protected readonly image = computed(() => imageOf(this.text()));
  // (a to-do: its box first — the text after "- [ ] " / "- [x] "; ticked: struck through, gray)
  protected readonly todo = computed(() => {
    const m = /^- \[( |x)\] ?/.exec(this.text() ?? '');
    return m ? (m[1] === 'x' ? 'done' : 'open') : null;
  });
  private readonly body = computed(() => (this.text() ?? '').replace(/^- \[( |x)\] ?/, ''));
  protected readonly read = computed(() => shown(this.body()));
  protected readonly pieces = computed(() => marked(this.body()));
}
