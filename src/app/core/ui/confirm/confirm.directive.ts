import {
  Component, Directive, ElementRef, EventEmitter,
  HostListener, InjectionToken, Injector,
  Input, Output, inject,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ButtonDirective } from '../button/button.directive';
import { ButtonVariant } from '../button/button-styles';

// ── Data passed to the panel ────────────────────────────────────

interface PanelData {
  message: string;
  confirmLabel: string;
  variant: ButtonVariant;
}

const PANEL_DATA    = new InjectionToken<PanelData>('confirm-panel-data');
const PANEL_OVERLAY = new InjectionToken<OverlayRef>('confirm-panel-overlay');

// ── Floating panel component ────────────────────────────────────

@Component({
  selector: 'app-confirm-panel',
  standalone: true,
  imports: [ButtonDirective],
  template: `
    <div
      class="w-56 rounded-2xl overflow-hidden origin-bottom-right
             bg-white/70 dark:bg-[#2a2522]/75 backdrop-blur-xl
             shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_16px_40px_rgba(0,0,0,0.16)]
             dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.5)]
             [animation:popoverIn_180ms_cubic-bezier(0.2,0,0,1)]"
    >
      <p class="px-5 pt-6 pb-5 text-[13px] [[data-device=mobile]_&]:text-[15px] leading-snug opacity-50 text-pretty select-none text-center">
        {{ data.message }}
      </p>
      <div class="px-3 py-3 flex justify-center">
        <button
          type="button"
          appButton
          [variant]="data.variant"
          (click)="confirm()"
        >{{ data.confirmLabel }}</button>
      </div>
    </div>
  `,
})
export class ConfirmPanel {
  readonly data = inject(PANEL_DATA);
  private readonly overlayRef = inject(PANEL_OVERLAY);
  confirmed = false;

  confirm() {
    this.confirmed = true;
    this.overlayRef.dispose();
  }
}

// ── Directive ───────────────────────────────────────────────────

@Directive({
  selector: '[appConfirm]',
  standalone: true,
})
export class ConfirmDirective {
  /** Message shown in the popover */
  @Input('appConfirm') message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Input() confirmVariant: ButtonVariant = 'warn';
  @Output() confirmed = new EventEmitter<void>();

  private readonly overlay    = inject(Overlay);
  private readonly elementRef = inject(ElementRef);
  private readonly injector   = inject(Injector);
  private overlayRef: OverlayRef | null = null;

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.overlayRef) return;
    this.open();
  }

  private open() {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        // Primary: panel grows upward, its bottom-right covers the trigger button
        { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'bottom' },
        // Fallback: panel grows downward from button's top-right
        { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'top'    },
        // Fallback left-aligned variants
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
        { originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'top'    },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const injector = Injector.create({
      providers: [
        { provide: PANEL_DATA,    useValue: { message: this.message, confirmLabel: this.confirmLabel, variant: this.confirmVariant } },
        { provide: PANEL_OVERLAY, useValue: this.overlayRef },
      ],
      parent: this.injector,
    });

    const panelRef = this.overlayRef.attach(new ComponentPortal(ConfirmPanel, null, injector));

    this.overlayRef.backdropClick().subscribe(() => this.overlayRef?.dispose());

    this.overlayRef.detachments().subscribe(() => {
      if (panelRef.instance.confirmed) this.confirmed.emit();
      this.overlayRef = null;
    });
  }
}
