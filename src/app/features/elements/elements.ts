import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Switch } from '../../core/ui/switch/switch';

@Component({
  selector: 'app-elements',
  standalone: true,
  imports: [FormsModule, Switch],
  templateUrl: './elements.html',
})
export class Elements {
  // Form values
  dateValue = '';
  timeValue = '';
  datetimeValue = '';
  colorValue = '#3b82f6';
  selectValue = '';
  rangeValue = 50;
  checkboxValue = false;
  textValue = '';

  detailsOpen = false;
}
