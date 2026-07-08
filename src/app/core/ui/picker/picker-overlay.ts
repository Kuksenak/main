import {
  Component,
  Injectable,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, PortalModule, TemplatePortal } from '@angular/cdk/portal';

/**
 * Adaptive overlay surface shared by Select / Date / Time.
 *   Desktop → floating panel anchored to the trigger (dropdownIn).
 *   Mobile  → short bottom sheet that slides up (auto height).
 * The container owns the surface look (bg / radius / shadow); components only
 * project their content, so every picker reads as the same material.
 */

const PANEL_DESKTOP =
  'w-full rounded-2xl bg-[var(--surface)] overflow-hidden origin-top ' +
  '[animation:dropdownIn_160ms_cubic-bezier(0.2,0,0,1)] ' +
  'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_30px_rgba(0,0,0,0.12)] ' +
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.5)]';

const PANEL_MOBILE =
  'w-full rounded-t-[28px] bg-[var(--surface)] overflow-hidden will-change-transform ' +
  'pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] ' +
  'shadow-[0_-2px_30px_rgba(0,0,0,0.18)]';

@Component({
  selector: 'app-picker-container',
  standalone: true,
  imports: [PortalModule],
  template: `
    <div
      [class]="isMobile ? mobileClass : desktopClass"
      [style.transform]="transform"
      [style.transition]="transition"
    >
      <ng-template [cdkPortalOutlet]="content"></ng-template>
    </div>
  `,
})
export class PickerContainer {
  content!: TemplatePortal;
  isMobile = false;

  readonly desktopClass = PANEL_DESKTOP;
  readonly mobileClass = PANEL_MOBILE;

  transform = '';
  transition = 'none';

  animateIn() {
    if (!this.isMobile) return; // desktop uses the dropdownIn keyframe
    this.transform = 'translate3d(0, 100%, 0)';
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
        this.transform = 'translate3d(0, 0, 0)';
      }),
    );
  }

  animateOut(done: () => void) {
    if (!this.isMobile) {
      done();
      return;
    }
    this.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    this.transform = 'translate3d(0, 100%, 0)';
    setTimeout(done, 350);
  }
}

export class PickerRef {
  constructor(
    private readonly overlayRef: OverlayRef,
    private readonly container: PickerContainer,
  ) {}

  close() {
    if (!this.overlayRef.hasAttached()) return;
    this.container.animateOut(() => this.overlayRef.dispose());
  }
}

export interface PickerOptions {
  origin: HTMLElement;
  template: TemplateRef<unknown>;
  viewContainerRef: ViewContainerRef;
  isMobile: boolean;
  /** Fixed desktop panel width. If omitted, matches the trigger width (>= minWidth). */
  width?: number;
  minWidth?: number;
  onClose?: () => void;
}

@Injectable({ providedIn: 'root' })
export class PickerOverlay {
  private readonly overlay = inject(Overlay);

  open(opts: PickerOptions): PickerRef {
    const overlayRef = this.overlay.create(this.buildConfig(opts));
    const containerRef = overlayRef.attach(new ComponentPortal(PickerContainer));
    const container = containerRef.instance;

    container.isMobile = opts.isMobile;
    container.content = new TemplatePortal(opts.template, opts.viewContainerRef);
    container.animateIn();

    const ref = new PickerRef(overlayRef, container);
    overlayRef.backdropClick().subscribe(() => ref.close());
    if (opts.onClose) overlayRef.detachments().subscribe(() => opts.onClose!());

    return ref;
  }

  private buildConfig(opts: PickerOptions): OverlayConfig {
    if (opts.isMobile) {
      return new OverlayConfig({
        positionStrategy: this.overlay.position().global().centerHorizontally().bottom('0'),
        width: '100%',
        hasBackdrop: true,
        backdropClass: 'picker-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.block(),
      });
    }

    return new OverlayConfig({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(opts.origin)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
        ]),
      width: opts.width ?? Math.max(opts.origin.offsetWidth, opts.minWidth ?? 0),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
  }
}
