import { Component, ElementRef, HostBinding, HostListener, inject, Input, Type } from '@angular/core';
import { CdkPortalOutlet, ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { OverlayRef } from '@angular/cdk/overlay';
import { Theme } from 'app/_todo-core/theme/theme';

@Component({
  selector: 'app-sheet-container',
  standalone: true,
  imports: [PortalModule],
  templateUrl: './sheet-container.html',
  host: {
    class: 'mobile-sheet relative'
  }
})
export class SheetContainer {
  private theme = inject(Theme);
  protected accentColor = this.theme.accentColor;

  @Input({ required: true }) portal!: ComponentPortal<any>;
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
    // Notify the service through the overlayRef
    // But we need the service to handle the app-stacked and disposal
    // We'll use a custom event or just have the service handle it
    this.overlayRef.detach(); // This will trigger the close logic in the service
  }
}
