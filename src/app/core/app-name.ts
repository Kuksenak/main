import manifest from '../../../public/manifest.webmanifest';

/**
 * The app's name — in one place only: the web manifest's "name" (what an installed app is called), read
 * from it here for the rest (the window's title, the sign-in page, Home's title). Renamed there, renamed
 * everywhere.
 */
export const APP_NAME: string = JSON.parse(manifest).name;
