import { Component, DestroyRef, inject } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { BrandIcon, BrandIconName } from '../core/ui/icon/brand-icon';
import { ToolbarService } from '../core/services/toolbar.service';

@Component({
  selector: 'app-about',
  imports: [BrandIcon, TranslatePipe],
  templateUrl: './about.html',
})
export class About {
  protected readonly icons: BrandIconName[] = ['calendar', 'people', 'book'];

  constructor() {
    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }
}
