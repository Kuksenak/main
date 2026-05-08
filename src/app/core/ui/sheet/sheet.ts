import { inject, Injectable, Injector, Type } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { take } from 'rxjs';
import { SheetContainer } from './sheet-container';

@Injectable({ providedIn: 'root' })
export class Sheet {
  private overlay = inject(Overlay);
  private injector = inject(Injector);

  open<T>(component: Type<T>): OverlayRef {
    const config = this.createOverlayConfig();
    const overlayRef = this.overlay.create(config);

    // Прикрепляем контейнер-оболочку
    const containerPortal = new ComponentPortal(SheetContainer, null, this.injector);
    const containerRef = overlayRef.attach(containerPortal);
    
    // Передаем целевой компонент внутрь контейнера
    containerRef.instance.portal = new ComponentPortal(component, null, this.injector);
    containerRef.instance.overlayRef = overlayRef;

    // Анимация появления (двойной кадр для гарантии старта анимации)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        containerRef.instance.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
        containerRef.instance.transform = 'translateY(0)';
      });
    });

    this.setAppStacked(true);

    // Закрытие при клике на бэкдроп или вызове из контейнера
    overlayRef.backdropClick().pipe(take(1)).subscribe(() => this.close(overlayRef, containerRef.instance));
    
    // Перехватываем метод закрытия из контейнера
    const originalClose = containerRef.instance.close.bind(containerRef.instance);
    containerRef.instance.close = () => this.close(overlayRef, containerRef.instance);

    return overlayRef;
  }

  private createOverlayConfig(): OverlayConfig {
    return new OverlayConfig({
      positionStrategy: this.overlay.position().global().centerHorizontally().bottom('0'),
      hasBackdrop: true,
      backdropClass: 'sheet-backdrop',
      panelClass: 'sheet-panel-container',
      width: '100%',
      scrollStrategy: this.overlay.scrollStrategies.block()
    });
  }

  close(overlayRef: OverlayRef, container: SheetContainer) {
    this.setAppStacked(false);

    container.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
    container.transform = 'translateY(100%)';

    const backdrop = overlayRef.backdropElement;
    if (backdrop) {
      backdrop.style.transition = 'opacity 0.4s ease';
      backdrop.style.opacity = '0';
    }

    setTimeout(() => overlayRef.dispose(), 500);
  }

  private setAppStacked(isStacked: boolean) {
    const wrapper = document.getElementById('app-main-wrapper');
    if (wrapper) wrapper.classList.toggle('app-stacked', isStacked);
  }
}
