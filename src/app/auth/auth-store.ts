import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthStore {

  private tokenSignal = signal<string | null>(localStorage.getItem('token'));

  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  token = computed(() => this.tokenSignal());

  isAuthenticated = computed(() => !!this.tokenSignal());

  signin(): void {
    window.location.href = `${this.baseUrl}/auth/signin`;
  }

  signout(): void {
    this.tokenSignal.set(null);
    localStorage.removeItem('token');
  }

  getToken(state: string | null) {
    if (!state) {
      this.signout();
    } else {

      this.http.get<{ token: string, user: any }>(`${this.baseUrl}/auth/state/${state}`).subscribe(data => {
        localStorage.setItem('token', data.token);
        this.tokenSignal.set(data.token);
      });
    }
  }
}