import { inject, Injectable, Injector, Type } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { take } from 'rxjs';
import { Theme } from '../theme/theme';

/** @deprecated Не отрефакторено (legacy). Почистить и переписать. */
@Injectable({ providedIn: 'root' })
export class Popup {
  private overlay = inject(Overlay);
  private injector = inject(Injector);
  private themeService = inject(Theme);

  open<T>(component: Type<T>, trigger: HTMLElement): OverlayRef {
    const isMobile = this.isMobileViewport();
    const config = this.createOverlayConfig(trigger, isMobile);

    const overlayRef = this.overlay.create(config);
    overlayRef.attach(new ComponentPortal(component, null, this.injector));

    if (isMobile) {
      this.injectHandle(overlayRef);
      this.initMobileAnimation(overlayRef);
      this.setAppStacked(true);
    }

    overlayRef.backdropClick().pipe(take(1)).subscribe(() => this.close(overlayRef, isMobile));
    return overlayRef;
  }

  private isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  private createOverlayConfig(trigger: HTMLElement, isMobile: boolean): OverlayConfig {
    const positionStrategy = isMobile
      ? this.overlay.position().global().centerHorizontally().bottom('0')
      : this.overlay.position().flexibleConnectedTo(trigger).withPositions([{
        originX: 'end', originY: 'bottom',
        overlayX: 'end', overlayY: 'top',
        offsetY: 8
      }]);

    return new OverlayConfig({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: isMobile ? 'sheet-backdrop' : 'panel-backdrop-transparent',
      panelClass: isMobile ? 'mobile-sheet' : 'desktop-sheet',
      scrollStrategy: this.overlay.scrollStrategies.block()
    });
  }

  private initMobileAnimation(overlayRef: OverlayRef) {
    const el = overlayRef.overlayElement;
    el.style.transition = 'none';
    el.style.transform = 'translateY(100%)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform = 'translateY(0)';
      });
    });
  }

  close(overlayRef: OverlayRef, isMobile: boolean) {
    if (isMobile) {
      const el = overlayRef.overlayElement;
      const backdrop = overlayRef.backdropElement;

      this.setAppStacked(false);

      el.style.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
      el.style.transform = 'translateY(100%)';

      if (backdrop) {
        backdrop.style.transition = 'opacity 0.4s ease';
        backdrop.style.opacity = '0';
      }

      setTimeout(() => overlayRef.dispose(), 500);
    } else {
      overlayRef.dispose();
    }
  }

  private injectHandle(overlayRef: OverlayRef) {
    const el = overlayRef.overlayElement;
    const handleWrapper = document.createElement('div');
    handleWrapper.className = 'sheet-handle-wrapper';
    handleWrapper.innerHTML = '<div class="sheet-handle"></div>';

    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    let startY = 0;
    let isDragging = false;

    handleWrapper.addEventListener('pointerdown', (e) => {
      startY = e.clientY;
      isDragging = true;
      el.style.transition = 'none';
      handleWrapper.setPointerCapture(e.pointerId);
    });

    handleWrapper.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      if (deltaY > 0) el.style.transform = `translateY(${deltaY}px)`;
    });

    const endDrag = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = e.clientY - startY;

      if (deltaY > 150) {
        this.close(overlayRef, true);
      } else {
        el.style.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform = 'translateY(0)';
      }
      handleWrapper.releasePointerCapture(e.pointerId);
    };

    handleWrapper.addEventListener('pointerup', endDrag);
    handleWrapper.addEventListener('pointercancel', endDrag);
    el.insertAdjacentElement('afterbegin', handleWrapper);
  }

  private setAppStacked(isStacked: boolean) {
    const wrapper = document.getElementById('app-main-wrapper');
    if (wrapper) wrapper.classList.toggle('app-stacked', isStacked);
  }
}