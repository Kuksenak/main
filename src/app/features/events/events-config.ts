import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EventsConfig {
  private _selectedCalendar = signal('all');
  readonly selectedCalendar = this._selectedCalendar.asReadonly();

  setSelectedCalendar(calendar: string) {
    this._selectedCalendar.set(calendar);
  }

  reset() {
    this._selectedCalendar.set('all');
  }
}
