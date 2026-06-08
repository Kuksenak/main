import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Switch } from '../../core/ui/switch/switch';
import { Button } from '../../core/ui/button/button';
import { IconButtonDirective } from '../../core/directives/icon-button.directive';

@Component({
  selector: 'app-elements',
  standalone: true,
  imports: [FormsModule, Switch, Button, IconButtonDirective],
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

  openDialog() {
    const dialog = document.getElementById('nativeDialog') as HTMLDialogElement;
    dialog?.showModal();
  }

  closeDialog() {
    const dialog = document.getElementById('nativeDialog') as HTMLDialogElement;
    dialog?.close();
  }
}
