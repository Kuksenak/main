import { inject, Injectable, Injector, Type, InjectionToken } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { BehaviorSubject, take } from 'rxjs';
import { SheetContainer } from './sheet-container';

export const SHEET_REF = new InjectionToken<SheetRef>('sheet-ref');

export class SheetRef {
  contentPortal!: ComponentPortal<any>;
  title$ = new BehaviorSubject<string | null>(null);
  headerPortal$ = new BehaviorSubject<TemplatePortal<unknown> | null>(null);
  buttonsPortal$ = new BehaviorSubject<TemplatePortal<unknown> | null>(null);

  constructor(private closeCallback: () => void) {}

  setButtons(portal: TemplatePortal<unknown>) {
    this.buttonsPortal$.next(portal);
  }

  setHeader(portal: TemplatePortal<unknown>) {
    this.headerPortal$.next(portal);
  }

  setTitle(title: string | null) {
    this.title$.next(title);
  }

  close() {
    this.closeCallback();
  }
}

/** @deprecated Не отрефакторено (legacy). Почистить и переписать. */
@Injectable({ providedIn: 'root' })
export class Sheet {
  private overlay = inject(Overlay);
  private injector = inject(Injector);
  private activeSheets: OverlayRef[] = [];

  open<T>(component: Type<T>): SheetRef {
    const overlayConfig = this.createOverlayConfig();
    const overlayRef = this.overlay.create(overlayConfig);

    // Прикрепляем контейнер-оболочку
    const containerPortal = new ComponentPortal(SheetContainer, null, this.injector);
    const containerRef = overlayRef.attach(containerPortal);

    const sheetRef = new SheetRef(() => this.close(overlayRef, containerRef.instance, sheetRef));
    
    // Передаем целевой компонент внутрь контейнера
    const providers = [{ provide: SHEET_REF, useValue: sheetRef }];

    const componentInjector = Injector.create({
      providers,
      parent: this.injector
    });
    
    sheetRef.contentPortal = new ComponentPortal(component, null, componentInjector);
    containerRef.instance.sheetRef = sheetRef;
    containerRef.instance.overlayRef = overlayRef;
    this.activeSheets.push(overlayRef);

    // Анимация появления (двойной кадр для гарантии старта анимации)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        containerRef.instance.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
        containerRef.instance.transform = 'translate3d(0, 0, 0)';
      });
    });

    this.setAppStacked(this.activeSheets.length > 0);

    // Закрытие при клике на бэкдроп или вызове из контейнера
    overlayRef.backdropClick().pipe(take(1)).subscribe(() => this.close(overlayRef, containerRef.instance, sheetRef));

    return sheetRef;
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

  close(overlayRef: OverlayRef, container: SheetContainer, sheetRef: SheetRef) {
    if (!overlayRef.hasAttached()) {
      return;
    }

    this.activeSheets = this.activeSheets.filter((ref) => ref !== overlayRef);
    this.setAppStacked(this.activeSheets.length > 0);

    sheetRef.title$.next(null);
    sheetRef.headerPortal$.next(null);
    sheetRef.buttonsPortal$.next(null);

    container.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
    container.transform = 'translate3d(0, 100%, 0)';

    const backdrop = overlayRef.backdropElement;
    if (backdrop) {
      backdrop.style.transition = 'opacity 0.4s ease';
      backdrop.style.opacity = '0';
    }

    setTimeout(() => overlayRef.dispose(), 500);
  }

  private setAppStacked(isStacked: boolean) {
    document.getElementById('app-main-wrapper')?.classList.toggle('app-stacked', isStacked);
    document.getElementById('app-navbar')?.classList.toggle('sheet-open', isStacked);
  }
}
