import { Component } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';

@Component({
  selector: 'app-about',
  imports: [TranslatePipe],
  templateUrl: './about.html',
})
export class About {}
