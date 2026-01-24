import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MAT_DIALOG_DATA, MatDialogActions, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MfaStore } from '../mfa.store';

@Component({
  selector: 'app-mfa-details',
  imports: [MatDialogTitle, MatDialogContent, MatButtonModule, MatFormFieldModule, MatInputModule, MatDialogActions],
  templateUrl: './mfa-details.html',
  styleUrl: './mfa-details.scss'
})
export class MfaDetails {
  dialogRef = inject(MatDialogRef<MfaDetails>);
  //data = inject(MAT_DIALOG_DATA); for future use
  store = inject(MfaStore);

  issuer = signal('');
  secret = signal('');
  username = signal('');

  isValid = computed(() =>
    this.issuer().trim() !== '' &&
    this.secret().trim() !== '' &&
    this.username().trim() !== ''
  );

  create() {
    if (this.isValid()) {
      const result = {
        issuer: this.issuer(),
        secret: this.secret(),
        username: this.username()
      };
      this.store.create(result.issuer, result.secret);
      this.close();
    }
  }

  close() {
    this.dialogRef.close();
  }
}
