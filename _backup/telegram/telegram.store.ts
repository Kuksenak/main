import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '@environments/environment';

export interface TelegramStatus {
  enabled: boolean;
  linked: boolean;
  botUsername: string | null;
}

export interface TelegramMessage {
  id: string;
  isIncoming: boolean;
  text: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TelegramStore {
  private http = inject(HttpClient);

  private _status = signal<TelegramStatus>({ enabled: false, linked: false, botUsername: null });
  private _messages = signal<TelegramMessage[]>([]);

  readonly status = this._status.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly linked = computed(() => this._status().linked);

  loadStatus(): void {
    this.http
      .get<TelegramStatus>(`${environment.apiUrl}/telegram/status`)
      .pipe(catchError(() => of({ enabled: false, linked: false, botUsername: null })))
      .subscribe((s) => this._status.set(s));
  }

  loadMessages(): void {
    this.http
      .get<{ messages: TelegramMessage[] }>(`${environment.apiUrl}/telegram/messages`)
      .pipe(catchError(() => of({ messages: [] })))
      .subscribe((res) => this._messages.set(res.messages ?? []));
  }

  link(): Observable<{ code: string; deepLink: string } | null> {
    return this.http
      .post<{ code: string; deepLink: string }>(`${environment.apiUrl}/telegram/link`, {})
      .pipe(catchError(() => of(null)));
  }

  send(text: string): Observable<unknown> {
    return this.http
      .post(`${environment.apiUrl}/telegram/send`, { text })
      .pipe(
        catchError(() => of(null)),
        tap(() => this.loadMessages()),
      );
  }

  unlink(): void {
    this.http
      .post(`${environment.apiUrl}/telegram/unlink`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this._messages.set([]);
        this.loadStatus();
      });
  }
}
