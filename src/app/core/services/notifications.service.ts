import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import type { HubConnection } from '@microsoft/signalr';
import { environment } from '@environments/environment';
import { Subject, catchError, firstValueFrom, of } from 'rxjs';
import { AuthStore } from '../../auth/auth.store';

/** Something for the teacher (e.g. a student finished a lesson): what to show, where a tap goes. */
export interface TeacherNotification {
  kind: string;
  title: string;
  body: string;
  url: string;
}

/**
 * The teacher's notifications: live in the open app (SignalR — a banner at the top, see
 * NotificationBanner; `received` for pages that refresh, e.g. a lesson's Students), and push
 * notifications to this device when the app is closed (Web Push through the Angular service
 * worker — only in the production build; on iPhone only in the app added to the Home Screen).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private auth = inject(AuthStore);
  private swPush = inject(SwPush);

  /** The banner's notification (null: none showing). */
  readonly showing = signal<TeacherNotification | null>(null);
  readonly received = new Subject<TeacherNotification>();
  private hub?: HubConnection;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Signed out: nothing more for this app
    effect(() => {
      if (!this.auth.isAuthenticated()) this.stop();
    });
  }

  private starting = false;

  /** Connect once signed in (reconnects on its own). The SignalR library loads only now — it isn't
   * in the app's first download. */
  async start(): Promise<void> {
    if (this.hub || this.starting) return;
    this.starting = true;
    try {
      const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');
      if (!this.auth.isAuthenticated()) return;
      const hub = new HubConnectionBuilder()
        .withUrl(`${environment.apiUrl}/notifications-hub`, { accessTokenFactory: () => this.auth.accessToken() ?? '' })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();
      hub.on('notification', (n: TeacherNotification) => {
        this.received.next(n);
        this.show(n);
      });
      this.hub = hub;
      await hub.start();
    } catch {
      // Not reachable now: the next start (another page load) tries again
      this.hub = undefined;
    } finally {
      this.starting = false;
    }
  }

  stop(): void {
    this.hub?.stop();
    this.hub = undefined;
  }

  show(n: TeacherNotification): void {
    this.showing.set(n);
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.showing.set(null), 6000);
  }

  dismiss(): void {
    clearTimeout(this.hideTimer);
    this.showing.set(null);
  }

  // ---- Push (this device) ----

  /** Push can work here: the service worker is on (production build) and the browser has push. */
  readonly pushAvailable = this.swPush.isEnabled && 'PushManager' in window;
  /** This device subscribed (null: not known yet). */
  readonly pushOn = signal<boolean | null>(null);
  private serverKey: string | null = null;

  /** The device's state and the server's key, ahead of the tap (the permission prompt must come
   * right in it — iOS shows it only then). */
  async prepare(): Promise<void> {
    if (!this.pushAvailable) return void this.pushOn.set(false);
    const [sub, res] = await Promise.all([
      firstValueFrom(this.swPush.subscription),
      firstValueFrom(this.http.get<{ key: string | null }>(`${environment.apiUrl}/push/key`).pipe(catchError(() => of({ key: null })))),
    ]);
    this.serverKey = res.key;
    this.pushOn.set(!!sub);
  }

  /** The server can send pushes (its key is set). */
  get pushConfigured(): boolean {
    return !!this.serverKey;
  }

  /** In the tap: ask the device, then tell the server. False when it didn't work (denied, no key). */
  async enablePush(): Promise<boolean> {
    if (!this.pushAvailable || !this.serverKey) return false;
    try {
      const sub = await this.swPush.requestSubscription({ serverPublicKey: this.serverKey });
      const json = sub.toJSON();
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/push/subscribe`, { endpoint: sub.endpoint, p256dh: json.keys?.['p256dh'], auth: json.keys?.['auth'] }),
      );
      this.pushOn.set(true);
      return true;
    } catch {
      this.pushOn.set(false);
      return false;
    }
  }

  async disablePush(): Promise<void> {
    const sub = await firstValueFrom(this.swPush.subscription);
    this.pushOn.set(false);
    if (!sub) return;
    await sub.unsubscribe().catch(() => false);
    await firstValueFrom(this.http.post(`${environment.apiUrl}/push/unsubscribe`, { endpoint: sub.endpoint }).pipe(catchError(() => of(null))));
  }
}
