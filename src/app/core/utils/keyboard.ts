/**
 * iOS opens the keyboard only for a field focused right in a tap — not one focused later, e.g. in
 * a form that slides in. Call this in the tap: a hidden field takes the focus now (the keyboard
 * comes up), and the form's field, focused a moment later, takes it over (the keyboard stays). The
 * helper goes away once it loses the focus.
 */
export function primeKeyboard(): void {
  const input = document.createElement('input');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  // 16px: smaller text makes iOS zoom in
  input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none;';
  document.body.appendChild(input);
  input.addEventListener('blur', () => input.remove(), { once: true });
  input.focus({ preventScroll: true });
  // Nothing took it over: let the keyboard go
  setTimeout(() => {
    if (document.activeElement === input) input.blur();
  }, 1500);
}
