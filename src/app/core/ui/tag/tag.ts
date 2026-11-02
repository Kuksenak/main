import { Component, computed, input } from '@angular/core';
import { TranslationKey } from '../../i18n/translations';

/** A tag's colors (as Notion's): the API's names, in the pickers' order. */
export const TAG_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'] as const;
export type TagColor = (typeof TAG_COLORS)[number];

// (each color's classes, whole: Tailwind finds them here — the tokens are styles.css' tag-*)
const CHIP: Record<TagColor, string> = {
  gray: 'bg-tag-gray text-tag-gray-text',
  brown: 'bg-tag-brown text-tag-brown-text',
  orange: 'bg-tag-orange text-tag-orange-text',
  yellow: 'bg-tag-yellow text-tag-yellow-text',
  green: 'bg-tag-green text-tag-green-text',
  blue: 'bg-tag-blue text-tag-blue-text',
  purple: 'bg-tag-purple text-tag-purple-text',
  pink: 'bg-tag-pink text-tag-pink-text',
  red: 'bg-tag-red text-tag-red-text',
};

/** A color's chip classes (its pastel, its text): for what wears the tag's look whole (a button). */
export const tagChip = (color: string | null | undefined): string => CHIP[color as TagColor] ?? CHIP.gray;

/** A color's swatch (a dot, a square): its pastel's class, whole for Tailwind. */
export const TAG_SWATCH: Record<TagColor, string> = {
  gray: 'bg-tag-gray',
  brown: 'bg-tag-brown',
  orange: 'bg-tag-orange',
  yellow: 'bg-tag-yellow',
  green: 'bg-tag-green',
  blue: 'bg-tag-blue',
  purple: 'bg-tag-purple',
  pink: 'bg-tag-pink',
  red: 'bg-tag-red',
};

/** A color's name (translations' keys). */
export const TAG_COLOR_LABELS: Record<TagColor, TranslationKey> = {
  gray: 'tags.gray',
  brown: 'tags.brown',
  orange: 'tags.orange',
  yellow: 'tags.yellow',
  green: 'tags.green',
  blue: 'tags.blue',
  purple: 'tags.purple',
  pink: 'tags.pink',
  red: 'tags.red',
};

/** A color's pastel, for what's painted by it (a page's icon: `<app-icon colored [tint]>`). */
export const tagTint = (color: string | null | undefined): string | null =>
  color && (TAG_COLORS as readonly string[]).includes(color) ? `var(--tag-${color})` : null;

/**
 * A tag: its name on its pastel, small and round (as Notion's). `<ui-tag color="green">A2</ui-tag>`;
 * an unknown color: gray.
 */
@Component({
  selector: 'ui-tag',
  host: { '[class]': 'classes()' },
  template: `<span class="min-w-0 truncate"><ng-content /></span>`,
})
export class UiTag {
  readonly color = input<string>('gray');
  protected readonly classes = computed(
    () =>
      'inline-flex h-5 max-w-40 shrink-0 items-center rounded-[0.3rem] px-1.5 text-footnote leading-none ' +
      (CHIP[this.color() as TagColor] ?? CHIP.gray),
  );
}
