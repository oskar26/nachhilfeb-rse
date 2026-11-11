import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'open-design',
    'node_modules',
    'api',
    'public',
    'docs',
    'sql',
    'sql-updates',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // `_`-Präfix = bewusste Interface-Konformität (z. B. Fluent-Stub-Parameter),
      // kein toter Code – deshalb von unused-vars ausgenommen.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      // Bestehender Code nutzt `any` an API-/Legacy-Grenzen. Das wird in den
      // Seiten-Migrationen schrittweise durch konkrete Typen ersetzt; bis dahin
      // ist es ein Warnsignal, kein Build-Blocker.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Bestehende Datenlade-Effekte und dynamische Icon-Komponenten folgen
      // noch dem alten Muster. Diese Regeln sind für den Redesign-Scope keine
      // Korrektheitsfehler und würden die Migration sonst blockieren.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      // shadcn/ui exportiert bewusst Varianten (buttonVariants, badgeVariants)
      // neben den Komponenten; Fast Refresh bleibt im Dev-Betrieb funktionsfähig.
      'react-refresh/only-export-components': 'off',
    },
  },
])
