import { Component, inject, OnInit } from '@angular/core';
import { environment } from '@environments/environment';
import { SignalRService } from 'app/_todo-core/realtime/signalr';
import { createSheetTitleRegistrar } from 'app/core/ui/sheet/sheet-buttons.helper';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private signalR = inject(SignalRService);
  private title = createSheetTitleRegistrar();

  protected version = environment.version;
  protected messages: string[] = [];

  ngOnInit() {
    this.title.set('Settings');

    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
    });
  }
}
