import { Directive, ElementRef, OnDestroy, inject, output } from '@angular/core';

/** The element's height (border box, px) each time it changes: `(appResized)="h = $event"`. */
@Directive({ selector: '[appResized]' })
export class Resized implements OnDestroy {
  readonly appResized = output<number>();
  private readonly observer = new ResizeObserver((entries) => {
    const box = entries[0]?.borderBoxSize?.[0];
    this.appResized.emit(box ? box.blockSize : (entries[0]?.contentRect.height ?? 0));
  });

  constructor() {
    this.observer.observe(inject(ElementRef).nativeElement);
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
