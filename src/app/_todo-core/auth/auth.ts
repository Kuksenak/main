import { Component, inject } from '@angular/core';
import { AuthStore } from './auth-store';

@Component({
  selector: 'app-auth',
  imports: [],
  templateUrl: './auth.html',
  // styleUrl: './auth.scss'
})
export class Auth {
  auth = inject(AuthStore);

  ngOnInit() {
    const nav = navigator as any;

    if (nav.userAgentData) {
      nav.userAgentData.getHighEntropyValues(["platformVersion"])
        .then((ua: any) => {
          console.log(ua.platformVersion);
        });
    }
  }
}
