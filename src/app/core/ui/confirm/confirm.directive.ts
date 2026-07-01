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
      class="w-56 rounded-[28px] origin-top-right
             backdrop-blur-2xl bg-[#f2f2f7]/30 dark:bg-[#1c1c1e]/30
             shadow-[0_0_0_1.5px_#faf9f7,0_2px_8px_rgba(0,0,0,0.06)]
             dark:shadow-[0_0_0_1.5px_#1c1917,0_2px_8px_rgba(0,0,0,0.25)]"
      [style.animation]="closing
        ? 'popoverOut 160ms cubic-bezier(0.4,0,1,1) forwards'
        : 'popoverIn 220ms cubic-bezier(0.2,0,0,1)'"
    >
      <div class="rounded-[28px] overflow-hidden">
        <p class="px-5 pt-6 pb-5 text-[14px] [[data-device=mobile]_&]:text-[18px] leading-snug opacity-50 text-pretty select-none text-center">
          {{ data.message }}
        </p>
        <div class="p-3">
          <button
            type="button"
            appButton
            [variant]="data.variant"
            (click)="confirm()"
            class="w-full"
          >{{ data.confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmPanel {
  readonly data = inject(PANEL_DATA);
  private readonly overlayRef = inject(PANEL_OVERLAY);
  confirmed = false;
  closing = false;

  dismiss() {
    this.closing = true;
    setTimeout(() => this.overlayRef.dispose(), 160);
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
  private overlayRef: OverlayRef | null = null;
  private panelInstance: ConfirmPanel | null = null;

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
        // Top-right of panel = top-right of trigger → panel grows left+down, covers button
        { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'top'    },
        // Fallback: bottom-right of panel = bottom-right of trigger → panel grows left+up
        { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'bottom' },
        { originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'top'    },
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
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
    this.panelInstance = panelRef.instance;

    // Animate out on backdrop click instead of disposing immediately
    this.overlayRef.backdropClick().subscribe(() => this.panelInstance?.dismiss());

    this.overlayRef.detachments().subscribe(() => {
      if (panelRef.instance.confirmed) this.confirmed.emit();
      this.overlayRef = null;
      this.panelInstance = null;
    });
  }
}
