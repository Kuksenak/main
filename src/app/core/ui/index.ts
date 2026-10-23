/**
 * The UI kit: pages are built from these, a folder per piece (menu/: the menu and its rows, …).
 * Each takes its look only from the tokens, by their Tailwind names (styles.css: colors from
 * styles/base.css, sizes per device from styles/mobile.css / desktop.css), so a change there
 * changes the whole app; pages themselves carry no looks of their own.
 */
export { Icon, type IconName } from './icon/icon';
export { UiAvatar } from './avatar/avatar';
export { UiButton } from './button/button';
export { UiCalendar } from './calendar/calendar';
export { UiMenu } from './menu/menu';
export { UiMenuItem } from './menu/menu-item';
export { UiMenuLabel } from './menu/menu-label';
export { UiMenuSeparator } from './menu/menu-separator';
export { UiSidebar } from './sidebar/sidebar';
export { UiSidebarItem } from './sidebar/sidebar-item';
