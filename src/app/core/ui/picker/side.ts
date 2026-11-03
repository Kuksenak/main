/** A popover under a field: at the field's right edge when it's in the window's right half (else it'd run off the screen). */
export function atEnd(field: HTMLElement): boolean {
  const r = field.getBoundingClientRect();
  return r.left + r.width / 2 > window.innerWidth / 2;
}
