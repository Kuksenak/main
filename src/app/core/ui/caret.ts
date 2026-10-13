// What makes text lay out the same way in a copy of the field
const PROPS = [
  'direction',
  'boxSizing',
  'width',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
] as const;

/**
 * Where a place in a text field is on screen (viewport px): its left, its line's top and the
 * line's height — for a menu at the cursor or a toolbar over a selection. Measured on an
 * invisible copy of the field laid out the same way.
 */
export function caretRect(field: HTMLTextAreaElement, position: number): { left: number; top: number; height: number } {
  const computed = getComputedStyle(field);
  const copy = document.createElement('div');
  const style = copy.style;
  for (const p of PROPS) style[p] = computed[p];
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.top = '0';
  style.left = '-9999px';
  style.whiteSpace = 'pre-wrap';
  style.overflowWrap = 'break-word';
  style.overflow = 'hidden';
  copy.textContent = field.value.slice(0, position);
  const mark = document.createElement('span');
  mark.textContent = field.value.slice(position) || '.';
  copy.appendChild(mark);
  document.body.appendChild(copy);

  const box = field.getBoundingClientRect();
  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.4;
  const rect = {
    left: box.left + mark.offsetLeft - field.scrollLeft,
    top: box.top + mark.offsetTop - field.scrollTop,
    height: lineHeight,
  };
  copy.remove();
  return rect;
}
