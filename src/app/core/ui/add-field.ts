import { Component, DestroyRef, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { EscStack } from './esc-stack';
import { Icon, IconName } from './icon/icon';
import { ToBody } from './to-body';
import { TranslatePipe } from '../i18n/t.pipe';

export interface AddItem {
  id: string;
  name: string;
  hint?: string | null; // a second line (an email, "Group", a level); with icons: at the right
  icon?: IconName; // its own icon (else the field's itemIcon)
}

/**
 * Adding people / lessons (as Notion Calendar's): a field with its icon; typing
 * lists what matches under it — as the menus, the typed part in bold, a hint below each — ↑ ↓ and Enter
 * or a click add one, and the field is ready for the next.
 */
@Component({
  selector: 'app-add-field',
  imports: [Icon, ToBody, TranslatePipe],
  host: { class: 'block' },
  template: `
    <label #box class="add-field">
      @if (icon(); as i) {
        <app-icon [name]="i" class="size-4 shrink-0 opacity-45" />
      }
      <input #inp [value]="query()" (input)="query.set(inp.value); index.set(0); show()" (focus)="openOnFocus() && show()" (blur)="hide()" (keydown)="key($event)" [placeholder]="placeholder()" autocomplete="off" class="min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-45" />
    </label>
    @if (pos(); as p) {
      @if (query().trim() || openOnFocus()) {
        <!-- (one height while typing: the items scroll under the action; none: "Nothing found") -->
        <div appToBody class="add-drop" [style.left.px]="p.left" [style.top.px]="p.top" [style.width.px]="p.width">
          <!-- (an action first, e.g. New lesson; then the section's items) -->
          @if (action(); as a) {
            <button type="button" (mousedown)="$event.preventDefault(); act()" (mouseenter)="index.set(0)" class="add-opt with-icon" [class.is-on]="index() === 0">
              <app-icon [name]="a.icon" class="add-icon" />{{ a.label }}
            </button>
            <div class="menu-sep"></div>
          }
          <div class="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto">
          @if (section() && matches().length) {
            <p class="px-2.5 pb-0.5 pt-1 text-[0.75rem] font-medium opacity-50">{{ section() }}</p>
          }
          @for (m of matches(); track m.id; let i = $index) {
            <button type="button" (mousedown)="$event.preventDefault(); pick(m)" (mouseenter)="index.set(i + shift())" class="add-opt" [class.is-on]="i + shift() === index()" [class.with-icon]="!!(m.icon ?? itemIcon())">
              @if (m.icon ?? itemIcon(); as ic) {
                <app-icon [name]="ic" class="add-icon" />
                <span class="min-w-0 flex-1 truncate">{{ m.before }}<b>{{ m.hit }}</b>{{ m.after }}</span>
                @if (m.hint) {
                  <span class="shrink-0 text-[0.75rem] opacity-50">{{ m.hint }}</span>
                }
              } @else {
                <span class="block truncate">{{ m.before }}<b>{{ m.hit }}</b>{{ m.after }}</span>
                @if (m.hint) {
                  <span class="block truncate text-[0.75rem] opacity-60">{{ m.hint }}</span>
                }
              }
            </button>
          } @empty {
            <p class="px-2.5 py-2 text-[0.875rem] opacity-45">{{ 'students.notFound' | t }}</p>
          }
          </div>
        </div>
      }
    }
  `,
})
export class AddField {
  /** null: none (under rows: the field in line with their names). */
  readonly icon = input<IconName | null>('plus');
  readonly placeholder = input('');
  readonly items = input<AddItem[]>([]);
  /** Already added: not offered. */
  readonly exclude = input<readonly string[]>([]);
  readonly picked = output<string>();
  /** The list on focus too, before typing (a library to pick from). */
  readonly openOnFocus = input(false);
  /** An action at the top of the list (e.g. New lesson): `acted` when picked. */
  readonly action = input<{ label: string; icon: IconName } | null>(null);
  readonly acted = output<string>(); // what was typed (e.g. the new one's name)
  /** A label over the items (e.g. "From the library"). */
  readonly section = input<string | null>(null);
  /** An icon before each item (its hint then at the right). */
  readonly itemIcon = input<IconName | null>(null);
  // (the action, when there's one, is the first row: the items' indexes after it)
  protected readonly shift = computed(() => (this.action() ? 1 : 0));

  protected readonly query = signal('');
  protected readonly index = signal(0);
  protected readonly pos = signal<{ left: number; top: number; width: number } | null>(null);
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly esc = inject(EscStack);
  private offEsc: (() => void) | null = null;

  // What matches the typed text (anywhere in the name), split for the bold part; the first 8
  protected readonly matches = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    const out = new Set(this.exclude());
    return this.items()
      .filter((it) => !out.has(it.id))
      .map((it) => {
        const at = q ? it.name.toLocaleLowerCase().indexOf(q) : 0;
        return { ...it, at };
      })
      .filter((it) => it.at >= 0)
      .sort((a, b) => a.at - b.at)
      .slice(0, 60)
      .map((it) => ({ ...it, before: it.name.slice(0, it.at), hit: it.name.slice(it.at, it.at + q.length), after: it.name.slice(it.at + q.length) }));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.offEsc?.());
  }

  // At the field's left (as Notion Calendar's: beside the card, its top at the field's), kept in the
  // window; no room at the left: under it (over it when there's no room below)
  protected show(): void {
    const r = this.box().nativeElement.getBoundingClientRect();
    const width = 280;
    const top = Math.max(8, Math.min(r.top - 4, window.innerHeight - 8 - 320));
    if (r.left - 8 - width >= 8) this.pos.set({ left: r.left - 8 - width, top, width });
    else {
      // (no room at the left: under the field — or over it when there's no room below; as wide as
      // a menu, not the field)
      const below = window.innerHeight - r.bottom - 8 >= 320 + 4;
      this.pos.set({ left: r.left, top: below ? r.bottom + 4 : Math.max(8, r.top - 4 - 320), width });
    }
    this.offEsc ??= this.esc.push(() => (this.box().nativeElement.querySelector('input') as HTMLInputElement).blur());
  }

  protected hide(): void {
    this.pos.set(null);
    this.offEsc?.();
    this.offEsc = null;
  }

  protected key(e: KeyboardEvent): void {
    const n = this.matches().length + this.shift();
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.index.set((this.index() + 1) % n);
      this.reveal();
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.index.set((this.index() - 1 + n) % n);
      this.reveal();
    } else if (e.key === 'Enter' && n) {
      e.preventDefault();
      const i = Math.min(this.index(), n - 1);
      if (i < this.shift()) this.act();
      else this.pick(this.matches()[i - this.shift()]);
    }
  }

  // (the highlighted row scrolled into view)
  private reveal(): void {
    setTimeout(() => document.querySelector('.add-drop .add-opt.is-on')?.scrollIntoView({ block: 'nearest' }));
  }

  protected act(): void {
    this.acted.emit(this.query().trim());
    this.query.set('');
    (this.box().nativeElement.querySelector('input') as HTMLInputElement).blur();
  }

  protected pick(m: AddItem): void {
    this.picked.emit(m.id);
    this.query.set('');
    this.index.set(0);
    (this.box().nativeElement.querySelector('input') as HTMLInputElement).blur();
  }
}
