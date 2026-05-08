import { Injectable, inject } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Snack, SnackType } from '../ui/snack/snack';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private overlay = inject(Overlay);
  private activeToasts: any[] = [];

  show(message: string, type: SnackType = 'info') {
    const overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position()
        .global()
        .bottom(this.getPosition(0))
        .centerHorizontally(),
      panelClass: 'pointer-events-none' // Чтобы не блокировать клики вне тоста
    });

    // Сдвигаем старые вверх
    this.activeToasts.forEach((ref, i) => {
      const pos = this.getPosition(this.activeToasts.length - i);
      ref.updatePositionStrategy(
        this.overlay.position().global().bottom(pos).centerHorizontally()
      );
    });

    const portal = new ComponentPortal<Snack>(Snack);
    const componentRef = overlayRef.attach(portal);
    componentRef.setInput('message', message);
    componentRef.setInput('type', type);

    this.activeToasts.push(overlayRef);

    const remove = () => {
      const index = this.activeToasts.indexOf(overlayRef);
      if (index > -1) {
        this.activeToasts.splice(index, 1);
        overlayRef.dispose();
        this.recalculate();
      }
    };

    componentRef.instance.close.subscribe(remove);
    setTimeout(remove, 4000);
  }

  private getPosition(index: number): string {
    // Учитываем отступ снизу + безопасную зону iPhone
    const baseGap = 20;
    const toastHeight = 60;
    return `calc(env(safe-area-inset-bottom) + ${baseGap + (index * (toastHeight + 12))}px)`;
  }

  private recalculate() {
    this.activeToasts.forEach((ref, i) => {
      const pos = this.getPosition(this.activeToasts.length - 1 - i);
      ref.updatePositionStrategy(
        this.overlay.position().global().bottom(pos).centerHorizontally()
      );
    });
  }
}