import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
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

import jsqr from 'jsqr';

@Component({
  selector: 'app-mfa',
  imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatListModule, FormsModule, MatButtonModule],
  templateUrl: './mfa.html',
  styleUrl: './mfa.scss',

})
export class Mfa implements OnInit {

  // store = inject(MfaStore);
  // mode = signal<string>('view');
  issuer: any;
  secret: any;

  ngOnInit() { }

  create() {
    // this.store.create(this.issuer, this.secret);
    // this.mode.set('view');
  }

  edit() {
    // this.mode.set('view');
  }

  dialog = inject(MatDialog);
  openDialog() {
    this.dialog.open(MfaDetails, {
      data: {
        animal: 'panda',
      },
    });
  }

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  loading = false;
  async scanScreen() {
    this.loading = true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' } // Подсказка браузеру сфокусироваться на окнах
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Ждем отрисовки первого кадра
      video.onloadedmetadata = () => {
        setTimeout(() => this.processFrame(video, stream), 500);
      };
    } catch (err) {
      console.error("Ошибка захвата:", err);
    }
    this.loading = false;
  }

  processFrame(video: HTMLVideoElement, stream: MediaStream) {
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Останавливаем захват экрана сразу после скриншота
    stream.getTracks().forEach(track => track.stop());

    const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
    if (imageData) {
      const code = jsqr(imageData.data, imageData.width, imageData.height);
      if (code) {
        this.parseOtpUri(code.data);
      } else {
        alert("QR-код не найден на выбранном окне");
      }
    }
  }

  parseOtpUri(uri: string) {
    // uri будет иметь вид: otpauth://totp/Issuer:User?secret=JBSWY3DPEHPK3PXP&issuer=Issuer
    const url = new URL(uri.replace('otpauth://', 'http://')); // хак для парсинга через URL
    const secret = url.searchParams.get('secret');
    const issuer = url.searchParams.get('issuer') || url.pathname.split(':')[0].replace('//totp/', '');
    
    console.log('Secret:', secret, 'Issuer:', issuer);
    alert(`secret ${secret}, issuer ${issuer}`);
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

