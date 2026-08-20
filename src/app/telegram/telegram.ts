import { DatePipe } from '@angular/common';
import { Component, effect, ElementRef, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramStore } from './telegram.store';

@Component({
  selector: 'app-telegram',
  imports: [DatePipe, FormsModule],
  templateUrl: './telegram.html',
})
export class Telegram implements OnInit, OnDestroy {
  protected readonly tg = inject(TelegramStore);
  protected draft = '';
  private timer: ReturnType<typeof setInterval> | undefined;
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    effect(() => {
      this.tg.messages();
      const el = this.scroller()?.nativeElement;
      if (el) {
        setTimeout(() => (el.scrollTop = el.scrollHeight), 0);
      }
    });
  }

  ngOnInit(): void {
    this.tg.loadStatus();
    this.tg.loadMessages();
    this.timer = setInterval(() => {
      if (this.tg.linked()) {
        this.tg.loadMessages();
      }
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  connect(): void {
    this.tg.link().subscribe((res) => {
      if (res?.deepLink) {
        window.open(res.deepLink, '_blank');
      }
    });
  }

  submit(): void {
    const text = this.draft.trim();
    if (!text) {
      return;
    }
    this.tg.send(text).subscribe();
    this.draft = '';
  }
}
