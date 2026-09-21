import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

/**
 * Flat ESLint config for the workspace.
 *
 * The rules here are not stylistic preference — they are the machine-checkable
 * subset of `.claude/rules/prohibited.md`. Anything that file forbids and a
 * linter can detect should be an error here, so the rule is enforced rather
 * than remembered.
 *
 * Type-aware rules are scoped to TypeScript only: applying them repo-wide makes
 * ESLint fail on every config file that lives outside the TS project graph.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/out-tsc/**',
      '**/.angular/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'fixtures/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.ts', '**/*.mts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: [
            './tsconfig.base.json',
            './packages/*/tsconfig.json',
            './apps/web/tsconfig.app.json',
          ],
          noWarnOnMultipleProjects: true,
        },
      },
    },
    rules: {
      // `.claude/rules/prohibited.md` § Types
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],

      // `.claude/rules/prohibited.md` § Repository hygiene
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // `.claude/rules/typescript-style.md` § Types — immutability is the default.
      '@typescript-eslint/prefer-readonly': 'error',

      // `.claude/rules/typescript-style.md` § Imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@barista/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',

      // `.claude/rules/prohibited.md` § Shape of code
      'max-depth': ['error', 3],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 12],
    },
  },

  {
    // Tests describe behaviour: long `describe` blocks and repetition are the
    // point, and a fixture-heavy file legitimately runs past the line budget.
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    // Angular specs run under Vitest globals injected by the CLI builder.
    files: ['apps/web/src/**/*.spec.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },

  {
    // Config files and harness scripts are plain Node: outside the typed
    // project graph, and they talk to the terminal on purpose.
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
    },
  },

  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
);
