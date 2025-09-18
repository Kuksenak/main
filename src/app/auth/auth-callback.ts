import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from './auth-store';

@Component({
    template: '',
})
export class AuthCallback {
    authStore = inject(AuthStore);
    route = inject(ActivatedRoute);
    router = inject(Router);

    ngOnInit() {
        const state = this.route.snapshot.queryParamMap.get('state');
        this.authStore.getToken(state);
        this.router.navigate(['/']);
    }
}
