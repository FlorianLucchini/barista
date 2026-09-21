/**
 * Architecture boundaries, enforced.
 *
 * The rule that matters most here is `core-stays-framework-free`. Barista's
 * analysis engine has to run inside a Web Worker and under plain Node, so a
 * single `@angular/core` import would break both — silently, and long before
 * anyone notices. This turns "the model must not depend on the view" from a
 * convention people remember into a check that fails the build.
 *
 * Run with `pnpm deps:check`. A Claude Code hook also runs it after any edit
 * inside `packages/core`.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-stays-framework-free',
      comment:
        'packages/core is the analysis engine: pure TypeScript, no framework, no UI. ' +
        'It must run in a Web Worker and in Node. Move anything that needs Angular or ' +
        'the DOM into apps/web, and keep the engine testable in isolation.',
      severity: 'error',
      from: { path: '^packages/core' },
      to: {
        path: '(^apps/web)|(node_modules/@angular)|(^@angular)|(node_modules/rxjs)',
      },
    },
    {
      name: 'parser-does-not-leak',
      comment:
        'Tree-sitter types must not escape core/src/parse/. Everything downstream works ' +
        'on our own model types so the parser stays swappable — java-parser is a proven ' +
        'fallback, and that only stays true while nothing else knows which parser we use.',
      severity: 'error',
      from: { path: '^packages/core/src', pathNot: '^packages/core/src/parse' },
      to: { path: '(web-tree-sitter)|(tree-sitter-java)' },
    },
    {
      name: 'pipeline-flows-one-way',
      comment:
        'The pipeline is a sequence: parse → resolve → infer → model → export. A later ' +
        'stage importing an earlier one is fine; an earlier stage importing a later one ' +
        'is a cycle in disguise and makes each stage untestable on its own.',
      severity: 'error',
      from: { path: '^packages/core/src/parse' },
      to: { path: '^packages/core/src/(resolve|infer|export)' },
    },
    {
      name: 'no-circular-dependencies',
      comment:
        'A cycle means neither module can be understood, tested or reused without the ' +
        'other. Extract the shared piece into a third module instead.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphan-modules',
      comment:
        'A module nothing imports is either dead code or a missing wire-up. Both are ' +
        'worth knowing about.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.[^/]+\\.json$',
          '(^|/)(eslint|prettier|vitest|playwright)\\.config\\.[^/]+$',
          '^packages/core/src/index\\.ts$',
          '^apps/web/src/main\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'no-deep-imports-across-packages',
      comment:
        'Import from a package entry point, not its internals. @barista/core decides what ' +
        'it exposes; reaching past that couples you to a private layout that is free to change.',
      severity: 'error',
      from: { path: '^apps/web' },
      to: { path: '^packages/core/src/(?!index)' },
    },
    {
      name: 'no-dev-dependencies-in-production-code',
      comment:
        'Something shipped to the browser is importing a devDependency. It will work ' +
        'locally and break in the built bundle.',
      severity: 'error',
      from: { path: '^(packages|apps)/[^/]+/src', pathNot: '\\.(spec|test)\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: '(^|/)(node_modules|dist|coverage|\\.angular|out-tsc)(/|$)',
    },
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.d.ts'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
      archi: {
        collapsePattern: '^(?:packages|apps)/[^/]+/src/[^/]+|^node_modules/(?:@[^/]+/[^/]+|[^/]+)',
      },
    },
  },
};
