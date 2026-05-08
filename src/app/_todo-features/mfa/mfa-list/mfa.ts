// import { ClipboardModule } from '@angular/cdk/clipboard'; // 1. Импортируем модуль
// import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { MatButtonModule } from '@angular/material/button';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatIconModule } from '@angular/material/icon';
// import { MatInputModule } from '@angular/material/input';
// import { MatListModule } from '@angular/material/list';
// import { MatProgressBarModule } from '@angular/material/progress-bar';
// import { MatSnackBar } from '@angular/material/snack-bar';
// import { BarcodeFormat } from '@zxing/library';
// import { default as jsqr, default as jsQR } from 'jsqr';
// import { MfaStore } from '../mfa.store';
// @Component({
//   selector: 'app-mfa',
//   imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatListModule, FormsModule, MatButtonModule, ClipboardModule, MatProgressBarModule],
//   templateUrl: './mfa.html',
//   styleUrl: './mfa.scss',

// })
// export class Mfa implements OnInit {

//   snackBar = inject(MatSnackBar);
//   allowedFormats = [BarcodeFormat.QR_CODE];
//   store = inject(MfaStore);

//   issuer: any;
//   secret: any;
//   text1: any;
//   loading: boolean = false;

//   ngOnInit() {
//     this.store.load();
//   }

//   protected copyCode(code: string) {
//     this.snackBar.open('Code copied to clipboard', 'OK', {
//       duration: 2000,
//       horizontalPosition: 'center',
//       verticalPosition: 'bottom'
//     });
//   }

//   protected formatCode(code: string): string {
//     if (!code) return '';
//     return code.replace(/(\d{3})(\d{3})/, '$1 $2');
//   }


//   async scanScreen() {
//     this.loading = true;
//     let stream: MediaStream | null = null;

//     try {
//       stream = await navigator.mediaDevices.getDisplayMedia({
//         video: { displaySurface: 'window' }
//       });

//       const video = document.createElement('video');
//       video.srcObject = stream;

//       await new Promise((resolve) => {
//         video.onloadedmetadata = () => video.play().then(resolve);
//       });

//       const canvas = document.createElement('canvas');
//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;
//       const ctx = canvas.getContext('2d');

//       if (ctx) {
//         ctx.drawImage(video, 0, 0);
//         stream.getTracks().forEach(track => track.stop());
//         stream = null;
//         const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//         if (imageData) {
//           const code = jsqr(imageData.data, imageData.width, imageData.height);
//           if (code) {
//             this.parseOtpUri(code.data);
//           } else {
//             this.snackBar.open('QR-код не найден на выбранном окне', 'OK', {
//               duration: 2000,
//               horizontalPosition: 'center',
//               verticalPosition: 'bottom'
//             });
//           }
//         }
//         console.log(imageData);
//       }
//     } catch (err) {
//       console.error("Ошибка:", err);
//     } finally {
//       // На случай ошибки, если поток успел создаться, но не закрылся
//       stream?.getTracks().forEach(track => track.stop());
//       this.loading = false;
//     }
//   }

//   @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
//   isCameraOpen = false;

//   async startLiveScanner() {
//     this.loading = true;
//     this.isCameraOpen = true;
//     const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

//     this.videoElement.nativeElement.srcObject = stream;

//     const scanFrame = () => {
//       if (!this.isCameraOpen) return;

//       const video = this.videoElement.nativeElement;
//       if (video.readyState === video.HAVE_ENOUGH_DATA) {
//         const code = this.checkQrCode(video);
//         if (code) {
//           // this.handleQrResult(code);
//           this.stopCamera();
//           return;
//         }
//       }
//       requestAnimationFrame(scanFrame);
//     };

//     requestAnimationFrame(scanFrame);
//   }

//   private checkQrCode(video: HTMLVideoElement): string | null {
//     const canvas = document.createElement('canvas');
//     const context = canvas.getContext('2d', { willReadFrequently: true });

//     if (!context) return null;

//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     context.drawImage(video, 0, 0, canvas.width, canvas.height);

//     const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

//     const code = jsQR(imageData.data, imageData.width, imageData.height, {
//       inversionAttempts: "dontInvert",
//     });

//     return code ? code.data : null;
//   }
//   videoReady: boolean = false;
//   stopCamera(): void {
//     this.isCameraOpen = false;
//     this.loading = false;
//     this.videoReady = false;
//     if (this.videoElement?.nativeElement?.srcObject) {
//       const stream = this.videoElement.nativeElement.srcObject as MediaStream;
//       stream.getTracks().forEach(track => {
//         track.stop();
//       });
//       this.videoElement.nativeElement.srcObject = null;
//     }
//   }

//   parseOtpUri(uri: string) {
//     const url = new URL(uri.replace('otpauth://', 'http://'));
//     const secret = url.searchParams.get('secret');
//     const issuer = url.searchParams.get('issuer') || url.pathname.split(':')[0].replace('//totp/', '');
//     // this.snackBar.open(`issuer: ${issuer}`, 'OK', {
//     //   duration: 2000,
//     //   horizontalPosition: 'center',
//     //   verticalPosition: 'bottom'
//     // });
//     if (secret) {
//       this.store.create(issuer, secret);
//     }
//   }
// }


// // export interface Mfa1 {
// //   secret: string;
// //   issuer: string;
// // }

