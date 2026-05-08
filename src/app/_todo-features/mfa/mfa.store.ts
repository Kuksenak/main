import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { environment } from "@environments/environment";
import { Mfa } from "app/_todo-features/mfa/mfa.model";

@Injectable({ providedIn: 'root' })
export class MfaStore {

  private baseUrl = `${environment.apiUrl}/mfa`;
  private http = inject(HttpClient);

  items = signal<Mfa[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  load() {
    this.loading.set(true);
    this.http.get<Mfa[]>(`${this.baseUrl}`).subscribe({
      next: data => this.items.set(data),
      error: err => this.error.set(err.message),
      complete: () => this.loading.set(false)
    });
  }

  create(issuer: string, secret: string) {
    this.loading.set(true);
    const payload: Partial<Mfa> = { issuer, secret };

    this.http.post<Mfa>(`${this.baseUrl}/create`, payload).subscribe({
      next: mfa => {
        this.items.update(list => [...list, mfa])
      },
      error: err => this.error.set(err.message),
      complete: () => this.loading.set(false)
    });
  }

  remove(id: string) {
    this.items.update(list => list.filter(m => m.id !== id));
  }
}