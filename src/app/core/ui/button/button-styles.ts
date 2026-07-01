// Shared style tokens for the button directives (appButton / appIconButton).
// One fixed size (medium); two variants: primary (filled blue) and warn (red, like Sign Out).

export type ButtonVariant = 'primary' | 'warn';
export type IconButtonVariant = 'glass' | 'warn';

/* ── Text button (appButton) ───────────────────────────────── */

export const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 h-9 px-4 text-[14px] ' +
  '[[data-device=mobile]_&]:h-12 [[data-device=mobile]_&]:px-6 [[data-device=mobile]_&]:text-[18px]' +
  'font-medium rounded-lg no-underline ' +
  'select-none cursor-pointer outline-none transition-[transform,background-color,filter] duration-150 ease-out ' +
  'active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  '[-webkit-tap-highlight-color:transparent]';

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-[#d4732f]/12 text-[#d4732f] hover:bg-[#d4732f]/20',
  warn: 'bg-[#e5484d]/10 text-[#e5484d] hover:bg-[#e5484d]/18',
};

/* ── Icon button (appIconButton) — iOS-26 circular ─────────── */

export const ICON_BUTTON_BASE =
  'inline-flex items-center justify-center rounded-lg shrink-0 w-9 h-9 ' +
  '[[data-device=mobile]_&]:w-12 [[data-device=mobile]_&]:h-12 ' +
  'select-none cursor-pointer outline-none transition-[transform,background-color] duration-150 ease-out ' +
  'active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  '[-webkit-tap-highlight-color:transparent] [&>svg]:w-[70%] [&>svg]:h-[70%] [&_*]:[stroke-width:1.5]';

// `glass` is a solid placeholder for now — real liquid-glass (translucent + blur)
// comes once the transparency issue is sorted out.
export const ICON_BUTTON_VARIANT: Record<IconButtonVariant, string> = {
  glass: 'text-black/70 dark:text-white/75 bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12',
  warn: 'bg-[#e5484d]/10 text-[#e5484d] hover:bg-[#e5484d]/18',
};
