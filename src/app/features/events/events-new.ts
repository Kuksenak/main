import { Component, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Theme } from 'app/_todo-core/theme/theme';
import { createSheetHeaderRegistrar, createSheetTitleRegistrar } from 'app/core/ui/sheet/sheet-buttons.helper';
import { Toggle } from 'app/core/ui/toggle/toggle';
import { IconButtonDirective } from 'app/core/directives/icon-button.directive';

@Component({
  selector: 'app-events-new',
  standalone: true,
  imports: [CommonModule, FormsModule, Toggle, IconButtonDirective],
  templateUrl: './events-new.html',
})
export class EventsNew {
  private store = inject(AuthStore);
  private themeService = inject(Theme);
  private header = createSheetHeaderRegistrar();
  private sheetTitle = createSheetTitleRegistrar();

  protected accentColor = this.themeService.accentColor;

  @ViewChild('sheetHeaderActions', { static: true })
  private sheetHeaderActionsTpl?: TemplateRef<unknown>;

  // Form state using signals
  protected title = signal('');
  protected description = signal('');
  protected location = signal('');
  protected isAllDay = signal(true);
  protected startDate = signal(this.getTodayDate());
  protected startTime = signal('09:00');
  protected endDate = signal(this.getTodayDate());
  protected endTime = signal('10:00');
  protected selectedCalendarId = signal('');

  protected isSaving = signal(false);

  ngOnInit(): void {
    this.sheetTitle.set('New Event');
  }

  ngAfterViewInit(): void {
    if (this.sheetHeaderActionsTpl) {
      this.header.register(this.sheetHeaderActionsTpl);
    }
  }

  protected closeSheet(): void {
    this.header.sheetRef?.close();
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  save(): void {
    if (!this.title().trim()) {
      alert('Please enter event title');
      return;
    }

    this.isSaving.set(true);

    const startDateTime = this.isAllDay()
      ? `${this.startDate()}T00:00:00`
      : `${this.startDate()}T${this.startTime()}:00`;

    const endDateTime = this.isAllDay()
      ? `${this.endDate()}T23:59:59`
      : `${this.endDate()}T${this.endTime()}:00`;

    const event = {
      title: this.title(),
      description: this.description() || null,
      location: this.location() || null,
      isAllDay: this.isAllDay(),
      startDate: startDateTime,
      endDate: endDateTime,
      calendarId: this.selectedCalendarId(),
    };

    // TODO: Call API to create event
    console.log('Creating event:', event);
    this.isSaving.set(false);
    this.closeSheet();

    // Clear form after creation
    this.resetForm();
  }

  private resetForm(): void {
    this.title.set('');
    this.description.set('');
    this.location.set('');
    this.isAllDay.set(true);
    this.startDate.set(this.getTodayDate());
    this.startTime.set('09:00');
    this.endDate.set(this.getTodayDate());
    this.endTime.set('10:00');
  }
}
