// The web manifest imported as its text (angular.json's loader): the app's name read from it, app-name.ts
declare module '*.webmanifest' {
  const text: string;
  export default text;
}
