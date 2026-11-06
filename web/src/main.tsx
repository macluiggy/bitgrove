import { render } from 'preact';
import { App } from './app';
import { EmbeddedGroveSource } from './data/embedded-grove-source';
import type { GroveSource } from './data/grove-source';
import { SampleGroveSource } from './data/sample-grove-source';
import './styles.css';

// Vite replaces this at build time.
const DEVELOPMENT_MODE = 'development';

function pickSource(): GroveSource {
  const embedded = new EmbeddedGroveSource(document);

  if (import.meta.env.MODE !== DEVELOPMENT_MODE) {
    return embedded;
  }

  // In `bun run dev:web` there is no CLI to embed data: fall back to a demo.
  return {
    load: async () => (await embedded.load()) ?? new SampleGroveSource().load(),
  };
}

const root = document.getElementById('app');

if (root !== null) {
  render(<App source={pickSource()} />, root);
}
