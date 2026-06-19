// Shared style tokens for the button directives (appButton / appIconButton).
// One fixed size (medium); two variants: primary (filled blue) and warn (red, like Sign Out).

export type ButtonVariant = 'primary' | 'warn';
export type IconButtonVariant = 'glass' | 'warn';

/* ── Text button (appButton) ───────────────────────────────── */

export const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 h-11 px-5 text-[17px] font-semibold rounded-full no-underline ' +
  'select-none cursor-pointer outline-none transition-[transform,background-color,filter] duration-200 ' +
  'active:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  '[-webkit-tap-highlight-color:transparent]';

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-[#0071eb] text-white shadow-[0_2px_8px_rgba(0,113,235,0.3)] hover:brightness-110',
  warn: 'bg-[#fa233b]/10 text-[#fa233b] hover:bg-[#fa233b]/18',
};

/* ── Icon button (appIconButton) — iOS-26 circular ─────────── */

export const ICON_BUTTON_BASE =
  'inline-flex items-center justify-center rounded-full shrink-0 w-11 h-11 ' +
  'select-none cursor-pointer outline-none transition-[transform,background-color] duration-200 ' +
  'active:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  '[-webkit-tap-highlight-color:transparent] [&>svg]:w-1/2 [&>svg]:h-1/2';

// `glass` is a solid placeholder for now — real liquid-glass (translucent + blur)
// comes once the transparency issue is sorted out.
export const ICON_BUTTON_VARIANT: Record<IconButtonVariant, string> = {
  glass: 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15',
  warn: 'bg-[#fa233b]/10 text-[#fa233b] hover:bg-[#fa233b]/18',
};
