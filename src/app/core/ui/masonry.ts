import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/** The grid's row step, px: tiles take whole steps of it (their height rounded up). */
const ROW = 4;
/** Room between tiles, px (both ways). */
const GAP = 16;

/**
 * Pinterest-like tiles, but of different widths: the element becomes a grid of equal columns
 * (as many as fit, at least `--masonry-col` wide) with a fine row step; each child takes
 * `data-span` columns (as many as there are, at most) and as many rows as its height needs, and
 * `dense` packing fills the holes with later, smaller tiles. Children re-measured when they (or
 * the grid) resize, or come and go.
 */
@Directive({ selector: '[appMasonry]', host: { class: 'grid grid-flow-row-dense' } })
export class Masonry {
  constructor() {
    const grid: HTMLElement = inject(ElementRef).nativeElement;
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(var(--masonry-col, 15rem), 1fr))';
    grid.style.gridAutoRows = `${ROW}px`;
    grid.style.columnGap = `${GAP}px`;
    grid.style.alignItems = 'start';

    let frame = 0;
    const layout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter((x) => x).length || 1;
        for (const tile of Array.from(grid.children) as HTMLElement[]) {
          const span = Math.min(columns, Math.max(1, Number(tile.dataset['span']) || 1));
          tile.style.gridColumn = `span ${span}`;
          tile.style.gridRowEnd = `span ${Math.ceil((tile.getBoundingClientRect().height + GAP) / ROW)}`;
        }
      });
    };

    const sizes = new ResizeObserver(layout);
    const watch = () => {
      sizes.disconnect();
      sizes.observe(grid);
      for (const tile of Array.from(grid.children)) sizes.observe(tile);
      layout();
    };
    const children = new MutationObserver(watch);
    afterNextRender(() => {
      children.observe(grid, { childList: true });
      watch();
    });
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      children.disconnect();
    });
  }
}
