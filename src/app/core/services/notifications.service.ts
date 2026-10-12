import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import type { HubConnection } from '@microsoft/signalr';
import { environment } from '@environments/environment';
import { Subject, catchError, firstValueFrom, of } from 'rxjs';
import { AuthStore } from '../../auth/auth.store';
import { DeviceDetectionService } from './device-detection.service';
import { NavStack } from './nav-stack.service';

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
 * notifications to this device when the app is closed or out of view (the app tells the server
 * when it's in view — then its device gets the banner only, not also the push) (Web Push through the Angular service
 * worker — only in the production build; on iPhone only in the app added to the Home Screen).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private auth = inject(AuthStore);
  private swPush = inject(SwPush);
  private router = inject(Router);
  private stack = inject(NavStack);
  private device = inject(DeviceDetectionService);

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
        // In view: the banner (hidden: the device's push says it)
        if (document.visibilityState === 'visible') this.show(n);
      });
      this.hub = hub;
      await hub.start();
      // Here and in view (or not): a visible app gets the banner, not also a push
      this.report();
      hub.onreconnected(() => this.report());
      document.addEventListener('visibilitychange', this.onVisibility);
    } catch {
      // Not reachable now: the next start (another page load) tries again
      this.hub = undefined;
    } finally {
      this.starting = false;
    }
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.hub?.stop();
    this.hub = undefined;
  }

  private readonly onVisibility = () => this.report();

  // Tell the server this app's device (its push endpoint, if subscribed) and whether it's in view.
  private async report(): Promise<void> {
    const hub = this.hub;
    if (!hub) return;
    const sub = this.swPush.isEnabled ? await firstValueFrom(this.swPush.subscription).catch(() => null) : null;
    hub.invoke('Here', sub?.endpoint ?? null, document.visibilityState === 'visible').catch(() => {});
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

  /**
   * Opens what a notification is about (its URL). Phones: a lesson comes up as a card right over
   * the current page (the student's answers on top; just ✕, closing back to where you were);
   * otherwise the page itself.
   */
  open(url: string): void {
    const m = /^\/lessons\/([^/?#]+)(?:\?attempt=([^&#]+))?/.exec(url);
    if (m && this.device.isMobile()) {
      this.stack.push({ kind: 'lesson', id: m[1], attempt: m[2], readOnly: true });
      return;
    }
    this.router.navigateByUrl(url);
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
      this.report();
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
    this.hub?.invoke('Here', null, document.visibilityState === 'visible').catch(() => {});
    await sub.unsubscribe().catch(() => false);
    await firstValueFrom(this.http.post(`${environment.apiUrl}/push/unsubscribe`, { endpoint: sub.endpoint }).pipe(catchError(() => of(null))));
  }
}
