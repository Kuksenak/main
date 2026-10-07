import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../auth/auth.store';
import { Sheet } from '../core/ui/sheet/sheet';
import { Admin } from '../admin/admin';
import { Calendar } from '../calendar/calendar';
import { Telegram } from '../telegram/telegram';

@Component({
  selector: 'app-home',
  imports: [DatePipe, FormsModule],
  templateUrl: './home.html',
})
export class Home {
  protected readonly auth = inject(AuthStore);
  private sheet = inject(Sheet);
  protected draft = '';

  openCalendar(): void {
    this.sheet.open(Calendar);
  }

  openTelegram(): void {
    this.sheet.open(Telegram);
  }

  openAdmin(): void {
    this.sheet.open(Admin);
  }
}
