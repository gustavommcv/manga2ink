declare module '*.css';

declare module '*.webp' {
  const source: string;
  export default source;
}

declare module 'electron-squirrel-startup' {
  const started: boolean;
  export default started;
}
