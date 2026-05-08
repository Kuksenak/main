import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, computed, ElementRef, inject, ViewChild } from '@angular/core';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Sheet } from '../sheet/sheet';
import { Settings } from 'app/features/settings/settings';

@Component({
  selector: 'app-navbar',
  imports: [CdkMenuItem, CdkMenuTrigger, CdkMenu],
  templateUrl: './navbar.html',
  host: {
    class: 'block w-full'
  }
})
export class Navbar {
  protected readonly auth = inject(AuthStore);
  private readonly sheet = inject(Sheet);

  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  protected readonly userInitial = computed(() => {
    return this.userEmail() ? this.userEmail().charAt(0).toUpperCase() : '';
  });

  @ViewChild('profileTrigger', { read: ElementRef })
  private readonly profileTrigger?: ElementRef<HTMLElement>;

  openSettings() {
    this.sheet.open(Settings);
  }

  // openApplications() {
  //   this.popupService.open(Applications, this.settingsTrigger.nativeElement);
  // }

  reload() {
    window.location.reload();
  }
}


