import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Switch } from '../../core/ui/switch/switch';
import { NavbarVisibility } from '../../core/services/navbar-visibility.service';
import { Select, SelectOption } from '../../core/ui/select/select';
import { DateField } from '../../core/ui/date/date';
import { TimeField } from '../../core/ui/time/time';
import { ButtonDirective } from '../../core/ui/button/button.directive';
import { IconButtonDirective } from '../../core/directives/icon-button.directive';

@Component({
  selector: 'app-elements',
  standalone: true,
  imports: [FormsModule, Switch, Select, DateField, TimeField, ButtonDirective, IconButtonDirective],
  templateUrl: './elements.html',
})
export class Elements {
  protected navbarVisibility = inject(NavbarVisibility);

  switchValue1 = false;
  switchValue2 = true;

  fruitValue: string | null = null;
  countryValue: string | null = null;

  dateValue: Date | null = null;
  timeValue: string | null = null;

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
