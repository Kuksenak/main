import { Component, DestroyRef, inject } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';

@Component({
  selector: 'app-about',
  imports: [TranslatePipe],
  templateUrl: './about.html',
})
export class About {
  constructor() {
    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }
}
