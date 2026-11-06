import type { GroveEvent, GroveRules } from '../domain';

// Must match web/index.html and EMBEDDED_DATA_ELEMENT_ID in the web app.
export const DATA_PLACEHOLDER =
  '<script type="application/json" id="bitgrove-data">null</script>';

export interface ViewPageData {
  events: GroveEvent[];
  rules: GroveRules;
  generatedAt: string;
}

// `<` is escaped so no project name can close the script tag early.
function toInlineJson(data: ViewPageData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function renderViewPage(template: string, data: ViewPageData): string {
  if (!template.includes(DATA_PLACEHOLDER)) {
    throw new Error(
      'The Bitgrove page has no data slot. Rebuild with "bun run build".',
    );
  }

  return template.replace(
    DATA_PLACEHOLDER,
    () =>
      `<script type="application/json" id="bitgrove-data">${toInlineJson(data)}</script>`,
  );
}
