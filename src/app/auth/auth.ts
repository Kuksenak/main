import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore } from './auth-store';

@Component({
  selector: 'app-auth',
  imports: [MatButtonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss'
})
export class Auth {
  auth = inject(AuthStore);
}
