import { Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, IconName } from '../core/ui/icon/icon';
import { LessonBlock, LessonBlockKind } from './lesson.service';

type Token = { text: string; cls: string };

// Pretty JSON split into colored pieces: keys, strings, numbers, true / false / null
function tokens(json: string): Token[] {
  const out: Token[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  let at = 0;
  for (const m of json.matchAll(re)) {
    if (m.index > at) out.push({ text: json.slice(at, m.index), cls: 'opacity-50' });
    if (m[1] && m[2]) {
      out.push({ text: m[1], cls: 'text-[var(--accent)]' });
      out.push({ text: m[2], cls: 'opacity-50' });
    } else if (m[1]) out.push({ text: m[1], cls: 'text-[var(--success)]' });
    else out.push({ text: m[0], cls: 'text-[var(--warning)]' });
    at = m.index + m[0].length;
  }
  if (at < json.length) out.push({ text: json.slice(at), cls: 'opacity-50' });
  return out;
}

const KINDS: { kind: LessonBlockKind; icon: IconName; label: TranslationKey }[] = [
  { kind: 'text', icon: 'text', label: 'lessons.text' },
  { kind: 'gaps', icon: 'compose', label: 'lessons.gaps' },
  { kind: 'exercise', icon: 'exercise', label: 'lessons.exercise' },
  { kind: 'checklist', icon: 'checklist', label: 'lessons.checklist' },
  { kind: 'image', icon: 'image', label: 'lessons.image' },
];

/**
 * What the AI made of the photos, under the lesson editor's buttons: the model, how long it took
 * and what came of it (blocks by kind); the model's JSON as it came on a tap — colored, copyable.
 */
@Component({
  selector: 'app-ai-response',
  imports: [Icon, TranslatePipe],
  template: `
    <div class="card">
      <div class="list-row gap-2 after:hidden">
        <span class="text-footnote flex-1 font-semibold">{{ 'lessons.aiResponse' | t }}</span>
        <span class="text-footnote rounded-full bg-[var(--fill)] px-2 py-0.5 font-medium">{{ modelName() }}</span>
        <span class="text-footnote tabular-nums opacity-50">{{ seconds() }} s</span>
        <button type="button" (click)="closed.emit()" [attr.aria-label]="'action.done' | t" class="icon-plain -mr-2">
          <app-icon name="close" class="size-4" />
        </button>
      </div>

      <!-- What came of it -->
      <div class="flex flex-wrap items-center gap-1.5 px-4 pb-3">
        @for (c of counts(); track c.kind) {
          <span class="text-footnote inline-flex items-center gap-1 rounded-full bg-[var(--fill)] px-2.5 py-1">
            <app-icon [name]="c.icon" class="size-3.5 opacity-60" />
            <span class="font-semibold tabular-nums">{{ c.n }}</span>{{ c.label | t }}
          </span>
        } @empty {
          <span class="text-footnote opacity-50">{{ 'lessons.photoEmpty' | t }}</span>
        }
        <span class="flex-1"></span>
        <button type="button" (click)="showJson.set(!showJson())" class="text-footnote flex items-center gap-0.5 rounded-full px-2 py-1 font-medium text-[var(--accent)] hover:bg-[var(--highlight)]">
          JSON
          <app-icon name="chevron-down" class="size-3.5 transition-transform duration-200" [class.rotate-180]="showJson()" />
        </button>
      </div>

      @if (showJson()) {
        <div class="relative mx-3 mb-3">
          <pre class="max-h-[28rem] select-text overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--fill)] p-3 pr-12 font-mono text-xs leading-relaxed">@for (tk of pieces(); track $index) {<span [class]="tk.cls">{{ tk.text }}</span>}</pre>
          <button type="button" (click)="copy()" [attr.aria-label]="'lessons.copyJson' | t" class="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-1 text-xs font-medium shadow-sm active:opacity-70">
            <app-icon [name]="copied() ? 'check' : 'copy'" class="size-3.5" />{{ (copied() ? 'lessons.copied' : 'lessons.copyJson') | t }}
          </button>
        </div>
      }
    </div>
  `,
})
export class AiResponse {
  readonly model = input.required<string>();
  readonly seconds = input.required<number>();
  readonly raw = input.required<unknown>();
  // The blocks it added (after the server's checks)
  readonly blocks = input.required<LessonBlock[]>();
  readonly closed = output<void>();

  protected readonly showJson = signal(false);
  protected readonly copied = signal(false);

  private readonly json = computed(() => JSON.stringify(this.raw(), null, 2));
  protected readonly pieces = computed(() => tokens(this.json()));

  protected readonly counts = computed(() =>
    KINDS.map((k) => ({ ...k, n: this.blocks().filter((b) => b.kind === k.kind).length })).filter((c) => c.n > 0),
  );

  // "gemini-3.5-flash-lite" → "Gemini 3.5 Flash Lite"
  protected readonly modelName = computed(() => this.model().replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase()));

  protected copy(): void {
    navigator.clipboard?.writeText(this.json()).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      },
      () => {},
    );
  }
}
