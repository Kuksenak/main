import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ActionChoice, ActionSheet } from '../core/ui/confirm';
import { Icon } from '../core/ui/icon/icon';

/** A student's personal link: their page (/s/{token}). */
export function studentPageUrl(token: string): string {
  return `${location.origin}/s/${token}`;
}

/**
 * The teacher's row for a student's personal link: their own page, where their answers are saved
 * as theirs. ⧉ copies it (fetched when the card opens, so the copy happens right in the tap — iOS
 * allows the clipboard only then); "New link" makes another one, the old one stops (asked first).
 */
@Component({
  selector: 'app-student-link',
  imports: [ActionSheet, Icon, TranslatePipe],
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <span class="card-label">{{ 'students.link' | t }}</span>
    <div class="card">
      <button type="button" (click)="copy()" [disabled]="!token()" class="list-row w-full text-left">
        <app-icon name="link" class="row-icon" />
        <span class="min-w-0 flex-1 truncate" [class.opacity-50]="!token()">{{ token() ? url() : '…' }}</span>
        <app-icon [name]="copied() ? 'check' : 'copy'" class="size-5 shrink-0 text-[var(--accent)]" />
      </button>
      <button #resetBtn type="button" (click)="asking.set(resetBtn)" [disabled]="!token()" class="list-row w-full text-left text-[var(--danger)]">
        {{ 'students.newLink' | t }}
      </button>
    </div>
    <p class="text-footnote px-1 opacity-50">{{ 'students.linkHint' | t }}</p>

    @if (asking(); as origin) {
      <app-action-sheet
        title="students.newLinkTitle"
        [choices]="choices"
        [origin]="origin"
        (chosen)="reset()"
        (closed)="asking.set(null)"
      />
    }
  `,
})
export class StudentLink {
  readonly studentId = input.required<string>();

  private http = inject(HttpClient);
  protected readonly token = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly asking = signal<HTMLElement | null>(null);
  protected readonly choices: ActionChoice[] = [{ value: 'reset', label: 'students.newLink', danger: true }];

  constructor() {
    // The student's link (made on the server the first time)
    effect(() => {
      const id = this.studentId();
      this.token.set(null);
      this.http
        .post<{ token: string }>(`${environment.apiUrl}/students/${id}/access`, {})
        .pipe(catchError(() => of(null)))
        .subscribe((res) => this.token.set(res?.token ?? null));
    });
  }

  protected url(): string {
    return studentPageUrl(this.token() ?? '');
  }

  protected copy(): void {
    if (!this.token()) return;
    navigator.clipboard?.writeText(this.url()).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => {},
    );
  }

  protected reset(): void {
    this.http
      .post<{ token: string }>(`${environment.apiUrl}/students/${this.studentId()}/access/reset`, {})
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.token) this.token.set(res.token);
      });
  }
}
