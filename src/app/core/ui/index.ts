/**
 * The UI kit: pages are built from these, a folder per piece (menu/: the menu and its rows, …).
 * Each takes its look only from the tokens, by their Tailwind names (styles.css: colors from
 * styles/base.css, sizes per device from styles/mobile.css / desktop.css), so a change there
 * changes the whole app; pages themselves carry no looks of their own.
 */
export { Icon, ICONS, type IconName } from './icon/icon';
export { UiAvatar } from './avatar/avatar';
export { UiButton } from './button/button';
export { UiPrimary } from './button/primary';
export { UiFloatingButton, UiFloatingGroup } from './floating-button/floating-button';
export { UiList, UiListTitle } from './list/list';
export { UiListItem } from './list/list-item';
export { UiSheet } from './sheet/sheet';
export { UiScrollBar } from './scroll-bar/scroll-bar';
export { UiToggle } from './toggle/toggle';
export { Toasts, UiToasts, type Toast } from './toast/toast';
export { Confirm, type ConfirmAsk, type ConfirmChoice } from './confirm/confirm';
export { UiSelect, type UiOption } from './picker/select';
export { UiDate } from './picker/date';
export { UiTime } from './picker/time';
export { UiWheel } from './picker/wheel';
export { UiRow } from './row/row';
export { UiSwipe, type SwipeAction } from './swipe/swipe';
export { UiPopover, UiPopItem, UiPopSeparator } from './popover/popover';
export { UiEmpty } from './empty/empty';
export { UiKbd } from './kbd/kbd';
export { UiTag, UiTagSwatch, TAG_CHOICES, TAG_COLORS, tagColorLabel, tagTint, type TagColor } from './tag/tag';
export { UiFoldName } from './fold/fold';
