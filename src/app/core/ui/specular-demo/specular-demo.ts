import { Component, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-specular-demo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col items-center gap-6 p-8 bg-black/5 dark:bg-white/5 rounded-xl">
      <h2 class="text-xl font-bold">Specular Highlight Demo</h2>

      <div class="relative">
        <canvas #canvas class="rounded-lg border border-white/10" width="400" height="200"></canvas>
      </div>

      <div class="flex flex-col items-center gap-3">
        <label class="text-sm font-medium">
          Specular Angle: <span class="tabular-nums">{{ angleDegrees() }}°</span>
        </label>
        <input
          type="range"
          [(ngModel)]="angle"
          (input)="updateCanvas()"
          [min]="-Math.PI"
          [max]="Math.PI"
          [step]="0.01"
          class="w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
        <div class="flex justify-between w-64 text-xs opacity-50">
          <span>-180°</span>
          <span>0°</span>
          <span>180°</span>
        </div>
      </div>
    </div>
  `,
})
export class SpecularDemo implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  angle = 0;
  Math = Math;

  angleDegrees = signal(0);

  ngAfterViewInit() {
    this.updateCanvas();
  }

  updateCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Button dimensions
    const x = 100;
    const y = 100;
    const width = 200;
    const height = 48;
    const radius = height / 2;

    // Draw button background
    ctx.fillStyle = '#0071eb';
    this.roundRect(ctx, x, y - height/2, width, height, radius);
    ctx.fill();

    // Draw specular highlight
    const gradient = ctx.createLinearGradient(
      x + Math.cos(this.angle) * width,
      y + Math.sin(this.angle) * height,
      x + Math.cos(this.angle + Math.PI) * width,
      y + Math.sin(this.angle + Math.PI) * height
    );

    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y - height/2, width, height, radius);
    ctx.fill();

    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 17px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Button', x + width/2, y);

    // Update angle display
    this.angleDegrees.set(Math.round((this.angle * 180) / Math.PI));
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, (3 * Math.PI) / 2);
    ctx.closePath();
  }
}
