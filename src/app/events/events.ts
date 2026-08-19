import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-events',
  imports: [DatePipe, RouterLink],
  templateUrl: './events.html',
})
export class Events {
  protected readonly auth = inject(AuthStore);

  constructor() {
    this.auth.loadEvents();
  }
}
