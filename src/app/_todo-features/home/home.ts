import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  // styleUrl: './home.scss'
})
export class Home {
  x = navigator.userAgent;

  // В Angular
  async ngOnInit() {
    const nav = navigator as any;

    if (nav.userAgentData) {
      console.log(nav.userAgentData);
      nav.userAgentData.getHighEntropyValues(["platformVersion"])
        .then((ua: any) => {
          console.log(ua);
          console.log(ua.platformVersion);
        });
    }

    const highEntropyValues = await nav.userAgentData.getHighEntropyValues([
      "architecture",
      "model",
      "platformVersion",
      "fullVersionList"
    ])
      .then((ua: any) => {
        console.log(ua);
        console.log(ua.platformVersion);
      });;

    console.log(highEntropyValues);
  }

}
