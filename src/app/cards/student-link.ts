import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ActionChoice, ActionSheet } from '../core/ui/confirm';
import { Icon } from '../core/ui/icon/icon';
import { DeviceDetectionService } from '../core/services/device-detection.service';

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
    @if (desktop) {
      <!-- Desktop, in the new style (as the page's properties): the PIN — set or not; the hint under
           it. (Copy link, New link, Reset PIN: in the page's head and ⋯, see PersonPage) -->
      <div class="flex flex-col">
        <div class="flex h-9 items-center gap-3 text-[0.875rem]">
          <span class="flex w-36 shrink-0 items-center gap-2 opacity-50"><app-icon name="lock" class="size-4" />PIN</span>
          <span class="min-w-0 flex-1 px-1.5" [class.opacity-40]="!hasPin()">{{ (hasPin() ? 'students.pinSet' : 'students.pinNone') | t }}</span>
        </div>
        <p class="pt-1 text-[0.75rem] opacity-45">{{ 'students.linkHint' | t }}</p>
      </div>
    } @else {
    <span class="card-label">{{ 'students.link' | t }}</span>
    <div class="card">
      <button type="button" (click)="copy()" [disabled]="!token()" class="list-row w-full text-left">
        <app-icon name="link" class="row-icon" />
        <span class="min-w-0 flex-1 truncate" [class.opacity-50]="!token()">{{ token() ? url() : '…' }}</span>
        <app-icon [name]="copied() ? 'check' : 'copy'" class="size-5 shrink-0 text-[var(--accent)]" />
      </button>
      <!-- The PIN the student made up (asked on a new device); forgotten: reset — they make a new one -->
      <div class="list-row">
        <app-icon name="lock" class="row-icon" />
        <span class="flex-1" [class.opacity-50]="!hasPin()">{{ (hasPin() ? 'students.pinSet' : 'students.pinNone') | t }}</span>
        @if (hasPin()) {
          <button type="button" (click)="resetPin()" class="text-subhead rounded-full bg-[var(--fill)] px-3 py-1 font-medium text-[var(--danger)] hover:bg-[var(--highlight)]">{{ 'students.resetPin' | t }}</button>
        }
      </div>
      <button #resetBtn type="button" (click)="asking.set(resetBtn)" [disabled]="!token()" class="list-row w-full text-left text-[var(--danger)]">
        {{ 'students.newLink' | t }}
      </button>
    </div>
    <p class="text-footnote px-1 opacity-50">{{ 'students.linkHint' | t }}</p>
    }

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
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  readonly token = signal<string | null>(null);
  readonly hasPin = signal(false);
  readonly copied = signal(false);
  protected readonly asking = signal<HTMLElement | null>(null);
  protected readonly choices: ActionChoice[] = [{ value: 'reset', label: 'students.newLink', danger: true }];

  constructor() {
    // The student's link (made on the server the first time)
    effect(() => {
      const id = this.studentId();
      this.token.set(null);
      this.http
        .post<{ token: string; hasPin?: boolean }>(`${environment.apiUrl}/students/${id}/access`, {})
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          this.token.set(res?.token ?? null);
          this.hasPin.set(!!res?.hasPin);
        });
    });
  }

  // Forgotten: the next visit (on any device) makes a new one
  resetPin(): void {
    this.http
      .post(`${environment.apiUrl}/students/${this.studentId()}/pin/reset`, {})
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) this.hasPin.set(false);
      });
  }

  protected url(): string {
    return studentPageUrl(this.token() ?? '');
  }

  /** Copies the link (✓ for a moment: `copied`). */
  copy(): void {
    if (!this.token()) return;
    navigator.clipboard?.writeText(this.url()).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => {},
    );
  }

  /** New link (asked first, next to `origin`): the old one stops working. */
  askNewLink(origin: HTMLElement): void {
    if (this.token()) this.asking.set(origin);
  }

  protected reset(): void {
    this.http
      .post<{ token: string }>(`${environment.apiUrl}/students/${this.studentId()}/access/reset`, {})
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.token) {
          this.token.set(res.token);
          this.hasPin.set(false); // a new link: a new PIN too
        }
      });
  }
}
