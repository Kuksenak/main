import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-elements',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './elements.html',
})
export class Elements {
  // Form values
  onToggle($event: Event) {
    console.log('Toggle event:', $event);
  }
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
