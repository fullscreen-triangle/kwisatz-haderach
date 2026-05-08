/**
 * Jest configuration for the Kwisatz-Haderach Citation Intelligence Framework.
 *
 * This is the minimal, runnable configuration. The previous version referenced
 * a number of yet-to-be-created files (globalSetup.ts, integration setup,
 * snapshot serializers, jest-junit reporter) that broke `npm test` outright.
 * Those can be layered in once the corresponding artefacts exist.
 *
 * Two non-obvious settings worth flagging:
 *   - `moduleNameMapper` (NOT `moduleNameMapping`, which Jest silently ignores)
 *   - the `^vscode$` mapping points at our test mock; the VSCode runtime API
 *     is not available outside the editor, so Logger and other utilities that
 *     import it would otherwise break every test that imports them.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: ['<rootDir>/src', '<rootDir>/tests'],

  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }]
  },

  moduleNameMapper: {
    '^vscode$': '<rootDir>/tests/__mocks__/vscode.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/storage/(.*)$': '<rootDir>/src/storage/$1',
    // Strip the .js extension that source files use for ESM-style imports;
    // ts-jest resolves the underlying .ts file directly.
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  setupFilesAfterEach: ['<rootDir>/tests/setup.ts'],

  testTimeout: 30000,

  clearMocks: true,
  restoreMocks: true,

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/models/',
    '/data/',
    '/coverage/'
  ],

  transformIgnorePatterns: [
    'node_modules/(?!(@huggingface|@xenova|node-fetch)/)'
  ],

  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/models/',
    '/coverage/'
  ]
};
