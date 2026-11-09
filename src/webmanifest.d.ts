// The web manifest imported as its text (`with { loader: 'text' }`): the app's name read from it, app-name.ts
declare module '*.webmanifest' {
  const text: string;
  export default text;
}
