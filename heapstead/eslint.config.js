import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

/**
 * SPEC §12.1 — the sim/render split, enforced mechanically.
 *
 * `src/sim/**` is a pure, headless, deterministic simulation. It must run in
 * Node with no browser and no GPU. The rules below are the enforcement; the
 * prose in docs/SPEC.md is only the explanation. If you find yourself wanting
 * to disable one of these, you want a different design.
 */
const SIM_PURITY = {
  files: ['src/sim/**/*.ts'],
  languageOptions: {
    // No browser globals in scope at all: referencing `window` in here is an
    // undefined-variable error, not merely a lint warning.
    globals: { ...globals.node },
  },
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: 'three', message: 'SPEC §12.1: src/sim must not import three.js. The sim is headless; use src/sim/vec.ts.' },
      ],
      patterns: [
        { group: ['three', 'three/*'], message: 'SPEC §12.1: src/sim must not import three.js. The sim is headless.' },
        { group: ['**/render/**', '../render', '../render/*'], message: 'SPEC §12.1: the dependency arrow points one way — render may import sim, sim may never import render.' },
      ],
    }],
    'no-restricted-globals': ['error',
      { name: 'window', message: 'SPEC §12.1: no DOM in src/sim.' },
      { name: 'document', message: 'SPEC §12.1: no DOM in src/sim.' },
      { name: 'navigator', message: 'SPEC §12.1: no DOM in src/sim.' },
      { name: 'localStorage', message: 'SPEC §12.1: no DOM in src/sim.' },
      { name: 'sessionStorage', message: 'SPEC §12.1: no DOM in src/sim.' },
      { name: 'performance', message: 'SPEC §12.1: no wall-clock time in src/sim. The sim\'s only clock is the tick counter.' },
      { name: 'requestAnimationFrame', message: 'SPEC §12.1: no DOM in src/sim.' },
    ],
    'no-restricted-properties': ['error',
      { object: 'Math', property: 'random', message: 'SPEC §12.1: no Math.random in src/sim. Take a seeded Rng and call rng.next(). Unseeded randomness is non-determinism that hides for weeks.' },
      { object: 'Date', property: 'now', message: 'SPEC §12.1: no wall-clock time in src/sim. Use the tick counter.' },
      { object: 'performance', property: 'now', message: 'SPEC §12.1: no wall-clock time in src/sim. Use the tick counter.' },
    ],
    // Belt and braces: catches `const r = Math.random` and destructuring forms
    // that no-restricted-properties misses.
    'no-restricted-syntax': ['error',
      {
        selector: 'MemberExpression[object.name="Math"][property.name="random"]',
        message: 'SPEC §12.1: no Math.random in src/sim. Take a seeded Rng.',
      },
      {
        selector: 'NewExpression[callee.name="Date"]',
        message: 'SPEC §12.1: no wall-clock time in src/sim.',
      },
    ],
  },
};

export default ts.config(
  { ignores: ['dist/**', 'node_modules/**', 'screenshots/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
    },
  },
  SIM_PURITY,
);
