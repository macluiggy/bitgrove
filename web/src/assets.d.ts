// Vite inlines stylesheets into the single HTML file.
declare module '*.css';

// Images become URLs (inlined as data URIs in the single HTML file).
declare module '*.png' {
  const url: string;
  export default url;
}
