import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number; // the line's total
  category: string;
}

export interface Receipt {
  id: string;
  store: string | null;
  date: string | null; // yyyy-MM-dd
  total: number;
  currency: string | null;
  createdAt: string;
  items: ReceiptItem[];
}

/** Why a scan failed: no receipt in the photo, the model couldn't read it / isn't set up, the photo's not taken. */
export type ScanError = 'notReceipt' | 'unreadable' | 'badImage';

/** The account's receipts: loaded once, a scanned one added at the top. */
@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/receipts`;

  readonly receipts = signal<Receipt[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    const list = await firstValueFrom(this.http.get<Receipt[]>(this.url));
    this.receipts.set(list);
    this.loaded.set(true);
  }

  /** Photos of one receipt (a long one in parts, in order) → the receipt as read; or why not. */
  async scan(files: File[]): Promise<Receipt | ScanError> {
    const form = new FormData();
    for (const f of files) form.append('images', f, f.name);
    try {
      const receipt = await firstValueFrom(this.http.post<Receipt>(`${this.url}/scan`, form));
      this.receipts.update((list) => [receipt, ...list]);
      return receipt;
    } catch (e) {
      const status = e instanceof HttpErrorResponse ? e.status : 0;
      return status === 422 ? 'notReceipt' : status === 400 ? 'badImage' : 'unreadable';
    }
  }

  async remove(id: string): Promise<void> {
    this.receipts.update((list) => list.filter((r) => r.id !== id));
    await firstValueFrom(this.http.delete(`${this.url}/${id}`));
  }
}
