import { inject, Injectable, InjectionToken, Injector, Type } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { take } from 'rxjs';
import { SheetContainer } from './sheet-container';

export const SHEET_REF = new InjectionToken<SheetRef>('SHEET_REF');

export class SheetRef {
  contentPortal!: ComponentPortal<unknown>;

  constructor(private readonly closeFn: () => void) {}

  close(): void {
    this.closeFn();
  }
}

@Injectable({ providedIn: 'root' })
export class Sheet {
  private overlay = inject(Overlay);
  private injector = inject(Injector);

  open<T>(component: Type<T>): SheetRef {
    const overlayRef = this.overlay.create(
      new OverlayConfig({
        positionStrategy: this.overlay.position().global().centerHorizontally().bottom('0'),
        hasBackdrop: true,
        backdropClass: 'sheet-backdrop',
        panelClass: 'sheet-panel',
        width: '100%',
        maxWidth: '640px',
        scrollStrategy: this.overlay.scrollStrategies.block(),
      }),
    );

    const containerRef = overlayRef.attach(new ComponentPortal(SheetContainer, null, this.injector));

    const sheetRef = new SheetRef(() => this.dispose(overlayRef, containerRef.instance));

    const contentInjector = Injector.create({
      providers: [{ provide: SHEET_REF, useValue: sheetRef }],
      parent: this.injector,
    });
    sheetRef.contentPortal = new ComponentPortal(component, null, contentInjector);

    containerRef.instance.sheetRef = sheetRef;

    requestAnimationFrame(() => requestAnimationFrame(() => containerRef.instance.enter()));

    overlayRef.backdropClick().pipe(take(1)).subscribe(() => sheetRef.close());

    return sheetRef;
  }

  private dispose(overlayRef: OverlayRef, container: SheetContainer): void {
    if (!overlayRef.hasAttached()) {
      return;
    }

    container.leave();

    const backdrop = overlayRef.backdropElement;
    if (backdrop) {
      backdrop.style.transition = 'opacity 0.35s ease';
      backdrop.style.opacity = '0';
    }

    setTimeout(() => overlayRef.dispose(), 420);
  }
}
