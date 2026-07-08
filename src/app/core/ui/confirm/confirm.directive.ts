import {
  Component, Directive, EventEmitter,
  HostListener, InjectionToken, Injector,
  Input, Output, inject,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ButtonVariant } from '../button/button-styles';

// ── Data passed to the panel ────────────────────────────────────

interface PanelData {
  message: string;
  confirmLabel: string;
  variant: ButtonVariant;
}

const PANEL_DATA    = new InjectionToken<PanelData>('confirm-panel-data');
const PANEL_OVERLAY = new InjectionToken<OverlayRef>('confirm-panel-overlay');

// ── Bottom-sheet confirm (action group + separate Cancel) ───────

@Component({
  selector: 'app-confirm-panel',
  standalone: true,
  host: { class: 'block w-full' },
  template: `
    <div
      class="w-full px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] will-change-transform"
      [style.animation]="closing
        ? 'sheetDown 300ms cubic-bezier(0.32,0.72,0,1) forwards'
        : 'sheetUp 350ms cubic-bezier(0.32,0.72,0,1)'"
    >
      <!-- Message + action -->
      <div class="mb-2 rounded-2xl overflow-hidden bg-[var(--card)] shadow-[0_6px_28px_rgba(0,0,0,0.1)]">
        <p class="px-4 pt-4 pb-3 text-center text-[14px] leading-snug opacity-50 text-pretty select-none">
          {{ data.message }}
        </p>
        <button
          type="button"
          (click)="confirm()"
          [style.color]="actionColor"
          class="w-full py-3.5 text-[30px] select-none active:bg-black/5 dark:active:bg-white/10 transition-colors [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
        >{{ data.confirmLabel }}</button>
      </div>

      <!-- Cancel -->
      <button
        type="button"
        (click)="dismiss()"
        class="w-full rounded-2xl bg-[var(--card)] shadow-[0_6px_28px_rgba(0,0,0,0.1)] py-3.5 text-[30px] font-semibold text-[#d4732f] select-none active:brightness-95 dark:active:brightness-125 transition-[filter] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      >Cancel</button>
    </div>
  `,
})
export class ConfirmPanel {
  readonly data = inject(PANEL_DATA);
  private readonly overlayRef = inject(PANEL_OVERLAY);
  confirmed = false;
  closing = false;

  get actionColor(): string {
    return this.data.variant === 'warn' ? '#e5484d' : '#d4732f';
  }

  dismiss() {
    this.closing = true;
    setTimeout(() => this.overlayRef.dispose(), 300);
  }

  confirm() {
    this.confirmed = true;
    this.dismiss();
  }
}

// ── Directive ───────────────────────────────────────────────────

@Directive({
  selector: '[appConfirm]',
  standalone: true,
})
export class ConfirmDirective {
  @Input('appConfirm') message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Input() confirmVariant: ButtonVariant = 'warn';
  @Output() confirmed = new EventEmitter<void>();

  private readonly overlay  = inject(Overlay);
  private readonly injector = inject(Injector);
  private overlayRef: OverlayRef | null = null;
  private panelInstance: ConfirmPanel | null = null;
  private prevThemeColor: string | null = null;

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.overlayRef) return;
    this.open();
  }

  private open() {
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().bottom('0'),
      width: '100%',
      hasBackdrop: true,
      backdropClass: 'picker-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.noop(),
    });

    const injector = Injector.create({
      providers: [
        { provide: PANEL_DATA, useValue: {
          message: this.message,
          confirmLabel: this.confirmLabel,
          variant: this.confirmVariant,
        } },
        { provide: PANEL_OVERLAY, useValue: this.overlayRef },
      ],
      parent: this.injector,
    });

    const panelRef = this.overlayRef.attach(new ComponentPortal(ConfirmPanel, null, injector));
    this.panelInstance = panelRef.instance;
    this.setTitleBarDim(true);

    this.overlayRef.backdropClick().subscribe(() => this.panelInstance?.dismiss());
    this.overlayRef.detachments().subscribe(() => {
      this.setTitleBarDim(false);
      if (panelRef.instance.confirmed) this.confirmed.emit();
      this.overlayRef = null;
      this.panelInstance = null;
    });
  }

  // Dim the OS title bar (theme-color) so it darkens with the backdrop instead of
  // staying bright white.
  private setTitleBarDim(on: boolean) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (on) {
      this.prevThemeColor = meta.getAttribute('content');
      meta.setAttribute('content', this.darken(this.prevThemeColor ?? '#ffffff', 0.82));
    } else if (this.prevThemeColor !== null) {
      meta.setAttribute('content', this.prevThemeColor);
      this.prevThemeColor = null;
    }
  }

  private darken(hex: string, factor: number): string {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const to = (i: number) =>
      Math.round(parseInt(full.slice(i, i + 2), 16) * factor)
        .toString(16)
        .padStart(2, '0');
    return `#${to(0)}${to(2)}${to(4)}`;
  }
}
