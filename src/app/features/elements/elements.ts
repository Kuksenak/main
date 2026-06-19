import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Switch } from '../../core/ui/switch/switch';
import { Select, SelectOption } from '../../core/ui/select/select';
import { ButtonDirective } from '../../core/ui/button/button.directive';
import { IconButtonDirective } from '../../core/directives/icon-button.directive';

@Component({
  selector: 'app-elements',
  standalone: true,
  imports: [FormsModule, Switch, Select, ButtonDirective, IconButtonDirective],
  templateUrl: './elements.html',
})
export class Elements {
  switchValue1 = false;
  switchValue2 = true;

  fruitValue: string | null = null;
  countryValue: string | null = null;

  readonly fruitOptions: SelectOption[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'orange', label: 'Orange' },
    { value: 'grape', label: 'Grape' },
  ];

  readonly countryOptions: SelectOption[] = [
    { value: 'us', label: 'United States' },
    { value: 'de', label: 'Germany' },
    { value: 'jp', label: 'Japan' },
    { value: 'ua', label: 'Ukraine' },
  ];
}
