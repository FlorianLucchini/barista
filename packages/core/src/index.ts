/**
 * Public surface of Barista's analysis engine.
 *
 * Everything the web app is allowed to use is re-exported from here. Reaching
 * past this file into `src/` internals is a boundary violation, and
 * `pnpm deps:check` fails the build on it — the point is that the pipeline
 * stays free to reorganise itself without breaking the UI.
 */

export { selectJavaSources } from './zip/java-source-filter.js';
