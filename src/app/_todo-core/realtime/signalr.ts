import * as signalR from '@microsoft/signalr';
import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection!: signalR.HubConnection;

  startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/notifications-hub`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log('Connected to SignalR'))
      .catch(err => console.error(err));
  }

  onNotification(callback: (message: string) => void) {
    this.hubConnection.on('ReceiveNotification', callback);
  }
}