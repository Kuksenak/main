import { Component } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { BrandIcon, BrandIconName } from '../core/ui/icon/brand-icon';

@Component({
  selector: 'app-about',
  imports: [BrandIcon, TranslatePipe],
  templateUrl: './about.html',
})
export class About {
  protected readonly icons: BrandIconName[] = ['calendar', 'people', 'book', 'settings', 'info'];
}
