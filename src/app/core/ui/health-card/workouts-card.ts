import { Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-workouts-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    @if (workouts().length) {
      <div class="flex flex-col gap-2">
        @for (w of workouts(); track w.date + '-' + w.distanceKm) {
          <div class="rounded-2xl bg-[var(--card)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-2">
            <div class="flex items-baseline justify-between">
              <span class="text-2xl font-semibold tabular-nums">{{ w.distanceKm | number: '1.0-2' }} <span class="text-sm font-normal opacity-50">km</span></span>
              <span class="text-xs opacity-50">{{ w.date | date: 'd MMM' }}</span>
            </div>
            <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span class="tabular-nums"><b>{{ w.durationMin | number: '1.0-0' }}</b> <span class="opacity-50">min</span></span>
              <span class="tabular-nums"><b>{{ w.calories | number: '1.0-0' }}</b> <span class="opacity-50">kcal</span></span>
              @if (w.avgHr) {
                <span class="tabular-nums"><b>{{ w.avgHr }}</b> <span class="opacity-50">bpm avg</span></span>
              }
              @if (w.distanceKm > 0 && w.durationMin > 0) {
                <span class="tabular-nums"><b>{{ pace(w) }}</b> <span class="opacity-50">/km</span></span>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <p class="text-sm opacity-50 text-pretty">
        No runs yet. Sync — the shortcut sends your recent running workouts here.
      </p>
    }
  `,
})
export class WorkoutsCard {
  private readonly health = inject(HealthService);

  protected readonly workouts = computed(() => this.health.data()?.workouts ?? []);

  protected pace(w: { distanceKm: number; durationMin: number }): string {
    const secPerKm = (w.durationMin * 60) / w.distanceKm;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
