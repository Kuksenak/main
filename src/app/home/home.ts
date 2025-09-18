import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore } from 'app/auth/auth-store';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  auth = inject(AuthStore);
}
