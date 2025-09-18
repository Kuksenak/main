import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthStore {

  private tokenSignal = signal<string | null>(localStorage.getItem('token'));

  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private router = inject(Router);

  token = computed(() => this.tokenSignal());

  isAuthenticated = computed(() => !!this.tokenSignal());

  signin(): void {
    window.location.href = `${this.baseUrl}/auth/signin`;
  }

  signout(): void {
    localStorage.removeItem('token');
    this.tokenSignal.set(null);
    this.router.navigate(['/signin']);
  }

  getToken(state: string | null) {
    if (!state) {
      this.signout();
    } else {
      this.http.get<string>(`${this.baseUrl}/auth/state/${state}`).subscribe(data => {
        localStorage.setItem('token', data);
        this.tokenSignal.set(data);
        this.router.navigate(['']);
      });
    }
  }
}