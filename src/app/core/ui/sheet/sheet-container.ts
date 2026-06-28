import { Component, HostBinding, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { OverlayRef } from '@angular/cdk/overlay';
import { SheetRef } from './sheet';
import { IconButtonDirective } from '../../directives/icon-button.directive';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-sheet-container',
  standalone: true,
  imports: [CommonModule, PortalModule, IconButtonDirective],
  templateUrl: './sheet-container.html',
  host: {
    class:
      'relative flex flex-col w-full overflow-hidden will-change-transform ' +
      'bg-[var(--surface)] ' +
      'border-t border-x border-black/10 dark:border-white/10 ' +
      'rounded-t-[20px] ' +
      'shadow-[0_-2px_20px_rgba(0,0,0,0.08)] ' +
      'h-[calc(100dvh_-_env(safe-area-inset-top,20px)_-_12px)]',
  },
})
export class SheetContainer {
  @Input({ required: true }) sheetRef!: SheetRef;
  @Input({ required: true }) overlayRef!: OverlayRef;

  private startY = 0;
  private isDragging = false;

  @HostBinding('style.transform') transform = 'translateY(100%)';
  @HostBinding('style.transition') transition = 'none';

  onPointerDown(e: PointerEvent) {
    this.startY = e.clientY;
    this.isDragging = true;
    this.transition = 'none';
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(e: PointerEvent) {
    if (!this.isDragging) return;
    const deltaY = e.clientY - this.startY;
    if (deltaY > 0) {
      this.transform = `translateY(${deltaY}px)`;
    }
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  onPointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;
    const deltaY = e.clientY - this.startY;

    if (deltaY > 150) {
      this.close();
    } else {
      this.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
      this.transform = 'translateY(0)';
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  close() {
    this.sheetRef.close();
  }

  getContentPortal(): ComponentPortal<any> {
    return this.sheetRef.contentPortal;
  }

}
