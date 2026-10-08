import { Component, computed, signal } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';

interface Question {
  text: string;
  options: string[];
  answer: number; // index of the right option
}

// An example test, shown in every lesson until real tests exist (nothing is saved).
const QUESTIONS: Question[] = [
  { text: 'She ___ to school every day.', options: ['go', 'goes', 'going'], answer: 1 },
  { text: 'The past tense of “buy” is…', options: ['buyed', 'bought', 'buy'], answer: 1 },
  { text: 'Which word is a noun?', options: ['quickly', 'run', 'table'], answer: 2 },
];

/**
 * Example test: pick one option per question, Check marks right / wrong and shows the score,
 * Try again starts over. A preview of how tests will look — answers aren't stored yet.
 */
@Component({
  selector: 'app-demo-quiz',
  imports: [Icon, TranslatePipe],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex items-baseline gap-2 px-1">
      <h2 class="text-xl font-semibold">{{ 'quiz.title' | t }}</h2>
      <span class="text-footnote opacity-50">{{ 'quiz.example' | t }}</span>
    </div>

    @for (q of questions; track $index; let qi = $index) {
      <div class="flex flex-col gap-1.5">
        <p class="text-body px-1 font-medium">{{ qi + 1 }}. {{ q.text }}</p>
        <div class="card">
          @for (o of q.options; track $index; let oi = $index) {
            <button type="button" (click)="pick(qi, oi)" [disabled]="checked()" class="list-row w-full text-left disabled:opacity-100">
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-full border-2"
                [class.border-[var(--accent)]]="picked()[qi] === oi"
                [class.bg-[var(--accent)]]="picked()[qi] === oi"
                [class.border-[var(--separator)]]="picked()[qi] !== oi"
              >
                @if (picked()[qi] === oi) {
                  <span class="size-2 rounded-full bg-white"></span>
                }
              </span>
              <span class="min-w-0 flex-1">{{ o }}</span>
              @if (checked() && oi === q.answer) {
                <app-icon name="check" [strokeWidth]="2.6" class="size-5 text-[var(--success)]" />
              } @else if (checked() && picked()[qi] === oi) {
                <app-icon name="close" [strokeWidth]="2.6" class="size-5 text-[var(--danger)]" />
              }
            </button>
          }
        </div>
      </div>
    }

    @if (checked()) {
      <div class="flex items-center gap-3">
        <p class="text-body flex-1 px-1 font-semibold">{{ 'quiz.score' | t }}: {{ score() }} / {{ questions.length }}</p>
        <button type="button" (click)="reset()" class="btn-secondary">{{ 'quiz.retry' | t }}</button>
      </div>
    } @else {
      <button type="button" (click)="checked.set(true)" [disabled]="!complete()" class="btn-primary self-start">{{ 'quiz.check' | t }}</button>
    }
  `,
})
export class DemoQuiz {
  protected readonly questions = QUESTIONS;
  protected readonly picked = signal<(number | null)[]>(QUESTIONS.map(() => null));
  protected readonly checked = signal(false);

  protected readonly complete = computed(() => this.picked().every((p) => p !== null));
  protected readonly score = computed(() => this.picked().filter((p, i) => p === QUESTIONS[i].answer).length);

  protected pick(question: number, option: number): void {
    this.picked.update((list) => list.map((p, i) => (i === question ? option : p)));
  }

  protected reset(): void {
    this.picked.set(QUESTIONS.map(() => null));
    this.checked.set(false);
  }
}
