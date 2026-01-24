import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MfaStore } from '../mfa.store';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
} from '@angular/material/dialog';
import { MfaDetails } from '../mfa-details/mfa-details';

@Component({
  selector: 'app-mfa',
  imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatListModule, FormsModule, MatButtonModule],
  templateUrl: './mfa.html',
  styleUrl: './mfa.scss',

})
export class Mfa implements OnInit {

  store = inject(MfaStore);
  mode = signal<string>('view');
  issuer: any;
  secret: any;

  ngOnInit() { }

  create() {
    this.store.create(this.issuer, this.secret);
    this.mode.set('view');
  }

  edit() {
    this.mode.set('view');
  }

  dialog = inject(MatDialog);
  openDialog() {
    this.dialog.open(MfaDetails, {
      data: {
        animal: 'panda',
      },
    });
  }



  // secrets: string[] = [
  //   'KZHIU5DJNFWGK2LP',
  //   'JBSWY3DPEHPK3PXP',
  //   'NB2W45DFOIZA====',
  // ];
  // private baseUrl = environment.apiUrl;
  // private http = inject(HttpClient);
  // create() {
  //   let todo: Mfa1 = { secret: 'KZHIU5DJNFWGK2LP', issuer: 'MyApp' };

  //   this.http.post<Mfa1>(`${this.baseUrl}/mfa/create`, todo).subscribe({
  //     next: (res) => {
  //       console.log('Создано:', res);
  //     },
  //     error: (err) => {
  //       console.error('Ошибка при создании:', err);
  //     }

  //   });
  // }
}


export interface Mfa1 {
  secret: string;
  issuer: string;
}

