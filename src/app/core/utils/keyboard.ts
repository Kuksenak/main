/**
 * iOS opens the keyboard only when a field is focused during the user's tap — not later, when
 * a card with the field has slid in. So, on that tap, focus an invisible stand-in field: the
 * keyboard opens, and the card's own field can take the focus over once it's there (see
 * PageSheet). The stand-in goes away as soon as it loses focus (or after a few seconds).
 */
export function openKeyboardNow(): void {
  const proxy = document.createElement('input');
  proxy.setAttribute('aria-hidden', 'true');
  proxy.tabIndex = -1;
  // 16px: smaller text would make iOS zoom in; off-screen-ish and invisible
  proxy.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0';
  document.body.appendChild(proxy);
  proxy.focus();
  const remove = () => proxy.remove();
  proxy.addEventListener('blur', remove, { once: true });
  setTimeout(remove, 3000);
}
