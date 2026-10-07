import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-events',
  templateUrl: './events.html',
  imports: [DatePipe],
})
export class Events {
  protected readonly auth = inject(AuthStore);

  constructor() {
    this.auth.loadEvents();
  }
}
