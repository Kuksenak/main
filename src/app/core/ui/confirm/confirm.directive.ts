import {
  Component, Directive, ElementRef, EventEmitter,
  HostListener, InjectionToken, Injector,
  Input, Output, inject,
} from '@angular/core';
import { Overlay, OverlayRef, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ButtonDirective } from '../button/button.directive';
import { ButtonVariant } from '../button/button-styles';
import { DeviceDetectionService } from '../../services/device-detection.service';

// ── Data passed to the panel ────────────────────────────────────

interface PanelData {
  message: string;
  confirmLabel: string;
  variant: ButtonVariant;
  isMobile: boolean;
}

const PANEL_DATA    = new InjectionToken<PanelData>('confirm-panel-data');
const PANEL_OVERLAY = new InjectionToken<OverlayRef>('confirm-panel-overlay');

// ── Floating panel component ────────────────────────────────────

@Component({
  selector: 'app-confirm-panel',
  standalone: true,
  imports: [ButtonDirective],
  host: { class: 'block w-full' },
  template: `
    @if (data.isMobile) {
      <!-- Mobile: full-width bottom sheet — action group + separate Cancel -->
      <div
        class="w-full px-2 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] will-change-transform"
        [style.animation]="closing
          ? 'sheetDown 300ms cubic-bezier(0.32,0.72,0,1) forwards'
          : 'sheetUp 350ms cubic-bezier(0.32,0.72,0,1)'"
      >
        <!-- Message + action -->
        <div class="mb-2 rounded-2xl overflow-hidden bg-[var(--card)] shadow-[0_6px_28px_rgba(0,0,0,0.1)]">
          <p class="px-4 pt-4 pb-3 text-center text-[15px] leading-snug opacity-50 text-pretty select-none">
            {{ data.message }}
          </p>
          <button
            type="button"
            (click)="confirm()"
            [style.color]="actionColor"
            class="w-full py-3.5 text-[19px] select-none active:bg-black/5 dark:active:bg-white/10 transition-colors [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
          >{{ data.confirmLabel }}</button>
        </div>

        <!-- Cancel -->
        <button
          type="button"
          (click)="dismiss()"
          class="w-full rounded-2xl bg-[var(--card)] shadow-[0_6px_28px_rgba(0,0,0,0.1)] py-3.5 text-[19px] text-[#d4732f] select-none active:brightness-95 dark:active:brightness-125 transition-[filter] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
        >Cancel</button>
      </div>
    } @else {
      <!-- Desktop: popover anchored to the trigger -->
      <div
        class="w-56 rounded-2xl origin-top-right bg-[var(--surface)] border border-black/10 dark:border-white/10
               shadow-[0_-2px_20px_rgba(0,0,0,0.08)]"
        [style.animation]="closing
          ? 'popoverOut 160ms cubic-bezier(0.4,0,1,1) forwards'
          : 'popoverIn 220ms cubic-bezier(0.2,0,0,1)'"
      >
        <div class="rounded-2xl overflow-hidden">
          <p class="px-5 pt-5 pb-4 text-[14px] leading-snug opacity-50 text-pretty select-none text-center">
            {{ data.message }}
          </p>
          <div class="px-3 pb-3">
            <button type="button" appButton [variant]="data.variant" (click)="confirm()" class="w-full">
              {{ data.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
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
    setTimeout(() => this.overlayRef.dispose(), this.data.isMobile ? 300 : 160);
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

  private readonly overlay    = inject(Overlay);
  private readonly elementRef = inject(ElementRef);
  private readonly injector   = inject(Injector);
  private readonly deviceService = inject(DeviceDetectionService);
  private overlayRef: OverlayRef | null = null;
  private panelInstance: ConfirmPanel | null = null;

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.overlayRef) return;
    this.open();
  }

  private open() {
    const isMobile = this.deviceService.isMobile();
    this.overlayRef = this.overlay.create(this.buildConfig(isMobile));

    const injector = Injector.create({
      providers: [
        { provide: PANEL_DATA, useValue: {
          message: this.message,
          confirmLabel: this.confirmLabel,
          variant: this.confirmVariant,
          isMobile,
        } },
        { provide: PANEL_OVERLAY, useValue: this.overlayRef },
      ],
      parent: this.injector,
    });

    const panelRef = this.overlayRef.attach(new ComponentPortal(ConfirmPanel, null, injector));
    this.panelInstance = panelRef.instance;

    this.overlayRef.backdropClick().subscribe(() => this.panelInstance?.dismiss());
    this.overlayRef.detachments().subscribe(() => {
      if (panelRef.instance.confirmed) this.confirmed.emit();
      this.overlayRef = null;
      this.panelInstance = null;
    });
  }

  private buildConfig(isMobile: boolean): OverlayConfig {
    if (isMobile) {
      return new OverlayConfig({
        positionStrategy: this.overlay.position().global().centerHorizontally().bottom('0'),
        width: '100%',
        hasBackdrop: true,
        backdropClass: 'picker-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.noop(),
      });
    }

    return new OverlayConfig({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.elementRef)
        .withPositions([
          { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'top'    },
          { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'bottom' },
          { originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'top'    },
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
        ]),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
  }
}
