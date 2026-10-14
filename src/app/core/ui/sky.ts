import { Component } from '@angular/core';

/**
 * A sky behind a public page (sign-in, a shared page, a student's own page), as craft.do's — in
 * layers, all our own drawings: the app's background at the top (as the status bar's / the
 * manifest's color) into a sky lower down, a paper grain over it, halftone clouds (our own: long and
 * low, a diagonal grid of fine dots over it, as a print) peeking in at the sides and a small one
 * further off, two birds, a drawn line along the bottom.
 */
@Component({
  selector: 'app-sky',
  host: { class: 'sky pointer-events-none fixed inset-0 -z-0 overflow-hidden', 'aria-hidden': 'true' },
  template: `
    <div class="absolute inset-0 bg-[linear-gradient(to_bottom,var(--app-bg)_0%,var(--sky-top)_45%,var(--sky-bottom)_100%)]"></div>
    <div class="sky-grain absolute inset-0 mix-blend-overlay"></div>

    <!-- One cloud, drawn once, used twice -->
    <svg width="0" height="0" class="absolute">
      <defs>
        <filter id="skyBlur" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="9" /></filter>
        <!-- (the print's dots: a fine grid) -->
        <pattern id="skyDots" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="3" cy="3" r="1.1" class="sky-dot" />
        </pattern>
        <g id="skyPuffs">
          <!-- (ours: long and low, three caps on a flat bottom) -->
          <ellipse cx="260" cy="190" rx="220" ry="36" />
          <ellipse cx="170" cy="150" rx="80" ry="50" />
          <ellipse cx="290" cy="128" rx="80" ry="58" />
          <ellipse cx="395" cy="160" rx="62" ry="40" />
        </g>
        <mask id="skyShape" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="270">
          <use href="#skyPuffs" fill="white" filter="url(#skyBlur)" />
        </mask>
        <symbol id="skyCloud" viewBox="0 0 520 270">
          <!-- the cloud: white, soft at the edges -->
          <use href="#skyPuffs" class="sky-cloud-body" filter="url(#skyBlur)" />
          <!-- the print's dots, only on the cloud -->
          <rect width="520" height="270" fill="url(#skyDots)" mask="url(#skyShape)" class="sky-cloud-dots" />
        </symbol>
      </defs>
    </svg>
    <svg class="absolute -left-28 bottom-[16%] w-[380px] md:w-[520px]" viewBox="0 0 520 270"><use href="#skyCloud" /></svg>
    <svg class="absolute -right-32 top-[13%] w-[380px] -scale-x-100 md:w-[520px]" viewBox="0 0 520 270"><use href="#skyCloud" /></svg>
    <!-- A small one, further off -->
    <svg class="absolute right-[18%] top-[46%] w-[150px] opacity-80 md:w-[200px]" viewBox="0 0 520 270"><use href="#skyCloud" /></svg>

    <!-- Two birds far away -->
    <svg class="sky-birds absolute right-[30%] top-[20%] w-[70px]" viewBox="0 0 70 30" fill="none">
      <path d="M2 14 Q 9 6, 16 13 Q 23 6, 30 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      <path d="M40 24 Q 45 18, 50 23 Q 55 18, 60 24" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>

    <!-- Along the bottom: one drawn line — a calm wave with a loop in it, faint -->
    <svg class="sky-line absolute inset-x-0 bottom-0 h-[34%] w-full" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" fill="none">
      <path
        d="M-40 236 C 110 222, 210 190, 330 196 C 450 202, 520 246, 640 238 C 735 232, 790 190, 780 160 C 770 128, 720 130, 716 162 C 712 196, 770 222, 860 214 C 980 204, 1040 168, 1150 172 C 1260 176, 1330 214, 1480 206"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
})
export class Sky {}
