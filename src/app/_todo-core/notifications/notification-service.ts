import { Injectable, inject } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Snack, SnackType } from '../ui/snack/snack';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private overlay = inject(Overlay);
  private activeToasts: any[] = [];

  // Удалили constructor, так как Safari блокирует авто-запрос прав при загрузке.

  async show(message: string, type: SnackType = 'info') {
    // WebKit/iOS требует, чтобы запрос прав происходил ТОЛЬКО по прямому клику пользователя.
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        // Запрашиваем права. Это сработает, только если show() был вызван по клику кнопки.
        await Notification.requestPermission();
      }
      
      if (Notification.permission === 'granted') {
          new Notification('My App', { 
              body: message,
              icon: '/favicon.ico'
          });
      }
    }

    // 2. Внутриигровой снек
    const overlayRef = this.overlay.create({
      positionStrategy: this.getPositionStrategy(0),
      panelClass: 'pointer-events-none'
    });

    // Сдвигаем старые вверх
    this.activeToasts.forEach((ref, i) => {
      ref.updatePositionStrategy(this.getPositionStrategy(this.activeToasts.length - i));
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

  private getPositionStrategy(index: number) {
    const isDesktop = window.innerWidth >= 768;
    // Отступ снизу. На мобилке нужно поднять выше плеера (~100px)
    const baseGap = isDesktop ? 24 : 100; 
    const toastHeight = 56;
    const offset = baseGap + (index * (toastHeight + 8));

    if (isDesktop) {
      return this.overlay.position().global().bottom(`${offset}px`).right('24px');
    } else {
      return this.overlay.position().global().bottom(`calc(env(safe-area-inset-bottom) + ${offset}px)`).centerHorizontally();
    }
  }

  private recalculate() {
    this.activeToasts.forEach((ref, i) => {
      ref.updatePositionStrategy(this.getPositionStrategy(this.activeToasts.length - 1 - i));
    });
  }
}