import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const webRoot = fileURLToPath(new URL('.', import.meta.url));

// One self-contained HTML file: `bitgrove view` embeds it in the CLI bundle,
// and the same build can be deployed as a static site later.
export default defineConfig({
  root: webRoot,
  plugins: [preact(), viteSingleFile()],
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
  },
});
