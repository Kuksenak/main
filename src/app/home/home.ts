import { Component, inject, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon } from '../core/ui/icon/icon';
import { Receipt, ReceiptService, ScanError } from '../receipts/receipt.service';

const CATEGORIES = ['groceries', 'household', 'restaurants', 'transport', 'health', 'beauty', 'clothing', 'electronics', 'kids', 'pets', 'entertainment', 'other'];

/**
 * The start page: the receipts. Scan — photos of one receipt (the camera on phones, or files) are
 * read by the server's model: the shop, the date, the total and each line with its category; the
 * receipts listed latest first, a click opens its lines.
 */
@Component({
  selector: 'app-home',
  imports: [Icon, TranslatePipe],
  template: `
    <main class="list-page mx-auto w-full max-w-[48rem]">
      <div class="list-head">
        <h1 class="list-title flex-1">{{ 'receipts.title' | t }}</h1>
        <button type="button" (click)="picker.click()" [disabled]="scanning()" class="list-tab">
          <app-icon name="plus" />{{ 'receipts.scan' | t }}
        </button>
        <input #picker type="file" accept="image/jpeg,image/png,image/webp" multiple (change)="picked(picker)" class="hidden" />
      </div>

      @if (scanning()) {
        <p class="receipt-note animate-pulse">{{ 'receipts.reading' | t }}</p>
      } @else if (error(); as e) {
        <p class="receipt-note !text-[var(--danger)]">{{ errorKey(e) | t }}</p>
      }

      @for (r of receipts.receipts(); track r.id) {
        <div class="receipt">
          <button type="button" (click)="open.set(open() === r.id ? null : r.id)" class="receipt-row">
            <app-icon name="page" class="size-4 shrink-0 opacity-50" />
            <span class="min-w-0 flex-1 truncate">{{ r.store || ('receipts.untitled' | t) }}</span>
            <span class="shrink-0 text-[0.8125rem] opacity-50">{{ dateLabel(r) }}</span>
            <span class="w-28 shrink-0 text-right font-medium tabular-nums">{{ money(r.total, r) }}</span>
          </button>
          @if (open() === r.id) {
            <div class="receipt-items">
              @for (item of r.items; track $index) {
                <div class="receipt-item">
                  <span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
                  @if (item.quantity !== 1) {
                    <span class="shrink-0 tabular-nums opacity-50">× {{ item.quantity }}</span>
                  }
                  <span class="receipt-cat">{{ categoryKey(item.category) | t }}</span>
                  <span class="w-24 shrink-0 text-right tabular-nums">{{ money(item.price, r) }}</span>
                </div>
              } @empty {
                <p class="py-1 opacity-50">{{ 'receipts.noItems' | t }}</p>
              }
              <div class="flex justify-end pt-2">
                <button type="button" (click)="receipts.remove(r.id)" class="list-tab !text-[var(--danger)]"><app-icon name="trash" />{{ 'action.delete' | t }}</button>
              </div>
            </div>
          }
        </div>
      } @empty {
        @if (receipts.loaded() && !scanning()) {
          <p class="receipt-note">{{ 'receipts.empty' | t }}</p>
        }
      }

      <div class="mt-auto flex items-center justify-end gap-2 py-4 text-[0.8125rem] opacity-60">
        <span>{{ auth.email() }}</span>
        <button type="button" (click)="auth.logout()" class="list-tab">{{ 'account.logout' | t }}</button>
      </div>
    </main>
  `,
})
export class Home {
  protected readonly auth = inject(AuthStore);
  protected readonly receipts = inject(ReceiptService);
  private readonly i18n = inject(I18nService);

  protected readonly scanning = signal(false);
  protected readonly error = signal<ScanError | null>(null);
  protected readonly open = signal<string | null>(null);

  constructor() {
    this.receipts.load().catch(() => this.receipts.loaded.set(true));
  }

  // Up to 3 photos of one receipt → read; the new one opened
  protected async picked(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []).slice(0, 3);
    input.value = '';
    if (!files.length) return;
    this.error.set(null);
    this.scanning.set(true);
    const result = await this.receipts.scan(files);
    this.scanning.set(false);
    if (typeof result === 'string') this.error.set(result);
    else this.open.set(result.id);
  }

  protected errorKey(e: ScanError): TranslationKey {
    return `receipts.error.${e}`;
  }

  protected categoryKey(c: string): TranslationKey {
    return (CATEGORIES.includes(c) ? `receipts.cat.${c}` : 'receipts.cat.other') as TranslationKey;
  }

  protected dateLabel(r: Receipt): string {
    const d = r.date ? new Date(`${r.date}T00:00`) : new Date(r.createdAt);
    return this.i18n.date(d, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // An amount in the receipt's currency (none, or one the browser doesn't know: just the number);
  // a formatter per locale and currency, made once
  private readonly formats = new Map<string, Intl.NumberFormat>();
  protected money(amount: number, r: Receipt): string {
    const locale = this.i18n.locale();
    const key = `${locale}|${r.currency ?? ''}`;
    let f = this.formats.get(key);
    if (!f) {
      try {
        f = new Intl.NumberFormat(locale, r.currency ? { style: 'currency', currency: r.currency } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } catch {
        f = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      this.formats.set(key, f);
    }
    return f.format(amount);
  }
}
