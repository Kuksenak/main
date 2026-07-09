import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HealthService } from '../../services/health.service';
import { ButtonDirective } from '../button/button.directive';

@Component({
  selector: 'app-health-card',
  standalone: true,
  imports: [DatePipe, ButtonDirective],
  template: `
    <div class="flex flex-col gap-3 rounded-2xl bg-[var(--card)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
      @if (days().length) {
        <div class="flex flex-col gap-2">
          @for (day of days(); track day.date) {
            <div class="flex items-center gap-3">
              <span class="w-9 shrink-0 text-xs opacity-50">{{ day.date | date: 'EEE' }}</span>
              <div class="flex-1 h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div class="h-full rounded-full bg-[#d4732f]" [style.width.%]="(day.steps / max()) * 100"></div>
              </div>
              <span class="w-14 shrink-0 text-right text-sm tabular-nums font-medium">{{ day.steps }}</span>
            </div>
          }
        </div>
        <span class="text-xs opacity-40">Synced {{ health.data()!.syncedAt | date: 'short' }}</span>
      } @else {
        <p class="text-sm opacity-50 text-pretty">
          No steps yet. Tap sync — it runs the “SyncHealth” Shortcut, which reads your daily steps
          from the Health app and reopens the app with them.
        </p>
      }

      <div class="flex items-center gap-2">
        <button appButton (click)="health.sync()">Sync from Apple Health</button>
        @if (days().length) {
          <button appButton variant="warn" (click)="health.clear()">Clear</button>
        }
      </div>
    </div>
  `,
})
export class HealthCard {
  protected readonly health = inject(HealthService);

  protected readonly days = computed(() => this.health.data()?.days ?? []);
  protected readonly max = computed(() =>
    Math.max(1, ...this.days().map((d) => d.steps)),
  );
}
